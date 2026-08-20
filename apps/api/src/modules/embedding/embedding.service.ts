import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EMBEDDING } from '@recommendation-genie/config';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async embedMedia(mediaItemId: string): Promise<number[] | null> {
    const item = await this.prisma.client.mediaItem.findUnique({
      where: { id: mediaItemId },
      include: {
        genres: { include: { genre: true } },
        tags: { include: { tag: true } },
        people: { include: { person: true } },
      },
    });
    if (!item) {
      return null;
    }
    const text = [
      item.title,
      item.description ?? '',
      item.genres.map((g) => g.genre.name).join(' '),
      item.tags.map((t) => t.tag.name).join(' '),
      item.people.map((p) => p.person.name).join(' '),
    ].join(' | ');
    const contentHash = createHash('sha256').update(text).digest('hex');

    const cached = await this.loadCachedVector('MEDIA', mediaItemId, contentHash);
    if (cached) {
      return cached;
    }

    const vector = (await this.embedText(text)) ?? this.fallbackVector(text);
    await this.store('MEDIA', mediaItemId, contentHash, vector);
    return vector;
  }

  async embedUserTaste(userId: string): Promise<number[] | null> {
    const interactions = await this.prisma.client.userMediaInteraction.findMany({
      where: { userId, type: { in: ['LOVE', 'LIKE', 'DISLIKE', 'NOT_INTERESTED'] } },
      select: { mediaItemId: true, type: true },
      take: 200,
    });
    if (interactions.length === 0) {
      return null;
    }
    const contentHash = createHash('sha256')
      .update(
        interactions
          .map((row) => `${row.mediaItemId}:${row.type}`)
          .sort()
          .join('|'),
      )
      .digest('hex');

    const cached = await this.loadCachedVector('USER_TASTE', userId, contentHash);
    if (cached) {
      return cached;
    }

    const weights: Record<string, number> = {
      LOVE: 2,
      LIKE: 1,
      DISLIKE: -1,
      NOT_INTERESTED: -1.5,
    };
    const accumulator = Array.from({ length: EMBEDDING.dimensions }, () => 0);
    let used = 0;
    for (const row of interactions) {
      const vector = await this.embedMedia(row.mediaItemId);
      if (!vector) {
        continue;
      }
      const weight = weights[row.type] ?? 0;
      used += 1;
      for (let i = 0; i < accumulator.length; i += 1) {
        accumulator[i] = (accumulator[i] ?? 0) + (vector[i] ?? 0) * weight;
      }
    }
    if (used === 0) {
      return null;
    }
    const mag = Math.sqrt(accumulator.reduce((sum, n) => sum + n * n, 0)) || 1;
    const mean = accumulator.map((n) => n / mag);
    await this.store('USER_TASTE', userId, contentHash, mean);
    return mean;
  }

  async similarByVector(vector: number[], limit = 40, excludeIds: string[] = []): Promise<string[]> {
    if (vector.length === 0) {
      return [];
    }
    const literal = `[${vector.join(',')}]`;
    try {
      const rows = await this.prisma.client.$queryRawUnsafe<Array<{ entityId: string }>>(
        `SELECT "entityId" FROM "Embedding"
         WHERE "entityType" = 'MEDIA'
         AND "entityId" <> ALL($2::text[])
         ORDER BY vector <=> $1::vector
         LIMIT $3`,
        literal,
        excludeIds,
        limit,
      );
      return rows.map((row) => row.entityId);
    } catch (error) {
      this.logger.debug(String(error));
      return [];
    }
  }

  /**
   * Prisma cannot project Unsupported("vector") columns. Always read the
   * vector via raw SQL so cache hits keep working across generations.
   */
  private async loadCachedVector(
    entityType: 'MEDIA' | 'USER_TASTE',
    entityId: string,
    contentHash: string,
  ): Promise<number[] | null> {
    try {
      const rows = await this.prisma.client.$queryRawUnsafe<Array<{ contentHash: string; vector: string }>>(
        `SELECT "contentHash", vector::text AS vector
         FROM "Embedding"
         WHERE "entityType" = $1 AND "entityId" = $2 AND model = $3
         LIMIT 1`,
        entityType,
        entityId,
        EMBEDDING.model,
      );
      const row = rows[0];
      if (!row || row.contentHash !== contentHash) {
        return null;
      }
      return this.parseVector(row.vector);
    } catch (error) {
      this.logger.debug(String(error));
      return null;
    }
  }

  private async embedText(text: string): Promise<number[] | null> {
    if (this.config.get('AI_MOCK') === 'true' || !this.config.get('OPENAI_API_KEY')) {
      return this.fallbackVector(text);
    }
    try {
      const { embed } = await import('ai');
      const { openai } = await import('@ai-sdk/openai');
      const result = await embed({
        model: openai.textEmbeddingModel(this.config.get('EMBEDDING_MODEL') ?? EMBEDDING.model),
        value: text,
      });
      return result.embedding;
    } catch (error) {
      this.logger.warn(error);
      return this.fallbackVector(text);
    }
  }

  private fallbackVector(text: string): number[] {
    const dims = EMBEDDING.dimensions;
    const vector = Array.from({ length: dims }, () => 0);
    for (let i = 0; i < text.length; i += 1) {
      const index = text.charCodeAt(i) % dims;
      vector[index] = (vector[index] ?? 0) + 1;
    }
    const mag = Math.sqrt(vector.reduce((sum, n) => sum + n * n, 0)) || 1;
    return vector.map((n) => n / mag);
  }

  private parseVector(raw: string | null): number[] | null {
    if (!raw) {
      return null;
    }
    const trimmed = raw.trim();
    if (!trimmed) {
      return null;
    }
    try {
      const asJson = trimmed.startsWith('[') ? trimmed : `[${trimmed}]`;
      const parsed = JSON.parse(asJson) as unknown;
      if (Array.isArray(parsed) && parsed.every((n) => typeof n === 'number')) {
        return parsed;
      }
    } catch {
      // Fall through to CSV parse for pgvector text forms like {1,2,3}.
    }
    const values = trimmed
      .replace(/^\[/, '')
      .replace(/\]$/, '')
      .replace(/^\{/, '')
      .replace(/\}$/, '')
      .split(',')
      .map((part) => Number(part.trim()))
      .filter((n) => !Number.isNaN(n));
    return values.length > 0 ? values : null;
  }

  private async store(
    entityType: 'MEDIA' | 'USER_TASTE',
    entityId: string,
    contentHash: string,
    vector: number[],
  ): Promise<void> {
    const literal = `[${vector.join(',')}]`;
    await this.prisma.client.$executeRawUnsafe(
      `INSERT INTO "Embedding" (id, "entityType", "entityId", model, dimensions, "contentHash", vector, "generatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7::vector, NOW())
       ON CONFLICT ("entityType", "entityId", model)
       DO UPDATE SET "contentHash" = EXCLUDED."contentHash", vector = EXCLUDED.vector, "generatedAt" = NOW()`,
      createHash('sha1').update(`${entityType}:${entityId}`).digest('hex').slice(0, 24),
      entityType,
      entityId,
      EMBEDDING.model,
      vector.length,
      contentHash,
      literal,
    );
  }
}

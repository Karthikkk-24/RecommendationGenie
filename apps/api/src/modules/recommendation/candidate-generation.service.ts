import { Injectable } from '@nestjs/common';
import { PIPELINE } from '@recommendation-genie/config';
import type { GenerateRecommendationsInput, MediaType } from '@recommendation-genie/types';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmbeddingService } from '../embedding/embedding.service';

@Injectable()
export class CandidateGenerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingService,
  ) {}

  async generate(userId: string, input: GenerateRecommendationsInput): Promise<string[]> {
    const liked = await this.prisma.client.userMediaInteraction.findMany({
      where: { userId, type: { in: ['LIKE', 'LOVE', 'SAVE'] } },
      select: { mediaItemId: true },
      take: 50,
    });
    const likedIds = liked.map((row) => row.mediaItemId);
    const type = input.mode === 'SURPRISE_ME' ? undefined : input.mediaType;

    const tasteVector = await this.embeddings.embedUserTaste(userId);
    const [similar, genreBased, tagBased, popular, hidden, exploration, vectorNeighbors] = await Promise.all([
      this.similarTo(likedIds, type),
      this.byTasteGenres(userId, type),
      this.byTasteTags(userId, type),
      this.popular(type),
      this.hiddenGems(type),
      this.explore(type, input.similarToId),
      tasteVector ? this.embeddings.similarByVector(tasteVector, 80, likedIds) : Promise.resolve([]),
    ]);

    const pool = new Set<string>([
      ...similar,
      ...genreBased,
      ...tagBased,
      ...popular,
      ...hidden,
      ...exploration,
      ...vectorNeighbors,
    ]);

    if (input.similarToId) {
      const neighbors = await this.similarTo([input.similarToId], type);
      neighbors.forEach((id) => pool.add(id));
    }

    return [...pool].slice(0, PIPELINE.candidatePoolSize);
  }

  private async similarTo(ids: string[], type?: MediaType): Promise<string[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.prisma.client.mediaSimilarity.findMany({
      where: {
        fromId: { in: ids },
        ...(type ? { to: { type } } : {}),
      },
      orderBy: { score: 'desc' },
      take: 200,
      select: { toId: true },
    });
    return rows.map((row) => row.toId);
  }

  private async byTasteGenres(userId: string, type?: MediaType): Promise<string[]> {
    const prefs = await this.prisma.client.tastePreference.findMany({
      where: { userId, featureType: 'GENRE', weight: { gt: 0.15 } },
      orderBy: { weight: 'desc' },
      take: 8,
    });
    if (prefs.length === 0) {
      return [];
    }
    const rows = await this.prisma.client.mediaItem.findMany({
      where: {
        ...(type ? { type } : {}),
        genres: { some: { genre: { name: { in: prefs.map((p) => p.featureKey) } } } },
      },
      select: { id: true },
      take: 200,
    });
    return rows.map((row) => row.id);
  }

  private async byTasteTags(userId: string, type?: MediaType): Promise<string[]> {
    const prefs = await this.prisma.client.tastePreference.findMany({
      where: { userId, featureType: { in: ['TAG', 'THEME'] }, weight: { gt: 0.1 } },
      orderBy: { weight: 'desc' },
      take: 12,
    });
    if (prefs.length === 0) {
      return [];
    }
    const rows = await this.prisma.client.mediaItem.findMany({
      where: {
        ...(type ? { type } : {}),
        tags: { some: { tag: { name: { in: prefs.map((p) => p.featureKey) } } } },
      },
      select: { id: true },
      take: 160,
    });
    return rows.map((row) => row.id);
  }

  private async popular(type?: MediaType): Promise<string[]> {
    const rows = await this.prisma.client.mediaItem.findMany({
      where: type ? { type } : {},
      orderBy: { popularity: 'desc' },
      take: 80,
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  private async hiddenGems(type?: MediaType): Promise<string[]> {
    const rows = await this.prisma.client.mediaItem.findMany({
      where: {
        ...(type ? { type } : {}),
        popularity: { lt: 0.55 },
        qualityScore: { gt: 0.78 },
      },
      orderBy: { qualityScore: 'desc' },
      take: 80,
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  private async explore(type?: MediaType, excludeId?: string): Promise<string[]> {
    const rows = await this.prisma.client.mediaItem.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      orderBy: { qualityScore: 'desc' },
      take: 60,
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }
}

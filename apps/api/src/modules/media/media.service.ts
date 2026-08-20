import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MediaType } from '@recommendation-genie/types';
import { CacheService } from '../../common/cache/cache.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { IgdbGameProvider } from './providers/igdb.provider';
import type { MediaProvider, NormalizedMedia } from './providers/media-provider';
import { MockMediaProvider } from './providers/mock.provider';
import { MusicBrainzProvider } from './providers/musicbrainz.provider';
import { TmdbMovieProvider } from './providers/tmdb.provider';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly config: ConfigService,
    private readonly mock: MockMediaProvider,
    private readonly tmdb: TmdbMovieProvider,
    private readonly igdb: IgdbGameProvider,
    private readonly musicbrainz: MusicBrainzProvider,
  ) {}

  providers(): MediaProvider[] {
    const mode = this.config.get<string>('MEDIA_PROVIDER_MODE') ?? 'mock';
    if (mode === 'live') {
      return [this.tmdb, this.igdb, this.musicbrainz, this.mock];
    }
    return [this.mock];
  }

  async search(query: string, mediaType?: MediaType, page = 1, pageSize = 20) {
    const cacheKey = `search:${mediaType ?? 'all'}:${query}:${page}:${pageSize}`;
    const cached = await this.cache.get<unknown>(cacheKey);
    if (cached) {
      return cached;
    }

    const fuzzyIds = await this.fuzzyTitleIds(query, mediaType, pageSize * page);
    const dbResults = await this.prisma.client.mediaItem.findMany({
      where: {
        ...(mediaType ? { type: mediaType } : {}),
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          ...(fuzzyIds.length ? [{ id: { in: fuzzyIds } }] : []),
        ],
      },
      include: this.cardInclude(),
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { popularity: 'desc' },
    });

    if (dbResults.length < pageSize) {
      for (const provider of this.providers()) {
        if (mediaType && !provider.mediaTypes.includes(mediaType)) {
          continue;
        }
        const remote = await provider.search({ query, mediaType, limit: pageSize });
        for (const item of remote) {
          await this.upsertNormalized(item);
        }
      }
    }

    const grouped = await this.groupSearch(query, mediaType);
    await this.cache.set(cacheKey, grouped, 1000 * 60 * 5);
    return grouped;
  }

  async getById(id: string) {
    const item = await this.prisma.client.mediaItem.findUnique({
      where: { id },
      include: { ...this.cardInclude(), sources: true },
    });
    if (!item) {
      throw new NotFoundException({ code: 'MEDIA_NOT_FOUND', message: 'Media item not found' });
    }
    return this.toCard(item);
  }

  async similar(id: string) {
    const similar = await this.prisma.client.mediaSimilarity.findMany({
      where: { fromId: id },
      include: { to: { include: this.cardInclude() } },
      orderBy: { score: 'desc' },
      take: 12,
    });
    if (similar.length > 0) {
      return similar.map((row) => this.toCard(row.to));
    }
    const item = await this.prisma.client.mediaItem.findUnique({
      where: { id },
      include: { genres: { include: { genre: true } } },
    });
    if (!item) {
      return [];
    }
    const genreIds = item.genres.map((g) => g.genreId);
    const neighbors = await this.prisma.client.mediaItem.findMany({
      where: {
        id: { not: id },
        type: item.type,
        genres: { some: { genreId: { in: genreIds } } },
      },
      include: this.cardInclude(),
      take: 12,
    });
    return neighbors.map((row) => this.toCard(row));
  }

  async popular(mediaType?: MediaType) {
    const cacheKey = `popular:${mediaType ?? 'all'}`;
    const cached = await this.cache.get<unknown[]>(cacheKey);
    if (cached) {
      return cached;
    }
    const items = await this.prisma.client.mediaItem.findMany({
      where: mediaType ? { type: mediaType } : {},
      include: this.cardInclude(),
      orderBy: { popularity: 'desc' },
      take: 24,
    });
    const cards = items.map((item) => this.toCard(item));
    await this.cache.set(cacheKey, cards, 1000 * 60 * 15);
    return cards;
  }

  async upsertNormalized(input: NormalizedMedia): Promise<string> {
    const existing = await this.prisma.client.mediaSource.findUnique({
      where: { provider_externalId: { provider: input.provider, externalId: input.externalId } },
    });

    const data = {
      type: input.type,
      title: input.title,
      description: input.description,
      releaseDate: input.releaseDate,
      language: input.language,
      runtimeMinutes: input.runtimeMinutes,
      posterUrl: input.posterUrl,
      popularity: input.popularity,
      qualityScore: input.qualityScore,
      pacing: input.pacing,
      complexity: input.complexity,
      darkness: input.darkness,
      emotionalIntensity: input.emotionalIntensity,
    };

    const mediaItemId = existing
      ? (
          await this.prisma.client.mediaItem.update({
            where: { id: existing.mediaItemId },
            data,
          })
        ).id
      : (
          await this.prisma.client.mediaItem.create({
            data: {
              ...data,
              sources: { create: { provider: input.provider, externalId: input.externalId } },
            },
          })
        ).id;

    await this.syncTaxonomy(mediaItemId, input);
    return mediaItemId;
  }

  toCard(item: {
    id: string;
    type: MediaType;
    title: string;
    description: string | null;
    posterUrl: string | null;
    releaseDate: Date | null;
    popularity: number;
    qualityScore: number;
    runtimeMinutes: number | null;
    genres: Array<{ genre: { name: string } }>;
    tags: Array<{ tag: { name: string } }>;
    people: Array<{ person: { name: string } }>;
  }) {
    return {
      id: item.id,
      type: item.type,
      title: item.title,
      description: item.description,
      posterUrl: item.posterUrl,
      releaseDate: item.releaseDate?.toISOString() ?? null,
      genres: item.genres.map((row) => row.genre.name),
      tags: item.tags.map((row) => row.tag.name),
      creators: item.people.map((row) => row.person.name),
      popularity: item.popularity,
      qualityScore: item.qualityScore,
      runtimeMinutes: item.runtimeMinutes,
    };
  }

  cardInclude() {
    return {
      genres: { include: { genre: true } },
      tags: { include: { tag: true } },
      people: { include: { person: true } },
    } as const;
  }

  private async groupSearch(query: string, mediaType?: MediaType) {
    const fuzzyIds = await this.fuzzyTitleIds(query, mediaType, 40);
    const items = await this.prisma.client.mediaItem.findMany({
      where: {
        ...(mediaType ? { type: mediaType } : {}),
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          ...(fuzzyIds.length ? [{ id: { in: fuzzyIds } }] : []),
        ],
      },
      include: this.cardInclude(),
      take: 40,
      orderBy: { popularity: 'desc' },
    });
    const cards = items.map((item) => this.toCard(item));
    return {
      movies: cards.filter((item) => item.type === 'MOVIE'),
      games: cards.filter((item) => item.type === 'GAME'),
      music: cards.filter((item) => item.type === 'MUSIC'),
    };
  }

  /** pg_trgm fuzzy title matches (typos / near-misses). Falls back to [] if extension unavailable. */
  private async fuzzyTitleIds(query: string, mediaType: MediaType | undefined, limit: number): Promise<string[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return [];
    }
    try {
      const rows = mediaType
        ? await this.prisma.client.$queryRawUnsafe<Array<{ id: string }>>(
            `SELECT id
             FROM "MediaItem"
             WHERE type = $1::"MediaType"
               AND similarity(title, $2) > 0.25
             ORDER BY similarity(title, $2) DESC, popularity DESC
             LIMIT $3`,
            mediaType,
            trimmed,
            limit,
          )
        : await this.prisma.client.$queryRawUnsafe<Array<{ id: string }>>(
            `SELECT id
             FROM "MediaItem"
             WHERE similarity(title, $1) > 0.25
             ORDER BY similarity(title, $1) DESC, popularity DESC
             LIMIT $2`,
            trimmed,
            limit,
          );
      return rows.map((row) => row.id);
    } catch {
      return [];
    }
  }

  private async syncTaxonomy(mediaItemId: string, input: NormalizedMedia): Promise<void> {
    // Never wipe existing links when the provider payload has empty taxonomy
    // (e.g. TMDB search without details). Only replace dimensions we actually received.
    if (input.genres.length > 0) {
      await this.prisma.client.mediaGenreLink.deleteMany({ where: { mediaItemId } });
      for (const genre of input.genres) {
        const row = await this.prisma.client.mediaGenre.upsert({
          where: { slug: slugify(genre) },
          update: { name: genre },
          create: { slug: slugify(genre), name: genre },
        });
        await this.prisma.client.mediaGenreLink.create({ data: { mediaItemId, genreId: row.id } });
      }
    }

    if (input.tags.length > 0) {
      await this.prisma.client.mediaTagLink.deleteMany({ where: { mediaItemId } });
      for (const tag of input.tags) {
        const row = await this.prisma.client.mediaTag.upsert({
          where: { slug: slugify(tag) },
          update: { name: tag },
          create: { slug: slugify(tag), name: tag },
        });
        await this.prisma.client.mediaTagLink.create({ data: { mediaItemId, tagId: row.id } });
      }
    }

    if (input.people.length > 0) {
      await this.prisma.client.mediaPersonLink.deleteMany({ where: { mediaItemId } });
      for (const person of input.people) {
        const row = await this.prisma.client.mediaPerson.upsert({
          where: { slug: slugify(person.name) },
          update: { name: person.name },
          create: { slug: slugify(person.name), name: person.name },
        });
        await this.prisma.client.mediaPersonLink.create({
          data: { mediaItemId, personId: row.id, role: person.role },
        });
      }
    }
  }
}

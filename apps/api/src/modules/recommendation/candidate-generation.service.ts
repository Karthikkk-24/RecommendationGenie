import { Injectable } from '@nestjs/common';
import { PIPELINE } from '@recommendation-genie/config';
import type { GenerateRecommendationsInput, MediaType, Mood } from '@recommendation-genie/types';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmbeddingService } from '../embedding/embedding.service';
import { expandCrossMediaKeys } from './cross-media-map';

type TypeFilter = MediaType | MediaType[] | undefined;

const DEFAULT_ENABLED_TYPES: MediaType[] = ['MOVIE', 'GAME', 'MUSIC', 'TV_SHOW'];

const MOOD_FILTERS: Record<
  Mood,
  {
    darkness?: { gte?: number; lte?: number };
    pacing?: { gte?: number; lte?: number };
    emotionalIntensity?: { gte?: number; lte?: number };
    complexity?: { gte?: number; lte?: number };
  }
> = {
  CHILL: { pacing: { lte: 0 }, emotionalIntensity: { lte: 0.2 }, darkness: { lte: 0.2 } },
  ADRENALINE: { pacing: { gte: 0.35 }, emotionalIntensity: { gte: 0.2 } },
  EMOTIONAL: { emotionalIntensity: { gte: 0.35 } },
  DARK: { darkness: { gte: 0.35 } },
  FUNNY: { darkness: { lte: 0 }, pacing: { gte: -0.2 } },
  MIND_BENDING: { complexity: { gte: 0.35 } },
  RELAXING: { pacing: { lte: -0.15 }, darkness: { lte: 0 }, emotionalIntensity: { lte: 0.15 } },
  INTENSE: { emotionalIntensity: { gte: 0.4 }, pacing: { gte: 0.2 } },
};

@Injectable()
export class CandidateGenerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingService,
  ) {}

  async generate(userId: string, input: GenerateRecommendationsInput): Promise<string[]> {
    const typeFilter = await this.resolveTypeFilter(userId, input);
    const liked = await this.prisma.client.userMediaInteraction.findMany({
      where: { userId, type: { in: ['LIKE', 'LOVE', 'SAVE'] } },
      select: { mediaItemId: true },
      take: 50,
    });
    const likedIds = liked.map((row) => row.mediaItemId);

    switch (input.mode) {
      case 'SIMILAR_TO':
        return this.similarToMode(input.similarToId, typeFilter);
      case 'SHORTLIST':
        return this.shortlistMode(userId, typeFilter);
      case 'HIDDEN_GEMS':
        return this.takeUnique([
          ...(await this.hiddenGems(typeFilter, 200)),
          ...(await this.byTasteGenres(userId, typeFilter, 80)),
        ]);
      case 'DEEP_CUTS':
        return this.takeUnique([
          ...(await this.deepCuts(typeFilter)),
          ...(await this.explore(typeFilter, undefined, 100)),
          ...(await this.byTasteTags(userId, typeFilter, 80)),
        ]);
      case 'SURPRISE_ME':
        return this.surpriseMode(userId, likedIds, typeFilter);
      case 'MOOD':
        return this.moodMode(userId, input.mood, typeFilter, likedIds);
      case 'FOR_YOU':
      default:
        return this.forYouMode(userId, likedIds, typeFilter, input.similarToId);
    }
  }

  private async resolveTypeFilter(
    userId: string,
    input: GenerateRecommendationsInput,
  ): Promise<TypeFilter> {
    if (input.mode === 'SURPRISE_ME' && !input.mediaType) {
      // Honor enabled media types and hard bans; do not hardcode a TV-less set.
      const banned = await this.bannedMediaTypes(userId);
      const preference = await this.prisma.client.userPreference.findUnique({
        where: { userId },
        select: { enabledMediaTypes: true },
      });
      const enabled = (preference?.enabledMediaTypes ?? []) as MediaType[];
      if (banned.size === 0 && enabled.length === 0) {
        return undefined;
      }
      const base = enabled.length ? enabled : DEFAULT_ENABLED_TYPES;
      const allowed = base.filter((type) => !banned.has(type));
      return allowed.length ? allowed : undefined;
    }
    if (input.mediaType) {
      const banned = await this.bannedMediaTypes(userId);
      if (banned.has(input.mediaType)) {
        return [];
      }
      return input.mediaType;
    }
    const preference = await this.prisma.client.userPreference.findUnique({
      where: { userId },
      select: { enabledMediaTypes: true },
    });
    const banned = await this.bannedMediaTypes(userId);
    const enabled = (preference?.enabledMediaTypes ?? []) as MediaType[];
    const filtered = (enabled.length ? enabled : DEFAULT_ENABLED_TYPES).filter(
      (type) => !banned.has(type),
    );
    if (filtered.length === 0) {
      return [];
    }
    return filtered;
  }

  private async bannedMediaTypes(userId: string): Promise<Set<string>> {
    const rows = await this.prisma.client.tastePreference.findMany({
      where: { userId, featureType: 'MEDIA_TYPE', weight: { lt: -0.2 } },
      select: { featureKey: true },
    });
    return new Set(rows.map((row) => row.featureKey));
  }

  private async forYouMode(
    userId: string,
    likedIds: string[],
    type: TypeFilter,
    similarToId?: string,
  ): Promise<string[]> {
    const tasteVector = await this.embeddings.embedUserTaste(userId);
    const [similar, genreBased, tagBased, popular, hidden, exploration, vectorNeighbors] =
      await Promise.all([
        this.similarTo(likedIds, type),
        this.byTasteGenres(userId, type),
        this.byTasteTags(userId, type),
        this.popular(type),
        this.hiddenGems(type),
        this.explore(type, similarToId),
        tasteVector ? this.embeddings.similarByVector(tasteVector, 80, likedIds) : Promise.resolve([]),
      ]);

    const pool = this.takeUnique([
      ...similar,
      ...genreBased,
      ...tagBased,
      ...popular,
      ...hidden,
      ...exploration,
      ...vectorNeighbors,
    ]);

    if (similarToId) {
      const neighbors = await this.similarTo([similarToId], type);
      return this.takeUnique([...neighbors, ...pool]);
    }
    return pool;
  }

  private async similarToMode(similarToId: string | undefined, type: TypeFilter): Promise<string[]> {
    if (!similarToId) {
      return this.popular(type);
    }
    const neighbors = await this.similarTo([similarToId], type, 300);
    if (neighbors.length > 0) {
      return this.takeUnique(neighbors);
    }
    // Fall back to genre neighbors of the seed item when similarity graph is empty.
    const seed = await this.prisma.client.mediaItem.findUnique({
      where: { id: similarToId },
      include: { genres: { include: { genre: true } } },
    });
    if (!seed) {
      return this.popular(type);
    }
    const genreNames = expandCrossMediaKeys(seed.genres.map((g) => g.genre.name));
    const rows = await this.prisma.client.mediaItem.findMany({
      where: {
        id: { not: similarToId },
        ...this.typeWhere(type),
        ...(genreNames.length
          ? {
              OR: [
                { genres: { some: { genre: { name: { in: genreNames } } } } },
                { tags: { some: { tag: { name: { in: genreNames } } } } },
              ],
            }
          : { type: seed.type }),
      },
      select: { id: true },
      take: PIPELINE.candidatePoolSize,
    });
    return rows.map((row) => row.id);
  }

  private async shortlistMode(userId: string, type: TypeFilter): Promise<string[]> {
    const saved = await this.prisma.client.savedItem.findMany({
      where: {
        userId,
        ...(type
          ? {
              mediaItem: Array.isArray(type)
                ? { type: { in: type } }
                : { type },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: PIPELINE.candidatePoolSize,
      select: { mediaItemId: true },
    });
    if (saved.length > 0) {
      return saved.map((row) => row.mediaItemId);
    }
    // Soft fallback: SAVE interactions if SavedItem table is empty.
    const interactions = await this.prisma.client.userMediaInteraction.findMany({
      where: {
        userId,
        type: 'SAVE',
        ...(type
          ? {
              mediaItem: Array.isArray(type)
                ? { type: { in: type } }
                : { type },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: PIPELINE.candidatePoolSize,
      select: { mediaItemId: true },
    });
    return interactions.map((row) => row.mediaItemId);
  }

  private async surpriseMode(
    userId: string,
    likedIds: string[],
    type: TypeFilter,
  ): Promise<string[]> {
    const tasteVector = await this.embeddings.embedUserTaste(userId);
    const [exploration, deep, vectorNeighbors, hidden] = await Promise.all([
      this.explore(type, undefined, 160),
      this.deepCuts(type),
      tasteVector ? this.embeddings.similarByVector(tasteVector, 100, likedIds) : Promise.resolve([]),
      this.hiddenGems(type, 80),
    ]);
    // Prefer exploration/deep cuts; keep a thin taste-vector slice for coherence.
    return this.takeUnique([...exploration, ...deep, ...hidden, ...vectorNeighbors.slice(0, 40)]);
  }

  private async moodMode(
    userId: string,
    mood: Mood | undefined,
    type: TypeFilter,
    likedIds: string[],
  ): Promise<string[]> {
    const moodFilter = mood ? MOOD_FILTERS[mood] : undefined;
    const [moodItems, genreBased, tagBased, similar] = await Promise.all([
      this.byMood(type, moodFilter),
      this.byTasteGenres(userId, type, 80),
      this.byTasteTags(userId, type, 60),
      this.similarTo(likedIds, type, 60),
    ]);
    return this.takeUnique([...moodItems, ...genreBased.slice(0, 40), ...tagBased.slice(0, 30), ...similar.slice(0, 30)]);
  }

  private async byMood(
    type: TypeFilter,
    moodFilter:
      | {
          darkness?: { gte?: number; lte?: number };
          pacing?: { gte?: number; lte?: number };
          emotionalIntensity?: { gte?: number; lte?: number };
          complexity?: { gte?: number; lte?: number };
        }
      | undefined,
  ): Promise<string[]> {
    const rows = await this.prisma.client.mediaItem.findMany({
      where: {
        ...this.typeWhere(type),
        ...(moodFilter ?? {}),
      },
      orderBy: [{ qualityScore: 'desc' }, { popularity: 'desc' }],
      take: 220,
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  private async similarTo(ids: string[], type?: TypeFilter, take = 200): Promise<string[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.prisma.client.mediaSimilarity.findMany({
      where: {
        fromId: { in: ids },
        ...(type
          ? {
              to: Array.isArray(type) ? { type: { in: type } } : { type },
            }
          : {}),
      },
      orderBy: { score: 'desc' },
      take,
      select: { toId: true },
    });
    return rows.map((row) => row.toId);
  }

  private async byTasteGenres(userId: string, type?: TypeFilter, take = 200): Promise<string[]> {
    const prefs = await this.prisma.client.tastePreference.findMany({
      where: { userId, featureType: 'GENRE', weight: { gt: 0.15 } },
      orderBy: { weight: 'desc' },
      take: 8,
    });
    if (prefs.length === 0) {
      return [];
    }
    const keys = expandCrossMediaKeys(prefs.map((p) => p.featureKey));
    const rows = await this.prisma.client.mediaItem.findMany({
      where: {
        ...this.typeWhere(type),
        OR: [
          { genres: { some: { genre: { name: { in: keys } } } } },
          { tags: { some: { tag: { name: { in: keys } } } } },
        ],
      },
      select: { id: true },
      take,
    });
    return rows.map((row) => row.id);
  }

  private async byTasteTags(userId: string, type?: TypeFilter, take = 160): Promise<string[]> {
    const prefs = await this.prisma.client.tastePreference.findMany({
      where: { userId, featureType: { in: ['TAG', 'THEME'] }, weight: { gt: 0.1 } },
      orderBy: { weight: 'desc' },
      take: 12,
    });
    if (prefs.length === 0) {
      return [];
    }
    const keys = expandCrossMediaKeys(prefs.map((p) => p.featureKey));
    const rows = await this.prisma.client.mediaItem.findMany({
      where: {
        ...this.typeWhere(type),
        OR: [
          { tags: { some: { tag: { name: { in: keys } } } } },
          { genres: { some: { genre: { name: { in: keys } } } } },
        ],
      },
      select: { id: true },
      take,
    });
    return rows.map((row) => row.id);
  }

  private async popular(type?: TypeFilter): Promise<string[]> {
    const rows = await this.prisma.client.mediaItem.findMany({
      where: this.typeWhere(type),
      orderBy: { popularity: 'desc' },
      take: 80,
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  private async hiddenGems(type?: TypeFilter, take = 80): Promise<string[]> {
    const rows = await this.prisma.client.mediaItem.findMany({
      where: {
        ...this.typeWhere(type),
        popularity: { lt: 0.55 },
        qualityScore: { gt: 0.78 },
      },
      orderBy: { qualityScore: 'desc' },
      take,
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  private async deepCuts(type?: TypeFilter): Promise<string[]> {
    const rows = await this.prisma.client.mediaItem.findMany({
      where: {
        ...this.typeWhere(type),
        popularity: { lt: 0.4 },
        qualityScore: { gt: 0.65 },
      },
      orderBy: [{ popularity: 'asc' }, { qualityScore: 'desc' }],
      take: 160,
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  private async explore(type?: TypeFilter, excludeId?: string, take = 60): Promise<string[]> {
    const rows = await this.prisma.client.mediaItem.findMany({
      where: {
        ...this.typeWhere(type),
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      orderBy: { qualityScore: 'desc' },
      take,
      select: { id: true },
    });
    return rows.map((row) => row.id);
  }

  private typeWhere(type?: TypeFilter): { type?: MediaType | { in: MediaType[] } } {
    if (!type) {
      return {};
    }
    if (Array.isArray(type)) {
      return { type: { in: type } };
    }
    return { type };
  }

  private takeUnique(ids: string[]): string[] {
    return [...new Set(ids)].slice(0, PIPELINE.candidatePoolSize);
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { ALGORITHM_VERSION, PIPELINE, SCORING_WEIGHTS } from '@recommendation-genie/config';
import type { GenerateRecommendationsInput } from '@recommendation-genie/types';
import { CacheService } from '../../common/cache/cache.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { AiService } from '../ai/ai.service';
import { MediaService } from '../media/media.service';
import { TasteService } from '../taste/taste.service';
import { CandidateGenerationService } from './candidate-generation.service';
import { combineScores, mmrSelect, normalize01, weightsForMode } from './scoring';

@Injectable()
export class RecommendationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly candidates: CandidateGenerationService,
    private readonly taste: TasteService,
    private readonly media: MediaService,
    private readonly ai: AiService,
    private readonly cache: CacheService,
    private readonly analytics: AnalyticsService,
  ) {}

  async generate(userId: string, input: GenerateRecommendationsInput) {
    const blocked = await this.blockedIds(userId);
    const candidateIds = (await this.candidates.generate(userId, input)).filter((id) => !blocked.has(id));
    const items = await this.prisma.client.mediaItem.findMany({
      where: { id: { in: candidateIds } },
      include: this.media.cardInclude(),
    });
    const { profile, features } = await this.taste.getProfile(userId);
    const weights = weightsForMode(input.mode, SCORING_WEIGHTS);
    const liked = await this.prisma.client.userMediaInteraction.findMany({
      where: { userId, type: { in: ['LIKE', 'LOVE'] } },
      include: { mediaItem: true },
      take: 20,
    });
    const genreWeights = new Map(
      features.filter((f) => f.featureType === 'GENRE').map((f) => [f.featureKey, f.weight]),
    );
    const creatorWeights = new Map(
      features.filter((f) => f.featureType === 'CREATOR').map((f) => [f.featureKey, f.weight]),
    );
    const tagWeights = new Map(
      features.filter((f) => f.featureType === 'TAG').map((f) => [f.featureKey, f.weight]),
    );
    const themeWeights = new Map(
      features.filter((f) => f.featureType === 'THEME').map((f) => [f.featureKey, f.weight]),
    );
    const mediaTypeWeights = new Map(
      features.filter((f) => f.featureType === 'MEDIA_TYPE').map((f) => [f.featureKey, f.weight]),
    );

    const scored = items.map((item) => {
      const genres = item.genres.map((g) => g.genre.name);
      const tags = item.tags.map((t) => t.tag.name);
      const creators = item.people.map((p) => p.person.name);
      const themeKeys = [...genres, ...tags];
      const content = this.avg([
        this.featureScore(genres, genreWeights),
        this.featureScore(tags, tagWeights),
        this.featureScore(themeKeys, themeWeights),
      ]);
      const tasteScore = this.avg([
        1 - Math.abs(item.complexity - profile.complexity) / 2,
        1 - Math.abs(item.darkness - profile.darkness) / 2,
        1 - Math.abs(item.pacing - profile.pacing) / 2,
        this.featureScore(genres, genreWeights),
        this.featureScore(themeKeys, themeWeights),
        this.featureScore([item.type], mediaTypeWeights),
      ]);
      const feedback = this.featureScore([...tags, ...themeKeys], new Map([...tagWeights, ...themeWeights]));
      const creator = this.featureScore(creators, creatorWeights);
      const quality = item.qualityScore;
      const novelty = 1 - item.popularity;
      const exploration = input.mode === 'SURPRISE_ME' ? novelty : novelty * PIPELINE.explorationRatio;
      const parts = {
        content: normalize01(content),
        taste: normalize01(tasteScore, 0, 1),
        feedback: normalize01(feedback),
        creator: normalize01(creator),
        quality,
        exploration,
        novelty,
      };
      return {
        mediaId: item.id,
        ...parts,
        ai: null as number | null,
        final: combineScores(parts, weights),
        item,
      };
    });

    scored.sort((a, b) => b.final - a.final);
    const top = scored.slice(0, PIPELINE.scoredPoolSize);

    const reranked = await this.ai.rerank({
      userId,
      tasteSummary: this.tasteSummary(profile, features),
      positives: features.filter((f) => f.weight > 0.3).map((f) => f.featureKey),
      negatives: features.filter((f) => f.weight < -0.3).map((f) => f.featureKey),
      candidates: top.slice(0, PIPELINE.aiRerankSize).map((row) => ({
        id: row.mediaId,
        title: row.item.title,
        type: row.item.type,
        genres: row.item.genres.map((g) => g.genre.name),
        score: row.final,
      })),
    });

    const aiScores = new Map(reranked.map((row) => [row.mediaId, row]));
    for (const row of top) {
      const aiRow = aiScores.get(row.mediaId);
      if (aiRow) {
        row.ai = aiRow.aiScore;
        row.final = row.final * 0.75 + aiRow.aiScore * 0.25;
      }
    }

    const diversified = mmrSelect(top, (a, b) => this.similarity(items, a, b), input.count);
    const likedTitles = liked.map((row) => row.mediaItem.title);

    const generation = await this.prisma.client.recommendationGeneration.create({
      data: {
        userId,
        algorithmVersion: ALGORITHM_VERSION,
        mode: input.mode,
        candidateCount: candidateIds.length,
        scoringWeights: weights,
        mood: input.mood,
        items: {
          create: await Promise.all(
            diversified.map(async (row, index) => {
              const explanationKey = `explain:${userId}:${row.mediaId}:${ALGORITHM_VERSION}`;
              const cached = await this.cache.get<string>(explanationKey);
              const explanation =
                cached ??
                (await this.ai.explain({
                  userId,
                  title: row.item.title,
                  genres: row.item.genres.map((g) => g.genre.name),
                  likedTitles,
                  scores: {
                    content: row.content,
                    taste: row.taste,
                    feedback: row.feedback,
                    quality: row.quality,
                    novelty: row.novelty,
                  },
                }));
              if (!cached) {
                await this.cache.set(explanationKey, explanation, 1000 * 60 * 60 * 12);
              }
              return {
                mediaItemId: row.mediaId,
                rank: index + 1,
                finalScore: row.final,
                contentScore: row.content,
                tasteScore: row.taste,
                feedbackScore: row.feedback,
                creatorScore: row.creator,
                qualityScore: row.quality,
                noveltyScore: row.novelty,
                aiScore: row.ai,
                explanation,
                reason: `Genie thinks this could be a strong match because of ${row.item.genres[0]?.genre.name ?? 'your taste profile'}.`,
              };
            }),
          ),
        },
      },
      include: { items: { include: { mediaItem: { include: this.media.cardInclude() } }, orderBy: { rank: 'asc' } } },
    });

    await this.taste.snapshot(userId);
    await this.analytics.track({
      userId,
      eventName: 'recommendation.generated',
      generationId: generation.id,
      payload: { mode: input.mode, candidateCount: candidateIds.length },
    });
    return this.serializeGeneration(generation);
  }

  async latest(userId: string) {
    const generation = await this.prisma.client.recommendationGeneration.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { mediaItem: { include: this.media.cardInclude() } }, orderBy: { rank: 'asc' } } },
    });
    return generation ? this.serializeGeneration(generation) : { items: [] };
  }

  async history(userId: string) {
    const rows = await this.prisma.client.recommendationGeneration.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { items: { include: { mediaItem: { include: this.media.cardInclude() } }, orderBy: { rank: 'asc' } } },
    });
    return rows.map((row) => this.serializeGeneration(row));
  }

  async getById(userId: string, id: string) {
    const generation = await this.prisma.client.recommendationGeneration.findFirst({
      where: { id, userId },
      include: { items: { include: { mediaItem: { include: this.media.cardInclude() } }, orderBy: { rank: 'asc' } } },
    });
    if (!generation) {
      throw new NotFoundException({ code: 'GENERATION_NOT_FOUND', message: 'Recommendation not found' });
    }
    return this.serializeGeneration(generation);
  }

  async matchForMedia(userId: string, mediaItemId: string) {
    const item = await this.prisma.client.mediaItem.findUnique({
      where: { id: mediaItemId },
      include: this.media.cardInclude(),
    });
    if (!item) {
      throw new NotFoundException({ code: 'MEDIA_NOT_FOUND', message: 'Media item not found' });
    }
    const { profile, features } = await this.taste.getProfile(userId);
    const genreWeights = new Map(
      features.filter((f) => f.featureType === 'GENRE').map((f) => [f.featureKey, f.weight]),
    );
    const content = this.featureScore(
      item.genres.map((g) => g.genre.name),
      genreWeights,
    );
    const tasteScore = 1 - Math.abs(item.complexity - profile.complexity) / 2;
    return {
      media: this.media.toCard(item),
      scores: {
        content: normalize01(content),
        taste: normalize01(tasteScore, 0, 1),
        feedback: 0.5,
        quality: item.qualityScore,
        novelty: 1 - item.popularity,
      },
    };
  }

  private serializeGeneration(generation: {
    id: string;
    algorithmVersion: string;
    mode: string;
    createdAt: Date;
    items: Array<{
      id: string;
      rank: number;
      finalScore: number;
      contentScore: number;
      tasteScore: number;
      feedbackScore: number;
      creatorScore: number;
      qualityScore: number;
      noveltyScore: number;
      aiScore: number | null;
      explanation: string | null;
      reason: string | null;
      mediaItem: Parameters<MediaService['toCard']>[0];
    }>;
  }) {
    return {
      id: generation.id,
      algorithmVersion: generation.algorithmVersion,
      mode: generation.mode,
      createdAt: generation.createdAt,
      items: generation.items.map((item) => ({
        id: item.id,
        rank: item.rank,
        media: this.media.toCard(item.mediaItem),
        scores: {
          content: item.contentScore,
          taste: item.tasteScore,
          feedback: item.feedbackScore,
          creator: item.creatorScore,
          quality: item.qualityScore,
          novelty: item.noveltyScore,
          ai: item.aiScore,
          final: item.finalScore,
        },
        explanation: item.explanation,
        reason: item.reason,
      })),
    };
  }

  private async blockedIds(userId: string): Promise<Set<string>> {
    const rows = await this.prisma.client.userMediaInteraction.findMany({
      where: { userId, type: { in: ['NOT_INTERESTED', 'DISLIKE'] } },
      select: { mediaItemId: true },
    });
    return new Set(rows.map((row) => row.mediaItemId));
  }

  private featureScore(keys: string[], weights: Map<string, number>): number {
    if (keys.length === 0) {
      return 0;
    }
    const values = keys.map((key) => weights.get(key) ?? 0);
    return values.reduce((sum, n) => sum + n, 0) / keys.length;
  }

  private avg(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }
    return values.reduce((sum, n) => sum + n, 0) / values.length;
  }

  private similarity(
    items: Array<{ id: string; genres: Array<{ genre: { name: string } }>; people: Array<{ person: { name: string } }> }>,
    a: string,
    b: string,
  ): number {
    const left = items.find((item) => item.id === a);
    const right = items.find((item) => item.id === b);
    if (!left || !right) {
      return 0;
    }
    const leftGenres = new Set(left.genres.map((g) => g.genre.name));
    const rightGenres = right.genres.map((g) => g.genre.name);
    const overlap = rightGenres.filter((g) => leftGenres.has(g)).length;
    const creatorOverlap = left.people.some((p) => right.people.some((q) => q.person.name === p.person.name)) ? 0.4 : 0;
    return Math.min(1, overlap / Math.max(1, leftGenres.size) + creatorOverlap);
  }

  private tasteSummary(
    profile: { complexity: number; darkness: number; novelty: number },
    features: Array<{ featureType: string; featureKey: string; weight: number }>,
  ): string {
    const top = features
      .filter((f) => f.weight > 0.2)
      .slice(0, 8)
      .map((f) => `${f.featureKey} (${f.weight.toFixed(2)})`);
    return `complexity=${profile.complexity.toFixed(2)} darkness=${profile.darkness.toFixed(2)} novelty=${profile.novelty.toFixed(2)} features=${top.join(', ')}`;
  }
}

import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { ALGORITHM_VERSION, PIPELINE } from '@recommendation-genie/config';
import type { GenerateRecommendationsInput } from '@recommendation-genie/types';
import { CacheService } from '../../common/cache/cache.service';
import { JOB_QUEUE } from '../../common/jobs/jobs.module';
import type { JobQueue } from '../../common/jobs/job-queue';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { AiService } from '../ai/ai.service';
import { MediaService } from '../media/media.service';
import { TasteService } from '../taste/taste.service';
import { CandidateGenerationService } from './candidate-generation.service';
import { RecommendationConfigService } from './recommendation-config.service';
import { combineScores, mmrSelect, moodAlignment, normalize01, weightsForMode } from './scoring';

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
    private readonly config: RecommendationConfigService,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
  ) {}

  async generate(userId: string, input: GenerateRecommendationsInput) {
    const blocked = await this.blockedIds(userId, input.mode);
    const candidateIds = (await this.candidates.generate(userId, input)).filter((id) => !blocked.has(id));
    const items = await this.prisma.client.mediaItem.findMany({
      where: {
        id: { in: candidateIds },
        ...(input.language ? { language: input.language } : {}),
        ...(input.timeAvailableMinutes
          ? {
              OR: [
                { runtimeMinutes: null },
                { runtimeMinutes: { lte: input.timeAvailableMinutes } },
              ],
            }
          : {}),
      },
      include: this.media.cardInclude(),
    });
    const { profile, features } = await this.taste.getProfile(userId);
    const baseWeights = await this.config.getActiveWeights();
    const weights = weightsForMode(input.mode, baseWeights);
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
    const pacingWeights = new Map(
      features.filter((f) => f.featureType === 'PACING').map((f) => [f.featureKey, f.weight]),
    );

    const scored = items.map((item) => {
      const genres = item.genres.map((g) => g.genre.name);
      const tags = item.tags.map((t) => t.tag.name);
      const creators = item.people.map((p) => p.person.name);
      const themeKeys = [...genres, ...tags];
      const pacingKeys = this.pacingKeys(item.pacing);
      const content = this.avg([
        this.featureScore(genres, genreWeights),
        this.featureScore(tags, tagWeights),
        this.featureScore(themeKeys, themeWeights),
        this.featureScore(pacingKeys, pacingWeights),
      ]);
      const tasteParts = [
        1 - Math.abs(item.complexity - profile.complexity) / 2,
        1 - Math.abs(item.darkness - profile.darkness) / 2,
        1 - Math.abs(item.pacing - profile.pacing) / 2,
        this.featureScore(genres, genreWeights),
        this.featureScore(themeKeys, themeWeights),
        this.featureScore([item.type], mediaTypeWeights),
        this.featureScore(pacingKeys, pacingWeights),
      ];
      if (input.mood) {
        tasteParts.push(
          moodAlignment(input.mood, {
            darkness: item.darkness,
            pacing: item.pacing,
            emotionalIntensity: item.emotionalIntensity,
            complexity: item.complexity,
          }),
        );
      }
      const tasteScore = this.avg(tasteParts);
      const feedback = this.featureScore([...tags, ...themeKeys], new Map([...tagWeights, ...themeWeights]));
      const creator = this.featureScore(creators, creatorWeights);
      const quality = item.qualityScore;
      const novelty = 1 - item.popularity;
      const exploration =
        input.mode === 'SURPRISE_ME' || input.mode === 'DEEP_CUTS'
          ? novelty
          : novelty * PIPELINE.explorationRatio;
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
          create: diversified.map((row, index) => {
            const reason = `Genie thinks this could be a strong match because of ${row.item.genres[0]?.genre.name ?? 'your taste profile'}.`;
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
              explorationScore: row.exploration,
              aiScore: row.ai,
              explanation: reason,
              reason,
            };
          }),
        },
      },
      include: { items: { include: { mediaItem: { include: this.media.cardInclude() } }, orderBy: { rank: 'asc' } } },
    });

    for (const item of generation.items) {
      const row = diversified.find((candidate) => candidate.mediaId === item.mediaItemId);
      if (!row) {
        continue;
      }
      const explanationKey = `explain:${userId}:${item.mediaItemId}:${ALGORITHM_VERSION}`;
      void this.jobs.enqueue('generate-ai-explanation', {
        userId,
        recommendationItemId: item.id,
        cacheKey: explanationKey,
        title: row.item.title,
        genres: row.item.genres.map((g) => g.genre.name),
        likedTitles,
        scores: {
          content: row.content,
          taste: row.taste,
          feedback: row.feedback,
          quality: row.quality,
          novelty: row.novelty,
          exploration: row.exploration,
        },
      });
    }

    await this.taste.snapshot(userId);
    await this.analytics.track({
      userId,
      eventName: 'recommendation.generated',
      generationId: generation.id,
      payload: { mode: input.mode, candidateCount: candidateIds.length },
    });
    return this.serializeGeneration(generation);
  }

  async latest(userId: string, mode: GenerateRecommendationsInput['mode'] = 'FOR_YOU') {
    const generation = await this.prisma.client.recommendationGeneration.findFirst({
      where: { userId, mode },
      orderBy: { createdAt: 'desc' },
      include: { items: { include: { mediaItem: { include: this.media.cardInclude() } }, orderBy: { rank: 'asc' } } },
    });
    return generation ? this.serializeGeneration(generation) : { items: [] };
  }

  async history(userId: string, cursor?: string, limit = 10) {
    const rows = await this.prisma.client.recommendationGeneration.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { items: { include: { mediaItem: { include: this.media.cardInclude() } }, orderBy: { rank: 'asc' } } },
    });
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    return {
      items: page.map((row) => this.serializeGeneration(row)),
      nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
    };
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
    const baseWeights = await this.config.getActiveWeights();
    const weights = weightsForMode('FOR_YOU', baseWeights);
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
    ]);
    const feedback = this.featureScore([...tags, ...themeKeys], new Map([...tagWeights, ...themeWeights]));
    const creator = this.featureScore(creators, creatorWeights);
    const novelty = 1 - item.popularity;
    const exploration = novelty * PIPELINE.explorationRatio;
    const parts = {
      content: normalize01(content),
      taste: normalize01(tasteScore, 0, 1),
      feedback: normalize01(feedback),
      creator: normalize01(creator),
      quality: item.qualityScore,
      exploration,
      novelty,
    };
    return {
      media: this.media.toCard(item),
      scores: {
        ...parts,
        final: combineScores(parts, weights),
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
      explorationScore: number;
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
          exploration: item.explorationScore,
          ai: item.aiScore,
          final: item.finalScore,
        },
        explanation: item.explanation,
        reason: item.reason,
      })),
    };
  }

  private async blockedIds(userId: string, mode: GenerateRecommendationsInput['mode']): Promise<Set<string>> {
    // SHORTLIST is intentionally the saved list — do not exclude SAVE there.
    const types =
      mode === 'SHORTLIST'
        ? (['NOT_INTERESTED', 'DISLIKE', 'CONSUMED'] as const)
        : (['NOT_INTERESTED', 'DISLIKE', 'CONSUMED', 'LIKE', 'LOVE', 'SAVE'] as const);
    const rows = await this.prisma.client.userMediaInteraction.findMany({
      where: { userId, type: { in: [...types] } },
      select: { mediaItemId: true },
    });
    const blocked = new Set(rows.map((row) => row.mediaItemId));

    if (mode !== 'SHORTLIST') {
      const saved = await this.prisma.client.savedItem.findMany({
        where: { userId },
        select: { mediaItemId: true },
      });
      for (const row of saved) {
        blocked.add(row.mediaItemId);
      }
      const consumed = await this.prisma.client.consumptionHistory.findMany({
        where: { userId },
        select: { mediaItemId: true },
      });
      for (const row of consumed) {
        blocked.add(row.mediaItemId);
      }
    }

    return blocked;
  }

  private pacingKeys(pacing: number): string[] {
    if (pacing <= -0.25) {
      return ['slow'];
    }
    if (pacing >= 0.25) {
      return ['fast'];
    }
    return ['medium'];
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

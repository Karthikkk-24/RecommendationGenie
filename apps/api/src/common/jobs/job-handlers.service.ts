import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import type { GenerateRecommendationsInput } from '@recommendation-genie/types';
import { CacheService } from '../../common/cache/cache.service';
import { JOB_QUEUE } from './jobs.module';
import type { JobQueue } from './job-queue';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../../modules/ai/ai.service';
import { EmbeddingService } from '../../modules/embedding/embedding.service';
import { MediaService } from '../../modules/media/media.service';
import { RecommendationService } from '../../modules/recommendation/recommendation.service';
import { TasteService } from '../../modules/taste/taste.service';

@Injectable()
export class JobHandlersService implements OnModuleInit {
  constructor(
    @Inject(JOB_QUEUE) private readonly queue: JobQueue,
    private readonly embeddings: EmbeddingService,
    private readonly ai: AiService,
    private readonly media: MediaService,
    private readonly recommendations: RecommendationService,
    private readonly taste: TasteService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  onModuleInit(): void {
    this.queue.register<{ userId: string } & Partial<GenerateRecommendationsInput>>(
      'generate-recommendations',
      async (payload) => {
        const { userId, ...input } = payload;
        await this.recommendations.generate(userId, {
          count: 10,
          ...input,
          mode: input.mode ?? 'FOR_YOU',
        });
      },
    );

    this.queue.register<{ userId: string }>('update-taste-profile', async (payload) => {
      await this.taste.snapshot(payload.userId);
      await this.embeddings.embedUserTaste(payload.userId);
    });

    this.queue.register<{ userId: string }>('generate-embedding', async (payload) => {
      await this.embeddings.embedUserTaste(payload.userId);
    });

    this.queue.register<{
      userId: string;
      recommendationItemId: string;
      cacheKey: string;
      title: string;
      genres: string[];
      likedTitles: string[];
      scores: Record<string, number>;
    }>('generate-ai-explanation', async (payload) => {
      const explanation = await this.ai.explain({
        userId: payload.userId,
        title: payload.title,
        genres: payload.genres,
        likedTitles: payload.likedTitles,
        scores: payload.scores,
      });
      await this.cache.set(payload.cacheKey, explanation, 1000 * 60 * 60 * 12);
      await this.prisma.client.recommendationItem.update({
        where: { id: payload.recommendationItemId },
        data: { explanation },
      });
    });

    this.queue.register<{ mediaItemId: string }>('sync-media', async (payload) => {
      await this.media.syncFromProvider(payload.mediaItemId);
      await this.embeddings.embedMedia(payload.mediaItemId);
    });
  }
}

import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { AiService } from '../../modules/ai/ai.service';
import { EmbeddingService } from '../../modules/embedding/embedding.service';
import { JOB_QUEUE } from './jobs.module';
import type { JobQueue } from './job-queue';

@Injectable()
export class JobHandlersService implements OnModuleInit {
  constructor(
    @Inject(JOB_QUEUE) private readonly queue: JobQueue,
    private readonly embeddings: EmbeddingService,
    private readonly ai: AiService,
  ) {}

  onModuleInit(): void {
    this.queue.register<{ userId: string }>('generate-embedding', async (payload) => {
      await this.embeddings.embedUserTaste(payload.userId);
    });

    this.queue.register<{
      userId: string;
      title: string;
      genres: string[];
      likedTitles: string[];
      scores: Record<string, number>;
    }>('generate-ai-explanation', async (payload) => {
      await this.ai.explain({
        userId: payload.userId,
        title: payload.title,
        genres: payload.genres,
        likedTitles: payload.likedTitles,
        scores: payload.scores,
      });
    });

    this.queue.register<{ mediaItemId: string }>('sync-media', async (payload) => {
      await this.embeddings.embedMedia(payload.mediaItemId);
    });
  }
}

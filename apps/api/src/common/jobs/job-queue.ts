import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type JobName =
  | 'generate-recommendations'
  | 'generate-embedding'
  | 'sync-media'
  | 'generate-ai-explanation'
  | 'rerank-recommendations'
  | 'update-taste-profile'
  | 'send-recommendation-email'
  | 'send-digest-emails'
  | 'send-product-update-emails'
  | 'backfill-media-embeddings';

export type JobHandler<T = unknown> = (payload: T) => Promise<void>;

export interface JobQueue {
  enqueue<T>(name: JobName, payload: T): Promise<void>;
  register<T>(name: JobName, handler: JobHandler<T>): void;
}

const MAX_ATTEMPTS = 3;
const DEAD_LETTER_EVENT = 'job.failed';

@Injectable()
export class InlineJobQueue implements JobQueue {
  private readonly logger = new Logger(InlineJobQueue.name);
  private readonly handlers = new Map<JobName, JobHandler>();

  constructor(private readonly prisma: PrismaService) {}

  register<T>(name: JobName, handler: JobHandler<T>): void {
    this.handlers.set(name, handler as JobHandler);
  }

  async enqueue<T>(name: JobName, payload: T): Promise<void> {
    const handler = this.handlers.get(name);
    if (!handler) {
      this.logger.warn(`No handler registered for job ${name}`);
      return;
    }

    const run = async (attempt: number): Promise<void> => {
      try {
        await handler(payload);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'unknown error';
        if (attempt >= MAX_ATTEMPTS) {
          this.logger.error(`Job ${name} failed after ${MAX_ATTEMPTS} attempts: ${message}`);
          await this.recordDeadLetter(name, payload, message);
          return;
        }
        const delayMs = 250 * 2 ** (attempt - 1);
        this.logger.warn(`Job ${name} attempt ${attempt} failed (${message}); retrying in ${delayMs}ms`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        await run(attempt + 1);
      }
    };

    // Fire-and-forget so request paths stay fast; retries stay in-process.
    setImmediate(() => {
      void run(1);
    });
  }

  /** Persist permanent failures for admin/ops visibility (survives process restarts). */
  private async recordDeadLetter(name: JobName, payload: unknown, message: string): Promise<void> {
    try {
      await this.prisma.client.analyticsEvent.create({
        data: {
          eventName: DEAD_LETTER_EVENT,
          payload: JSON.parse(
            JSON.stringify({
              jobName: name,
              attempts: MAX_ATTEMPTS,
              message,
              payload,
              failedAt: new Date().toISOString(),
            }),
          ),
        },
      });
    } catch (error: unknown) {
      this.logger.error(
        `Failed to persist dead-letter for ${name}: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}

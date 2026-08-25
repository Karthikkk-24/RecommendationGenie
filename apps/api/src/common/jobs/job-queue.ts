import { Injectable, Logger } from '@nestjs/common';

export type JobName =
  | 'generate-recommendations'
  | 'generate-embedding'
  | 'sync-media'
  | 'generate-ai-explanation'
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

@Injectable()
export class InlineJobQueue implements JobQueue {
  private readonly logger = new Logger(InlineJobQueue.name);
  private readonly handlers = new Map<JobName, JobHandler>();

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
}

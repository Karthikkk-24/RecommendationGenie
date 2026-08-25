import { Injectable, Logger } from '@nestjs/common';

export type JobName =
  | 'generate-recommendations'
  | 'generate-embedding'
  | 'sync-media'
  | 'generate-ai-explanation'
  | 'update-taste-profile'
  | 'send-recommendation-email'
  | 'send-digest-emails'
  | 'send-product-update-emails';

export type JobHandler<T = unknown> = (payload: T) => Promise<void>;

export interface JobQueue {
  enqueue<T>(name: JobName, payload: T): Promise<void>;
  register<T>(name: JobName, handler: JobHandler<T>): void;
}

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
    // Fire-and-forget so request paths stay fast; errors are logged.
    setImmediate(() => {
      void handler(payload).catch((error: unknown) => {
        this.logger.error(
          `Job ${name} failed: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      });
    });
  }
}

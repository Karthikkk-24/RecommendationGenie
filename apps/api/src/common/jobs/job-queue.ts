export type JobName =
  | 'generate-recommendations'
  | 'generate-embedding'
  | 'sync-media'
  | 'generate-ai-explanation'
  | 'update-taste-profile';

export interface JobQueue {
  enqueue<T>(name: JobName, payload: T): Promise<void>;
}

export class InlineJobQueue implements JobQueue {
  async enqueue<T>(name: JobName, payload: T): Promise<void> {
    await Promise.resolve({ name, payload });
  }
}

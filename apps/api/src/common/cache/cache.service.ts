import { Injectable } from '@nestjs/common';
import { MemoryCacheStore, type CacheStore } from './cache-store';

@Injectable()
export class CacheService {
  constructor(private readonly store: CacheStore) {}

  get<T>(key: string): Promise<T | null> {
    return this.store.get<T>(key);
  }

  set(key: string, value: unknown, ttlMs = 1000 * 60 * 10): Promise<void> {
    return this.store.set(key, value, ttlMs);
  }

  delete(key: string): Promise<void> {
    return this.store.delete(key);
  }
}

export const CACHE_STORE = 'CACHE_STORE';

export const memoryCacheProvider = {
  provide: CACHE_STORE,
  useClass: MemoryCacheStore,
};

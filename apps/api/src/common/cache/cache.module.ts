import { Global, Module } from '@nestjs/common';
import { MemoryCacheStore } from './cache-store';
import { CACHE_STORE, CacheService } from './cache.service';

@Global()
@Module({
  providers: [
    { provide: CACHE_STORE, useClass: MemoryCacheStore },
    {
      provide: CacheService,
      useFactory: (store: MemoryCacheStore) => new CacheService(store),
      inject: [CACHE_STORE],
    },
  ],
  exports: [CacheService],
})
export class CacheModule {}

import { Global, Module } from '@nestjs/common';
import { CACHE_STORE, CacheService } from './cache.service';
import { PrismaCacheStore } from './prisma-cache.store';

@Global()
@Module({
  providers: [
    PrismaCacheStore,
    { provide: CACHE_STORE, useExisting: PrismaCacheStore },
    {
      provide: CacheService,
      useFactory: (store: PrismaCacheStore) => new CacheService(store),
      inject: [CACHE_STORE],
    },
  ],
  exports: [CacheService],
})
export class CacheModule {}

import { Injectable } from '@nestjs/common';
import type { Prisma } from '@recommendation-genie/prisma';
import { PrismaService } from '../prisma/prisma.service';
import type { CacheStore } from './cache-store';

@Injectable()
export class PrismaCacheStore implements CacheStore {
  constructor(private readonly prisma: PrismaService) {}

  async get<T>(key: string): Promise<T | null> {
    const row = await this.prisma.client.cacheEntry.findUnique({ where: { key } });
    if (!row) {
      return null;
    }
    if (row.expiresAt.getTime() < Date.now()) {
      await this.prisma.client.cacheEntry.delete({ where: { key } }).catch(() => undefined);
      return null;
    }
    return row.value as T;
  }

  async set(key: string, value: unknown, ttlMs: number): Promise<void> {
    const expiresAt = new Date(Date.now() + ttlMs);
    await this.prisma.client.cacheEntry.upsert({
      where: { key },
      create: {
        key,
        value: value as Prisma.InputJsonValue,
        expiresAt,
      },
      update: {
        value: value as Prisma.InputJsonValue,
        expiresAt,
      },
    });
  }

  async delete(key: string): Promise<void> {
    await this.prisma.client.cacheEntry.deleteMany({ where: { key } });
  }
}

import { Injectable } from '@nestjs/common';
import type { LibraryFilter, LibrarySort, MediaType } from '@recommendation-genie/types';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MediaService } from '../media/media.service';

type Card = ReturnType<MediaService['toCard']>;

@Injectable()
export class LibraryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  async list(userId: string, filter: LibraryFilter, type?: MediaType, sort: LibrarySort = 'RECENTLY_ADDED') {
    const typeFilter = type ? { type } : {};

    if (filter === 'SAVED') {
      const rows = await this.prisma.client.savedItem.findMany({
        where: { userId, mediaItem: typeFilter },
        include: { mediaItem: { include: this.media.cardInclude() } },
        orderBy: { createdAt: 'desc' },
      });
      const items = rows.map((row) => ({
        card: this.media.toCard(row.mediaItem),
        addedAt: row.createdAt.getTime(),
        mediaItemId: row.mediaItemId,
      }));
      return this.applySort(userId, items, sort);
    }

    const interactionType =
      filter === 'LOVED'
        ? 'LOVE'
        : filter === 'LIKED'
          ? 'LIKE'
          : filter === 'CONSUMED'
            ? 'CONSUMED'
            : filter === 'REJECTED'
              ? 'DISLIKE'
              : undefined;

    const rows = await this.prisma.client.userMediaInteraction.findMany({
      where: {
        userId,
        ...(interactionType ? { type: interactionType } : {}),
        mediaItem: typeFilter,
      },
      include: { mediaItem: { include: this.media.cardInclude() } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const unique = new Map<string, { card: Card; addedAt: number; mediaItemId: string }>();
    for (const row of rows) {
      if (!unique.has(row.mediaItemId)) {
        unique.set(row.mediaItemId, {
          card: this.media.toCard(row.mediaItem),
          addedAt: row.createdAt.getTime(),
          mediaItemId: row.mediaItemId,
        });
      }
    }
    return this.applySort(userId, [...unique.values()], sort);
  }

  private async applySort(
    userId: string,
    items: Array<{ card: Card; addedAt: number; mediaItemId: string }>,
    sort: LibrarySort,
  ): Promise<Card[]> {
    if (items.length === 0) {
      return [];
    }

    if (sort === 'ALPHABETICAL') {
      return [...items].sort((a, b) => a.card.title.localeCompare(b.card.title)).map((row) => row.card);
    }

    if (sort === 'HIGHEST_RATED') {
      const ratings = await this.prisma.client.userMediaRating.findMany({
        where: { userId, mediaItemId: { in: items.map((row) => row.mediaItemId) } },
        select: { mediaItemId: true, rating: true },
      });
      const byId = new Map(ratings.map((row) => [row.mediaItemId, row.rating]));
      return [...items]
        .sort((a, b) => {
          const ratingDiff = (byId.get(b.mediaItemId) ?? 0) - (byId.get(a.mediaItemId) ?? 0);
          if (ratingDiff !== 0) {
            return ratingDiff;
          }
          return b.addedAt - a.addedAt;
        })
        .map((row) => row.card);
    }

    if (sort === 'RECENTLY_CONSUMED') {
      const consumption = await this.prisma.client.consumptionHistory.findMany({
        where: { userId, mediaItemId: { in: items.map((row) => row.mediaItemId) } },
        select: { mediaItemId: true, consumedAt: true },
        orderBy: { consumedAt: 'desc' },
      });
      const byId = new Map<string, number>();
      for (const row of consumption) {
        if (!byId.has(row.mediaItemId)) {
          byId.set(row.mediaItemId, row.consumedAt.getTime());
        }
      }
      // Fallback: CONSUMED interactions when no ConsumptionHistory row exists.
      if (byId.size < items.length) {
        const consumed = await this.prisma.client.userMediaInteraction.findMany({
          where: {
            userId,
            type: 'CONSUMED',
            mediaItemId: { in: items.map((row) => row.mediaItemId) },
          },
          select: { mediaItemId: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        });
        for (const row of consumed) {
          if (!byId.has(row.mediaItemId)) {
            byId.set(row.mediaItemId, row.createdAt.getTime());
          }
        }
      }
      return [...items]
        .sort((a, b) => (byId.get(b.mediaItemId) ?? 0) - (byId.get(a.mediaItemId) ?? 0))
        .map((row) => row.card);
    }

    // RECENTLY_ADDED (default)
    return [...items].sort((a, b) => b.addedAt - a.addedAt).map((row) => row.card);
  }

  async add(userId: string, mediaItemId: string) {
    return this.prisma.client.savedItem.upsert({
      where: { userId_mediaItemId: { userId, mediaItemId } },
      update: {},
      create: { userId, mediaItemId },
    });
  }

  async remove(userId: string, mediaItemId: string) {
    await this.prisma.client.savedItem.deleteMany({ where: { userId, mediaItemId } });
    return { ok: true };
  }
}

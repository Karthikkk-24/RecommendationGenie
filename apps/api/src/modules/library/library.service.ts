import { Injectable } from '@nestjs/common';
import type { LibraryFilter, LibrarySort, MediaType } from '@recommendation-genie/types';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MediaService } from '../media/media.service';

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
      return rows.map((row) => this.media.toCard(row.mediaItem));
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

    const unique = new Map<string, (typeof rows)[number]['mediaItem']>();
    for (const row of rows) {
      if (!unique.has(row.mediaItemId)) {
        unique.set(row.mediaItemId, row.mediaItem);
      }
    }
    let items = [...unique.values()].map((item) => this.media.toCard(item));
    if (sort === 'ALPHABETICAL') {
      items = items.sort((a, b) => a.title.localeCompare(b.title));
    }
    return items;
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

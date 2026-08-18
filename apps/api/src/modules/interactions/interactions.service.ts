import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TasteService } from '../taste/taste.service';
import { AnalyticsService } from '../analytics/analytics.service';
import type { CreateInteractionDto } from './dto/create-interaction.dto';

@Injectable()
export class InteractionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taste: TasteService,
    private readonly analytics: AnalyticsService,
  ) {}

  async create(userId: string, dto: CreateInteractionDto) {
    const interaction = await this.prisma.client.userMediaInteraction.create({
      data: {
        userId,
        mediaItemId: dto.mediaItemId,
        type: dto.type,
        recommendationItemId: dto.recommendationItemId,
      },
    });

    if (dto.type === 'RATED' && dto.rating) {
      await this.prisma.client.userMediaRating.upsert({
        where: { userId_mediaItemId: { userId, mediaItemId: dto.mediaItemId } },
        update: { rating: dto.rating },
        create: { userId, mediaItemId: dto.mediaItemId, rating: dto.rating },
      });
    }

    if (dto.type === 'SAVE') {
      await this.prisma.client.savedItem.upsert({
        where: { userId_mediaItemId: { userId, mediaItemId: dto.mediaItemId } },
        update: {},
        create: { userId, mediaItemId: dto.mediaItemId },
      });
    }

    if (dto.type === 'CONSUMED') {
      await this.prisma.client.consumptionHistory.create({
        data: { userId, mediaItemId: dto.mediaItemId },
      });
    }

    await this.taste.applyInteraction({
      userId,
      mediaItemId: dto.mediaItemId,
      type: dto.type,
      rating: dto.rating,
    });
    await this.analytics.track({
      userId,
      eventName: `interaction.${dto.type.toLowerCase()}`,
      mediaItemId: dto.mediaItemId,
    });

    return interaction;
  }

  list(userId: string) {
    return this.prisma.client.userMediaInteraction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { mediaItem: true },
    });
  }
}

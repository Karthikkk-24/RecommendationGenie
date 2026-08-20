import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async track(input: {
    userId?: string;
    eventName: string;
    mediaItemId?: string;
    generationId?: string;
    payload?: object;
  }) {
    return this.prisma.client.analyticsEvent.create({
      data: {
        userId: input.userId,
        eventName: input.eventName,
        mediaItemId: input.mediaItemId,
        generationId: input.generationId,
        payload: input.payload,
      },
    });
  }

  async overview(userId: string) {
    const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30);

    const [likeEvents, loveEvents, dislikeEvents, saveEvents, skipEvents, viewEvents, itemImpressions] =
      await Promise.all([
        this.prisma.client.analyticsEvent.count({
          where: { userId, eventName: 'interaction.like', createdAt: { gte: since } },
        }),
        this.prisma.client.analyticsEvent.count({
          where: { userId, eventName: 'interaction.love', createdAt: { gte: since } },
        }),
        this.prisma.client.analyticsEvent.count({
          where: { userId, eventName: 'interaction.dislike', createdAt: { gte: since } },
        }),
        this.prisma.client.analyticsEvent.count({
          where: { userId, eventName: 'interaction.save', createdAt: { gte: since } },
        }),
        this.prisma.client.analyticsEvent.count({
          where: { userId, eventName: 'interaction.skip', createdAt: { gte: since } },
        }),
        this.prisma.client.analyticsEvent.count({
          where: { userId, eventName: 'interaction.view', createdAt: { gte: since } },
        }),
        // Per-item impressions from stored recommendation rows (not generation events).
        this.prisma.client.recommendationItem.count({
          where: { generation: { userId, createdAt: { gte: since } } },
        }),
      ]);

    const likes = likeEvents + loveEvents;
    const dislikes = dislikeEvents;
    const saves = saveEvents;
    const skips = skipEvents;
    const impressions = Math.max(itemImpressions, viewEvents);

    return {
      windowDays: 30,
      likeRate: this.rate(likes, likes + dislikes),
      dislikeRate: this.rate(dislikes, likes + dislikes),
      saveRate: this.rate(saves, impressions || 1),
      skipRate: this.rate(skips, impressions || 1),
      acceptanceRate: this.rate(likes + saves, impressions || 1),
      totals: { likes, dislikes, saves, skips, impressions },
    };
  }

  private rate(num: number, den: number): number {
    if (den === 0) {
      return 0;
    }
    return Number((num / den).toFixed(3));
  }
}

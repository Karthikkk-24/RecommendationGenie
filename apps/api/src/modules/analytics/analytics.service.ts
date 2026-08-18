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
    const events = await this.prisma.client.analyticsEvent.findMany({
      where: { userId },
    });
    const count = (name: string) => events.filter((event: { eventName: string }) => event.eventName === name).length;
    const likes = count('interaction.like') + count('interaction.love');
    const dislikes = count('interaction.dislike');
    const saves = count('interaction.save');
    const skips = count('interaction.skip');
    const impressions = events.filter((event: { eventName: string }) => event.eventName.startsWith('recommendation.')).length;
    return {
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

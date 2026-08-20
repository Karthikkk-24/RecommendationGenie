import { Injectable } from '@nestjs/common';
import type { FeedbackAction, InteractionType } from '@recommendation-genie/types';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InteractionsService } from '../interactions/interactions.service';
import { TasteService } from '../taste/taste.service';
import type { CreateFeedbackDto } from './dto/create-feedback.dto';

const ACTION_TO_INTERACTION: Record<FeedbackAction, InteractionType> = {
  LOVE: 'LOVE',
  LIKE: 'LIKE',
  MAYBE: 'SKIP',
  NOT_FOR_ME: 'DISLIKE',
  NEVER_THIS_TYPE: 'NOT_INTERESTED',
  ALREADY_CONSUMED: 'CONSUMED',
  SAVE: 'SAVE',
};

@Injectable()
export class FeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly interactions: InteractionsService,
    private readonly taste: TasteService,
  ) {}

  async create(userId: string, dto: CreateFeedbackDto) {
    const row = await this.prisma.client.userFeedback.create({
      data: {
        userId,
        mediaItemId: dto.mediaItemId,
        action: dto.action,
        reason: dto.reason,
        otherText: dto.otherText,
        recommendationItemId: dto.recommendationItemId,
      },
    });

    await this.interactions.create(userId, {
      mediaItemId: dto.mediaItemId,
      type: ACTION_TO_INTERACTION[dto.action],
      recommendationItemId: dto.recommendationItemId,
    });

    if (dto.action === 'NEVER_THIS_TYPE') {
      const media = await this.prisma.client.mediaItem.findUnique({
        where: { id: dto.mediaItemId },
        select: { type: true },
      });
      if (media) {
        await this.taste.applyMediaTypeBan(userId, media.type);
      }
    }

    if (dto.reason) {
      await this.taste.applyFeedbackReason(userId, dto.mediaItemId, dto.reason);
    }
    await this.taste.snapshot(userId);
    return row;
  }

  list(userId: string) {
    return this.prisma.client.userFeedback.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }
}

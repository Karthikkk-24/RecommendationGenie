import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { FeedbackAction, InteractionType } from '@recommendation-genie/types';
import { JOB_QUEUE } from '../../common/jobs/jobs.module';
import type { JobQueue } from '../../common/jobs/job-queue';
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
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
  ) {}

  async create(userId: string, dto: CreateFeedbackDto) {
    const media = await this.prisma.client.mediaItem.findUnique({
      where: { id: dto.mediaItemId },
      select: { id: true, type: true },
    });
    if (!media) {
      throw new NotFoundException({ code: 'MEDIA_NOT_FOUND', message: 'Media item not found' });
    }
    if (dto.recommendationItemId) {
      const recommendationItem = await this.prisma.client.recommendationItem.findFirst({
        where: { id: dto.recommendationItemId, generation: { userId } },
        select: { id: true },
      });
      if (!recommendationItem) {
        throw new NotFoundException({
          code: 'RECOMMENDATION_ITEM_NOT_FOUND',
          message: 'Recommendation item not found',
        });
      }
    }

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
      await this.taste.applyMediaTypeBan(userId, media.type);
    }

    if (dto.reason) {
      await this.taste.applyFeedbackReason(userId, dto.mediaItemId, dto.reason);
    }
    await this.jobs.enqueue('update-taste-profile', { userId });
    await this.jobs.enqueue('generate-recommendations', { userId, mode: 'FOR_YOU', count: 10 });
    await this.jobs.enqueue('sync-media', { mediaItemId: dto.mediaItemId });
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

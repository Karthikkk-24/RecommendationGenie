import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';
import { MailService } from '../auth/mail.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async sendRecommendationEmail(userId: string, generationId: string): Promise<void> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      include: { notificationPreference: true },
    });
    if (!user?.notificationPreference?.emailRecommendations) {
      return;
    }

    const generation = await this.prisma.client.recommendationGeneration.findFirst({
      where: { id: generationId, userId },
      include: {
        items: {
          include: { mediaItem: true },
          orderBy: { rank: 'asc' },
          take: 5,
        },
      },
    });
    if (!generation || generation.items.length === 0) {
      return;
    }

    const titles = generation.items.map((item) => `• ${item.mediaItem.title}`).join('\n');
    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
    await this.mail.send(
      user.email,
      'New recommendations from Genie',
      `Here are fresh picks for you:\n\n${titles}\n\nOpen Genie: ${appUrl}/app/recommendations`,
    );
  }

  async sendDigestEmails(): Promise<void> {
    const users = await this.prisma.client.user.findMany({
      where: {
        notificationPreference: { emailDigest: true },
        emailVerifiedAt: { not: null },
      },
      include: { notificationPreference: true },
      take: 200,
    });

    for (const user of users) {
      try {
        const generation = await this.prisma.client.recommendationGeneration.findFirst({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: { mediaItem: true },
              orderBy: { rank: 'asc' },
              take: 5,
            },
          },
        });
        if (!generation || generation.items.length === 0) {
          continue;
        }
        const titles = generation.items.map((item) => `• ${item.mediaItem.title}`).join('\n');
        const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
        await this.mail.send(
          user.email,
          'Your weekly Genie digest',
          `A quick look at recommendations waiting for you:\n\n${titles}\n\nOpen Genie: ${appUrl}/app`,
        );
      } catch (error) {
        this.logger.warn(
          `Digest email failed for ${user.id}: ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
    }
  }

  async sendProductUpdateEmails(message: string): Promise<void> {
    const users = await this.prisma.client.user.findMany({
      where: {
        notificationPreference: { productUpdates: true },
        emailVerifiedAt: { not: null },
      },
      take: 200,
    });
    const appUrl = this.config.get<string>('APP_URL') ?? 'http://localhost:3000';
    for (const user of users) {
      try {
        await this.mail.send(
          user.email,
          'Genie product update',
          `${message}\n\nOpen Genie: ${appUrl}/app`,
        );
      } catch (error) {
        this.logger.warn(
          `Product update email failed for ${user.id}: ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
    }
  }
}

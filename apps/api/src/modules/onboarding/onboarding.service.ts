import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { JOB_QUEUE } from '../../common/jobs/jobs.module';
import type { JobQueue } from '../../common/jobs/job-queue';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InteractionsService } from '../interactions/interactions.service';
import { MediaService } from '../media/media.service';
import { RecommendationService } from '../recommendation/recommendation.service';
import { TasteService } from '../taste/taste.service';
import type {
  OnboardingCalibrateDto,
  OnboardingPreferencesDto,
  OnboardingRatingsDto,
  OnboardingSelectionsDto,
  OnboardingTypesDto,
} from './dto/onboarding.dto';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
    private readonly interactions: InteractionsService,
    private readonly taste: TasteService,
    private readonly recommendations: RecommendationService,
    @Inject(JOB_QUEUE) private readonly jobs: JobQueue,
  ) {}

  async getState(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      include: { preference: true, profile: true },
    });
    const popular = await this.media.popular();
    return {
      onboardingStatus: user?.onboardingStatus,
      preference: user?.preference,
      onboarding: user?.profile?.onboarding ?? null,
      popular,
    };
  }

  private async persistOnboarding(userId: string, patch: Record<string, unknown>) {
    const profile = await this.prisma.client.profile.findUnique({ where: { userId } });
    const existing =
      profile?.onboarding && typeof profile.onboarding === 'object' && !Array.isArray(profile.onboarding)
        ? (profile.onboarding as Record<string, unknown>)
        : {};
    await this.prisma.client.profile.upsert({
      where: { userId },
      update: { onboarding: { ...existing, ...patch, updatedAt: new Date().toISOString() } },
      create: { userId, onboarding: { ...patch, updatedAt: new Date().toISOString() } },
    });
  }

  async setTypes(userId: string, dto: OnboardingTypesDto) {
    await this.prisma.client.user.update({
      where: { id: userId },
      data: { onboardingStatus: 'IN_PROGRESS' },
    });
    const preference = await this.prisma.client.userPreference.upsert({
      where: { userId },
      update: { enabledMediaTypes: dto.mediaTypes },
      create: { userId, enabledMediaTypes: dto.mediaTypes },
    });
    await this.persistOnboarding(userId, { step: 1, mediaTypes: dto.mediaTypes });
    return preference;
  }

  async select(userId: string, dto: OnboardingSelectionsDto) {
    for (const mediaItemId of dto.mediaItemIds) {
      await this.interactions.create(userId, { mediaItemId, type: 'LIKE' });
    }
    await this.persistOnboarding(userId, { step: 2, selections: dto.mediaItemIds });
    return { count: dto.mediaItemIds.length };
  }

  async rate(userId: string, dto: OnboardingRatingsDto) {
    for (const row of dto.ratings) {
      await this.interactions.create(userId, {
        mediaItemId: row.mediaItemId,
        type: 'RATED',
        rating: row.rating,
      });
    }
    await this.persistOnboarding(userId, {
      step: 3,
      ratings: Object.fromEntries(dto.ratings.map((row) => [row.mediaItemId, row.rating])),
    });
    return { count: dto.ratings.length };
  }

  async preferences(userId: string, dto: OnboardingPreferencesDto) {
    const preference = await this.prisma.client.userPreference.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...dto, enabledMediaTypes: ['MOVIE', 'GAME', 'MUSIC'] },
    });

    await this.persistOnboarding(userId, {
      step: 4,
      favoriteGenres: dto.favoriteGenres,
      dislikedGenres: dto.dislikedGenres,
      preferredThemes: dto.preferredThemes,
      preferredPacing: dto.preferredPacing,
      preferredComplexity: dto.preferredComplexity,
      preferredTone: dto.preferredTone,
    });

    await this.taste.seedFromOnboarding(userId, {
      favoriteGenres: dto.favoriteGenres,
      dislikedGenres: dto.dislikedGenres,
      preferredThemes: dto.preferredThemes,
      preferredPacing: dto.preferredPacing,
      preferredComplexity: dto.preferredComplexity,
      preferredTone: dto.preferredTone,
      enabledMediaTypes: preference.enabledMediaTypes,
    });

    return preference;
  }

  async complete(userId: string) {
    await this.assertReadyToComplete(userId);
    await this.prisma.client.user.update({
      where: { id: userId },
      data: { onboardingStatus: 'COMPLETED' },
    });
    await this.persistOnboarding(userId, { step: 5, completedAt: new Date().toISOString() });
    await this.taste.snapshot(userId);
    // Single sync FOR_YOU generation for the preview — do not also enqueue another
    // generate-recommendations job (that doubled batches/emails; see #271).
    void this.jobs.enqueue('update-taste-profile', { userId });
    return this.recommendations.generate(userId, { mode: 'FOR_YOU', count: 10 });
  }

  /** Require types + preferences before marking onboarding complete. */
  private async assertReadyToComplete(userId: string): Promise<void> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      include: { preference: true, profile: true },
    });
    if (!user) {
      throw new BadRequestException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }
    if (user.onboardingStatus === 'COMPLETED') {
      return;
    }
    const preference = user.preference;
    const onboarding =
      user.profile?.onboarding &&
      typeof user.profile.onboarding === 'object' &&
      !Array.isArray(user.profile.onboarding)
        ? (user.profile.onboarding as Record<string, unknown>)
        : {};
    const step = typeof onboarding.step === 'number' ? onboarding.step : 0;
    const hasMediaTypes = (preference?.enabledMediaTypes?.length ?? 0) > 0;
    const hasFavorites = (preference?.favoriteGenres?.length ?? 0) > 0;
    if (!hasMediaTypes || !hasFavorites || step < 4) {
      throw new BadRequestException({
        code: 'ONBOARDING_INCOMPLETE',
        message: 'Finish media types and preferences before completing onboarding',
      });
    }
  }

  async calibrate(userId: string, dto: OnboardingCalibrateDto) {
    await this.taste.applyCalibration(userId, dto.feedback);
    const profile = await this.prisma.client.profile.findUnique({ where: { userId } });
    const onboarding =
      profile?.onboarding && typeof profile.onboarding === 'object' && !Array.isArray(profile.onboarding)
        ? (profile.onboarding as Record<string, unknown>)
        : {};
    await this.prisma.client.profile.upsert({
      where: { userId },
      update: {
        onboarding: {
          ...onboarding,
          calibrationFeedback: dto.feedback,
          calibratedAt: new Date().toISOString(),
          step: 6,
        },
      },
      create: {
        userId,
        onboarding: {
          calibrationFeedback: dto.feedback,
          calibratedAt: new Date().toISOString(),
          step: 6,
        },
      },
    });
    return { ok: true, feedback: dto.feedback };
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InteractionsService } from '../interactions/interactions.service';
import { MediaService } from '../media/media.service';
import { RecommendationService } from '../recommendation/recommendation.service';
import { TasteService } from '../taste/taste.service';
import type {
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
  ) {}

  async getState(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      include: { preference: true },
    });
    const popular = await this.media.popular();
    return { onboardingStatus: user?.onboardingStatus, preference: user?.preference, popular };
  }

  async setTypes(userId: string, dto: OnboardingTypesDto) {
    await this.prisma.client.user.update({
      where: { id: userId },
      data: { onboardingStatus: 'IN_PROGRESS' },
    });
    return this.prisma.client.userPreference.upsert({
      where: { userId },
      update: { enabledMediaTypes: dto.mediaTypes },
      create: { userId, enabledMediaTypes: dto.mediaTypes },
    });
  }

  async select(userId: string, dto: OnboardingSelectionsDto) {
    for (const mediaItemId of dto.mediaItemIds) {
      await this.interactions.create(userId, { mediaItemId, type: 'LIKE' });
    }
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
    return { count: dto.ratings.length };
  }

  async preferences(userId: string, dto: OnboardingPreferencesDto) {
    const preference = await this.prisma.client.userPreference.upsert({
      where: { userId },
      update: dto,
      create: { userId, ...dto, enabledMediaTypes: ['MOVIE', 'GAME', 'MUSIC'] },
    });

    await this.prisma.client.profile.upsert({
      where: { userId },
      update: {
        onboarding: {
          favoriteGenres: dto.favoriteGenres,
          dislikedGenres: dto.dislikedGenres,
          preferredThemes: dto.preferredThemes,
          preferredPacing: dto.preferredPacing,
          preferredComplexity: dto.preferredComplexity,
          preferredTone: dto.preferredTone,
        },
      },
      create: {
        userId,
        onboarding: {
          favoriteGenres: dto.favoriteGenres,
          dislikedGenres: dto.dislikedGenres,
          preferredThemes: dto.preferredThemes,
          preferredPacing: dto.preferredPacing,
          preferredComplexity: dto.preferredComplexity,
          preferredTone: dto.preferredTone,
        },
      },
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
    await this.prisma.client.user.update({
      where: { id: userId },
      data: { onboardingStatus: 'COMPLETED' },
    });
    await this.taste.snapshot(userId);
    return this.recommendations.generate(userId, { mode: 'FOR_YOU', count: 10 });
  }
}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InteractionsModule } from '../interactions/interactions.module';
import { MediaModule } from '../media/media.module';
import { RecommendationModule } from '../recommendation/recommendation.module';
import { TasteModule } from '../taste/taste.module';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [AuthModule, MediaModule, InteractionsModule, TasteModule, RecommendationModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}

import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AuthModule } from '../auth/auth.module';
import { EmbeddingModule } from '../embedding/embedding.module';
import { MediaModule } from '../media/media.module';
import { TasteModule } from '../taste/taste.module';
import { CandidateGenerationService } from './candidate-generation.service';
import { RecommendationConfigService } from './recommendation-config.service';
import { RecommendationController } from './recommendation.controller';
import { RecommendationService } from './recommendation.service';

@Module({
  imports: [AuthModule, MediaModule, TasteModule, AiModule, EmbeddingModule, AnalyticsModule],
  controllers: [RecommendationController],
  providers: [RecommendationService, CandidateGenerationService, RecommendationConfigService],
  exports: [RecommendationService, RecommendationConfigService],
})
export class RecommendationModule {}

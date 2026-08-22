import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { RecommendationModule } from '../recommendation/recommendation.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [AuthModule, AiModule, RecommendationModule],
  controllers: [AdminController],
})
export class AdminModule {}

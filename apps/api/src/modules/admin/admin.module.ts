import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RecommendationModule } from '../recommendation/recommendation.module';
import { AdminController } from './admin.controller';

@Module({
  imports: [AuthModule, RecommendationModule],
  controllers: [AdminController],
})
export class AdminModule {}

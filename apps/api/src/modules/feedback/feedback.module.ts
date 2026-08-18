import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { InteractionsModule } from '../interactions/interactions.module';
import { TasteModule } from '../taste/taste.module';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';

@Module({
  imports: [AuthModule, InteractionsModule, TasteModule],
  controllers: [FeedbackController],
  providers: [FeedbackService],
})
export class FeedbackModule {}

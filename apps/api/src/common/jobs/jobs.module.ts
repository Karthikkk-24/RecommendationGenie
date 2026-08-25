import { Global, Module } from '@nestjs/common';
import { AiModule } from '../../modules/ai/ai.module';
import { EmbeddingModule } from '../../modules/embedding/embedding.module';
import { MediaModule } from '../../modules/media/media.module';
import { NotificationsModule } from '../../modules/notifications/notifications.module';
import { RecommendationModule } from '../../modules/recommendation/recommendation.module';
import { TasteModule } from '../../modules/taste/taste.module';
import { InlineJobQueue } from './job-queue';
import { JobHandlersService } from './job-handlers.service';

export const JOB_QUEUE = 'JOB_QUEUE';

@Global()
@Module({
  imports: [EmbeddingModule, AiModule, MediaModule, RecommendationModule, TasteModule, NotificationsModule],
  providers: [
    { provide: JOB_QUEUE, useClass: InlineJobQueue },
    JobHandlersService,
  ],
  exports: [JOB_QUEUE],
})
export class JobsModule {}

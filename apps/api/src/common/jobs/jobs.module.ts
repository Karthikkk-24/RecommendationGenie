import { Global, Module } from '@nestjs/common';
import { AiModule } from '../../modules/ai/ai.module';
import { EmbeddingModule } from '../../modules/embedding/embedding.module';
import { InlineJobQueue } from './job-queue';
import { JobHandlersService } from './job-handlers.service';

export const JOB_QUEUE = 'JOB_QUEUE';

@Global()
@Module({
  imports: [EmbeddingModule, AiModule],
  providers: [
    { provide: JOB_QUEUE, useClass: InlineJobQueue },
    JobHandlersService,
  ],
  exports: [JOB_QUEUE],
})
export class JobsModule {}

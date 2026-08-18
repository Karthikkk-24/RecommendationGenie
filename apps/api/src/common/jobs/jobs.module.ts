import { Global, Module } from '@nestjs/common';
import { InlineJobQueue } from './job-queue';

export const JOB_QUEUE = 'JOB_QUEUE';

@Global()
@Module({
  providers: [{ provide: JOB_QUEUE, useClass: InlineJobQueue }],
  exports: [JOB_QUEUE],
})
export class JobsModule {}

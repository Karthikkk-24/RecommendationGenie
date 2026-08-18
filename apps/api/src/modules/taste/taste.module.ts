import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TasteController } from './taste.controller';
import { TasteService } from './taste.service';

@Module({
  imports: [AuthModule],
  controllers: [TasteController],
  providers: [TasteService],
  exports: [TasteService],
})
export class TasteModule {}

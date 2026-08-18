import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';

@Module({
  imports: [AuthModule, MediaModule],
  controllers: [LibraryController],
  providers: [LibraryService],
})
export class LibraryModule {}

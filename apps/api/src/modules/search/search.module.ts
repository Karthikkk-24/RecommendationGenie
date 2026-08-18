import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { SearchController } from './search.controller';

@Module({
  imports: [MediaModule, AuthModule],
  controllers: [SearchController],
})
export class SearchModule {}

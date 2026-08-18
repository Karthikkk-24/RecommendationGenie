import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { IgdbGameProvider } from './providers/igdb.provider';
import { MockMediaProvider } from './providers/mock.provider';
import { MusicBrainzProvider } from './providers/musicbrainz.provider';
import { TmdbMovieProvider } from './providers/tmdb.provider';

@Module({
  controllers: [MediaController],
  providers: [MediaService, MockMediaProvider, TmdbMovieProvider, IgdbGameProvider, MusicBrainzProvider],
  exports: [MediaService],
})
export class MediaModule {}

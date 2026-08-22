import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { IgdbGameProvider } from './providers/igdb.provider';
import { LastfmProvider } from './providers/lastfm.provider';
import { MockMediaProvider } from './providers/mock.provider';
import { MusicBrainzProvider } from './providers/musicbrainz.provider';
import { TmdbMovieProvider } from './providers/tmdb.provider';
import { TmdbTvProvider } from './providers/tmdb-tv.provider';

@Module({
  controllers: [MediaController],
  providers: [
    MediaService,
    MockMediaProvider,
    TmdbMovieProvider,
    TmdbTvProvider,
    IgdbGameProvider,
    MusicBrainzProvider,
    LastfmProvider,
  ],
  exports: [MediaService],
})
export class MediaModule {}

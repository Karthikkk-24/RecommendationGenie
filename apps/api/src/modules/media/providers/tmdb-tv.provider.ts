import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MediaType } from '@recommendation-genie/types';
import type { MediaProvider, NormalizedMedia, ProviderQuery } from './media-provider';
import { inferTasteScalars } from './infer-taste-scalars';
import { tmdbGenresFromRow } from './tmdb.provider';

/** TMDB TV genre ids (subset of common genres). */
export const TMDB_TV_GENRES: Record<number, string> = {
  10759: 'action-adventure',
  16: 'animation',
  35: 'comedy',
  80: 'crime',
  99: 'documentary',
  18: 'drama',
  10751: 'family',
  10762: 'kids',
  9648: 'mystery',
  10763: 'news',
  10764: 'reality',
  10765: 'sci-fi-fantasy',
  10766: 'soap',
  10767: 'talk',
  10768: 'war-politics',
  37: 'western',
};

export function tmdbTvGenresFromRow(row: Record<string, unknown>): string[] {
  if (Array.isArray(row.genres) && row.genres.length > 0) {
    return row.genres
      .map((g: { name?: string }) => (typeof g?.name === 'string' ? g.name.toLowerCase() : null))
      .filter((name): name is string => Boolean(name));
  }
  if (Array.isArray(row.genre_ids)) {
    return row.genre_ids
      .map((id: unknown) => (typeof id === 'number' ? TMDB_TV_GENRES[id] : undefined))
      .filter((name): name is string => Boolean(name));
  }
  return tmdbGenresFromRow(row);
}

@Injectable()
export class TmdbTvProvider implements MediaProvider {
  readonly id = 'tmdb-tv';
  readonly mediaTypes: MediaType[] = ['TV_SHOW'];
  private readonly logger = new Logger(TmdbTvProvider.name);

  constructor(private readonly config: ConfigService) {}

  async search(input: ProviderQuery): Promise<NormalizedMedia[]> {
    return this.fetchList(`/search/tv?query=${encodeURIComponent(input.query ?? '')}`, input.limit);
  }

  async getById(externalId: string): Promise<NormalizedMedia | null> {
    const payload = await this.getJson(`/tv/${externalId}`);
    return payload ? this.normalize(payload) : null;
  }

  async getPopular(input: ProviderQuery): Promise<NormalizedMedia[]> {
    return this.fetchList('/tv/popular', input.limit);
  }

  async getTrending(input: ProviderQuery): Promise<NormalizedMedia[]> {
    return this.fetchList('/trending/tv/week', input.limit);
  }

  async getSimilar(externalId: string): Promise<NormalizedMedia[]> {
    return this.fetchList(`/tv/${externalId}/similar`, 12);
  }

  async getDetails(externalId: string): Promise<NormalizedMedia> {
    const item = await this.getById(externalId);
    if (!item) {
      throw new Error(`TMDB TV ${externalId} not found`);
    }
    return item;
  }

  private async fetchList(path: string, limit = 20): Promise<NormalizedMedia[]> {
    const payload = await this.getJson(path);
    const results = Array.isArray(payload?.results) ? payload.results : [];
    return results.slice(0, limit).map((row: Record<string, unknown>) => this.normalize(row));
  }

  private normalize(row: Record<string, unknown>): NormalizedMedia {
    const genres = tmdbTvGenresFromRow(row);
    const description = typeof row.overview === 'string' ? row.overview : null;
    const scalars = inferTasteScalars({ type: 'TV_SHOW', genres, description });
    const episodeRuntime = Array.isArray(row.episode_run_time) ? row.episode_run_time[0] : undefined;
    return {
      provider: 'tmdb-tv',
      externalId: String(row.id),
      type: 'TV_SHOW',
      title: String(row.name ?? row.title ?? 'Untitled'),
      description,
      releaseDate: row.first_air_date ? new Date(String(row.first_air_date)) : null,
      language: typeof row.original_language === 'string' ? row.original_language : null,
      runtimeMinutes: typeof episodeRuntime === 'number' ? episodeRuntime : null,
      posterUrl: row.poster_path ? `https://image.tmdb.org/t/p/w500${row.poster_path}` : null,
      popularity: typeof row.popularity === 'number' ? Math.min(1, row.popularity / 200) : 0.3,
      qualityScore: typeof row.vote_average === 'number' ? row.vote_average / 10 : 0.5,
      ...scalars,
      genres,
      tags: [],
      people: [],
    };
  }

  private async getJson(path: string): Promise<Record<string, never> | null> {
    const key = this.config.get<string>('TMDB_API_KEY');
    if (!key) {
      return null;
    }
    try {
      const response = await fetch(`https://api.themoviedb.org/3${path}${path.includes('?') ? '&' : '?'}api_key=${key}`);
      if (!response.ok) {
        this.logger.warn(`TMDB TV ${path} ${response.status}`);
        return null;
      }
      return (await response.json()) as Record<string, never>;
    } catch (error) {
      this.logger.warn(error);
      return null;
    }
  }
}

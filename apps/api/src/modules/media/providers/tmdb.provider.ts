import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MediaType } from '@recommendation-genie/types';
import type { MediaProvider, NormalizedMedia, ProviderQuery } from './media-provider';

/** TMDB search results expose genre_ids; details expose genres[{id,name}]. */
export const TMDB_MOVIE_GENRES: Record<number, string> = {
  28: 'action',
  12: 'adventure',
  16: 'animation',
  35: 'comedy',
  80: 'crime',
  99: 'documentary',
  18: 'drama',
  10751: 'family',
  14: 'fantasy',
  36: 'history',
  27: 'horror',
  10402: 'music',
  9648: 'mystery',
  10749: 'romance',
  878: 'sci-fi',
  10770: 'tv-movie',
  53: 'thriller',
  10752: 'war',
  37: 'western',
};

export function tmdbGenresFromRow(row: Record<string, unknown>): string[] {
  if (Array.isArray(row.genres) && row.genres.length > 0) {
    return row.genres
      .map((g: { name?: string }) => (typeof g?.name === 'string' ? g.name.toLowerCase() : null))
      .filter((name): name is string => Boolean(name));
  }
  if (Array.isArray(row.genre_ids)) {
    return row.genre_ids
      .map((id: unknown) => (typeof id === 'number' ? TMDB_MOVIE_GENRES[id] : undefined))
      .filter((name): name is string => Boolean(name));
  }
  return [];
}

@Injectable()
export class TmdbMovieProvider implements MediaProvider {
  readonly id = 'tmdb';
  readonly mediaTypes: MediaType[] = ['MOVIE'];
  private readonly logger = new Logger(TmdbMovieProvider.name);

  constructor(private readonly config: ConfigService) {}

  async search(input: ProviderQuery): Promise<NormalizedMedia[]> {
    return this.fetchList(`/search/movie?query=${encodeURIComponent(input.query ?? '')}`, input.limit);
  }

  async getById(externalId: string): Promise<NormalizedMedia | null> {
    const payload = await this.getJson(`/movie/${externalId}`);
    return payload ? this.normalize(payload) : null;
  }

  async getPopular(input: ProviderQuery): Promise<NormalizedMedia[]> {
    return this.fetchList('/movie/popular', input.limit);
  }

  async getTrending(input: ProviderQuery): Promise<NormalizedMedia[]> {
    return this.fetchList('/trending/movie/week', input.limit);
  }

  async getSimilar(externalId: string): Promise<NormalizedMedia[]> {
    return this.fetchList(`/movie/${externalId}/similar`, 12);
  }

  async getDetails(externalId: string): Promise<NormalizedMedia> {
    const item = await this.getById(externalId);
    if (!item) {
      throw new Error(`TMDB movie ${externalId} not found`);
    }
    return item;
  }

  private async fetchList(path: string, limit = 20): Promise<NormalizedMedia[]> {
    const payload = await this.getJson(path);
    const results = Array.isArray(payload?.results) ? payload.results : [];
    return results.slice(0, limit).map((row: Record<string, unknown>) => this.normalize(row));
  }

  private normalize(row: Record<string, unknown>): NormalizedMedia {
    return {
      provider: 'tmdb',
      externalId: String(row.id),
      type: 'MOVIE',
      title: String(row.title ?? row.name ?? 'Untitled'),
      description: typeof row.overview === 'string' ? row.overview : null,
      releaseDate: row.release_date ? new Date(String(row.release_date)) : null,
      language: typeof row.original_language === 'string' ? row.original_language : null,
      runtimeMinutes: typeof row.runtime === 'number' ? row.runtime : null,
      posterUrl: row.poster_path ? `https://image.tmdb.org/t/p/w500${row.poster_path}` : null,
      popularity: typeof row.popularity === 'number' ? Math.min(1, row.popularity / 200) : 0.3,
      qualityScore: typeof row.vote_average === 'number' ? row.vote_average / 10 : 0.5,
      pacing: 0,
      complexity: 0,
      darkness: 0,
      emotionalIntensity: 0,
      genres: tmdbGenresFromRow(row),
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
        this.logger.warn(`TMDB ${path} ${response.status}`);
        return null;
      }
      return (await response.json()) as Record<string, never>;
    } catch (error) {
      this.logger.warn(error);
      return null;
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MediaType } from '@recommendation-genie/types';
import type { MediaProvider, NormalizedMedia, ProviderQuery } from './media-provider';
import { inferTasteScalars } from './infer-taste-scalars';

@Injectable()
export class LastfmProvider implements MediaProvider {
  readonly id = 'lastfm';
  readonly mediaTypes: MediaType[] = ['MUSIC'];
  private readonly logger = new Logger(LastfmProvider.name);

  constructor(private readonly config: ConfigService) {}

  async search(input: ProviderQuery): Promise<NormalizedMedia[]> {
    const query = encodeURIComponent(input.query ?? '');
    const payload = await this.getJson(`album.search&album=${query}&limit=${input.limit ?? 10}`);
    const results = payload?.results as { albummatches?: { album?: unknown } } | undefined;
    const albums = results?.albummatches?.album;
    const rows = Array.isArray(albums) ? albums : albums ? [albums] : [];
    return rows.map((row: Record<string, unknown>) => this.normalize(row));
  }

  async getById(externalId: string): Promise<NormalizedMedia | null> {
    const [artist, album] = externalId.split('::');
    if (!artist || !album) {
      return null;
    }
    const payload = await this.getJson(
      `album.getinfo&artist=${encodeURIComponent(artist)}&album=${encodeURIComponent(album)}`,
    );
    return payload?.album ? this.normalize(payload.album as Record<string, unknown>, externalId) : null;
  }

  async getPopular(input: ProviderQuery): Promise<NormalizedMedia[]> {
    return this.search({ ...input, query: 'indie' });
  }

  async getTrending(input: ProviderQuery): Promise<NormalizedMedia[]> {
    return this.search({ ...input, query: 'electronic' });
  }

  async getSimilar(_externalId: string): Promise<NormalizedMedia[]> {
    return [];
  }

  async getDetails(externalId: string): Promise<NormalizedMedia> {
    const item = await this.getById(externalId);
    if (!item) {
      throw new Error(`Last.fm album ${externalId} not found`);
    }
    return item;
  }

  private normalize(row: Record<string, unknown>, externalId?: string): NormalizedMedia {
    const artist = typeof row.artist === 'string' ? row.artist : (row.artist as { name?: string })?.name ?? 'Unknown';
    const title = String(row.name ?? row.title ?? 'Untitled');
    const tags = Array.isArray((row.tags as { tag?: Array<{ name: string }> })?.tag)
      ? (row.tags as { tag: Array<{ name: string }> }).tag.map((t) => t.name)
      : [];
    const genres = tags.slice(0, 4);
    const scalars = inferTasteScalars({ type: 'MUSIC', genres, tags });
    const id = externalId ?? `${artist}::${title}`;
    const imageList = Array.isArray(row.image) ? row.image : [];
    const poster =
      [...imageList].reverse().find((img: { '#text'?: string }) => img['#text'])?.['#text'] ?? null;
    const wiki = row.wiki as { summary?: string } | undefined;
    return {
      provider: 'lastfm',
      externalId: id,
      type: 'MUSIC',
      title,
      description: typeof wiki?.summary === 'string' ? wiki.summary : null,
      releaseDate: null,
      language: null,
      runtimeMinutes: null,
      posterUrl: typeof poster === 'string' ? poster : null,
      popularity: 0.25,
      qualityScore: 0.6,
      ...scalars,
      genres,
      tags,
      people: [{ name: String(artist), role: 'ARTIST' }],
    };
  }

  private async getJson(methodAndParams: string): Promise<Record<string, unknown> | null> {
    const key = this.config.get<string>('LASTFM_API_KEY');
    if (!key) {
      return null;
    }
    try {
      const response = await fetch(
        `https://ws.audioscrobbler.com/2.0/?method=${methodAndParams}&api_key=${key}&format=json`,
      );
      if (!response.ok) {
        this.logger.warn(`Last.fm ${response.status}`);
        return null;
      }
      return (await response.json()) as Record<string, unknown>;
    } catch (error) {
      this.logger.warn(error);
      return null;
    }
  }
}

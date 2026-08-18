import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { MediaType } from '@recommendation-genie/types';
import type { MediaProvider, NormalizedMedia, ProviderQuery } from './media-provider';

@Injectable()
export class IgdbGameProvider implements MediaProvider {
  readonly id = 'igdb';
  readonly mediaTypes: MediaType[] = ['GAME'];
  private readonly logger = new Logger(IgdbGameProvider.name);
  private token: { value: string; expiresAt: number } | null = null;

  constructor(private readonly config: ConfigService) {}

  async search(input: ProviderQuery): Promise<NormalizedMedia[]> {
    const q = (input.query ?? '').replace(/"/g, '');
    return this.query(`search "${q}"; fields name,summary,first_release_date,rating,aggregated_rating,cover.url,genres.name,involved_companies.company.name; limit ${input.limit ?? 20};`);
  }

  async getById(externalId: string): Promise<NormalizedMedia | null> {
    const rows = await this.query(
      `where id = ${Number(externalId)}; fields name,summary,first_release_date,rating,aggregated_rating,cover.url,genres.name,involved_companies.company.name;`,
    );
    return rows[0] ?? null;
  }

  async getPopular(input: ProviderQuery): Promise<NormalizedMedia[]> {
    return this.query(
      `fields name,summary,first_release_date,rating,aggregated_rating,cover.url,genres.name,involved_companies.company.name; sort rating desc; limit ${input.limit ?? 20};`,
    );
  }

  async getTrending(input: ProviderQuery): Promise<NormalizedMedia[]> {
    return this.getPopular(input);
  }

  async getSimilar(_externalId: string): Promise<NormalizedMedia[]> {
    return [];
  }

  async getDetails(externalId: string): Promise<NormalizedMedia> {
    const item = await this.getById(externalId);
    if (!item) {
      throw new Error(`IGDB game ${externalId} not found`);
    }
    return item;
  }

  private async query(body: string): Promise<NormalizedMedia[]> {
    const token = await this.getToken();
    const clientId = this.config.get<string>('IGDB_CLIENT_ID');
    if (!token || !clientId) {
      return [];
    }
    try {
      const response = await fetch('https://api.igdb.com/v4/games', {
        method: 'POST',
        headers: {
          'Client-ID': clientId,
          Authorization: `Bearer ${token}`,
        },
        body,
      });
      if (!response.ok) {
        this.logger.warn(`IGDB ${response.status}`);
        return [];
      }
      const rows = (await response.json()) as Array<Record<string, unknown>>;
      return rows.map((row) => this.normalize(row));
    } catch (error) {
      this.logger.warn(error);
      return [];
    }
  }

  private normalize(row: Record<string, unknown>): NormalizedMedia {
    const cover = row.cover as { url?: string } | undefined;
    const genres = Array.isArray(row.genres) ? row.genres.map((g: { name: string }) => g.name.toLowerCase()) : [];
    const companies = Array.isArray(row.involved_companies)
      ? row.involved_companies.map((c: { company?: { name?: string } }) => c.company?.name).filter(Boolean)
      : [];
    return {
      provider: 'igdb',
      externalId: String(row.id),
      type: 'GAME',
      title: String(row.name ?? 'Untitled'),
      description: typeof row.summary === 'string' ? row.summary : null,
      releaseDate: typeof row.first_release_date === 'number' ? new Date(row.first_release_date * 1000) : null,
      language: 'en',
      runtimeMinutes: null,
      posterUrl: cover?.url ? `https:${cover.url.replace('t_thumb', 't_cover_big')}` : null,
      popularity: typeof row.rating === 'number' ? row.rating / 100 : 0.3,
      qualityScore: typeof row.aggregated_rating === 'number' ? row.aggregated_rating / 100 : 0.5,
      pacing: 0,
      complexity: 0,
      darkness: 0,
      emotionalIntensity: 0,
      genres,
      tags: [],
      people: companies.map((name) => ({ name: String(name), role: 'DEVELOPER' as const })),
    };
  }

  private async getToken(): Promise<string | null> {
    if (this.token && this.token.expiresAt > Date.now()) {
      return this.token.value;
    }
    const clientId = this.config.get<string>('IGDB_CLIENT_ID');
    const secret = this.config.get<string>('IGDB_CLIENT_SECRET');
    if (!clientId || !secret) {
      return null;
    }
    const response = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${secret}&grant_type=client_credentials`,
      { method: 'POST' },
    );
    if (!response.ok) {
      return null;
    }
    const payload = (await response.json()) as { access_token: string; expires_in: number };
    this.token = { value: payload.access_token, expiresAt: Date.now() + payload.expires_in * 1000 };
    return this.token.value;
  }
}

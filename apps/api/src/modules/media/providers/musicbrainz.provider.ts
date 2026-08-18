import { Injectable, Logger } from '@nestjs/common';
import type { MediaType } from '@recommendation-genie/types';
import type { MediaProvider, NormalizedMedia, ProviderQuery } from './media-provider';

@Injectable()
export class MusicBrainzProvider implements MediaProvider {
  readonly id = 'musicbrainz';
  readonly mediaTypes: MediaType[] = ['MUSIC'];
  private readonly logger = new Logger(MusicBrainzProvider.name);

  async search(input: ProviderQuery): Promise<NormalizedMedia[]> {
    const query = encodeURIComponent(input.query ?? '');
    const payload = await this.getJson(
      `https://musicbrainz.org/ws/2/release-group/?query=${query}&fmt=json&limit=${input.limit ?? 10}`,
    );
    const groups = Array.isArray(payload?.['release-groups']) ? payload['release-groups'] : [];
    return groups.map((row: Record<string, unknown>) => this.normalize(row));
  }

  async getById(externalId: string): Promise<NormalizedMedia | null> {
    const payload = await this.getJson(
      `https://musicbrainz.org/ws/2/release-group/${externalId}?fmt=json&inc=artist-credits+tags`,
    );
    return payload ? this.normalize(payload) : null;
  }

  async getPopular(input: ProviderQuery): Promise<NormalizedMedia[]> {
    return this.search({ ...input, query: 'tag:electronic' });
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
      throw new Error(`MusicBrainz ${externalId} not found`);
    }
    return item;
  }

  private normalize(row: Record<string, unknown>): NormalizedMedia {
    const artistCredit = Array.isArray(row['artist-credit']) ? row['artist-credit'] : [];
    const tags = Array.isArray(row.tags) ? row.tags.map((t: { name: string }) => t.name) : [];
    return {
      provider: 'musicbrainz',
      externalId: String(row.id),
      type: 'MUSIC',
      title: String(row.title ?? 'Untitled'),
      description: null,
      releaseDate: row['first-release-date'] ? new Date(String(row['first-release-date'])) : null,
      language: null,
      runtimeMinutes: null,
      posterUrl: null,
      popularity: 0.2,
      qualityScore: 0.6,
      pacing: 0,
      complexity: 0,
      darkness: 0,
      emotionalIntensity: 0,
      genres: tags.slice(0, 4),
      tags,
      people: artistCredit
        .map((credit: { name?: string; artist?: { name?: string } }) => credit.artist?.name ?? credit.name)
        .filter(Boolean)
        .map((name: string) => ({ name, role: 'ARTIST' as const })),
    };
  }

  private async getJson(url: string): Promise<Record<string, never> | null> {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'RecommendationGenie/1.0 (dev@localhost)' },
      });
      if (!response.ok) {
        this.logger.warn(`MusicBrainz ${response.status}`);
        return null;
      }
      return (await response.json()) as Record<string, never>;
    } catch (error) {
      this.logger.warn(error);
      return null;
    }
  }
}

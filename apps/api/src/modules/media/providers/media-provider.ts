import type { MediaType } from '@recommendation-genie/types';

export type NormalizedPerson = {
  name: string;
  role: 'ACTOR' | 'DIRECTOR' | 'ARTIST' | 'DEVELOPER' | 'WRITER' | 'COMPOSER' | 'PUBLISHER';
};

export type NormalizedMedia = {
  provider: string;
  externalId: string;
  type: MediaType;
  title: string;
  description: string | null;
  releaseDate: Date | null;
  language: string | null;
  runtimeMinutes: number | null;
  posterUrl: string | null;
  popularity: number;
  qualityScore: number;
  pacing: number;
  complexity: number;
  darkness: number;
  emotionalIntensity: number;
  genres: string[];
  tags: string[];
  people: NormalizedPerson[];
  similarExternalIds?: string[];
};

export type ProviderQuery = {
  query?: string;
  mediaType?: MediaType;
  limit?: number;
};

export interface MediaProvider {
  readonly id: string;
  readonly mediaTypes: MediaType[];
  search(input: ProviderQuery): Promise<NormalizedMedia[]>;
  getById(externalId: string): Promise<NormalizedMedia | null>;
  getPopular(input: ProviderQuery): Promise<NormalizedMedia[]>;
  getTrending(input: ProviderQuery): Promise<NormalizedMedia[]>;
  getSimilar(externalId: string): Promise<NormalizedMedia[]>;
  getDetails(externalId: string): Promise<NormalizedMedia>;
}

import { Injectable } from '@nestjs/common';
import type { MediaType } from '@recommendation-genie/types';
import { PrismaService } from '../../../common/prisma/prisma.service';
import type { MediaProvider, NormalizedMedia, ProviderQuery } from './media-provider';

@Injectable()
export class MockMediaProvider implements MediaProvider {
  readonly id = 'mock';
  readonly mediaTypes: MediaType[] = ['MOVIE', 'GAME', 'MUSIC'];

  constructor(private readonly prisma: PrismaService) {}

  async search(input: ProviderQuery): Promise<NormalizedMedia[]> {
    const items = await this.load(input.mediaType, input.query, input.limit ?? 20);
    return items;
  }

  async getById(externalId: string): Promise<NormalizedMedia | null> {
    const item = await this.prisma.client.mediaItem.findFirst({
      where: { sources: { some: { provider: 'mock', externalId } } },
      include: this.include(),
    });
    return item ? this.toNormalized(item) : null;
  }

  async getPopular(input: ProviderQuery): Promise<NormalizedMedia[]> {
    return this.load(input.mediaType, undefined, input.limit ?? 20, 'popularity');
  }

  async getTrending(input: ProviderQuery): Promise<NormalizedMedia[]> {
    return this.load(input.mediaType, undefined, input.limit ?? 20, 'qualityScore');
  }

  async getSimilar(externalId: string): Promise<NormalizedMedia[]> {
    const source = await this.prisma.client.mediaSource.findUnique({
      where: { provider_externalId: { provider: 'mock', externalId } },
    });
    if (!source) {
      return [];
    }
    const similar = await this.prisma.client.mediaSimilarity.findMany({
      where: { fromId: source.mediaItemId },
      include: { to: { include: this.include() } },
      orderBy: { score: 'desc' },
      take: 12,
    });
    return similar.map((row) => this.toNormalized(row.to));
  }

  async getDetails(externalId: string): Promise<NormalizedMedia> {
    const item = await this.getById(externalId);
    if (!item) {
      throw new Error(`Mock media ${externalId} not found`);
    }
    return item;
  }

  private include() {
    return {
      genres: { include: { genre: true } },
      tags: { include: { tag: true } },
      people: { include: { person: true } },
      sources: true,
    } as const;
  }

  private async load(
    mediaType: MediaType | undefined,
    query: string | undefined,
    take: number,
    orderBy: 'popularity' | 'qualityScore' = 'popularity',
  ): Promise<NormalizedMedia[]> {
    const items = await this.prisma.client.mediaItem.findMany({
      where: {
        ...(mediaType ? { type: mediaType } : {}),
        ...(query
          ? { title: { contains: query, mode: 'insensitive' } }
          : {}),
      },
      include: this.include(),
      orderBy: { [orderBy]: 'desc' },
      take,
    });
    return items.map((item) => this.toNormalized(item));
  }

  private toNormalized(item: {
    id: string;
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
    genres: Array<{ genre: { name: string } }>;
    tags: Array<{ tag: { name: string } }>;
    people: Array<{ role: NormalizedMedia['people'][number]['role']; person: { name: string } }>;
  }): NormalizedMedia {
    return {
      provider: 'mock',
      externalId: item.id,
      type: item.type,
      title: item.title,
      description: item.description,
      releaseDate: item.releaseDate,
      language: item.language,
      runtimeMinutes: item.runtimeMinutes,
      posterUrl: item.posterUrl,
      popularity: item.popularity,
      qualityScore: item.qualityScore,
      pacing: item.pacing,
      complexity: item.complexity,
      darkness: item.darkness,
      emotionalIntensity: item.emotionalIntensity,
      genres: item.genres.map((row) => row.genre.name),
      tags: item.tags.map((row) => row.tag.name),
      people: item.people.map((row) => ({ name: row.person.name, role: row.role })),
    };
  }
}

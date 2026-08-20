import { Injectable } from '@nestjs/common';
import { TASTE } from '@recommendation-genie/config';
import type { FeedbackReason, InteractionType } from '@recommendation-genie/types';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  applyPreferenceUpdate,
  clampPreference,
  interactionLearningRate,
  interactionSignal,
  patchesFromFeedbackReason,
  type PreferencePatch,
} from './taste-algorithm';

@Injectable()
export class TasteService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const profile = await this.prisma.client.tasteProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
    const features = await this.prisma.client.tastePreference.findMany({
      where: { userId },
      orderBy: { weight: 'desc' },
    });
    return { profile, features };
  }

  async history(userId: string) {
    return this.prisma.client.tasteProfileSnapshot.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
  }

  async applyInteraction(input: {
    userId: string;
    mediaItemId: string;
    type: InteractionType;
    rating?: number;
  }): Promise<void> {
    const media = await this.prisma.client.mediaItem.findUnique({
      where: { id: input.mediaItemId },
      include: {
        genres: { include: { genre: true } },
        tags: { include: { tag: true } },
        people: { include: { person: true } },
      },
    });
    if (!media) {
      return;
    }

    const signal = interactionSignal(input.type, input.rating);
    const rate = interactionLearningRate(input.type);
    if (signal === 0 || rate === 0) {
      return;
    }

    await this.applyPatch(input.userId, {
      scalar: {
        complexity: media.complexity * signal,
        darkness: media.darkness * signal,
        emotionalIntensity: media.emotionalIntensity * signal,
        novelty: (1 - media.popularity) * signal,
        popularityPreference: media.popularity * signal,
        mainstreamVsNiche: (media.popularity - 0.5) * -signal,
        pacing: media.pacing * signal,
      },
      features: [
        ...media.genres.map((row) => ({
          featureType: 'GENRE' as const,
          featureKey: row.genre.name,
          signal,
        })),
        ...media.tags.map((row) => ({
          featureType: 'TAG' as const,
          featureKey: row.tag.name,
          signal: signal * 0.7,
        })),
        ...media.people.map((row) => ({
          featureType: 'CREATOR' as const,
          featureKey: row.person.name,
          signal: signal * 0.8,
        })),
        {
          featureType: 'MEDIA_TYPE' as const,
          featureKey: media.type,
          signal,
        },
      ],
    }, rate);
  }

  async applyFeedbackReason(
    userId: string,
    mediaItemId: string,
    reason: FeedbackReason,
  ): Promise<void> {
    const media = await this.prisma.client.mediaItem.findUnique({
      where: { id: mediaItemId },
      include: {
        genres: { include: { genre: true } },
        people: { include: { person: true } },
      },
    });
    const patch = patchesFromFeedbackReason(reason, {
      genres: media?.genres.map((row) => row.genre.name),
      creators: media?.people.map((row) => row.person.name),
    });
    await this.applyPatch(userId, patch, 0.22);
  }

  async snapshot(userId: string): Promise<void> {
    const { profile, features } = await this.getProfile(userId);
    await this.prisma.client.tasteProfileSnapshot.create({
      data: {
        userId,
        scalars: {
          complexity: profile.complexity,
          darkness: profile.darkness,
          emotionalIntensity: profile.emotionalIntensity,
          novelty: profile.novelty,
          popularityPreference: profile.popularityPreference,
          mainstreamVsNiche: profile.mainstreamVsNiche,
          pacing: profile.pacing,
        },
        features: features.map((row) => ({
          featureType: row.featureType,
          featureKey: row.featureKey,
          weight: row.weight,
        })),
      },
    });
  }

  async evolution(userId: string) {
    const snapshots = await this.prisma.client.tasteProfileSnapshot.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: 30,
    });
    if (snapshots.length < 2) {
      return { changes: [], message: 'Keep rating and Genie will show how your taste shifts.' };
    }
    const first = snapshots[0]?.scalars as Record<string, number> | undefined;
    const last = snapshots[snapshots.length - 1]?.scalars as Record<string, number> | undefined;
    if (!first || !last) {
      return { changes: [], message: 'Keep rating and Genie will show how your taste shifts.' };
    }
    const changes = Object.keys(last)
      .map((key) => ({
        key,
        delta: Math.round(((last[key] ?? 0) - (first[key] ?? 0)) * 100),
      }))
      .filter((row) => Math.abs(row.delta) >= 4);
    return {
      changes,
      message: changes.length ? 'Your taste is changing.' : 'Your taste has been stable lately.',
    };
  }

  async seedFromOnboarding(
    userId: string,
    input: {
      favoriteGenres: string[];
      dislikedGenres: string[];
      preferredThemes?: string[];
      preferredPacing?: number;
      preferredComplexity?: number;
      preferredTone?: string;
      enabledMediaTypes?: string[];
    },
  ): Promise<void> {
    // Onboarding sliders are explicit targets — set TasteProfile scalars directly
    // so the first recommendation batch reflects them (not a weak learning step).
    const darkness =
      input.preferredTone === 'dark' ? 0.6 : input.preferredTone === 'light' ? -0.4 : undefined;
    await this.prisma.client.tasteProfile.upsert({
      where: { userId },
      update: {
        ...(input.preferredComplexity !== undefined
          ? { complexity: clampPreference(input.preferredComplexity) }
          : {}),
        ...(input.preferredPacing !== undefined ? { pacing: clampPreference(input.preferredPacing) } : {}),
        ...(darkness !== undefined ? { darkness: clampPreference(darkness) } : {}),
      },
      create: {
        userId,
        complexity: clampPreference(input.preferredComplexity ?? 0),
        pacing: clampPreference(input.preferredPacing ?? 0),
        darkness: clampPreference(darkness ?? 0),
      },
    });

    const features: NonNullable<PreferencePatch['features']> = [
      ...input.favoriteGenres.map((genre) => ({
        featureType: 'GENRE' as const,
        featureKey: genre,
        signal: 1,
      })),
      ...input.dislikedGenres.map((genre) => ({
        featureType: 'GENRE' as const,
        featureKey: genre,
        signal: -1,
      })),
      ...(input.preferredThemes ?? []).map((theme) => ({
        featureType: 'THEME' as const,
        featureKey: theme,
        signal: 1,
      })),
      ...(input.enabledMediaTypes ?? []).map((mediaType) => ({
        featureType: 'MEDIA_TYPE' as const,
        featureKey: mediaType,
        signal: 0.8,
      })),
    ];

    // Two bounded learning steps so onboarding can seed meaningfully without
    // jumping past maxSingleDelta the way a raw ±0.7 upsert would.
    if (features.length) {
      await this.applyPatch(userId, { features }, TASTE.maxSingleDelta);
      await this.applyPatch(userId, { features }, TASTE.maxSingleDelta);
    }
  }

  private async applyPatch(userId: string, patch: PreferencePatch, learningRate: number): Promise<void> {
    const profile = await this.prisma.client.tasteProfile.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    const scalars = {
      complexity: profile.complexity,
      darkness: profile.darkness,
      emotionalIntensity: profile.emotionalIntensity,
      novelty: profile.novelty,
      popularityPreference: profile.popularityPreference,
      mainstreamVsNiche: profile.mainstreamVsNiche,
      pacing: profile.pacing,
    };

    for (const [key, signal] of Object.entries(patch.scalar ?? {})) {
      const typedKey = key as keyof typeof scalars;
      scalars[typedKey] = applyPreferenceUpdate(scalars[typedKey], signal ?? 0, learningRate);
    }

    await this.prisma.client.tasteProfile.update({
      where: { userId },
      data: scalars,
    });

    for (const feature of patch.features ?? []) {
      const existing = await this.prisma.client.tastePreference.findUnique({
        where: {
          userId_featureType_featureKey: {
            userId,
            featureType: feature.featureType,
            featureKey: feature.featureKey,
          },
        },
      });
      const next = applyPreferenceUpdate(existing?.weight ?? 0, feature.signal, learningRate);
      await this.prisma.client.tastePreference.upsert({
        where: {
          userId_featureType_featureKey: {
            userId,
            featureType: feature.featureType,
            featureKey: feature.featureKey,
          },
        },
        update: { weight: next },
        create: {
          userId,
          featureType: feature.featureType,
          featureKey: feature.featureKey,
          weight: next,
        },
      });
    }
  }
}

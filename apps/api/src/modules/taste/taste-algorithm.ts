import { TASTE } from '@recommendation-genie/config';
import type { FeedbackReason, InteractionType } from '@recommendation-genie/types';

export function clampPreference(value: number): number {
  return Math.min(TASTE.max, Math.max(TASTE.min, value));
}

export function applyPreferenceUpdate(
  oldPreference: number,
  signal: number,
  learningRate: number,
): number {
  const next = oldPreference * TASTE.decayFactor + signal * learningRate;
  const delta = Math.min(TASTE.maxSingleDelta, Math.max(-TASTE.maxSingleDelta, next - oldPreference));
  return clampPreference(oldPreference + delta);
}

export const INTERACTION_LEARNING_RATES: Record<InteractionType, number> = {
  LOVE: TASTE.learningRates.LOVE,
  LIKE: TASTE.learningRates.LIKE,
  DISLIKE: TASTE.learningRates.DISLIKE,
  NOT_INTERESTED: TASTE.learningRates.NOT_INTERESTED,
  SAVE: TASTE.learningRates.SAVE,
  SKIP: TASTE.learningRates.SKIP,
  CONSUMED: TASTE.learningRates.CONSUMED,
  RATED: TASTE.learningRates.RATED,
  VIEW: TASTE.learningRates.VIEW,
  CLICK: TASTE.learningRates.CLICK,
};

export function ratingToSignal(rating: number): number {
  return clampPreference((rating - 3) / 2);
}

/** Signed direction for an interaction type. Negative rates (SKIP, DISLIKE) push taste away. */
export function interactionSignal(type: InteractionType, rating?: number): number {
  if (type === 'RATED' && rating !== undefined) {
    return ratingToSignal(rating);
  }
  const rate = INTERACTION_LEARNING_RATES[type];
  if (rate < 0) {
    return -1;
  }
  if (rate > 0) {
    return 1;
  }
  return 0;
}

export function interactionLearningRate(type: InteractionType): number {
  return Math.abs(INTERACTION_LEARNING_RATES[type]);
}

export type PreferencePatch = {
  scalar?: Partial<{
    complexity: number;
    darkness: number;
    emotionalIntensity: number;
    novelty: number;
    popularityPreference: number;
    mainstreamVsNiche: number;
    pacing: number;
  }>;
  features?: Array<{ featureType: 'GENRE' | 'THEME' | 'TAG' | 'CREATOR' | 'MEDIA_TYPE' | 'PACING'; featureKey: string; signal: number }>;
};

export function patchesFromFeedbackReason(reason: FeedbackReason, context?: { genres?: string[]; creators?: string[] }): PreferencePatch {
  switch (reason) {
    case 'TOO_SLOW':
      return {
        scalar: { pacing: 1 },
        features: [{ featureType: 'PACING', featureKey: 'slow', signal: -1 }],
      };
    case 'TOO_PREDICTABLE':
      return {
        scalar: { novelty: 1 },
        features: [{ featureType: 'TAG', featureKey: 'formulaic', signal: -1 }],
      };
    case 'TOO_DARK':
      return { scalar: { darkness: -1 } };
    case 'TOO_DIFFICULT':
      return { scalar: { complexity: -1 } };
    case 'TOO_MAINSTREAM':
      return { scalar: { mainstreamVsNiche: 1, popularityPreference: -1 } };
    case 'TOO_OBSCURE':
      return { scalar: { mainstreamVsNiche: -1, popularityPreference: 1 } };
    case 'WRONG_GENRE':
      return {
        features: (context?.genres ?? []).map((genre) => ({
          featureType: 'GENRE' as const,
          featureKey: genre,
          signal: -1,
        })),
      };
    case 'DONT_LIKE_CREATOR':
      return {
        features: (context?.creators ?? []).map((creator) => ({
          featureType: 'CREATOR' as const,
          featureKey: creator,
          signal: -1,
        })),
      };
    case 'NOT_INTERESTED_IN_PREMISE':
      return {
        features: [{ featureType: 'TAG', featureKey: 'premise', signal: -0.6 }],
      };
    case 'NOT_MY_MOOD':
      return { scalar: { novelty: 0.4 } };
    case 'OTHER':
      return {};
    default:
      return {};
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) {
    return 0;
  }
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    magA += av * av;
    magB += bv * bv;
  }
  if (magA === 0 || magB === 0) {
    return 0;
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

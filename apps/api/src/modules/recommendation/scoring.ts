import { PIPELINE, SCORING_WEIGHTS } from '@recommendation-genie/config';
import type { Mood, RecommendationMode, ScoringWeights } from '@recommendation-genie/types';

export type ScoredCandidate = {
  mediaId: string;
  content: number;
  taste: number;
  feedback: number;
  creator: number;
  quality: number;
  novelty: number;
  exploration: number;
  final: number;
  ai: number | null;
};

export function weightsForMode(mode: RecommendationMode, base: ScoringWeights = SCORING_WEIGHTS): ScoringWeights {
  switch (mode) {
    case 'HIDDEN_GEMS':
      return { ...base, quality: 0.22, exploration: 0.18, content: 0.22, taste: 0.2, feedback: 0.1, creator: 0.08 };
    case 'DEEP_CUTS':
      return { ...base, exploration: 0.28, quality: 0.18, content: 0.2, taste: 0.18, feedback: 0.08, creator: 0.08 };
    case 'SURPRISE_ME':
      return { ...base, exploration: 0.4, taste: 0.18, content: 0.18, feedback: 0.08, creator: 0.08, quality: 0.08 };
    case 'SIMILAR_TO':
      return { ...base, content: 0.45, creator: 0.2, taste: 0.15, feedback: 0.08, quality: 0.07, exploration: 0.05 };
    case 'MOOD':
      return { ...base, taste: 0.3, content: 0.25, exploration: 0.15, feedback: 0.12, creator: 0.1, quality: 0.08 };
    case 'SHORTLIST':
      return { ...base, taste: 0.28, content: 0.28, quality: 0.16, feedback: 0.12, creator: 0.1, exploration: 0.06 };
    default:
      return base;
  }
}

/** 0–1 alignment of media scalars to a requested mood (used in MOOD mode scoring). */
export function moodAlignment(
  mood: Mood,
  item: { darkness: number; pacing: number; emotionalIntensity: number; complexity: number },
): number {
  switch (mood) {
    case 'CHILL':
      return clamp01(1 - Math.max(item.pacing, 0) - Math.max(item.emotionalIntensity, 0) * 0.5);
    case 'ADRENALINE':
      return clamp01((item.pacing + 1) / 2);
    case 'EMOTIONAL':
      return clamp01((item.emotionalIntensity + 1) / 2);
    case 'DARK':
      return clamp01((item.darkness + 1) / 2);
    case 'FUNNY':
      return clamp01(1 - Math.max(item.darkness, 0));
    case 'MIND_BENDING':
      return clamp01((item.complexity + 1) / 2);
    case 'RELAXING':
      return clamp01(1 - Math.max(item.pacing, -0.2) - Math.max(item.darkness, 0) * 0.5);
    case 'INTENSE':
      return clamp01(((item.emotionalIntensity + item.pacing) / 2 + 1) / 2);
    default:
      return 0.5;
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function combineScores(
  parts: Omit<ScoredCandidate, 'final' | 'mediaId' | 'ai'>,
  weights: ScoringWeights,
): number {
  return (
    parts.content * weights.content +
    parts.taste * weights.taste +
    parts.feedback * weights.feedback +
    parts.creator * weights.creator +
    parts.quality * weights.quality +
    parts.exploration * weights.exploration
  );
}

export function mmrSelect<T extends { mediaId: string; final: number }>(
  ranked: T[],
  similarity: (a: string, b: string) => number,
  count: number = PIPELINE.finalSize,
  lambda = 0.7,
): T[] {
  const selected: T[] = [];
  const remaining = [...ranked];

  while (selected.length < count && remaining.length > 0) {
    let bestIndex = 0;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < remaining.length; i += 1) {
      const candidate = remaining[i];
      if (!candidate) {
        continue;
      }
      const diversityPenalty =
        selected.length === 0
          ? 0
          : Math.max(...selected.map((item) => similarity(candidate.mediaId, item.mediaId)));
      const mmr = lambda * candidate.final - (1 - lambda) * diversityPenalty;
      if (mmr > bestScore) {
        bestScore = mmr;
        bestIndex = i;
      }
    }
    const [chosen] = remaining.splice(bestIndex, 1);
    if (chosen) {
      selected.push(chosen);
    }
  }

  return selected;
}

export function normalize01(value: number, min = -1, max = 1): number {
  if (max === min) {
    return 0.5;
  }
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

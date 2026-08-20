import type { MediaType } from '@recommendation-genie/types';

/** Heuristic taste scalars from catalog metadata so live providers are not all-zero. */
export function inferTasteScalars(input: {
  type: MediaType;
  genres: string[];
  tags?: string[];
  description?: string | null;
}): {
  pacing: number;
  complexity: number;
  darkness: number;
  emotionalIntensity: number;
} {
  const bag = [...input.genres, ...(input.tags ?? []), input.description ?? '']
    .join(' ')
    .toLowerCase();

  const hit = (...words: string[]) => words.some((word) => bag.includes(word));

  let pacing = 0;
  let complexity = 0;
  let darkness = 0;
  let emotionalIntensity = 0;

  if (hit('action', 'thriller', 'race', 'fps', 'shooter', 'metal', 'punk', 'adrenaline')) {
    pacing += 0.45;
  }
  if (hit('comedy', 'slice', 'ambient', 'chill', 'relax', 'lofi', 'lo-fi', 'jazz')) {
    pacing -= 0.35;
  }
  if (hit('sci-fi', 'science fiction', 'mystery', 'strategy', 'rpg', 'puzzle', 'mind', 'cerebral')) {
    complexity += 0.4;
  }
  if (hit('documentary', 'family', 'pop', 'casual')) {
    complexity -= 0.25;
  }
  if (hit('horror', 'noir', 'dark', 'crime', 'war', 'gothic', 'black metal')) {
    darkness += 0.5;
  }
  if (hit('romance', 'feel-good', 'family', 'animation', 'indie pop')) {
    darkness -= 0.3;
  }
  if (hit('drama', 'emotional', 'romance', 'tragedy', 'soul', 'intense')) {
    emotionalIntensity += 0.4;
  }
  if (hit('ambient', 'instrumental', 'minimal', 'documentary')) {
    emotionalIntensity -= 0.2;
  }

  if (input.type === 'GAME' && hit('roguelike', 'souls', 'hardcore')) {
    complexity += 0.25;
    pacing += 0.15;
  }
  if (input.type === 'MUSIC' && hit('electronic', 'dance', 'techno', 'house')) {
    pacing += 0.3;
  }

  const clamp = (value: number) => Math.max(-1, Math.min(1, value));
  return {
    pacing: clamp(pacing),
    complexity: clamp(complexity),
    darkness: clamp(darkness),
    emotionalIntensity: clamp(emotionalIntensity),
  };
}

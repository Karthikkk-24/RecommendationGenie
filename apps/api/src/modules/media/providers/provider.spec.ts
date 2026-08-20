import { patchesFromFeedbackReason } from '../../taste/taste-algorithm';
import type { NormalizedMedia } from './media-provider';
import { tmdbGenresFromRow } from './tmdb.provider';

describe('provider contract', () => {
  it('keeps adapter output inside NormalizedMedia fields', () => {
    const item: NormalizedMedia = {
      provider: 'mock',
      externalId: 't1',
      type: 'MOVIE',
      title: 'Fixture',
      description: 'A seeded title',
      releaseDate: null,
      language: 'en',
      runtimeMinutes: 120,
      posterUrl: null,
      popularity: 0.4,
      qualityScore: 0.8,
      pacing: 0.5,
      complexity: 0.7,
      darkness: 0.2,
      emotionalIntensity: 0.4,
      genres: ['sci-fi'],
      tags: ['slow-burn'],
      people: [{ name: 'Director', role: 'DIRECTOR' }],
    };
    expect(Object.keys(item)).not.toContain('rawTmdb');
    expect(item.provider).toBe('mock');
  });
});

describe('tmdb genre extraction', () => {
  it('maps search genre_ids to names', () => {
    expect(tmdbGenresFromRow({ genre_ids: [878, 53] })).toEqual(['sci-fi', 'thriller']);
  });

  it('prefers details genres when present', () => {
    expect(
      tmdbGenresFromRow({
        genres: [{ id: 18, name: 'Drama' }],
        genre_ids: [878],
      }),
    ).toEqual(['drama']);
  });
});

describe('feedback reason map', () => {
  it('maps TOO_SLOW onto pacing rather than genre strings', () => {
    const patch = patchesFromFeedbackReason('TOO_SLOW');
    expect(patch.scalar?.pacing).toBe(1);
    expect(patch.features?.some((f) => f.featureKey === 'slow')).toBe(true);
  });
});

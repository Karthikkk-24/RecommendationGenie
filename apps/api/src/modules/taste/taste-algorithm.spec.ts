import {
  applyPreferenceUpdate,
  interactionSignal,
  patchesFromFeedbackReason,
} from './taste-algorithm';

describe('TasteService algorithm', () => {
  it('does not let a single interaction rewrite a profile', () => {
    const next = applyPreferenceUpdate(0.2, 1, 0.25);
    expect(next).toBeLessThanOrEqual(0.5);
    expect(next).toBeGreaterThan(0.2);
  });

  it('reduces slow-content preference when feedback is TOO_SLOW', () => {
    const patch = patchesFromFeedbackReason('TOO_SLOW');
    expect(patch.features?.[0]?.featureKey).toBe('slow');
    expect(patch.features?.[0]?.signal).toBeLessThan(0);
    const pacing = applyPreferenceUpdate(-0.1, patch.scalar?.pacing ?? 0, 0.2);
    expect(pacing).toBeGreaterThan(-0.1);
  });

  it('lowers genre weight for WRONG_GENRE', () => {
    const patch = patchesFromFeedbackReason('WRONG_GENRE', { genres: ['romance'] });
    expect(patch.features).toEqual([
      expect.objectContaining({ featureType: 'GENRE', featureKey: 'romance', signal: -1 }),
    ]);
  });

  it('applies a soft genre push-away for OTHER feedback', () => {
    const patch = patchesFromFeedbackReason('OTHER', { genres: ['horror', 'thriller'] });
    expect(patch.scalar?.novelty).toBeGreaterThan(0);
    expect(patch.features?.[0]).toEqual(
      expect.objectContaining({ featureType: 'GENRE', featureKey: 'horror', signal: -0.4 }),
    );
  });

  it('treats SKIP and MAYBE-equivalent rates as negative signals', () => {
    expect(interactionSignal('SKIP')).toBe(-1);
    expect(interactionSignal('DISLIKE')).toBe(-1);
    expect(interactionSignal('NOT_INTERESTED')).toBe(-1);
    expect(interactionSignal('LIKE')).toBe(1);
    expect(interactionSignal('LOVE')).toBe(1);
  });

  it('ignores RATED interactions without a rating', () => {
    expect(interactionSignal('RATED')).toBe(0);
    expect(interactionSignal('RATED', 5)).toBeGreaterThan(0);
  });
});

import { applyPreferenceUpdate, patchesFromFeedbackReason } from '../taste/taste-algorithm';
import { combineScores, mmrSelect } from './scoring';

describe('recommendation feedback loop', () => {
  it('reduces slow-content preference after TOO_SLOW feedback and then penalizes slow items', () => {
    const slowPref = applyPreferenceUpdate(
      0,
      patchesFromFeedbackReason('TOO_SLOW').features?.[0]?.signal ?? 0,
      0.22,
    );
    expect(slowPref).toBeLessThan(0);

    const weights = {
      content: 0.3,
      taste: 0.25,
      feedback: 0.15,
      creator: 0.1,
      quality: 0.1,
      exploration: 0.1,
    };

    const slowItem = combineScores(
      {
        content: 0.8,
        taste: 0.8 + slowPref,
        feedback: slowPref,
        creator: 0.4,
        quality: 0.8,
        exploration: 0.2,
      },
      weights,
    );
    const fasterItem = combineScores(
      {
        content: 0.75,
        taste: 0.8,
        feedback: 0.2,
        creator: 0.4,
        quality: 0.8,
        exploration: 0.2,
      },
      weights,
    );

    expect(fasterItem).toBeGreaterThan(slowItem);
  });

  it('diversifies near-duplicate high scores with MMR', () => {
    const selected = mmrSelect(
      [
        { mediaId: 'a', final: 0.95 },
        { mediaId: 'b', final: 0.94 },
        { mediaId: 'c', final: 0.7 },
      ],
      (left, right) => (left === 'a' && right === 'b') || (left === 'b' && right === 'a') ? 0.98 : 0.1,
      2,
      0.5,
    );
    const ids = selected.map((row) => row.mediaId);
    expect(ids).toContain('a');
    expect(ids).toContain('c');
  });
});

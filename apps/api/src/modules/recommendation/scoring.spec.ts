import { combineScores, weightsForMode, type ScoredCandidate } from './scoring';

describe('scoring', () => {
  it('does not let popularity dominate a strong taste match', () => {
    const weights = {
      content: 0.3,
      taste: 0.25,
      feedback: 0.15,
      creator: 0.1,
      quality: 0.1,
      exploration: 0.1,
    };

    const personal: ScoredCandidate = {
      mediaId: 'a',
      content: 0.9,
      taste: 0.95,
      feedback: 0.8,
      creator: 0.7,
      quality: 0.4,
      novelty: 0.6,
      exploration: 0.2,
      ai: null,
      final: 0,
    };
    const popular: ScoredCandidate = {
      mediaId: 'b',
      content: 0.2,
      taste: 0.1,
      feedback: 0.1,
      creator: 0.1,
      quality: 0.99,
      novelty: 0.1,
      exploration: 0.1,
      ai: null,
      final: 0,
    };

    const personalFinal = combineScores(personal, weights);
    const popularFinal = combineScores(popular, weights);
    expect(personalFinal).toBeGreaterThan(popularFinal);
  });

  it('raises exploration for SURPRISE_ME and down-weights popularity modes', () => {
    const base = {
      content: 0.3,
      taste: 0.25,
      feedback: 0.15,
      creator: 0.1,
      quality: 0.1,
      exploration: 0.1,
    };
    expect(weightsForMode('SURPRISE_ME', base).exploration).toBeGreaterThan(base.exploration);
    expect(weightsForMode('HIDDEN_GEMS', base).quality).toBeGreaterThan(base.quality);
    expect(weightsForMode('DEEP_CUTS', base).exploration).toBeGreaterThan(base.exploration);
  });
});

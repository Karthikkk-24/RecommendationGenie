import { localeLanguagesFor, localeMatchBoost } from './locale-preference';

describe('locale preference', () => {
  it('merges preferred language and country languages', () => {
    expect(localeLanguagesFor('en', 'JP')).toEqual(expect.arrayContaining(['en', 'ja']));
  });

  it('boosts matching item languages', () => {
    expect(localeMatchBoost('ja', ['en', 'ja'])).toBe(0.2);
    expect(localeMatchBoost('fr', ['en', 'ja'])).toBe(0);
    expect(localeMatchBoost(null, ['en'])).toBe(0);
  });
});

import { expandCrossMediaKeys } from './cross-media-map';

describe('expandCrossMediaKeys', () => {
  it('maps cyberpunk to neon/synthwave/sci-fi aliases', () => {
    const keys = expandCrossMediaKeys(['cyberpunk']);
    expect(keys).toEqual(
      expect.arrayContaining(['cyberpunk', 'sci-fi', 'neon', 'synthwave', 'noir']),
    );
  });

  it('expands reverse aliases (science fiction → sci-fi)', () => {
    const keys = expandCrossMediaKeys(['science fiction']);
    expect(keys).toEqual(expect.arrayContaining(['sci-fi', 'science fiction', 'cyberpunk']));
  });
});

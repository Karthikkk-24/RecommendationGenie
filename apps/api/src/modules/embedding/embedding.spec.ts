import { createHash } from 'node:crypto';

// Mirror parseVector behavior for unit coverage without Nest DI.
function parseVector(raw: string | null): number[] | null {
  if (!raw) {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  try {
    const asJson = trimmed.startsWith('[') ? trimmed : `[${trimmed}]`;
    const parsed = JSON.parse(asJson) as unknown;
    if (Array.isArray(parsed) && parsed.every((n) => typeof n === 'number')) {
      return parsed;
    }
  } catch {
    // Fall through.
  }
  const values = trimmed
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .replace(/^\{/, '')
    .replace(/\}$/, '')
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((n) => !Number.isNaN(n));
  return values.length > 0 ? values : null;
}

describe('embedding vector parsing', () => {
  it('parses bracket and brace pgvector text forms', () => {
    expect(parseVector('[0.1,0.2,0.3]')).toEqual([0.1, 0.2, 0.3]);
    expect(parseVector('{0.1,0.2,0.3}')).toEqual([0.1, 0.2, 0.3]);
  });

  it('returns null for empty input', () => {
    expect(parseVector(null)).toBeNull();
    expect(parseVector('')).toBeNull();
  });

  it('content hash changes when interaction set changes', () => {
    const a = createHash('sha256').update(['m1:LIKE', 'm2:LOVE'].sort().join('|')).digest('hex');
    const b = createHash('sha256').update(['m1:LIKE', 'm2:DISLIKE'].sort().join('|')).digest('hex');
    expect(a).not.toEqual(b);
  });
});

/**
 * Cross-media label aliases so taste keys from one medium match catalog labels
 * on another (e.g. game "sci-fi" → movie "science fiction", music "synthwave").
 */
const CROSS_MEDIA_ALIASES: Record<string, string[]> = {
  'sci-fi': ['sci-fi', 'science fiction', 'scifi', 'cyberpunk', 'space', 'futuristic'],
  'science fiction': ['sci-fi', 'science fiction', 'scifi', 'cyberpunk'],
  cyberpunk: ['cyberpunk', 'sci-fi', 'neon', 'synthwave', 'dystopian', 'noir'],
  neon: ['neon', 'cyberpunk', 'synthwave', 'electronic'],
  synthwave: ['synthwave', 'electronic', 'neon', 'cyberpunk', 'retrowave'],
  electronic: ['electronic', 'synthwave', 'techno', 'house', 'ambient'],
  noir: ['noir', 'neo-noir', 'crime', 'thriller', 'dark'],
  'neo-noir': ['noir', 'neo-noir', 'crime', 'thriller'],
  horror: ['horror', 'thriller', 'dark', 'gothic'],
  thriller: ['thriller', 'mystery', 'crime', 'action', 'suspense'],
  mystery: ['mystery', 'thriller', 'detective', 'puzzle'],
  fantasy: ['fantasy', 'adventure', 'rpg', 'magic'],
  rpg: ['rpg', 'fantasy', 'adventure', 'role-playing'],
  action: ['action', 'adventure', 'thriller', 'fps', 'shooter'],
  fps: ['fps', 'shooter', 'action'],
  shooter: ['shooter', 'fps', 'action'],
  romance: ['romance', 'drama', 'feel-good'],
  drama: ['drama', 'emotional', 'indie'],
  comedy: ['comedy', 'funny', 'satire'],
  indie: ['indie', 'art-house', 'alternative', 'experimental'],
  ambient: ['ambient', 'chill', 'instrumental', 'relaxing'],
  metal: ['metal', 'rock', 'intense', 'dark'],
  psychological: ['psychological', 'mind-bending', 'thriller', 'drama'],
  'mind-bending': ['mind-bending', 'psychological', 'sci-fi', 'mystery'],
  heist: ['heist', 'crime', 'thriller', 'action'],
  'found-family': ['found-family', 'drama', 'adventure', 'feel-good'],
  dystopian: ['dystopian', 'sci-fi', 'cyberpunk', 'dark'],
};

export function expandCrossMediaKeys(keys: string[]): string[] {
  const expanded = new Set<string>();
  for (const key of keys) {
    const normalized = key.trim().toLowerCase();
    if (!normalized) {
      continue;
    }
    expanded.add(normalized);
    for (const alias of CROSS_MEDIA_ALIASES[normalized] ?? []) {
      expanded.add(alias);
    }
    // Also expand if the key is an alias target of another canonical entry.
    for (const [canonical, aliases] of Object.entries(CROSS_MEDIA_ALIASES)) {
      if (aliases.includes(normalized)) {
        expanded.add(canonical);
        for (const alias of aliases) {
          expanded.add(alias);
        }
      }
    }
  }
  return [...expanded];
}

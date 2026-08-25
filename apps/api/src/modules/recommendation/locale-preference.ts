/** ISO country → languages commonly associated with that market (lowercase ISO 639-1). */
const COUNTRY_LANGUAGES: Record<string, readonly string[]> = {
  US: ['en'],
  GB: ['en'],
  AU: ['en'],
  CA: ['en', 'fr'],
  IN: ['en', 'hi', 'ta', 'te', 'ml', 'bn'],
  JP: ['ja'],
  KR: ['ko'],
  FR: ['fr'],
  DE: ['de'],
  ES: ['es'],
  MX: ['es'],
  BR: ['pt'],
  PT: ['pt'],
  IT: ['it'],
  CN: ['zh'],
  TW: ['zh'],
  HK: ['zh', 'en'],
};

/** Languages implied by profile preferredLanguage + country for filtering/boosting. */
export function localeLanguagesFor(
  preferredLanguage?: string | null,
  country?: string | null,
): string[] {
  const langs = new Set<string>();
  const language = preferredLanguage?.trim().toLowerCase();
  if (language) {
    langs.add(language);
  }
  const countryCode = country?.trim().toUpperCase();
  if (countryCode) {
    for (const code of COUNTRY_LANGUAGES[countryCode] ?? []) {
      langs.add(code);
    }
  }
  return [...langs];
}

export function localeMatchBoost(itemLanguage: string | null | undefined, localeLanguages: string[]): number {
  if (!itemLanguage || localeLanguages.length === 0) {
    return 0;
  }
  return localeLanguages.includes(itemLanguage.toLowerCase()) ? 0.2 : 0;
}

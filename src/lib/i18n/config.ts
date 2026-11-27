/**
 * Locale catalogue for SophionOS.
 *
 * Scope ruling (owner, 2026-11-25): international languages only. The 38 codes
 * below are the full product scope; no regional languages. Tier 1 ships with
 * the i18n mechanism, Tier 2 is dictionary-only later, Tier 3 needs the RTL
 * layout pass first.
 *
 * This module is safe on both server and client (no React, no browser APIs).
 */

export const LOCALE_CODES = [
  // Tier 1 — shipped with the mechanism.
  "en",
  "ja",
  "es",
  "es-MX",
  "fr",
  "de",
  "pt",
  "it",
  "nl",
  "zh",
  "ko",
  "hi",
  "ru",
  // Tier 2 — dictionary-only follow-up.
  "pl",
  "cs",
  "uk",
  "bg",
  "tr",
  "sv",
  "no",
  "fi",
  "da",
  "el",
  "ro",
  "hr",
  "et",
  "th",
  "vi",
  "id",
  "bn",
  "mn",
  "kk",
  "ky",
  "fil",
  // Tier 3 — needs an RTL layout pass first.
  "ar",
  "ur",
  "fa",
  "he",
] as const;

export type Locale = (typeof LOCALE_CODES)[number];

export interface LocaleMeta {
  code: Locale;
  /** Endonym shown in the language picker. */
  nativeName: string;
  tier: 1 | 2 | 3;
  /** Locale that supplies missing strings before English. */
  inherits?: Locale;
  /** False for the Tier-3 locales that still need the RTL layout pass. */
  direction: "ltr" | "rtl";
}

export const LOCALES: readonly LocaleMeta[] = [
  { code: "en", nativeName: "English", tier: 1, direction: "ltr" },
  { code: "ja", nativeName: "日本語", tier: 1, direction: "ltr" },
  { code: "es", nativeName: "Español", tier: 1, direction: "ltr" },
  { code: "es-MX", nativeName: "Español (México)", tier: 1, inherits: "es", direction: "ltr" },
  { code: "fr", nativeName: "Français", tier: 1, direction: "ltr" },
  { code: "de", nativeName: "Deutsch", tier: 1, direction: "ltr" },
  { code: "pt", nativeName: "Português", tier: 1, direction: "ltr" },
  { code: "it", nativeName: "Italiano", tier: 1, direction: "ltr" },
  { code: "nl", nativeName: "Nederlands", tier: 1, direction: "ltr" },
  { code: "zh", nativeName: "中文", tier: 1, direction: "ltr" },
  { code: "ko", nativeName: "한국어", tier: 1, direction: "ltr" },
  { code: "hi", nativeName: "हिन्दी", tier: 1, direction: "ltr" },
  { code: "ru", nativeName: "Русский", tier: 1, direction: "ltr" },
  { code: "pl", nativeName: "Polski", tier: 2, direction: "ltr" },
  { code: "cs", nativeName: "Čeština", tier: 2, direction: "ltr" },
  { code: "uk", nativeName: "Українська", tier: 2, direction: "ltr" },
  { code: "bg", nativeName: "Български", tier: 2, direction: "ltr" },
  { code: "tr", nativeName: "Türkçe", tier: 2, direction: "ltr" },
  { code: "sv", nativeName: "Svenska", tier: 2, direction: "ltr" },
  { code: "no", nativeName: "Norsk", tier: 2, direction: "ltr" },
  { code: "fi", nativeName: "Suomi", tier: 2, direction: "ltr" },
  { code: "da", nativeName: "Dansk", tier: 2, direction: "ltr" },
  { code: "el", nativeName: "Ελληνικά", tier: 2, direction: "ltr" },
  { code: "ro", nativeName: "Română", tier: 2, direction: "ltr" },
  { code: "hr", nativeName: "Hrvatski", tier: 2, direction: "ltr" },
  { code: "et", nativeName: "Eesti", tier: 2, direction: "ltr" },
  { code: "th", nativeName: "ไทย", tier: 2, direction: "ltr" },
  { code: "vi", nativeName: "Tiếng Việt", tier: 2, direction: "ltr" },
  { code: "id", nativeName: "Bahasa Indonesia", tier: 2, direction: "ltr" },
  { code: "bn", nativeName: "বাংলা", tier: 2, direction: "ltr" },
  { code: "mn", nativeName: "Монгол", tier: 2, direction: "ltr" },
  { code: "kk", nativeName: "Қазақша", tier: 2, direction: "ltr" },
  { code: "ky", nativeName: "Кыргызча", tier: 2, direction: "ltr" },
  { code: "fil", nativeName: "Filipino", tier: 2, direction: "ltr" },
  { code: "ar", nativeName: "العربية", tier: 3, direction: "rtl" },
  { code: "ur", nativeName: "اردو", tier: 3, direction: "rtl" },
  { code: "fa", nativeName: "فارسی", tier: 3, direction: "rtl" },
  { code: "he", nativeName: "עברית", tier: 3, direction: "rtl" },
];

/** Locales whose dictionaries ship with the i18n mechanism. */
export const TIER1_LOCALES = LOCALES.filter((locale) => locale.tier === 1);

/** Locales with a stored dictionary that the UI can select (Tier 1 + Tier 2). */
export const AVAILABLE_LOCALES = LOCALES.filter((locale) => locale.tier <= 2);

export const DEFAULT_LOCALE: Locale = "en";

const LOCALE_BY_LOWER = new Map(LOCALES.map((locale) => [locale.code.toLowerCase(), locale]));

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && LOCALE_BY_LOWER.has(value.toLowerCase());
}

/** Resolve a stored/route value to a supported locale, else English. */
export function resolveLocale(value: string | null | undefined): Locale {
  if (!value) return DEFAULT_LOCALE;
  return LOCALE_BY_LOWER.get(value.toLowerCase())?.code ?? DEFAULT_LOCALE;
}

export function localeMeta(code: Locale): LocaleMeta {
  return LOCALES.find((locale) => locale.code === code) ?? LOCALES[0];
}

/**
 * Map a browser locale list (`navigator.languages`) to the closest supported
 * locale: exact region first (es-MX), then the base language (es), then
 * English. Matching is case-insensitive.
 */
export function matchBrowserLocale(languages: readonly string[]): Locale {
  for (const tag of languages) {
    const exact = LOCALE_BY_LOWER.get(tag.toLowerCase());
    if (exact) return exact.code;
  }
  for (const tag of languages) {
    const base = tag.split("-")[0]?.toLowerCase();
    if (!base) continue;
    const match = LOCALES.find((locale) => locale.code.toLowerCase() === base);
    if (match) return match.code;
  }
  return DEFAULT_LOCALE;
}

/** Locale chain used for fallback: self, inherited locale, English. */
export function localeChain(code: Locale): Locale[] {
  const chain: Locale[] = [code];
  const parent = localeMeta(code).inherits;
  if (parent && !chain.includes(parent)) chain.push(parent);
  if (!chain.includes(DEFAULT_LOCALE)) chain.push(DEFAULT_LOCALE);
  return chain;
}

export function isRtl(code: Locale): boolean {
  return localeMeta(code).direction === "rtl";
}

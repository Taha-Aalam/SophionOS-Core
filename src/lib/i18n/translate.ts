import {
  DEFAULT_LOCALE,
  localeChain,
  type Locale,
} from "./config";
import en, { type Dictionary, type TranslationKey } from "./dictionary";

export type TranslationVars = Record<string, string | number | undefined | null>;

/** Stored strings for a locale; es-MX arrives pre-merged with es. */
export type StoredDictionary = Partial<Dictionary>;

export function interpolate(template: string, vars?: TranslationVars): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined || value === null ? match : String(value);
  });
}

/**
 * Pick one key out of the fallback chain, never returning blank or a raw key.
 *
 * Order: active locale → inherited locale (es for es-MX) → English → the key
 * itself. An empty-string translation is treated as missing so a half-finished
 * translation file cannot blank the UI.
 */
export function translate(
  key: TranslationKey,
  locale: Locale,
  dictionaries: Partial<Record<Locale, StoredDictionary>>,
  vars?: TranslationVars,
): string {
  for (const candidate of localeChain(locale)) {
    const value =
      candidate === DEFAULT_LOCALE
        ? en[key]
        : dictionaries[candidate]?.[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return interpolate(value, vars);
    }
  }
  return key;
}

/**
 * Plural-aware translate. `base` names a family of keys with `.one` / `.other`
 * suffixes (or the CLDR categories a locale actually uses). A locale that only
 * provides `.other` still resolves for count 1, and any missing category falls
 * back to `.other` before English.
 */
export function translatePlural(
  base: string,
  count: number,
  locale: Locale,
  dictionaries: Partial<Record<Locale, StoredDictionary>>,
  vars?: TranslationVars,
): string {
  const withCount = { ...vars, count };
  const category = pluralCategory(locale, count);
  const keys = [`${base}.${category}`, `${base}.other`, base] as const;

  for (const candidate of localeChain(locale)) {
    const source: Record<string, string | undefined> =
      candidate === DEFAULT_LOCALE
        ? en
        : (dictionaries[candidate] as Record<string, string | undefined> | undefined) ?? {};
    for (const key of keys) {
      const value = source[key];
      if (typeof value === "string" && value.trim().length > 0) {
        return interpolate(value, withCount);
      }
    }
  }
  return base;
}

function pluralCategory(locale: Locale, count: number): Intl.LDMLPluralRule {
  try {
    return new Intl.PluralRules(locale).select(count);
  } catch {
    return count === 1 ? "one" : "other";
  }
}

import { DEFAULT_LOCALE, resolveLocale, type Locale } from "./config";
import type { Dictionary } from "./dictionary";
import { loadLocaleDictionary } from "./loaders";

/**
 * Server-side locale bootstrap for a layout.
 *
 * Reads the user's stored preference with the request's Supabase client and
 * returns the resolved locale plus its dictionary. Only the active locale is
 * serialised into the RSC payload, so other dictionaries stay off the wire
 * until the user actually switches language.
 */
export async function resolveUserLocale(
  storedLanguage: string | null | undefined,
): Promise<{
  locale: Locale;
  hasStoredLocale: boolean;
  dictionary: Partial<Dictionary>;
}> {
  const hasStoredLocale = typeof storedLanguage === "string" && storedLanguage.length > 0;
  const locale = hasStoredLocale ? resolveLocale(storedLanguage) : DEFAULT_LOCALE;
  const dictionary = locale === DEFAULT_LOCALE ? {} : await loadLocaleDictionary(locale);
  return { locale, hasStoredLocale, dictionary };
}

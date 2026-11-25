import { auth } from "@clerk/nextjs/server";

import { userSettingsService } from "@/lib/services/user-settings.service";
import { createClient } from "@/lib/supabase/server";

import { DEFAULT_LOCALE, resolveLocale, type Locale } from "./config";
import type { Dictionary, TranslationKey } from "./dictionary";
import { loadLocaleDictionary } from "./loaders";
import { translate, type TranslationVars } from "./translate";

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

/**
 * Legal-route language resolution (deliberate deviation from the rest of the UI):
 * signed-in visitors get their saved `user_settings.preferences.language`;
 * signed-out visitors ALWAYS get English — navigator languages are never used
 * here. The rest of the app keeps its existing first-visit browser derivation.
 *
 * Only the active locale's dictionary is loaded, so no other locale ships to
 * the client. The legal pages are Server Components and use `t` directly.
 */
export async function getLegalI18n(): Promise<{
  locale: Locale;
  t: (key: TranslationKey, vars?: TranslationVars) => string;
}> {
  const { userId } = await auth();
  if (!userId) {
    return {
      locale: DEFAULT_LOCALE,
      t: (key, vars) => translate(key, DEFAULT_LOCALE, {}, vars),
    };
  }

  let storedLanguage: string | null = null;
  try {
    const supabase = await createClient();
    const preferences = await userSettingsService.getPreferences(userId, { supabase });
    storedLanguage = preferences?.language ?? null;
  } catch {
    // A failed preference read must never block a legal document.
  }

  const { locale, dictionary } = await resolveUserLocale(storedLanguage);
  return {
    locale,
    t: (key, vars) => translate(key, locale, { [locale]: dictionary }, vars),
  };
}

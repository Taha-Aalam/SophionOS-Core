"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/components/providers/auth-provider";
import {
  DEFAULT_LOCALE,
  isRtl,
  matchBrowserLocale,
  type Locale,
} from "@/lib/i18n/config";
import type { Dictionary, TranslationKey } from "@/lib/i18n/dictionary";
import {
  formatDate as formatDateIntl,
  formatNumber as formatNumberIntl,
} from "@/lib/i18n/format";
import { loadLocaleDictionary } from "@/lib/i18n/loaders";
import {
  translate,
  translatePlural,
  type StoredDictionary,
  type TranslationVars,
} from "@/lib/i18n/translate";
import { USER_SETTINGS_QUERY_KEY } from "@/lib/hooks/use-user-settings";
import { userSettingsService } from "@/lib/services/user-settings.service";

interface I18nContextValue {
  locale: Locale;
  /** Switch the UI locale. Persists to user settings unless `persist` is false. */
  setLocale: (next: Locale, persist?: boolean) => Promise<void>;
  t: (key: TranslationKey, vars?: TranslationVars) => string;
  tp: (base: string, count: number, vars?: TranslationVars) => string;
  formatDate: (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
}

const StoredDictionaries = {} as Record<Locale, StoredDictionary>;

const I18nContext = createContext<I18nContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: async () => {},
  t: (key, vars) => translate(key, DEFAULT_LOCALE, StoredDictionaries, vars),
  tp: (base, count, vars) =>
    translatePlural(base, count, DEFAULT_LOCALE, StoredDictionaries, vars),
  formatDate: (value, options) => formatDateIntl(value, DEFAULT_LOCALE, options),
  formatNumber: (value, options) => formatNumberIntl(value, DEFAULT_LOCALE, options),
});

export function I18nProvider({
  children,
  initialLocale = DEFAULT_LOCALE,
  /** False when the account has no stored language yet — browser locale wins. */
  hasStoredLocale = false,
  /** Active-locale dictionary resolved on the server, so reloads never flash English. */
  initialDictionary,
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
  hasStoredLocale?: boolean;
  initialDictionary?: StoredDictionary | null;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [dictionaries, setDictionaries] = useState<Partial<Record<Locale, StoredDictionary>>>(
    () =>
      initialLocale === DEFAULT_LOCALE || !initialDictionary
        ? {}
        : { [initialLocale]: initialDictionary },
  );

  // Locale → promise, so two rapid switches cannot race and land the wrong
  // dictionary on the active locale.
  const loading = useRef(new Map<Locale, Promise<StoredDictionary>>());
  // The server already sent the active locale's dictionary; do not fetch that
  // same chunk again on hydration.
  const loadedLocales = useRef(new Set<Locale>(initialDictionary ? [initialLocale] : []));

  const ensureDictionary = useCallback(async (next: Locale): Promise<StoredDictionary> => {
    if (next === DEFAULT_LOCALE || loadedLocales.current.has(next)) return {};
    const cached = loading.current.get(next);
    if (cached) return cached;
    const promise = loadLocaleDictionary(next).then((loaded) => {
      loadedLocales.current.add(next);
      setDictionaries((prev) => ({ ...prev, [next]: loaded }));
      return loaded;
    });
    loading.current.set(next, promise);
    return promise;
  }, []);

  // First visit with no stored preference: follow the browser. This runs after
  // mount, so server HTML and the first client render agree (English), then the
  // detected locale swaps in.
  useEffect(() => {
    if (hasStoredLocale) return;
    if (typeof navigator === "undefined") return;
    const detected = matchBrowserLocale(navigator.languages ?? [navigator.language]);
    if (detected === locale) return;
    let cancelled = false;
    void ensureDictionary(detected).then(() => {
      if (!cancelled) setLocaleState(detected);
    });
    return () => {
      cancelled = true;
    };
    // Intentionally mount-only: a later user choice must not be overridden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void ensureDictionary(locale);
  }, [locale, ensureDictionary]);

  // Keep the document language/direction in sync for a11y and font fallback.
  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = isRtl(locale) ? "rtl" : "ltr";
  }, [locale]);

  const setLocale = useCallback(
    async (next: Locale, persist = true) => {
      await ensureDictionary(next);
      setLocaleState(next);

      if (!persist || !user?.id) return;
      try {
        const current = await userSettingsService.getPreferences(user.id);
        await userSettingsService.setPreferences(user.id, {
          ...(current ?? {}),
          language: next,
        });
        await queryClient.invalidateQueries({ queryKey: [USER_SETTINGS_QUERY_KEY] });
      } catch {
        // The UI stays in the chosen language for this session even if the
        // write fails; the next successful save (Preferences → Save) retries.
      }
    },
    [ensureDictionary, queryClient, user],
  );

  const t = useCallback(
    (key: TranslationKey, vars?: TranslationVars) =>
      translate(key, locale, dictionaries, vars),
    [locale, dictionaries],
  );

  const tp = useCallback(
    (base: string, count: number, vars?: TranslationVars) =>
      translatePlural(base, count, locale, dictionaries, vars),
    [locale, dictionaries],
  );

  const formatDate = useCallback(
    (value: Date | number | string, options?: Intl.DateTimeFormatOptions) =>
      formatDateIntl(value, locale, options),
    [locale],
  );

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) =>
      formatNumberIntl(value, locale, options),
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t, tp, formatDate, formatNumber }),
    [locale, setLocale, t, tp, formatDate, formatNumber],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}

/** Convenience hook for components that only need the translator. */
export function useTranslation() {
  const { t, tp, locale } = useI18n();
  return { t, tp, locale };
}

export type { Dictionary };

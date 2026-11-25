import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  breadcrumbLabelKeys,
  coreNavItems,
  systemNavItems,
  trustNavItems,
} from "@/components/layout/navigation";
import {
  LOCALE_CODES,
  TIER1_LOCALES,
  type Locale,
} from "@/lib/i18n/config";
import en, { type Dictionary } from "@/lib/i18n/dictionary";
import { NAV_SEARCH_KEYWORDS } from "@/lib/i18n/nav-search-keywords";
import { translate } from "@/lib/i18n/translate";
import de from "@/lib/i18n/locales/de";
import es from "@/lib/i18n/locales/es";
import esMX from "@/lib/i18n/locales/es-MX";
import fr from "@/lib/i18n/locales/fr";
import hi from "@/lib/i18n/locales/hi";
import itLocale from "@/lib/i18n/locales/it";
import ja from "@/lib/i18n/locales/ja";
import ko from "@/lib/i18n/locales/ko";
import nl from "@/lib/i18n/locales/nl";
import pt from "@/lib/i18n/locales/pt";
import ru from "@/lib/i18n/locales/ru";
import zh from "@/lib/i18n/locales/zh";

const SRC = new URL("../../src", import.meta.url).pathname;

const STORED_DICTIONARIES: Partial<Record<Locale, Partial<Dictionary>>> = {
  de,
  es,
  "es-MX": esMX,
  fr,
  hi,
  it: itLocale,
  ja,
  ko,
  nl,
  pt,
  ru,
  zh,
};

const EN_KEYS = Object.keys(en) as Array<keyof Dictionary>;

describe("i18n locale scope", () => {
  it("covers exactly the 38 international codes from the owner decision", () => {
    expect(LOCALE_CODES).toHaveLength(38);
    expect(new Set(LOCALE_CODES).size).toBe(38);
    expect(LOCALE_CODES).toEqual([
      "en", "ja", "es", "es-MX", "fr", "de", "pt", "it", "nl", "zh", "ko", "hi", "ru",
      "pl", "cs", "uk", "bg", "tr", "sv", "no", "fi", "da", "el", "ro", "hr", "et",
      "th", "vi", "id", "bn", "mn", "kk", "ky", "fil", "ar", "ur", "fa", "he",
    ]);
  });

  it("ships thirteen stored Tier-1 locales with English as source", () => {
    expect(TIER1_LOCALES.map((locale) => locale.code)).toEqual([
      "en", "ja", "es", "es-MX", "fr", "de", "pt", "it", "nl", "zh", "ko", "hi", "ru",
    ]);
  });
});

describe("dictionary parity", () => {
  it("every locale key exists in English (no orphan or typo keys)", () => {
    for (const [locale, dictionary] of Object.entries(STORED_DICTIONARIES)) {
      for (const key of Object.keys(dictionary)) {
        expect(EN_KEYS, `${locale} → ${key}`).toContain(key);
      }
    }
  });

  it("es-MX stores only overrides and its keys are a subset of es", () => {
    for (const key of Object.keys(esMX)) {
      expect(Object.keys(es), `es-MX → ${key}`).toContain(key);
    }
  });

  it("resolves every English key to non-blank copy in every Tier-1 locale", () => {
    for (const { code } of TIER1_LOCALES) {
      for (const key of EN_KEYS) {
        const value = translate(key, code, STORED_DICTIONARIES);
        expect(value, `${code} → ${key}`).toBeTruthy();
        expect(value, `${code} → ${key}`).not.toBe(key);
      }
    }
  });

  it("falls back to English for long-tail keys a locale has not translated", () => {
    // This key is intentionally English-only in the seed/locale files.
    expect(ja["tasks.subtitle.other" as keyof typeof ja]).toBeUndefined();
    expect(translate("tasks.subtitle.other", "ja", STORED_DICTIONARIES)).toBe(
      en["tasks.subtitle.other"],
    );
  });

  it("es-MX resolves through Spanish before English", () => {
    expect(translate("nav.tasks", "es-MX", STORED_DICTIONARIES)).toBe(es["nav.tasks"]);
  });

  it("covers every ja-translated key in every stored Tier-1 locale", () => {
    for (const [code, dictionary] of Object.entries(STORED_DICTIONARIES)) {
      // es-MX stores only overrides and inherits the rest from es.
      const parent = code === "es-MX" ? es : undefined;
      for (const key of Object.keys(ja) as Array<keyof Dictionary>) {
        const value = dictionary[key] ?? parent?.[key];
        expect(typeof value === "string" && value.trim().length > 0, `${code} → ${key}`).toBe(true);
      }
    }
  });
});

describe("navigation display-label guard", () => {
  const source = readFileSync(
    join(SRC, "components", "layout", "navigation.ts"),
    "utf8",
  );

  it("contains no hard-coded display labels", () => {
    // Strip comments: prose may legitimately mention the word "label".
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");
    // Nav items must expose `labelKey`, never a `label` display string.
    expect(code).not.toMatch(/\blabel\s*:/);
  });

  it("every nav item and breadcrumb carries a dictionary key", () => {
    for (const item of [...coreNavItems, ...systemNavItems, ...trustNavItems]) {
      expect(item.labelKey, item.href).toBeTruthy();
      expect(EN_KEYS, item.href).toContain(item.labelKey);
      expect((item as unknown as { label?: string }).label).toBeUndefined();
    }
    for (const [segment, key] of Object.entries(breadcrumbLabelKeys)) {
      expect(EN_KEYS, segment).toContain(key);
    }
  });
});

describe("command palette multilingual keywords", () => {
  it("indexes every nav label in every Tier-1 locale", () => {
    for (const item of [...coreNavItems, ...systemNavItems, ...trustNavItems]) {
      const keywords = NAV_SEARCH_KEYWORDS[item.labelKey] ?? [];
      expect(keywords.length, item.labelKey).toBeGreaterThan(0);
      for (const { code } of TIER1_LOCALES) {
        if (code === "en") {
          expect(keywords, `${item.labelKey} (en)`).toContain(en[item.labelKey]);
          continue;
        }
        const dictionary = STORED_DICTIONARIES[code] ?? {};
        const label = dictionary[item.labelKey] ?? en[item.labelKey];
        expect(keywords, `${item.labelKey} (${code})`).toContain(label);
      }
    }
  });

  it("includes Japanese romaji readings for the acceptance cases", () => {
    expect(NAV_SEARCH_KEYWORDS["nav.tasks"]).toContain("tasuku");
    expect(NAV_SEARCH_KEYWORDS["nav.tasks"]).toContain("タスク");
    expect(NAV_SEARCH_KEYWORDS["nav.goals"]).toContain("mokuhyou");
    expect(NAV_SEARCH_KEYWORDS["nav.goals"]).toContain("目標");
  });
});

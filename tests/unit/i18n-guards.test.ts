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
  AVAILABLE_LOCALES,
  isRtl,
  LOCALE_CODES,
  TIER1_LOCALES,
  type Locale,
} from "@/lib/i18n/config";
import en, { type Dictionary } from "@/lib/i18n/dictionary";
import { hasLocaleDictionary } from "@/lib/i18n/loaders";
import { NAV_SEARCH_KEYWORDS } from "@/lib/i18n/nav-search-keywords";
import { translate } from "@/lib/i18n/translate";
import ar from "@/lib/i18n/locales/ar";
import bg from "@/lib/i18n/locales/bg";
import bn from "@/lib/i18n/locales/bn";
import cs from "@/lib/i18n/locales/cs";
import da from "@/lib/i18n/locales/da";
import de from "@/lib/i18n/locales/de";
import el from "@/lib/i18n/locales/el";
import es from "@/lib/i18n/locales/es";
import esMX from "@/lib/i18n/locales/es-MX";
import et from "@/lib/i18n/locales/et";
import fa from "@/lib/i18n/locales/fa";
import fi from "@/lib/i18n/locales/fi";
import fil from "@/lib/i18n/locales/fil";
import fr from "@/lib/i18n/locales/fr";
import hi from "@/lib/i18n/locales/hi";
import he from "@/lib/i18n/locales/he";
import hr from "@/lib/i18n/locales/hr";
import id from "@/lib/i18n/locales/id";
import itLocale from "@/lib/i18n/locales/it";
import ja from "@/lib/i18n/locales/ja";
import kk from "@/lib/i18n/locales/kk";
import ko from "@/lib/i18n/locales/ko";
import ky from "@/lib/i18n/locales/ky";
import mn from "@/lib/i18n/locales/mn";
import nl from "@/lib/i18n/locales/nl";
import no from "@/lib/i18n/locales/no";
import pl from "@/lib/i18n/locales/pl";
import pt from "@/lib/i18n/locales/pt";
import ro from "@/lib/i18n/locales/ro";
import ru from "@/lib/i18n/locales/ru";
import sv from "@/lib/i18n/locales/sv";
import th from "@/lib/i18n/locales/th";
import tr from "@/lib/i18n/locales/tr";
import uk from "@/lib/i18n/locales/uk";
import ur from "@/lib/i18n/locales/ur";
import vi from "@/lib/i18n/locales/vi";
import zh from "@/lib/i18n/locales/zh";

const SRC = new URL("../../src", import.meta.url).pathname;

const STORED_DICTIONARIES: Partial<Record<Locale, Partial<Dictionary>>> = {
  bg,
  bn,
  cs,
  da,
  de,
  el,
  es,
  "es-MX": esMX,
  et,
  fi,
  fil,
  fr,
  hi,
  hr,
  id,
  it: itLocale,
  ja,
  kk,
  ko,
  ky,
  mn,
  nl,
  no,
  pl,
  pt,
  ro,
  ru,
  sv,
  th,
  tr,
  uk,
  vi,
  zh,
  ar, fa, he, ur,
};

const TIER2_CODES = [
  "pl", "cs", "uk", "bg", "tr", "sv", "no", "fi", "da", "el", "ro", "hr",
  "et", "th", "vi", "id", "bn", "mn", "kk", "ky", "fil",
] as const satisfies readonly Locale[];

const TIER3_CODES = ["ar", "ur", "fa", "he"] as const satisfies readonly Locale[];

const PROTECTED_LITERALS = [
  "SophionOS", "Clerk", "Supabase", "Vercel", "Dodo Payments", "Resend",
  "OpenAI", "Anthropic", "GitHub", "AGPL-3.0-or-later", "MCP", "REST API",
  "SECURITY.md", "GDPR", "DPDP Act", "sophionos.com",
];

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

  it("registers all twenty-one Tier-2 locales with stored dictionaries", () => {
    for (const code of TIER2_CODES) {
      expect(LOCALE_CODES, code).toContain(code);
      expect(Object.keys(STORED_DICTIONARIES), code).toContain(code);
      expect(hasLocaleDictionary(code), code).toBe(true);
    }
  });

  it("registers four RTL locales, selectable under their native names", () => {
    for (const code of TIER3_CODES) {
      expect(Object.keys(STORED_DICTIONARIES), code).toContain(code);
      expect(hasLocaleDictionary(code), code).toBe(true);
      expect(isRtl(code), code).toBe(true);
      expect(AVAILABLE_LOCALES.some((l) => l.code === code), code).toBe(true);
    }
    expect(AVAILABLE_LOCALES.map((l) => l.nativeName)).toEqual(
      expect.arrayContaining(["العربية", "اردو", "فارسی", "עברית"]),
    );
    expect(Object.keys(STORED_DICTIONARIES)).toHaveLength(37);
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

  it("resolves every English key to non-blank copy in every stored locale", () => {
    for (const code of Object.keys(STORED_DICTIONARIES) as Locale[]) {
      for (const key of EN_KEYS) {
        const value = translate(key, code, STORED_DICTIONARIES);
        expect(value, `${code} → ${key}`).toBeTruthy();
        expect(value, `${code} → ${key}`).not.toBe(key);
      }
    }
  });

  it("falls back to English when a locale has no stored translation", () => {
    // Every stored key is now translated in every Tier-1 locale, so exercise
    // the fallback with an empty dictionary rather than a deliberate gap.
    expect(translate("tasks.subtitle.other", "ja", {})).toBe(
      en["tasks.subtitle.other"],
    );
  });

  it("keeps Tier-3 placeholders and protected literals byte-identical", () => {
    const placeholders = (value: string) => (value.match(/\{[^{}]+\}/g) ?? []).sort();
    for (const code of TIER3_CODES) {
      const dictionary = STORED_DICTIONARIES[code] ?? {};
      for (const key of EN_KEYS) {
        const source = en[key] as string;
        const value = dictionary[key] ?? source;
        expect(placeholders(value), `${code} → ${key}`).toEqual(placeholders(source));
        for (const literal of PROTECTED_LITERALS) {
          expect(value.split(literal).length, `${code} → ${key} → ${literal}`).toBe(
            source.split(literal).length,
          );
        }
      }
    }
  });

  it("es-MX resolves through Spanish before English", () => {
    expect(translate("nav.tasks", "es-MX", STORED_DICTIONARIES)).toBe(es["nav.tasks"]);
  });

  it("covers every ja-translated key in every stored locale", () => {
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
  it("indexes every nav label in every stored locale", () => {
    const codes: Locale[] = ["en", ...(Object.keys(STORED_DICTIONARIES) as Locale[])];
    for (const item of [...coreNavItems, ...systemNavItems, ...trustNavItems]) {
      const keywords = NAV_SEARCH_KEYWORDS[item.labelKey] ?? [];
      expect(keywords.length, item.labelKey).toBeGreaterThan(0);
      for (const code of codes) {
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

  it("indexes the Tier-2 search acceptance labels", () => {
    expect(NAV_SEARCH_KEYWORDS["nav.tasks"]).toContain("Zadania");
    expect(NAV_SEARCH_KEYWORDS["nav.tasks"]).toContain(pl["nav.tasks"]);
    expect(NAV_SEARCH_KEYWORDS["nav.tasks"]).toContain(th["nav.tasks"]);
    expect(NAV_SEARCH_KEYWORDS["nav.tasks"]).toContain(bn["nav.tasks"]);
  });

  it("indexes the Tier-3 RTL acceptance labels", () => {
    for (const code of TIER3_CODES) {
      const dictionary = STORED_DICTIONARIES[code] ?? {};
      expect(NAV_SEARCH_KEYWORDS["nav.tasks"], code).toContain(dictionary["nav.tasks"]);
    }
    expect(NAV_SEARCH_KEYWORDS["nav.tasks"]).toContain(ar["nav.tasks"]);
    expect(NAV_SEARCH_KEYWORDS["nav.tasks"]).toContain(he["nav.tasks"]);
  });

  it("includes Japanese romaji readings for the acceptance cases", () => {
    expect(NAV_SEARCH_KEYWORDS["nav.tasks"]).toContain("tasuku");
    expect(NAV_SEARCH_KEYWORDS["nav.tasks"]).toContain("タスク");
    expect(NAV_SEARCH_KEYWORDS["nav.goals"]).toContain("mokuhyou");
    expect(NAV_SEARCH_KEYWORDS["nav.goals"]).toContain("目標");
  });
});

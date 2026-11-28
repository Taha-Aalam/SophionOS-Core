import type { Locale } from "./config";
import type { Dictionary } from "./dictionary";

/**
 * Lazy dictionary loaders.
 *
 * Only English is imported eagerly: it is the fallback every other locale
 * resolves through, and the one the shell needs before a preference is known.
 * Every other dictionary is a `import()` behind its own locale code, so the
 * bundler emits one chunk per locale and the client downloads only the active
 * one.
 *
 * es-MX deliberately imports `es` first, then applies its own overrides, which
 * keeps the variant file tiny and means an es fix reaches es-MX automatically.
 */
const LOADERS: Partial<Record<Locale, () => Promise<{ default: Partial<Dictionary> }>>> = {
  ja: () => import("./locales/ja"),
  es: () => import("./locales/es"),
  "es-MX": () => import("./locales/es"),
  fr: () => import("./locales/fr"),
  de: () => import("./locales/de"),
  pt: () => import("./locales/pt"),
  it: () => import("./locales/it"),
  nl: () => import("./locales/nl"),
  zh: () => import("./locales/zh"),
  ko: () => import("./locales/ko"),
  hi: () => import("./locales/hi"),
  ru: () => import("./locales/ru"),
  pl: () => import("./locales/pl"),
  cs: () => import("./locales/cs"),
  uk: () => import("./locales/uk"),
  bg: () => import("./locales/bg"),
  tr: () => import("./locales/tr"),
  sv: () => import("./locales/sv"),
  no: () => import("./locales/no"),
  fi: () => import("./locales/fi"),
  da: () => import("./locales/da"),
  el: () => import("./locales/el"),
  ro: () => import("./locales/ro"),
  hr: () => import("./locales/hr"),
  et: () => import("./locales/et"),
  th: () => import("./locales/th"),
  vi: () => import("./locales/vi"),
  id: () => import("./locales/id"),
  bn: () => import("./locales/bn"),
  mn: () => import("./locales/mn"),
  kk: () => import("./locales/kk"),
  ky: () => import("./locales/ky"),
  fil: () => import("./locales/fil"),
  ar: () => import("./locales/ar"),
  ur: () => import("./locales/ur"),
  fa: () => import("./locales/fa"),
  he: () => import("./locales/he"),
};

const ES_MX_OVERRIDES = () => import("./locales/es-MX");

export function hasLocaleDictionary(locale: Locale): boolean {
  return locale === "en" || Boolean(LOADERS[locale]);
}

/**
 * Load one locale's stored strings. Returns `{}` for locales that do not have
 * a dictionary yet, so callers can fall back without special-casing.
 */
export async function loadLocaleDictionary(
  locale: Locale,
): Promise<Partial<Dictionary>> {
  if (locale === "en") return {};
  const loader = LOADERS[locale];
  if (!loader) return {};
  const base = (await loader()).default;
  if (locale === "es-MX") {
    const overrides = (await ES_MX_OVERRIDES()).default;
    return { ...base, ...overrides };
  }
  return base;
}

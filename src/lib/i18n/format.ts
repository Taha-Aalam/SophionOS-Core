import type { Locale } from "./config";

/**
 * Locale-aware date/number formatting. `Intl` is built into every supported
 * browser, so this adds no bundle weight beyond the thin wrappers. Formatters
 * are created per call site (React `useMemo`s them in the provider) because
 * constructing one is cheap and caching by options is not worth the memory.
 */

export function formatDate(
  value: Date | number | string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    return new Intl.DateTimeFormat("en", options).format(date);
  }
}

export function formatDateTime(
  value: Date | number | string,
  locale: Locale,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" },
): string {
  return formatDate(value, locale, options);
}

export function formatNumber(
  value: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions,
): string {
  try {
    return new Intl.NumberFormat(locale, options).format(value);
  } catch {
    return new Intl.NumberFormat("en", options).format(value);
  }
}

export function formatRelative(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  locale: Locale,
  options: Intl.RelativeTimeFormatOptions = { numeric: "auto" },
): string {
  try {
    return new Intl.RelativeTimeFormat(locale, options).format(value, unit);
  } catch {
    return new Intl.RelativeTimeFormat("en", options).format(value, unit);
  }
}

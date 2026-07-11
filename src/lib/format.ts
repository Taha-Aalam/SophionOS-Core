/**
 * Locale-aware formatting helpers.
 *
 * All helpers pass `undefined` as the locale so the browser/user locale wins.
 * Centralizing formatting here means locale and style changes happen in one
 * place instead of drifting across 12+ call sites.
 */

const DATE_MED: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
const DATE_FULL: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
  year: "numeric",
};

/** Medium date, e.g. "Jul 12". */
export function formatDate(value: string | number | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, DATE_MED);
}

/** Full date with year, e.g. "Jul 12, 2026". */
export function formatDateLong(value: string | number | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, DATE_FULL);
}

/** Long-form human date, e.g. "Saturday, July 12". */
export function formatDateHuman(value: string | number | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** Date + time, e.g. "Jul 12, 2026, 3:45 PM". */
export function formatDateTime(value: string | number | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

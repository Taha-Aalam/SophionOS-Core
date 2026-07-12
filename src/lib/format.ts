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

/** Parse to Date, returning null for unparseable input so callers can fall back. */
function toDate(value: string | number | Date): Date | null {
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function format(
  value: string | number | Date,
  options: Intl.DateTimeFormatOptions,
): string {
  const d = toDate(value);
  return d ? d.toLocaleDateString(undefined, options) : "";
}

/** Medium date, e.g. "Jul 12". */
export function formatDate(value: string | number | Date): string {
  return format(value, DATE_MED);
}

/** Full date with year, e.g. "Jul 12, 2026". */
export function formatDateLong(value: string | number | Date): string {
  return format(value, DATE_FULL);
}

/** Long-form human date, e.g. "Saturday, July 12". */
export function formatDateHuman(value: string | number | Date): string {
  return format(value, { weekday: "long", month: "long", day: "numeric" });
}

/** Date + time, e.g. "Jul 12, 2026, 3:45 PM". */
export function formatDateTime(value: string | number | Date): string {
  return format(value, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

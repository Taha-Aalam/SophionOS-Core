/**
 * Returns the user's local calendar date as YYYY-MM-DD for DATE-column
 * comparisons (due_date, target_date).
 *
 * DATE columns store calendar dates without time. Comparing them against
 * full ISO timestamps (getLocalDateStart/End) breaks both in-memory string
 * comparison ("2026-08-03" < "2026-08-03T00:00:00.000Z") and PostgREST range
 * filters. Use this date-only key when the column is a DATE.
 *
 * @param timeZone - IANA timezone string. When omitted, falls back to the
 *   server's local calendar date.
 */
export function getLocalDateKey(timeZone?: string): string {
  const now = new Date();
  const { year, month, day } = zonedParts(now, timeZone);
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

/**
 * Returns the start of today in UTC for Supabase date range queries.
 * Supabase stores timestamps as UTC; we query in UTC so local "today"
 * is computed correctly regardless of timezone offset.
 *
 * @param timeZone - IANA timezone string (e.g. "America/New_York").
 *   When omitted, falls back to the server's local calendar date.
 */
export function getLocalDateStart(timeZone?: string): string {
  const now = new Date();
  const { year, month, day } = zonedParts(now, timeZone);
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0)).toISOString();
}

/**
 * Returns the end of today (23:59:59.999 UTC) for range comparisons.
 *
 * @param timeZone - IANA timezone string. When omitted, falls back to
 *   the server's local calendar date.
 */
export function getLocalDateEnd(timeZone?: string): string {
  const now = new Date();
  const { year, month, day } = zonedParts(now, timeZone);
  return new Date(Date.UTC(year, month, day, 23, 59, 59, 999)).toISOString();
}

/**
 * Returns the start of the current week (Monday 00:00 UTC).
 *
 * @param timeZone - IANA timezone string. When omitted, falls back to
 *   the server's local calendar date.
 */
export function getWeekStart(timeZone?: string): string {
  const now = new Date();
  const { year, month, day } = zonedParts(now, timeZone);
  const jsDay = new Date(Date.UTC(year, month, day)).getUTCDay();
  const diff = jsDay === 0 ? -6 : 1 - jsDay;
  const monday = new Date(Date.UTC(year, month, day + diff, 0, 0, 0, 0));
  return monday.toISOString();
}

/**
 * Returns true if a UTC ISO string falls on today's date in the given
 * timezone (or server-local when timeZone is omitted).
 */
export function isToday(utcString: string, timeZone?: string): boolean {
  const date = new Date(utcString);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  const { year, month, day } = zonedParts(now, timeZone);
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month &&
    date.getUTCDate() === day
  );
}

/**
 * Returns true if a UTC ISO string falls before today's start in the given
 * timezone (or server-local when timeZone is omitted).
 */
export function isPast(utcString: string, timeZone?: string): boolean {
  const date = new Date(utcString);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  const { year, month, day } = zonedParts(now, timeZone);
  const todayStart = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  return date < todayStart;
}

/**
 * Resolve a Date's calendar year/month/day in a given IANA timezone.
 * When timeZone is undefined/falsy, falls back to the server's local TZ.
 */
function zonedParts(
  now: Date,
  timeZone?: string,
): { year: number; month: number; day: number } {
  if (!timeZone) {
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
    };
  }
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = dtf.formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month") - 1,
    day: get("day"),
  };
}

// Locale is pinned to "en" because the app's UI copy is English-only (this
// helper used to hard-code English strings; localizing it alone would make it
// the one localized surface in the app). Style "narrow" keeps the terse
// "5m ago" / "3h ago" / "2d ago" shapes the app has always shown.
const relativeTimeFormatter = new Intl.RelativeTimeFormat("en", {
  numeric: "auto",
  style: "narrow",
});

/**
 * Returns a user-friendly relative time string: "Just now" under a minute,
 * terse durations ("5m ago", "3h ago"), "Yesterday"/"Tomorrow" via
 * Intl.RelativeTimeFormat's auto numerals, and a short calendar date past a
 * week. Future timestamps format naturally ("in 2h") instead of clamping.
 *
 * @param now - Reference time. Defaults to the current time; injectable so
 *   tests and tooling can pin the clock.
 */
export function relativeTime(utcString: string, now: Date = new Date()): string {
  const date = new Date(utcString);
  const diffMs = now.getTime() - date.getTime();
  // Magnitudes use the same floor-per-unit ladder the hand-rolled version
  // used, so past-timestamp output is unchanged.
  const mins = Math.floor(Math.abs(diffMs) / 60000);
  const hours = Math.floor(Math.abs(diffMs) / 3600000);
  const days = Math.floor(Math.abs(diffMs) / 86400000);
  const isPast = diffMs >= 0;
  // "yesterday"/"tomorrow" come back lowercase from Intl; the hand-rolled
  // version capitalized "Yesterday". Pure-word outputs get the same capital;
  // duration strings ("5m ago", "in 2h") stay as Intl formats them.
  const capitalize = (s: string) =>
    /^[a-z]+$/i.test(s) ? s.charAt(0).toUpperCase() + s.slice(1) : s;

  if (mins < 1) return "Just now";
  if (mins < 60)
    return capitalize(relativeTimeFormatter.format(isPast ? -mins : mins, "minute"));
  if (hours < 24)
    return capitalize(relativeTimeFormatter.format(isPast ? -hours : hours, "hour"));
  if (days < 7)
    return capitalize(relativeTimeFormatter.format(isPast ? -days : days, "day"));
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/**
 * Returns "morning", "afternoon", "evening", or "night" based on current hour.
 */
export function getGreetingTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}
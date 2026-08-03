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

/**
 * Returns a user-friendly relative time string.
 */
export function relativeTime(utcString: string): string {
  const date = new Date(utcString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
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
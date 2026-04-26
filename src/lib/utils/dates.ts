/**
 * Returns the start of today in UTC for Supabase date range queries.
 * Supabase stores timestamps as UTC; we query in UTC so local "today"
 * is computed correctly regardless of timezone offset.
 */
export function getLocalDateStart(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  ).toISOString();
}

/**
 * Returns the end of today (23:59:59.999 UTC) for range comparisons.
 */
export function getLocalDateEnd(): string {
  const now = new Date();
  return new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  ).toISOString();
}

/**
 * Returns the start of the current week (Monday 00:00 UTC).
 */
export function getWeekStart(): string {
  const now = new Date();
  const day = now.getUTCDay();
  // Monday = 1, Sunday = 0. Shift so Monday is the start.
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(
    Date.UTC(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + diff,
      0,
      0,
      0,
      0
    )
  );
  return monday.toISOString();
}

/**
 * Returns true if a UTC ISO string falls on today's date in local time.
 */
export function isToday(utcString: string): boolean {
  const date = new Date(utcString);
  const now = new Date();
  return (
    date.getUTCFullYear() === now.getFullYear() &&
    date.getUTCMonth() === now.getMonth() &&
    date.getUTCDate() === now.getDate()
  );
}

/**
 * Returns true if a UTC ISO string falls before today's date.
 */
export function isPast(utcString: string): boolean {
  const date = new Date(utcString);
  const now = new Date();
  const todayStart = new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  );
  return date < todayStart;
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
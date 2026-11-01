import type { DueBrief, NotificationPrefs } from "./types";

export type { NotificationPrefs };

export interface ZonedClock {
  localDate: string;
  hhmm: string;
  weekday: number; // 0=Sun .. 6=Sat
  minutesOfDay: number;
}

function isValidHour(hour: unknown): hour is number {
  return typeof hour === "number" && Number.isInteger(hour) && hour >= 0 && hour <= 23;
}

export function getZonedClock(now: Date, timeZone: string): ZonedClock {
  const tz = timeZone || "UTC";
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(now).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const year = parts.year;
  const month = parts.month;
  const day = parts.day;
  const hour = parts.hour === "24" ? "00" : parts.hour!.padStart(2, "0");
  const minute = parts.minute!.padStart(2, "0");
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const weekday = weekdayMap[parts.weekday ?? "Sun"] ?? 0;
  const minutesOfDay = Number(hour) * 60 + Number(minute);
  return {
    localDate: `${year}-${month}-${day}`,
    hhmm: `${hour}:${minute}`,
    weekday,
    minutesOfDay,
  };
}

function hourDue(clock: ZonedClock, hour: number | null | undefined): boolean {
  // Same-day catch-up: due from the configured hour onward; the delivery
  // log's per-day dedupe makes repeated ticks idempotent.
  if (!isValidHour(hour)) return false;
  return clock.minutesOfDay >= hour * 60;
}

export function kindsDueForUser(input: {
  prefs: NotificationPrefs;
  timezone: string;
  now: Date;
}): DueBrief[] {
  if (input.prefs.email_enabled === false) return [];
  const clock = getZonedClock(input.now, input.timezone || "UTC");
  const due: DueBrief[] = [];

  if (
    input.prefs.morning_briefing_enabled &&
    hourDue(clock, input.prefs.morning_briefing_hour)
  ) {
    due.push({
      kind: "morning_briefing",
      localDate: clock.localDate,
      configuredTime: `${String(input.prefs.morning_briefing_hour).padStart(2, "0")}:00`,
    });
  }

  if (
    input.prefs.evening_review_enabled &&
    hourDue(clock, input.prefs.evening_review_hour)
  ) {
    due.push({
      kind: "evening_review",
      localDate: clock.localDate,
      configuredTime: `${String(input.prefs.evening_review_hour).padStart(2, "0")}:00`,
    });
  }

  if (
    input.prefs.weekly_digest_day !== null &&
    input.prefs.weekly_digest_day !== undefined &&
    clock.weekday === input.prefs.weekly_digest_day &&
    hourDue(clock, input.prefs.weekly_digest_hour)
  ) {
    due.push({
      kind: "weekly_digest",
      localDate: clock.localDate,
      configuredTime: `${String(input.prefs.weekly_digest_hour ?? 9).padStart(2, "0")}:00`,
    });
  }

  return due;
}

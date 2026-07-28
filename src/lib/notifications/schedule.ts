import type { DueBrief, NotificationPrefs } from "./types";

export type { NotificationPrefs };

export interface ZonedClock {
  localDate: string;
  hhmm: string;
  weekday: number; // 0=Sun .. 6=Sat
  minutesOfDay: number;
}

function parseHHMM(value: string): number | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
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
  const hour = parts.hour === "24" ? "00" : parts.hour.padStart(2, "0");
  const minute = parts.minute.padStart(2, "0");
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const weekday = weekdayMap[parts.weekday] ?? 0;
  const minutesOfDay = Number(hour) * 60 + Number(minute);
  return {
    localDate: `${year}-${month}-${day}`,
    hhmm: `${hour}:${minute}`,
    weekday,
    minutesOfDay,
  };
}

export function isTimeInWindow(
  localHHMM: string,
  configuredHHMM: string,
  windowMinutes: number,
): boolean {
  const local = parseHHMM(localHHMM);
  const start = parseHHMM(configuredHHMM);
  if (local === null || start === null) return false;
  return local >= start && local < start + windowMinutes;
}

export function kindsDueForUser(input: {
  prefs: NotificationPrefs;
  timezone: string;
  now: Date;
  windowMinutes: number;
}): DueBrief[] {
  if (input.prefs.email_enabled === false) return [];
  const clock = getZonedClock(input.now, input.timezone || "UTC");
  const due: DueBrief[] = [];

  if (
    input.prefs.morning_briefing_enabled &&
    input.prefs.morning_briefing_time &&
    isTimeInWindow(
      clock.hhmm,
      input.prefs.morning_briefing_time,
      input.windowMinutes,
    )
  ) {
    due.push({
      kind: "morning_briefing",
      localDate: clock.localDate,
      configuredTime: input.prefs.morning_briefing_time,
    });
  }

  if (
    input.prefs.evening_review_enabled &&
    input.prefs.evening_review_time &&
    isTimeInWindow(
      clock.hhmm,
      input.prefs.evening_review_time,
      input.windowMinutes,
    )
  ) {
    due.push({
      kind: "evening_review",
      localDate: clock.localDate,
      configuredTime: input.prefs.evening_review_time,
    });
  }

  if (
    input.prefs.weekly_digest_day !== null &&
    input.prefs.weekly_digest_day !== undefined &&
    clock.weekday === input.prefs.weekly_digest_day &&
    isTimeInWindow(clock.hhmm, "09:00", input.windowMinutes)
  ) {
    due.push({
      kind: "weekly_digest",
      localDate: clock.localDate,
      configuredTime: "09:00",
    });
  }

  return due;
}

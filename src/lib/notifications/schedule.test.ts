import { describe, expect, it } from "vitest";
import {
  getZonedClock,
  isTimeInWindow,
  kindsDueForUser,
  type NotificationPrefs,
} from "./schedule";

describe("getZonedClock", () => {
  it("returns local HH:mm and date in America/New_York", () => {
    // 2026-07-23 12:05 UTC = 08:05 EDT
    const clock = getZonedClock(
      new Date("2026-07-23T12:05:00.000Z"),
      "America/New_York",
    );
    expect(clock.localDate).toBe("2026-07-23");
    expect(clock.hhmm).toBe("08:05");
    expect(clock.weekday).toBe(4); // Thursday
  });
});

describe("isTimeInWindow", () => {
  it("matches start of window inclusive", () => {
    expect(isTimeInWindow("08:00", "08:00", 15)).toBe(true);
  });
  it("matches inside window", () => {
    expect(isTimeInWindow("08:10", "08:00", 15)).toBe(true);
  });
  it("excludes end of window", () => {
    expect(isTimeInWindow("08:15", "08:00", 15)).toBe(false);
  });
  it("excludes before window", () => {
    expect(isTimeInWindow("07:59", "08:00", 15)).toBe(false);
  });
});

describe("kindsDueForUser", () => {
  const prefs: NotificationPrefs = {
    morning_briefing_enabled: true,
    morning_briefing_time: "08:00",
    evening_review_enabled: true,
    evening_review_time: "18:00",
    weekly_digest_day: 4,
    email_enabled: true,
  };

  it("returns morning when local time in morning window", () => {
    const due = kindsDueForUser({
      prefs,
      timezone: "America/New_York",
      now: new Date("2026-07-23T12:05:00.000Z"), // 08:05 NY
      windowMinutes: 15,
    });
    expect(due.map((d) => d.kind)).toEqual(["morning_briefing"]);
    expect(due[0]?.localDate).toBe("2026-07-23");
  });

  it("returns nothing when email disabled", () => {
    const due = kindsDueForUser({
      prefs: { ...prefs, email_enabled: false },
      timezone: "UTC",
      now: new Date("2026-07-23T08:05:00.000Z"),
      windowMinutes: 15,
    });
    expect(due).toEqual([]);
  });

  it("returns weekly_digest on configured weekday at 09:00 local", () => {
    // Thursday 09:05 UTC
    const due = kindsDueForUser({
      prefs,
      timezone: "UTC",
      now: new Date("2026-07-23T09:05:00.000Z"),
      windowMinutes: 15,
    });
    expect(due.map((d) => d.kind)).toContain("weekly_digest");
  });
});

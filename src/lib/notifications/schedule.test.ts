import { describe, expect, it } from "vitest";
import {
  getZonedClock,
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

// 2026-07-23 is a Thursday.
describe("kindsDueForUser (1-hour slots)", () => {
  const basePrefs: NotificationPrefs = {
    morning_briefing_enabled: true,
    morning_briefing_hour: 8,
    evening_review_enabled: true,
    evening_review_hour: 18,
    weekly_digest_day: 4, // Thursday
    weekly_digest_hour: 9,
    email_enabled: true,
  };

  function dueAt(iso: string, timezone = "America/New_York") {
    return kindsDueForUser({
      prefs: basePrefs,
      timezone,
      now: new Date(iso),
    });
  }

  it("is due once the local time reaches the configured hour", () => {
    // 08:05 New York — morning (8:00) and weekly (Thursday, 9:00? no — 08:05 < 09:00) only.
    const due = dueAt("2026-07-23T12:05:00.000Z"); // 08:05 NY
    expect(due.map((d) => d.kind)).toEqual(["morning_briefing"]);
    expect(due[0]?.configuredTime).toBe("08:00");
    expect(due[0]?.localDate).toBe("2026-07-23");
  });

  it("is not due before the configured hour", () => {
    // 07:05 New York
    const due = dueAt("2026-07-23T11:05:00.000Z");
    expect(due).toEqual([]);
  });

  it("stays due for the rest of the day after the hour (same-day catch-up)", () => {
    // 15:05 New York Thursday — morning long past, weekly past 9:00 too, evening not yet (18:00)
    const due = dueAt("2026-07-23T19:05:00.000Z");
    expect(due.map((d) => d.kind).sort()).toEqual([
      "morning_briefing",
      "weekly_digest",
    ]);
  });

  it("is due in the user's timezone, not the server's", () => {
    // 2026-07-23 12:05 UTC = 21:05 JST — all three anchors (8, 18, weekly Thu 9) passed.
    const due = dueAt("2026-07-23T12:05:00.000Z", "Asia/Tokyo");
    expect(due.map((d) => d.kind).sort()).toEqual([
      "evening_review",
      "morning_briefing",
      "weekly_digest",
    ]);
  });

  it("weekly digest needs both the weekday and the hour", () => {
    // Wednesday 10:05 NY — past 9:00 but wrong day.
    expect(
      dueAt("2026-07-22T14:05:00.000Z").map((d) => d.kind),
    ).toEqual(["morning_briefing"]);
    // Thursday 08:55 NY — right day, before 9:00.
    expect(
      dueAt("2026-07-23T12:55:00.000Z").map((d) => d.kind),
    ).toEqual(["morning_briefing"]);
    // Thursday 09:05 NY — right day, past 9:00.
    expect(
      dueAt("2026-07-23T13:05:00.000Z").map((d) => d.kind).sort(),
    ).toEqual(["morning_briefing", "weekly_digest"]);
  });

  it("returns nothing when the email channel is disabled", () => {
    const due = kindsDueForUser({
      prefs: { ...basePrefs, email_enabled: false },
      timezone: "America/New_York",
      now: new Date("2026-07-23T12:05:00.000Z"),
    });
    expect(due).toEqual([]);
  });

  it("skips kinds with no hour configured or disabled flags", () => {
    const due = kindsDueForUser({
      prefs: {
        morning_briefing_enabled: true,
        evening_review_enabled: true,
        evening_review_hour: 18,
        // no morning hour, evening enabled
        email_enabled: true,
      },
      timezone: "America/New_York",
      now: new Date("2026-07-23T12:05:00.000Z"), // 08:05 NY
    });
    expect(due).toEqual([]);
  });
});

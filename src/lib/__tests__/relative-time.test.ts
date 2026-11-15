import { describe, expect, it } from "vitest";

import { relativeTime } from "@/lib/utils/dates";

// Fixed clock so assertions are deterministic.
const NOW = new Date("2026-11-16T12:00:00.000Z");
const ago = (sec: number) => new Date(NOW.getTime() - sec * 1000).toISOString();
const ahead = (sec: number) => new Date(NOW.getTime() + sec * 1000).toISOString();

describe("relativeTime (Intl.RelativeTimeFormat-backed)", () => {
  it("renders 'Just now' under a minute", () => {
    expect(relativeTime(ago(30), NOW)).toBe("Just now");
    expect(relativeTime(ahead(30), NOW)).toBe("Just now");
  });

  it("keeps the terse narrow-style durations for minutes and hours", () => {
    expect(relativeTime(ago(90), NOW)).toBe("1m ago");
    expect(relativeTime(ago(3600), NOW)).toBe("1h ago");
    expect(relativeTime(ago(82800), NOW)).toBe("23h ago");
  });

  it("uses auto numerals for days, capitalized to match the old wording", () => {
    expect(relativeTime(ago(86400), NOW)).toBe("Yesterday");
    expect(relativeTime(ago(172800), NOW)).toBe("2d ago");
    expect(relativeTime(ago(518400), NOW)).toBe("6d ago");
  });

  it("falls back to a short date a week and older", () => {
    expect(relativeTime(ago(604800), NOW)).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
    expect(relativeTime(ago(31536000), NOW)).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
  });

  it("formats future timestamps naturally instead of clamping", () => {
    expect(relativeTime(ahead(3600), NOW)).toBe("in 1h");
    expect(relativeTime(ahead(86400), NOW)).toBe("Tomorrow");
  });

  it("falls through to the date string for invalid input (legacy behaviour)", () => {
    expect(relativeTime("not-a-date", NOW)).toBe("Invalid Date");
  });
});

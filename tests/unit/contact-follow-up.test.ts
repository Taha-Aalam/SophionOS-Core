import { describe, expect, it } from "vitest";

/** Mirrors the updated computeFollowUpStatus from contact.service.ts */
function computeFollowUpStatus(
  lastInteractionAt: string | null | undefined,
  intervalDays: number | null | undefined,
): "ON TRACK" | "FOLLOW UP" {
  if (intervalDays === null || intervalDays === undefined || intervalDays === 0) return "ON TRACK";
  if (!lastInteractionAt) return "FOLLOW UP";
  const lastDate = new Date(lastInteractionAt);
  const now = new Date();
  const diffMs = now.getTime() - lastDate.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays <= intervalDays ? "ON TRACK" : "FOLLOW UP";
}

describe("computeFollowUpStatus", () => {
  it("returns ON TRACK when intervalDays is null (no follow-up required)", () => {
    expect(computeFollowUpStatus(null, null)).toBe("ON TRACK");
  });

  it("returns ON TRACK when intervalDays is undefined", () => {
    expect(computeFollowUpStatus(null, undefined)).toBe("ON TRACK");
  });

  it("returns ON TRACK when intervalDays is 0 (explicit no-follow-up)", () => {
    expect(computeFollowUpStatus(null, 0)).toBe("ON TRACK");
  });

  it("returns FOLLOW UP when no last interaction and interval is set", () => {
    expect(computeFollowUpStatus(null, 14)).toBe("FOLLOW UP");
  });

  it("returns ON TRACK when interaction is recent enough", () => {
    const recentDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(computeFollowUpStatus(recentDate, 7)).toBe("ON TRACK");
  });

  it("returns FOLLOW UP when interaction is too long ago", () => {
    const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(computeFollowUpStatus(oldDate, 14)).toBe("FOLLOW UP");
  });
});

import { createContactSchema } from "@/lib/validators/contact.schema";

describe("contact schema – follow_up_interval_days allows 0", () => {
  it("accepts 0 for no-follow-up", () => {
    const result = createContactSchema.safeParse({ name: "Alice", follow_up_interval_days: 0 });
    expect(result.success).toBe(true);
  });

  it("accepts null for no-follow-up", () => {
    const result = createContactSchema.safeParse({ name: "Alice", follow_up_interval_days: null });
    expect(result.success).toBe(true);
  });

  it("rejects negative intervals", () => {
    const result = createContactSchema.safeParse({ name: "Alice", follow_up_interval_days: -1 });
    expect(result.success).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { getStableStringArray } from "@/lib/utils/stable-arrays";

describe("getStableStringArray", () => {
  it("reuses the same empty array when no values are provided", () => {
    const first = getStableStringArray(undefined);
    const second = getStableStringArray(undefined);

    expect(first).toBe(second);
    expect(first).toEqual([]);
  });

  it("returns the provided array when values exist", () => {
    const goalIds = ["goal-1", "goal-2"];

    expect(getStableStringArray(goalIds)).toBe(goalIds);
  });
});

import { describe, it, expect } from "vitest";

import { isFeatureEnabled, FEATURE_FLAGS, type FeatureFlag } from "./feature-flags";

describe("isFeatureEnabled", () => {
  it("reads its value from FEATURE_FLAGS", () => {
    (Object.keys(FEATURE_FLAGS) as FeatureFlag[]).forEach((flag) => {
      expect(isFeatureEnabled(flag)).toBe(FEATURE_FLAGS[flag]);
    });
  });

  it("defaults both flags to off as currently configured", () => {
    expect(isFeatureEnabled("cloud_later")).toBe(false);
    expect(isFeatureEnabled("sop_cloud")).toBe(false);
  });

  it("reflects a flipped value while keeping flags independent", () => {
    const original = FEATURE_FLAGS.cloud_later;
    FEATURE_FLAGS.cloud_later = true;
    try {
      expect(isFeatureEnabled("cloud_later")).toBe(true);
      expect(isFeatureEnabled("sop_cloud")).toBe(false);
    } finally {
      FEATURE_FLAGS.cloud_later = original;
    }
  });
});

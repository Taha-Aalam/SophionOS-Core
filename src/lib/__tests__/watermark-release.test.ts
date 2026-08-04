import { describe, expect, it } from "vitest";

import { GENERATOR_TAG, RELEASE_TAG } from "@/lib/watermark/release";

describe("watermark release tags", () => {
  it("RELEASE_TAG matches the sphn-0x<hex> format", () => {
    expect(RELEASE_TAG).toMatch(/^sphn-0x[0-9a-f]{4}$/);
  });

  it("GENERATOR_TAG matches the sophonios-<year>.<release> format", () => {
    expect(GENERATOR_TAG).toMatch(/^sophonios-\d{4}\.\d+$/);
  });

  it("RELEASE_TAG and GENERATOR_TAG are distinct (forensic separation)", () => {
    expect(RELEASE_TAG).not.toBe(GENERATOR_TAG);
  });
});

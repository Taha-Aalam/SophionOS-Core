import { describe, it, expect } from "vitest";
import { buildAreaDetailHref } from "@/lib/utils/area-urls";

describe("buildAreaDetailHref", () => {
  it("prefers the slug when present", () => {
    expect(buildAreaDetailHref({ id: "abc-123", slug: "health" })).toBe("/areas/health");
  });

  it("falls back to the id when slug is null", () => {
    expect(buildAreaDetailHref({ id: "abc-123", slug: null })).toBe("/areas/abc-123");
  });

  it("falls back to the id when slug is absent", () => {
    expect(buildAreaDetailHref({ id: "abc-123" })).toBe("/areas/abc-123");
  });
});

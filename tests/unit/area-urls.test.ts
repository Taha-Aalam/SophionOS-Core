import { describe, it, expect } from "vitest";
import { buildAreaDetailHref } from "@/lib/utils/area-urls";

describe("buildAreaDetailHref", () => {
  it("returns /areas/<id>", () => {
    expect(buildAreaDetailHref({ id: "abc-123" })).toBe("/areas/abc-123");
  });
});

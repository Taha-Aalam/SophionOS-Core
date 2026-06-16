import { describe, expect, it } from "vitest";

import { isValidReturnTo } from "@/lib/utils/return-to";

describe("VALID_RETURN_ORIGINS — system pages", () => {
  it("accepts /my-day as a return origin", () => {
    expect(isValidReturnTo("/my-day")).toBe(true);
  });

  it("accepts /inbox as a return origin", () => {
    expect(isValidReturnTo("/inbox")).toBe(true);
  });

  it("still accepts existing origins", () => {
    expect(isValidReturnTo("/dashboard")).toBe(true);
    expect(isValidReturnTo("/areas/some-area")).toBe(true);
    expect(isValidReturnTo("/knowledge")).toBe(true);
  });

  it("still rejects unknown origins and edit/new/create leaves", () => {
    expect(isValidReturnTo("/settings")).toBe(false);
    expect(isValidReturnTo("/notes/new")).toBe(false);
    expect(isValidReturnTo(null)).toBe(false);
  });
});

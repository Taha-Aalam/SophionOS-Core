import { describe, it, expect } from "vitest";

import { safeHttpUrl } from "@/lib/utils";
import { createContactSchema } from "@/lib/validators/contact.schema";

describe("safeHttpUrl", () => {
  it("passes through valid http(s) URLs", () => {
    expect(safeHttpUrl("https://example.com")).toBe("https://example.com");
    expect(safeHttpUrl("http://example.com/path")).toBe("http://example.com/path");
  });

  it("rejects javascript: and other dangerous schemes", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeHttpUrl("JavaScript:alert(1)")).toBeUndefined();
    expect(safeHttpUrl("data:text/html,<script>alert(1)</script>")).toBeUndefined();
    expect(safeHttpUrl("vbscript:msgbox(1)")).toBeUndefined();
    expect(safeHttpUrl("file:///etc/passwd")).toBeUndefined();
  });

  it("returns undefined for empty/invalid input", () => {
    expect(safeHttpUrl(null)).toBeUndefined();
    expect(safeHttpUrl(undefined)).toBeUndefined();
    expect(safeHttpUrl("")).toBeUndefined();
    expect(safeHttpUrl("not a url")).toBeUndefined();
  });
});

describe("contact schema URL validation", () => {
  it("accepts valid http(s) website and linkedin URLs", () => {
    const result = createContactSchema.safeParse({
      name: "Jane",
      website: "https://example.com",
      linkedin: "https://linkedin.com/in/jane",
    });
    expect(result.success).toBe(true);
  });

  it("rejects javascript: URLs in website/linkedin", () => {
    const result = createContactSchema.safeParse({
      name: "Jane",
      website: "javascript:alert(document.cookie)",
    });
    expect(result.success).toBe(false);
  });

  it("treats empty string URL fields as null", () => {
    const result = createContactSchema.safeParse({ name: "Jane", website: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.website).toBeNull();
    }
  });
});

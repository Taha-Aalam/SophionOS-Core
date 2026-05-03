import { describe, expect, it } from "vitest";

/** Mirrors the buildSlug logic from note.service.ts */
function buildSlug(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "note"
  );
}

describe("note slug generation", () => {
  it("converts a plain name to lowercase-hyphenated slug", () => {
    expect(buildSlug("My Great Note")).toBe("my-great-note");
  });

  it("strips special characters", () => {
    expect(buildSlug("Hello, World! & More")).toBe("hello-world-more");
  });

  it("collapses consecutive hyphens", () => {
    expect(buildSlug("One  Two")).toBe("one-two");
  });

  it("falls back to 'note' for an empty name", () => {
    expect(buildSlug("")).toBe("note");
  });

  it("falls back to 'note' when name has only special chars", () => {
    expect(buildSlug("!!!")).toBe("note");
  });

  it("preserves hyphens already in the name", () => {
    expect(buildSlug("step-1 plan")).toBe("step-1-plan");
  });
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

describe("UUID detection for getByIdentifier routing", () => {
  it("detects a valid UUID", () => {
    expect(UUID_RE.test("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });

  it("treats a slug as non-UUID", () => {
    expect(UUID_RE.test("my-great-note")).toBe(false);
  });

  it("treats a partial UUID as non-UUID", () => {
    expect(UUID_RE.test("550e8400-e29b")).toBe(false);
  });
});

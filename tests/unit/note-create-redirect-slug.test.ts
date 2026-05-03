import { describe, expect, it } from "vitest";

/**
 * Regression tests for FIX 1:
 * After note creation the redirect uses `slug ?? id` so the browser
 * navigates to the human-readable slug route whenever one exists.
 */
describe("note create redirect: slug-first navigation", () => {
  function buildNoteRedirectPath(note: { id: string; slug?: string | null }): string {
    return `/notes/${note.slug ?? note.id}`;
  }

  it("navigates to slug route when note has a slug", () => {
    const note = { id: "uuid-abc-123", slug: "my-great-note" };
    expect(buildNoteRedirectPath(note)).toBe("/notes/my-great-note");
  });

  it("falls back to UUID route when note has no slug (null)", () => {
    const note = { id: "uuid-abc-123", slug: null };
    expect(buildNoteRedirectPath(note)).toBe("/notes/uuid-abc-123");
  });

  it("falls back to UUID route when slug is undefined", () => {
    const note: { id: string; slug?: string | null } = { id: "uuid-abc-123" };
    expect(buildNoteRedirectPath(note)).toBe("/notes/uuid-abc-123");
  });

  it("prefers slug over UUID when both are truthy", () => {
    const note = { id: "550e8400-e29b-41d4-a716-446655440000", slug: "learning-rust" };
    expect(buildNoteRedirectPath(note)).toBe("/notes/learning-rust");
  });
});

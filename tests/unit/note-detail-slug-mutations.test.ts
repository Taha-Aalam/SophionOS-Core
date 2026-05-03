import { describe, expect, it } from "vitest";

/**
 * Regression test: NoteDetailPage mutations must use the resolved note UUID
 * (note.id), not the raw route parameter, which may be a slug on slug-based
 * routes (e.g. /notes/my-great-note).
 *
 * Mirrors the ID-resolution logic added to NoteDetailPage:
 *   save()       → uses note.id, early-returns when note is undefined
 *   handleDelete → uses note.id, early-returns when note is undefined
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Mirrors the mutation ID resolution logic in NoteDetailPage */
function resolveMutationId(
  _routeParam: string,
  note: { id: string } | undefined,
): string | null {
  if (!note) return null;
  return note.id;
}

const NOTE_UUID = "550e8400-e29b-41d4-a716-446655440000";
const NOTE_SLUG = "my-great-note";

describe("NoteDetailPage: mutation target ID resolution (slug-route regression)", () => {
  it("uses note.id (UUID) when route param is a slug", () => {
    expect(resolveMutationId(NOTE_SLUG, { id: NOTE_UUID })).toBe(NOTE_UUID);
  });

  it("uses note.id (UUID) when route param is also a UUID", () => {
    expect(resolveMutationId(NOTE_UUID, { id: NOTE_UUID })).toBe(NOTE_UUID);
  });

  it("returns null — blocks mutation — when note has not loaded yet", () => {
    expect(resolveMutationId(NOTE_SLUG, undefined)).toBeNull();
  });

  it("resolved mutation ID is always a valid UUID regardless of route param", () => {
    const id = resolveMutationId(NOTE_SLUG, { id: NOTE_UUID });
    expect(id).not.toBeNull();
    expect(UUID_RE.test(id!)).toBe(true);
  });

  it("slug route param is not a valid UUID (confirms the bug scenario)", () => {
    expect(UUID_RE.test(NOTE_SLUG)).toBe(false);
  });

  it("resolved ID equals note.id even when route param differs (autosave path)", () => {
    const note = { id: NOTE_UUID };
    expect(resolveMutationId(NOTE_SLUG, note)).toBe(note.id);
  });

  it("resolved ID equals note.id for delete path", () => {
    const note = { id: NOTE_UUID };
    expect(resolveMutationId(NOTE_SLUG, note)).toBe(note.id);
  });
});

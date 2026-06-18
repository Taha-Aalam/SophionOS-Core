import { beforeEach, describe, expect, it, vi } from "vitest";

import { noteService } from "../../src/lib/services/note.service";
import { createClient } from "../../src/lib/supabase/client";
import { NOTE_STATUS, NOTE_TYPE } from "../../src/lib/utils/constants";

vi.mock("../../src/lib/supabase/client", () => ({
  createClient: vi.fn(),
}));

describe("noteService", () => {
  const userId = "user-123";
  const noteId = "note-123";

  const baseNote = {
    id: noteId,
    user_id: userId,
    name: "Test note",
    content: null,
    type: NOTE_TYPE.NOTE,
    status: NOTE_STATUS.INBOX,
    notebook: null,
    favorite: false,
    pin: false,
    is_archived: false,
    area_id: null,
    project_id: null,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Stub for junction-table queries (note_areas, goal_notes, task_notes) and
  // note_types upsert — all of which are secondary createClient() calls.
  function makeHydrationClient() {
    return {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a note with defaults", async () => {
    // create() calls: (1) upsertNoteType, (2) insert note, (3-5) hydration.
    // A single client mock with all required methods handles all five calls.
    const client = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({ data: baseNote, error: null }),
    };
    vi.mocked(createClient).mockReturnValue(client as never);

    const result = await noteService.create(userId, { name: "Test note" });

    expect(result).toMatchObject(baseNote);
    expect(client.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Test note",
        user_id: userId,
        type: NOTE_TYPE.NOTE,
        status: NOTE_STATUS.INBOX,
        favorite: false,
        is_archived: false,
      }),
    );
  });

  it("creates a note with explicit status and type", async () => {
    const researchNote = {
      ...baseNote,
      type: NOTE_TYPE.RESEARCH,
      status: NOTE_STATUS.ACTIVE,
    };
    const client = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({ data: researchNote, error: null }),
    };
    vi.mocked(createClient).mockReturnValue(client as never);

    const result = await noteService.create(userId, {
      name: "Test note",
      type: NOTE_TYPE.RESEARCH,
      status: NOTE_STATUS.ACTIVE,
    });

    expect(result.type).toBe(NOTE_TYPE.RESEARCH);
    expect(result.status).toBe(NOTE_STATUS.ACTIVE);
  });

  it("lists notes without filters", async () => {
    // list() calls: (1) main query, (2-4) hydration.
    const primaryClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [baseNote], error: null }),
    };
    vi.mocked(createClient)
      .mockReturnValue(makeHydrationClient() as never)
      .mockReturnValueOnce(primaryClient as never);

    const result = await noteService.list(userId);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(noteId);
  });

  it("default list excludes archived notes", async () => {
    const primaryClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    vi.mocked(createClient)
      .mockReturnValue(makeHydrationClient() as never)
      .mockReturnValueOnce(primaryClient as never);

    await noteService.list(userId);

    expect(primaryClient.eq).toHaveBeenCalledWith("is_archived", false);
  });

  it("lists notes including archived when includeArchived is true", async () => {
    const archivedNote = { ...baseNote, is_archived: true };
    const primaryClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [archivedNote], error: null }),
    };
    vi.mocked(createClient)
      .mockReturnValue(makeHydrationClient() as never)
      .mockReturnValueOnce(primaryClient as never);

    const result = await noteService.list(userId, { includeArchived: true });

    expect(result).toHaveLength(1);
    expect(result[0].is_archived).toBe(true);
    expect(primaryClient.eq).not.toHaveBeenCalledWith("is_archived", false);
  });

  it("updates a note", async () => {
    // update() calls: (1) update query, (2-4) hydration. No upsertNoteType since no type field.
    const updated = { ...baseNote, name: "Updated title", status: NOTE_STATUS.ACTIVE };
    const primaryClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updated, error: null }),
    };
    vi.mocked(createClient)
      .mockReturnValue(makeHydrationClient() as never)
      .mockReturnValueOnce(primaryClient as never);

    const result = await noteService.update(userId, noteId, {
      name: "Updated title",
      status: NOTE_STATUS.ACTIVE,
    });

    expect(result.name).toBe("Updated title");
    expect(result.status).toBe(NOTE_STATUS.ACTIVE);
    expect(primaryClient.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Updated title", status: NOTE_STATUS.ACTIVE }),
    );
  });

  it("archives a note", async () => {
    // archive() calls: (1) update query, (2-4) hydration.
    const archived = { ...baseNote, is_archived: true };
    const primaryClient = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: archived, error: null }),
    };
    vi.mocked(createClient)
      .mockReturnValue(makeHydrationClient() as never)
      .mockReturnValueOnce(primaryClient as never);

    const result = await noteService.archive(userId, noteId);

    expect(result.is_archived).toBe(true);
    expect(primaryClient.update).toHaveBeenCalledWith({ is_archived: true });
  });

  it("throws ValidationError for empty name on create", async () => {
    await expect(noteService.create(userId, { name: "" })).rejects.toThrow();
  });

  it("getRelatedByNotebook groups co-notebook notes per notebook", async () => {
    // The note under view (n1) is in notebook "Ideas". n2, n3 also in "Ideas".
    const noteN2 = { ...baseNote, id: "n2", name: "N2" };
    const noteN3 = { ...baseNote, id: "n3", name: "N3" };
    // First createClient() call: fetch this note's notebooks.
    const notebooksClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: [{ notebook: "Ideas" }], error: null }),
    };
    // Second call: members of "Ideas" (notes joined via note_notebooks).
    const membersClient = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [noteN2, noteN3], error: null }),
    };
    vi.mocked(createClient)
      .mockReturnValue(makeHydrationClient() as never)
      .mockReturnValueOnce(notebooksClient as never)
      .mockReturnValueOnce(membersClient as never);

    const groups = await noteService.getRelatedByNotebook(userId, "n1");

    expect(groups).toHaveLength(1);
    expect(groups[0].notebook).toBe("Ideas");
    expect(groups[0].notes.map((n) => n.id).sort()).toEqual(["n2", "n3"]);
  });

  it("addNotesToNotebook inserts one row per note", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      upsert,
    } as never);

    await noteService.addNotesToNotebook(userId, "Ideas", ["n2", "n3"]);

    expect(upsert).toHaveBeenCalledWith(
      [
        { note_id: "n2", notebook: "Ideas" },
        { note_id: "n3", notebook: "Ideas" },
      ],
      { onConflict: "note_id,notebook" },
    );
  });

  it("removeNoteFromNotebook deletes the single membership row", async () => {
    const eqNotebook = vi.fn().mockResolvedValue({ error: null });
    const eqNote = vi.fn().mockReturnValue({ eq: eqNotebook });
    const del = vi.fn().mockReturnValue({ eq: eqNote });
    vi.mocked(createClient).mockReturnValue({
      from: vi.fn().mockReturnThis(),
      delete: del,
    } as never);

    await noteService.removeNoteFromNotebook(userId, "n3", "Ideas");

    expect(del).toHaveBeenCalled();
    expect(eqNote).toHaveBeenCalledWith("note_id", "n3");
    expect(eqNotebook).toHaveBeenCalledWith("notebook", "Ideas");
  });

  it("getNoteRelatedCounts counts distinct co-notebook notes", async () => {
    // note_notebooks rows: n1,n2,n3 in "Ideas"; n4,n5 in "Projects".
    const rows = [
      { note_id: "n1", notebook: "Ideas" },
      { note_id: "n2", notebook: "Ideas" },
      { note_id: "n3", notebook: "Ideas" },
      { note_id: "n4", notebook: "Projects" },
      { note_id: "n5", notebook: "Projects" },
    ];
    // 1) fetch notebooks for requested notes; 2) fetch all members of those notebooks
    vi.mocked(createClient)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: rows, error: null }),
      } as never)
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({ data: rows, error: null }),
      } as never);

    const counts = await noteService.getNoteRelatedCounts(userId, ["n1", "n4"]);

    expect(counts.get("n1")).toBe(2); // n2, n3
    expect(counts.get("n4")).toBe(1); // n5
  });
});

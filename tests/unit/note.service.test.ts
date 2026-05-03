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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a note with defaults", async () => {
    const client = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      like: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: baseNote, error: null }),
    };
    vi.mocked(createClient).mockReturnValue(client as never);

    const result = await noteService.create(userId, { name: "Test note" });

    expect(result).toEqual(baseNote);
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
      like: vi.fn().mockReturnThis(),
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
    const client = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [baseNote], error: null }),
    };
    vi.mocked(createClient).mockReturnValueOnce(client as never);

    const result = await noteService.list(userId);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(noteId);
  });

  it("updates a note", async () => {
    const updated = { ...baseNote, name: "Updated title", status: NOTE_STATUS.ACTIVE };
    const client = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: updated, error: null }),
    };
    vi.mocked(createClient).mockReturnValueOnce(client as never);

    const result = await noteService.update(userId, noteId, {
      name: "Updated title",
      status: NOTE_STATUS.ACTIVE,
    });

    expect(result.name).toBe("Updated title");
    expect(result.status).toBe(NOTE_STATUS.ACTIVE);
    expect(client.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Updated title", status: NOTE_STATUS.ACTIVE }),
    );
  });

  it("archives a note", async () => {
    const archived = { ...baseNote, is_archived: true };
    const client = {
      from: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: archived, error: null }),
    };
    vi.mocked(createClient).mockReturnValueOnce(client as never);

    const result = await noteService.archive(userId, noteId);

    expect(result.is_archived).toBe(true);
    expect(client.update).toHaveBeenCalledWith({ is_archived: true });
  });

  it("throws ValidationError for empty name on create", async () => {
    await expect(noteService.create(userId, { name: "" })).rejects.toThrow();
  });
});

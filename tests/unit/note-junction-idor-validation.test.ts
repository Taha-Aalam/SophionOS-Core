import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { noteService } from "@/lib/services/note.service";
import type { SupabaseClient } from "@supabase/supabase-js";

// Regression tests for the junction IDOR class (vuln-0003 family): every
// note junction writer must verify the linked ids are owned by the caller
// via assertOwnedIds BEFORE writing, because the API-key auth path uses a
// service-role client that bypasses RLS.
const ATTACKER_NOTE = "bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb";
const VICTIM_GOAL = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa";
const VICTIM_AREA = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaab";
const VICTIM_PROJECT = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaac";
const VICTIM_TASK = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaad";
const VICTIM_NOTE = "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaae";
const OWNED_GOAL = "cccccccc-cccc-4ccc-cccc-cccccccccccc";

/**
 * Mock supabase client. `owned` maps table name → ids assertOwnedIds should
 * find (i.e. rows this caller owns). Junction reads (getWithRelations) always
 * return no existing links; inserts/upserts are recorded for assertions.
 */
function makeClient(owned: Record<string, string[]> = {}) {
  const inserts: Array<{ table: string; rows: Array<Record<string, unknown>> }> = [];
  const upserts: Array<{ table: string; rows: Array<Record<string, unknown>> }> = [];

  function chain(table: string) {
    const api: Record<string, unknown> = {};
    api.select = () => api;
    api.eq = () => api;
    api.in = () =>
      Promise.resolve({
        data: (owned[table] ?? []).map((id) => ({ id })),
        error: null,
      });
    api.insert = (rows: Array<Record<string, unknown>>) => {
      inserts.push({ table, rows });
      return { error: null };
    };
    api.upsert = (rows: Array<Record<string, unknown>>) => {
      upserts.push({ table, rows });
      return { error: null };
    };
    api.delete = () => ({
      eq: () => ({ eq: () => ({ error: null }), in: () => ({ error: null }) }),
    });
    api.maybeSingle = async () => ({ data: null, error: null });
    api.single = async () => ({ data: null, error: null });
    // getWithRelations awaits from(...).select(...).eq(...) directly
    api.then = (onFulfilled: (v: { data: unknown[]; error: null }) => unknown) =>
      Promise.resolve({ data: [] as unknown[], error: null }).then(onFulfilled);
    api.update = () => ({
      eq: () => ({
        eq: () => ({
          select: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
        }),
      }),
    });
    return api;
  }

  return {
    from: (table: string) => chain(table),
    _inserts: inserts,
    _upserts: upserts,
  } as unknown as SupabaseClient & {
    _inserts: Array<{ table: string; rows: Array<Record<string, unknown>> }>;
    _upserts: Array<{ table: string; rows: Array<Record<string, unknown>> }>;
  };
}

function stubSyncStatus() {
  const original = (noteService as unknown as Record<string, unknown>).syncNoteStatusFromContext;
  (noteService as unknown as Record<string, unknown>).syncNoteStatusFromContext = async () => {};
  return () => {
    (noteService as unknown as Record<string, unknown>).syncNoteStatusFromContext = original;
  };
}

describe("note junction IDOR validation", () => {
  it("replaceGoalLinks rejects a goal the caller does not own (404) and inserts nothing", async () => {
    const client = makeClient();
    const restore = stubSyncStatus();
    try {
      await expect(
        noteService.replaceGoalLinks("user-attacker", ATTACKER_NOTE, [VICTIM_GOAL], { supabase: client }),
      ).rejects.toMatchObject({ statusCode: 404 });
    } finally {
      restore();
    }
    expect(client._inserts.some((x) => x.table === "goal_notes")).toBe(false);
  });

  it("replaceGoalLinks still links a goal the caller owns (positive control)", async () => {
    const client = makeClient({ goals: [OWNED_GOAL] });
    const restore = stubSyncStatus();
    try {
      await expect(
        noteService.replaceGoalLinks("user-attacker", ATTACKER_NOTE, [OWNED_GOAL], { supabase: client }),
      ).resolves.toBeUndefined();
    } finally {
      restore();
    }
    expect(client._inserts.some((x) =>
      x.table === "goal_notes" &&
      x.rows.some((r) => r.goal_id === OWNED_GOAL && r.note_id === ATTACKER_NOTE),
    )).toBe(true);
  });

  it("replaceAreaLinks rejects an area the caller does not own", async () => {
    const client = makeClient();
    await expect(
      noteService.replaceAreaLinks("user-attacker", ATTACKER_NOTE, [VICTIM_AREA], { supabase: client }),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(client._inserts.some((x) => x.table === "note_areas")).toBe(false);
  });

  it("replaceProjectLinks rejects a project the caller does not own", async () => {
    const client = makeClient();
    await expect(
      noteService.replaceProjectLinks("user-attacker", ATTACKER_NOTE, [VICTIM_PROJECT], { supabase: client }),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(client._inserts.some((x) => x.table === "note_projects")).toBe(false);
  });

  it("replaceTaskLinks rejects a task the caller does not own", async () => {
    const client = makeClient();
    await expect(
      noteService.replaceTaskLinks("user-attacker", ATTACKER_NOTE, [VICTIM_TASK], { supabase: client }),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(client._inserts.some((x) => x.table === "task_notes")).toBe(false);
  });

  it("addNotesToNotebook rejects a note the caller does not own", async () => {
    const client = makeClient();
    await expect(
      noteService.addNotesToNotebook("user-attacker", "research", [VICTIM_NOTE], { supabase: client }),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(client._upserts.some((x) => x.table === "note_notebooks")).toBe(false);
  });

  it("addNotesToNotebook upserts when the note is owned (positive control)", async () => {
    const client = makeClient({ notes: [ATTACKER_NOTE] });
    await expect(
      noteService.addNotesToNotebook("user-attacker", "research", [ATTACKER_NOTE], { supabase: client }),
    ).resolves.toBeUndefined();
    expect(client._upserts.some((x) =>
      x.table === "note_notebooks" &&
      x.rows.some((r) => r.note_id === ATTACKER_NOTE && r.notebook === "research"),
    )).toBe(true);
  });

  it("removeNoteFromNotebook rejects a note the caller does not own", async () => {
    const client = makeClient();
    await expect(
      noteService.removeNoteFromNotebook("user-attacker", VICTIM_NOTE, "research", { supabase: client }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("static: note.service and task.service both guard junction writes with assertOwnedIds", () => {
    const noteSrc = readFileSync("src/lib/services/note.service.ts", "utf8");
    const taskSrc = readFileSync("src/lib/services/task.service.ts", "utf8");
    expect(noteSrc.includes("assertOwnedIds")).toBe(true);
    expect(taskSrc.includes("assertOwnedIds")).toBe(true);
  });
});

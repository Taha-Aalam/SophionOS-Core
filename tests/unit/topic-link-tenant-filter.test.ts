import { describe, it, expect } from "vitest";
import { topicService } from "@/lib/services/topic.service";
import type { SupabaseClient } from "@supabase/supabase-js";

// Regression test for the SEC-2026-001 aggravator: the topic link functions
// rewrite `notes.topic_id` / `resources.topic_id` in bulk. The assertOwnedIds
// guard in front closes the normal flow, but the UPDATE statement itself must
// also carry a user_id filter so the write is tenant-scoped at the query
// level and can never touch rows outside the caller's own even if a future
// change drops or reorders the guard.
type Write = { table: string; patch: Record<string, unknown>; eqs: Array<[string, unknown]> };

function makeClient(owned: Record<string, string[]> = {}) {
  const writes: Write[] = [];

  function chain(table: string, entryRef: { entry: Write | null }) {
    const api: Record<string, unknown> = {};
    api.select = () => api;
    api.eq = (col: string, val: unknown) => {
      if (entryRef.entry) entryRef.entry.eqs.push([col, val]);
      return api;
    };
    api.in = (col: string, val: unknown) => {
      if (entryRef.entry) {
        writes.push(entryRef.entry);
        return Promise.resolve({ data: null, error: null });
      }
      // ownership read (assertOwnedIds): return rows this caller owns
      return Promise.resolve({
        data: (owned[table] ?? []).map((id) => ({ id })),
        error: null,
      });
    };
    api.update = (patch: Record<string, unknown>) => {
      entryRef.entry = { table, patch, eqs: [] };
      return api;
    };
    return api;
  }

  return {
    from: (table: string) => chain(table, { entry: null }),
    _writes: writes,
  } as unknown as SupabaseClient & { _writes: Write[] };
}

describe("topic link UPDATEs are tenant-scoped", () => {
  it("linkNotes UPDATE carries a user_id filter", async () => {
    const client = makeClient({ notes: ["note-1"] });
    await topicService.linkNotes("user-1", "topic-1", ["note-1"], { supabase: client });

    const write = client._writes.find(
      (w) => w.table === "notes" && w.patch.topic_id === "topic-1",
    );
    expect(write).toBeDefined();
    expect(write!.eqs).toContainEqual(["user_id", "user-1"]);
  });

  it("linkResources UPDATE carries a user_id filter", async () => {
    const client = makeClient({ resources: ["res-1"] });
    await topicService.linkResources("user-1", "topic-1", ["res-1"], { supabase: client });

    const write = client._writes.find(
      (w) => w.table === "resources" && w.patch.topic_id === "topic-1",
    );
    expect(write).toBeDefined();
    expect(write!.eqs).toContainEqual(["user_id", "user-1"]);
  });

  it("linkNotes still rejects a note the caller does not own (404)", async () => {
    const client = makeClient();
    await expect(
      topicService.linkNotes("user-1", "topic-1", ["note-foreign"], { supabase: client }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });
});

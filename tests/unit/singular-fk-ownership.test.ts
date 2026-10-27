import { describe, it, expect } from "vitest";
import { taskService } from "@/lib/services/task.service";
import { noteService } from "@/lib/services/note.service";
import { resourceService } from "@/lib/services/resource.service";
import { goalService } from "@/lib/services/goal.service";
import type { SupabaseClient } from "@supabase/supabase-js";

// Regression tests for the singular-FK ownership gate (audit finding
// `task-create-singular-fk-column-cross-tenant-persist`): create/update
// payloads carry singular FK columns (tasks.area_id/project_id,
// notes.area_id/project_id/topic_id, resources.area_id/topic_id,
// goals.area_id) that persist with the entity row. On the API-key path
// createDataClient returns the RLS-bypassing service-role client, and the
// ownership asserts only ran afterwards in the replace* junction writers
// (or not at all for topic_id) — so a 4xx response still left a row
// committed with a cross-tenant FK reference. The merged singular+plural
// id lists must be asserted BEFORE the INSERT/UPDATE, and a rejection
// must leave no row persisted.
const ATTACKER = "11111111-1111-4111-8111-111111111111";
const FOREIGN_AREA = "22222222-2222-4222-8222-222222222221";
const FOREIGN_PROJECT = "22222222-2222-4222-8222-222222222222";
const FOREIGN_TOPIC = "22222222-2222-4222-8222-222222222223";
const OWNED_AREA = "33333333-3333-4333-8333-333333333331";
const OWNED_PROJECT = "33333333-3333-4333-8333-333333333332";

type Row = Record<string, unknown>;

interface ClientConfig {
  /** table → ids assertOwnedIds should find (rows this caller owns). */
  owned?: Record<string, string[]>;
  /** Row returned by .single() (the inserted/updated entity row). */
  singleRow?: Row | null;
}

function makeEntityClient(cfg: ClientConfig = {}) {
  const inserts: Array<{ table: string; rows: Row[] }> = [];
  const updates: Array<{ table: string; payload: Row }> = [];

  function builder(table: string) {
    const filters: Record<string, unknown> = {};
    let selectCols = "";
    const api: Record<string, unknown> = {};
    api.select = (cols: string) => {
      selectCols = cols;
      return api;
    };
    api.eq = (col: string, val: unknown) => {
      filters[col] = val;
      return api;
    };
    api.in = (col: string, vals: unknown[]) => {
      if (selectCols === "id" && "user_id" in filters) {
        const owned = (cfg.owned?.[table] ?? []).filter((id) =>
          (vals as string[]).includes(id),
        );
        return Promise.resolve({
          data: owned.map((id) => ({ id })),
          error: null,
        });
      }
      return Promise.resolve({ data: [], error: null });
    };
    api.insert = (rows: Row[]) => {
      inserts.push({ table, rows });
      return api;
    };
    api.update = (payload: Row) => {
      updates.push({ table, payload });
      return api;
    };
    api.delete = () => {
      const delApi: Record<string, unknown> = {};
      delApi.eq = () => delApi;
      delApi.in = () => Promise.resolve({ error: null });
      return delApi;
    };
    api.ilike = () => Promise.resolve({ data: [], error: null });
    api.maybeSingle = () => Promise.resolve({ data: null, error: null });
    api.single = () => Promise.resolve({ data: cfg.singleRow ?? null, error: null });
    api.then = (
      onFulfilled: (v: { data: unknown[]; error: null }) => unknown,
      onRejected?: (e: unknown) => unknown,
    ) => Promise.resolve({ data: [], error: null }).then(onFulfilled, onRejected);
    return api;
  }

  return {
    from: (table: string) => builder(table),
    _inserts: inserts,
    _updates: updates,
  } as unknown as SupabaseClient & {
    _inserts: Array<{ table: string; rows: Row[] }>;
    _updates: Array<{ table: string; payload: Row }>;
  };
}

const TASK_ROW = {
  id: "44444444-4444-4444-8444-444444444444",
  user_id: ATTACKER,
  name: "task",
  status: "inbox",
};
const NOTE_ROW = {
  id: "44444444-4444-4444-8444-444444444445",
  user_id: ATTACKER,
  name: "note",
  slug: "note",
  status: "inbox",
};
const RESOURCE_ROW = {
  id: "44444444-4444-4444-8444-444444444446",
  user_id: ATTACKER,
  name: "resource",
  url: "https://example.test",
  status: "inbox",
};
const GOAL_ROW = {
  id: "44444444-4444-4444-8444-444444444447",
  user_id: ATTACKER,
  name: "goal",
  slug: "goal",
};

describe("task singular FK columns are ownership-gated before the write", () => {
  it("create with a foreign project_id persists no tasks row", async () => {
    const client = makeEntityClient({ singleRow: TASK_ROW });
    await expect(
      taskService.create(
        ATTACKER,
        { name: "t", project_id: FOREIGN_PROJECT } as never,
        { supabase: client },
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(client._inserts.some((x) => x.table === "tasks")).toBe(false);
  });

  it("create with a foreign area_id persists no tasks row", async () => {
    const client = makeEntityClient({ singleRow: TASK_ROW });
    await expect(
      taskService.create(
        ATTACKER,
        { name: "t", area_id: FOREIGN_AREA } as never,
        { supabase: client },
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(client._inserts.some((x) => x.table === "tasks")).toBe(false);
  });

  it("update with a foreign area_id persists no tasks row", async () => {
    const client = makeEntityClient({ singleRow: TASK_ROW });
    await expect(
      taskService.update(
        ATTACKER,
        TASK_ROW.id,
        { name: "t2", area_id: FOREIGN_AREA } as never,
        { supabase: client },
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(client._updates.some((x) => x.table === "tasks")).toBe(false);
  });

  it("create with owned area and project still inserts and links (positive control)", async () => {
    const client = makeEntityClient({
      singleRow: TASK_ROW,
      owned: { tasks: [TASK_ROW.id], areas: [OWNED_AREA], projects: [OWNED_PROJECT] },
    });
    await expect(
      taskService.create(
        ATTACKER,
        { name: "t", area_id: OWNED_AREA, project_id: OWNED_PROJECT } as never,
        { supabase: client },
      ),
    ).resolves.toBeDefined();
    expect(client._inserts.some((x) => x.table === "tasks")).toBe(true);
    expect(client._inserts.some((x) => x.table === "task_areas")).toBe(true);
  });
});

describe("note singular FK columns are ownership-gated before the write", () => {
  it("create with a foreign topic_id persists no notes row (topics asserted)", async () => {
    const client = makeEntityClient({ singleRow: NOTE_ROW });
    await expect(
      noteService.create(
        ATTACKER,
        { name: "n", topic_id: FOREIGN_TOPIC } as never,
        { supabase: client },
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(client._inserts.some((x) => x.table === "notes")).toBe(false);
  });

  it("create with a foreign project_id persists no notes row", async () => {
    const client = makeEntityClient({ singleRow: NOTE_ROW });
    await expect(
      noteService.create(
        ATTACKER,
        { name: "n", project_id: FOREIGN_PROJECT } as never,
        { supabase: client },
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(client._inserts.some((x) => x.table === "notes")).toBe(false);
  });

  it("update with a foreign topic_id persists no notes row", async () => {
    const client = makeEntityClient({ singleRow: NOTE_ROW });
    await expect(
      noteService.update(
        ATTACKER,
        NOTE_ROW.id,
        { topic_id: FOREIGN_TOPIC } as never,
        { supabase: client },
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(client._updates.some((x) => x.table === "notes")).toBe(false);
  });
});

describe("resource singular FK columns are ownership-gated before the write", () => {
  it("create with a foreign topic_id persists no resources row", async () => {
    const client = makeEntityClient({ singleRow: RESOURCE_ROW });
    await expect(
      resourceService.create(
        ATTACKER,
        { name: "r", url: "https://example.test", topic_id: FOREIGN_TOPIC } as never,
        { supabase: client },
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(client._inserts.some((x) => x.table === "resources")).toBe(false);
  });

  it("update with a foreign topic_id persists no resources row", async () => {
    const client = makeEntityClient({ singleRow: RESOURCE_ROW });
    await expect(
      resourceService.update(
        ATTACKER,
        RESOURCE_ROW.id,
        { topic_id: FOREIGN_TOPIC } as never,
        { supabase: client },
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(client._updates.some((x) => x.table === "resources")).toBe(false);
  });
});

describe("goal singular FK columns are ownership-gated before the write", () => {
  it("create with a foreign area_id persists no goals row", async () => {
    const client = makeEntityClient({ singleRow: GOAL_ROW });
    await expect(
      goalService.create(
        ATTACKER,
        { name: "g", term: "short", area_id: FOREIGN_AREA } as never,
        { supabase: client },
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(client._inserts.some((x) => x.table === "goals")).toBe(false);
  });

  it("update with a foreign area_id persists no goals row", async () => {
    const client = makeEntityClient({ singleRow: GOAL_ROW });
    await expect(
      goalService.update(
        ATTACKER,
        GOAL_ROW.id,
        { area_id: FOREIGN_AREA } as never,
        { supabase: client },
      ),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(client._updates.some((x) => x.table === "goals")).toBe(false);
  });
});

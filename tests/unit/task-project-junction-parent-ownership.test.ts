import { describe, it, expect } from "vitest";
import { taskService } from "@/lib/services/task.service";
import { projectService } from "@/lib/services/project.service";
import type { SupabaseClient } from "@supabase/supabase-js";

// Regression tests for the parent axis of the junction IDOR class
// (audit finding `junction-write-parent-ownership-missing-task-project`):
// task/project junction writers must verify the PARENT task/project id is
// owned by the caller via assertOwnedIds BEFORE writing, because the
// API-key auth path uses a service-role client that bypasses RLS. The
// sibling suite (note-junction-idor-validation.test.ts) covers the
// link-target axis; this one covers the parent axis for the
// task/project families.
const ATTACKER = "11111111-1111-4111-8111-111111111111";
const VICTIM_TASK = "22222222-2222-4222-8222-222222222222";
const VICTIM_PROJECT = "22222222-2222-4222-8222-222222222223";
const OWNED_TASK = "33333333-3333-4333-8333-333333333334";
const OWNED_PROJECT = "33333333-3333-4333-8333-333333333333";
const OWNED_AREA = "33333333-3333-4333-8333-333333333331";
const OWNED_GOAL = "33333333-3333-4333-8333-333333333332";

type Row = Record<string, unknown>;

interface ClientConfig {
  /** table → ids assertOwnedIds should find (rows this caller owns). */
  owned?: Record<string, string[]>;
  /** table → rows returned when the builder itself is awaited (junction reads). */
  thenData?: Record<string, Row[]>;
  /** Row returned by maybeSingle (tasks/projects fetches). */
  singleRow?: Row | null;
}

/**
 * Mock supabase client that records junction writes and captures the
 * filter chain of every update/delete so tests can assert that
 * parent-scoped predicates (user_id) are present.
 */
function makeJunctionClient(cfg: ClientConfig = {}) {
  const inserts: Array<{ table: string; rows: Row[] }> = [];
  const updates: Array<{ table: string; payload: Row; filters: Record<string, unknown> }> = [];
  const deletes: Array<{ table: string; filters: Record<string, unknown> }> = [];

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
      // assertOwnedIds shape: .select("id").eq("user_id", …).in("id", …)
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
      return Promise.resolve({ error: null });
    };
    api.update = (payload: Row) => {
      // filters is captured by reference: eq() calls chained after update()
      // mutate the same object the test later inspects.
      updates.push({ table, payload, filters });
      return api;
    };
    api.delete = () => {
      const entry = { table, filters };
      deletes.push(entry);
      const delApi: Record<string, unknown> = {};
      delApi.eq = (col: string, val: unknown) => {
        entry.filters[col] = val;
        return delApi;
      };
      delApi.in = (col: string, vals: unknown[]) => {
        entry.filters[col] = vals;
        return Promise.resolve({ error: null });
      };
      return delApi;
    };
    api.maybeSingle = () => Promise.resolve({ data: cfg.singleRow ?? null, error: null });
    api.single = () => Promise.resolve({ data: null, error: null });
    api.then = (
      onFulfilled: (v: { data: unknown[]; error: null }) => unknown,
      onRejected?: (e: unknown) => unknown,
    ) =>
      Promise.resolve({ data: cfg.thenData?.[table] ?? [], error: null }).then(
        onFulfilled,
        onRejected,
      );
    return api;
  }

  return {
    from: (table: string) => builder(table),
    _inserts: inserts,
    _updates: updates,
    _deletes: deletes,
  } as unknown as SupabaseClient & {
    _inserts: Array<{ table: string; rows: Row[] }>;
    _updates: Array<{ table: string; payload: Row; filters: Record<string, unknown> }>;
    _deletes: Array<{ table: string; filters: Record<string, unknown> }>;
  };
}

describe("task junction writers verify parent ownership", () => {
  it("replaceAreaLinks rejects a foreign parent task id (404) and inserts nothing", async () => {
    const client = makeJunctionClient({ owned: { areas: [OWNED_AREA] } });
    await expect(
      taskService.replaceAreaLinks(ATTACKER, VICTIM_TASK, [OWNED_AREA], {
        supabase: client,
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(client._inserts.some((x) => x.table === "task_areas")).toBe(false);
  });

  it("replaceGoalLinks rejects a foreign parent task id (404) and inserts nothing", async () => {
    const client = makeJunctionClient({ owned: { goals: [OWNED_GOAL] } });
    await expect(
      taskService.replaceGoalLinks(ATTACKER, VICTIM_TASK, [OWNED_GOAL], {
        supabase: client,
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(client._inserts.some((x) => x.table === "goal_tasks")).toBe(false);
  });

  it("replaceProjectLinks rejects a foreign parent task id (404) and inserts nothing", async () => {
    const client = makeJunctionClient({ owned: { projects: [OWNED_PROJECT] } });
    await expect(
      taskService.replaceProjectLinks(ATTACKER, VICTIM_TASK, [OWNED_PROJECT], {
        supabase: client,
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(client._inserts.some((x) => x.table === "task_projects")).toBe(false);
  });

  it("replaceAreaLinks with an owned parent and owned area still links (positive control)", async () => {
    const client = makeJunctionClient({
      owned: { tasks: [OWNED_TASK], areas: [OWNED_AREA] },
    });
    await expect(
      taskService.replaceAreaLinks(ATTACKER, OWNED_TASK, [OWNED_AREA], {
        supabase: client,
      }),
    ).resolves.toBeUndefined();
    expect(client._inserts).toContainEqual({
      table: "task_areas",
      rows: [{ area_id: OWNED_AREA, task_id: OWNED_TASK }],
    });
  });

  it("the status re-derivation UPDATE is scoped by user_id", async () => {
    const client = makeJunctionClient({
      owned: { tasks: [OWNED_TASK], areas: [OWNED_AREA] },
      // Inbox task with a singular area and a due date: the derived status
      // is todo, so syncTaskStatusFromContext performs an UPDATE.
      singleRow: {
        status: "inbox",
        area_id: OWNED_AREA,
        project_id: null,
        due_date: "2026-06-01T00:00:00.000Z",
      },
    });
    await taskService.replaceAreaLinks(ATTACKER, OWNED_TASK, [OWNED_AREA], {
      supabase: client,
    });
    const taskStatusUpdates = client._updates.filter(
      (u) => u.table === "tasks" && "status" in u.payload,
    );
    expect(taskStatusUpdates.length).toBeGreaterThan(0);
    for (const u of taskStatusUpdates) {
      expect(u.filters.user_id).toBe(ATTACKER);
    }
  });
});

describe("project junction writers verify parent ownership", () => {
  it("linkToArea rejects a foreign parent project id (404) and inserts nothing", async () => {
    const client = makeJunctionClient({ owned: { areas: [OWNED_AREA] } });
    await expect(
      projectService.linkToArea(ATTACKER, VICTIM_PROJECT, OWNED_AREA, {
        supabase: client,
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(client._inserts.some((x) => x.table === "project_areas")).toBe(false);
  });

  it("unlinkFromArea rejects a foreign parent project id (404) and deletes nothing", async () => {
    const client = makeJunctionClient({
      owned: { areas: [OWNED_AREA] },
      thenData: { project_areas: [{ area_id: OWNED_AREA }] },
    });
    await expect(
      projectService.unlinkFromArea(ATTACKER, VICTIM_PROJECT, OWNED_AREA, {
        supabase: client,
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(client._deletes.some((x) => x.table === "project_areas")).toBe(false);
  });

  it("linkToGoal rejects a foreign parent project id (404) and inserts nothing", async () => {
    const client = makeJunctionClient({ owned: { goals: [OWNED_GOAL] } });
    await expect(
      projectService.linkToGoal(ATTACKER, VICTIM_PROJECT, OWNED_GOAL, {
        supabase: client,
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(client._inserts.some((x) => x.table === "goal_projects")).toBe(false);
  });

  it("replaceAreaLinks rejects a foreign parent project id (404) and inserts nothing", async () => {
    const client = makeJunctionClient({ owned: { areas: [OWNED_AREA] } });
    await expect(
      projectService.replaceAreaLinks(ATTACKER, VICTIM_PROJECT, [OWNED_AREA], {
        supabase: client,
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
    expect(client._inserts.some((x) => x.table === "project_areas")).toBe(false);
  });

  it("linkToArea with an owned parent and owned area still links (positive control)", async () => {
    const client = makeJunctionClient({
      owned: { projects: [OWNED_PROJECT], areas: [OWNED_AREA] },
    });
    await expect(
      projectService.linkToArea(ATTACKER, OWNED_PROJECT, OWNED_AREA, {
        supabase: client,
      }),
    ).resolves.toBeUndefined();
    expect(client._inserts).toContainEqual({
      table: "project_areas",
      rows: [{ area_id: OWNED_AREA, project_id: OWNED_PROJECT }],
    });
  });
});

import { describe, it, expect, vi } from "vitest";
import { taskService } from "@/lib/services/task.service";
import { projectService } from "@/lib/services/project.service";
import type { SupabaseClient } from "@supabase/supabase-js";

// Regression tests for the junction READ sub-routes (audit finding
// `src/app/api/v1/junction-read-routes/unscoped-parent-keyed-hydration`):
// the junction read helpers query junction tables keyed by a bare parent
// id. On the API-key path createDataClient returns the RLS-bypassing
// service-role client, so a caller holding any valid sop_ key can read
// another user's task/project link graph when it knows the parent id.
// The helpers must bind the parent to the caller via assertOwnedIds
// (projectService.getWithRelations already accepts a userId it must
// actually use; taskService's helpers gain the userId parameter).
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => {
    throw new Error("unmocked createClient() reached");
  }),
}));

const ATTACKER = "11111111-1111-4111-8111-111111111111";
const VICTIM_TASK = "22222222-2222-4222-8222-222222222222";
const VICTIM_PROJECT = "22222222-2222-4222-8222-222222222223";
const OWNED_TASK = "33333333-3333-4333-8333-333333333334";
const OWNED_PROJECT = "33333333-3333-4333-8333-333333333333";
const OWNED_AREA = "33333333-3333-4333-8333-333333333331";
const OWNED_GOAL = "33333333-3333-4333-8333-333333333332";
const OWNED_PROJECT_LINK = "33333333-3333-4333-8333-333333333335";

type Row = Record<string, unknown>;

interface ClientConfig {
  /** table → ids assertOwnedIds should find (rows this caller owns). */
  owned?: Record<string, string[]>;
  /** table → rows returned when the builder itself is awaited (junction reads). */
  thenData?: Record<string, Row[]>;
}

function makeReadClient(cfg: ClientConfig = {}) {
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
    api.maybeSingle = () => Promise.resolve({ data: null, error: null });
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
  } as unknown as SupabaseClient;
}

describe("task junction read helpers are tenant-safe", () => {
  it("getAreaLinks rejects a foreign parent task id (404)", async () => {
    const client = makeReadClient();
    await expect(
      taskService.getAreaLinks(ATTACKER, VICTIM_TASK, { supabase: client }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("getGoalLinks rejects a foreign parent task id (404)", async () => {
    const client = makeReadClient();
    await expect(
      taskService.getGoalLinks(ATTACKER, VICTIM_TASK, { supabase: client }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("getProjectLinks rejects a foreign parent task id (404)", async () => {
    const client = makeReadClient();
    await expect(
      taskService.getProjectLinks(ATTACKER, VICTIM_TASK, { supabase: client }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("getWithRelations rejects a foreign parent task id (404)", async () => {
    const client = makeReadClient({
      thenData: {
        task_areas: [{ area_id: OWNED_AREA }],
        task_projects: [{ project_id: OWNED_PROJECT_LINK }],
        goal_tasks: [{ goal_id: OWNED_GOAL }],
      },
    });
    await expect(
      taskService.getWithRelations(ATTACKER, VICTIM_TASK, { supabase: client }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("getAreaLinks returns links for an owned parent (positive control)", async () => {
    const client = makeReadClient({
      owned: { tasks: [OWNED_TASK] },
      thenData: { task_areas: [{ area_id: OWNED_AREA }] },
    });
    await expect(
      taskService.getAreaLinks(ATTACKER, OWNED_TASK, { supabase: client }),
    ).resolves.toEqual([OWNED_AREA]);
  });
});

describe("projectService.getWithRelations is tenant-safe", () => {
  it("rejects a foreign parent project id (404)", async () => {
    const client = makeReadClient({
      thenData: {
        goal_projects: [{ goal_id: OWNED_GOAL, goals: { id: OWNED_GOAL, name: "victim goal" } }],
        project_areas: [{ area_id: OWNED_AREA }],
      },
    });
    await expect(
      projectService.getWithRelations(ATTACKER, VICTIM_PROJECT, {
        supabase: client,
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it("returns links for an owned parent (positive control)", async () => {
    const client = makeReadClient({
      owned: { projects: [OWNED_PROJECT] },
      thenData: {
        goal_projects: [{ goal_id: OWNED_GOAL, goals: { id: OWNED_GOAL, name: "goal" } }],
        project_areas: [{ area_id: OWNED_AREA }],
      },
    });
    await expect(
      projectService.getWithRelations(ATTACKER, OWNED_PROJECT, {
        supabase: client,
      }),
    ).resolves.toMatchObject({
      goal_ids: [OWNED_GOAL],
      area_ids: [OWNED_AREA],
    });
  });
});

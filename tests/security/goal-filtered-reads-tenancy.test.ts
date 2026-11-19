import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { noteService } from "@/lib/services/note.service";
import { projectService } from "@/lib/services/project.service";
import { resourceService } from "@/lib/services/resource.service";
import type { Note, Project, Resource } from "@/lib/types/domain.types";

/**
 * Regression: audit sophionos-core-20261117-r1 finding F1
 * (src/app/api/v1/junction-read-routes/unscoped-parent-keyed-hydration, medium).
 *
 * The goal_id-filtered collection routes forward the caller-supplied goal id to
 * *Service.listByGoal, which hydrated junction rows keyed only by goal_id. On
 * the API-key path the data client is the service-role admin client that
 * bypasses the dual-ownership junction RLS, so a foreign goal id returned
 * another tenant's rows. Every listByGoal must preflight goal ownership via
 * assertOwnedIds BEFORE the junction query (mirroring taskService.getGoalLinks).
 */

const GOAL_B = "00000000-0000-4000-8000-00000000bee1";

type RecordedQuery = {
  table: string;
  select?: string;
  filters: Array<{ column: string; value: unknown }>;
};

function makeRecordingStub(rowsByTable: Record<string, unknown[]>) {
  const queries: RecordedQuery[] = [];
  const builder = (q: RecordedQuery) => {
    const b = {
      select(c?: string) {
        q.select = c;
        return b;
      },
      eq(column: string, value: unknown) {
        q.filters.push({ column, value });
        return b;
      },
      in(column: string, values: unknown[]) {
        q.filters.push({ column, value: values });
        return b;
      },
      order() {
        return b;
      },
      limit() {
        return b;
      },
      range() {
        return b;
      },
      single() {
        return Promise.resolve({ data: null, error: null });
      },
      maybeSingle() {
        return Promise.resolve({ data: null, error: null });
      },
      upsert() {
        return Promise.resolve({ data: null, error: null });
      },
      insert() {
        return Promise.resolve({ data: null, error: null });
      },
      update() {
        return Promise.resolve({ data: null, error: null });
      },
      delete() {
        return Promise.resolve({ data: null, error: null });
      },
      then(onF: (result: { data: unknown[]; error: null }) => unknown, onR: (e: unknown) => unknown) {
        return Promise.resolve({ data: rowsByTable[q.table] ?? [], error: null }).then(onF, onR);
      },
    };
    return b;
  };
  const stub = {
    queries,
    from(table: string) {
      const q: RecordedQuery = { table, filters: [] };
      queries.push(q);
      return builder(q);
    },
    rpc() {
      return Promise.resolve({ data: null, error: null });
    },
  };
  return { ...stub, supabase: stub as unknown as SupabaseClient, queries };
}

describe("goal-filtered list reads bind the parent goal to the caller (audit F1)", () => {
  it("noteService.listByGoal preflights goal ownership and rejects a foreign goal", async () => {
    const foreignNote = {
      id: "00000000-0000-4000-8000-00000000004e",
      user_id: "user-B",
      name: "Victim note",
      content: "foreign tenant content",
    };
    // goal_notes has a linked row for the foreign goal; goals has no row owned
    // by user-A — the ownership preflight must reject before hydration.
    const stub = makeRecordingStub({
      goal_notes: [{ note_id: foreignNote.id, goal_id: GOAL_B, note: foreignNote }],
      goals: [],
    });

    await expect(
      noteService.listByGoal("user-A", GOAL_B, { supabase: stub.supabase }),
    ).rejects.toThrow();

    expect(stub.queries[0].table).toBe("goals");
    expect(stub.queries[0].filters).toEqual([
      { column: "user_id", value: "user-A" },
      { column: "id", value: [GOAL_B] },
    ]);
    expect(stub.queries.every((q) => q.table !== "goal_notes")).toBe(true);
  });

  it("projectService.listByGoal preflights goal ownership and rejects a foreign goal", async () => {
    const foreignProject = {
      id: "00000000-0000-4000-8000-000000000001",
      user_id: "user-B",
      name: "Victim project",
    };
    const stub = makeRecordingStub({
      goal_projects: [{ project_id: foreignProject.id, goal_id: GOAL_B, project: foreignProject }],
      goals: [],
    });

    await expect(
      projectService.listByGoal("user-A", GOAL_B, { supabase: stub.supabase }),
    ).rejects.toThrow();

    expect(stub.queries[0].table).toBe("goals");
    expect(stub.queries.every((q) => q.table !== "goal_projects")).toBe(true);
  });

  it("resourceService.listByGoal preflights goal ownership and rejects a foreign goal", async () => {
    const foreignResource = {
      id: "00000000-0000-4000-8000-0000000000e1",
      user_id: "user-B",
      name: "Victim resource",
    };
    const stub = makeRecordingStub({
      goal_resources: [{ resource_id: foreignResource.id, goal_id: GOAL_B, resource: foreignResource }],
      goals: [],
    });

    await expect(
      resourceService.listByGoal("user-A", GOAL_B, { supabase: stub.supabase }),
    ).rejects.toThrow();

    expect(stub.queries[0].table).toBe("goals");
    expect(stub.queries.every((q) => q.table !== "goal_resources")).toBe(true);
  });

  it("an owned goal still hydrates its junction rows (no functional regression)", async () => {
    const ownNote = {
      id: "00000000-0000-4000-8000-00000000004e",
      user_id: "user-A",
      name: "Own note",
      content: "own tenant content",
    };
    const stub = makeRecordingStub({
      goals: [{ id: GOAL_B, user_id: "user-A" }],
      goal_notes: [{ note_id: ownNote.id, goal_id: GOAL_B, note: ownNote }],
    });

    const notes = (await noteService.listByGoal("user-A", GOAL_B, {
      supabase: stub.supabase,
    })) as unknown as Note[];
    expect(notes).toHaveLength(1);
    expect(notes[0].user_id).toBe("user-A");
    expect(stub.queries[0].table).toBe("goals");
    expect(stub.queries.some((q) => q.table === "goal_notes")).toBe(true);
  });

  it("project/resource hydration still runs for an owned goal (type pass-through)", async () => {
    const ownProject = { id: "00000000-0000-4000-8000-000000000001", user_id: "user-A", name: "Own project" };
    const stub = makeRecordingStub({
      goals: [{ id: GOAL_B, user_id: "user-A" }],
      goal_projects: [{ project_id: ownProject.id, goal_id: GOAL_B, project: ownProject }],
    });

    const projects = (await projectService.listByGoal("user-A", GOAL_B, {
      supabase: stub.supabase,
    })) as unknown as Project[];
    expect(projects).toHaveLength(1);
    expect(projects[0].user_id).toBe("user-A");
    expect(stub.queries[0].table).toBe("goals");
    expect(stub.queries.some((q) => q.table === "goal_projects")).toBe(true);

    const ownResource = { id: "00000000-0000-4000-8000-0000000000e1", user_id: "user-A", name: "Own resource" };
    const rStub = makeRecordingStub({
      goals: [{ id: GOAL_B, user_id: "user-A" }],
      goal_resources: [{ resource_id: ownResource.id, goal_id: GOAL_B, resource: ownResource }],
    });
    const resources = (await resourceService.listByGoal("user-A", GOAL_B, {
      supabase: rStub.supabase,
    })) as unknown as Resource[];
    expect(resources).toHaveLength(1);
    expect(rStub.queries[0].table).toBe("goals");
  });
});

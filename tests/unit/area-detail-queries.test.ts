import { describe, expect, it } from "vitest";

import { serverFetchAreaDetail } from "../../src/lib/queries/area-detail.queries";

/**
 * Minimal thenable Supabase stub. Each chained method returns the same builder
 * so any combination of .select/.eq/.in/.order resolves to the rows registered
 * for that table. Junction tables back the .in(...) reads the production code
 * performs to hydrate linkedGoalIds / linkedTaskIds onto notes and resources.
 */
function makeSupabase(tables: Record<string, unknown[]>) {
  function builder(table: string) {
    const rows = tables[table] ?? [];
    const b = {
      select: () => b,
      eq: () => b,
      in: () => b,
      order: () => b,
      maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
      single: async () => ({ data: rows[0] ?? null, error: null }),
      then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
        resolve({ data: rows, error: null }),
    };
    return b;
  }
  return { from: (t: string) => builder(t) } as never;
}

const baseTables = () => ({
  areas: [
    {
      id: "area-1",
      user_id: "user-1",
      name: "Area One",
      slug: "area-one",
      icon: null,
      color: null,
      type: null,
      metadata: null,
      inactive: false,
      archive: false,
      description: null,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    },
  ],
  goals: [],
  projects: [],
  tasks: [
    {
      id: "task-1",
      user_id: "user-1",
      area_id: "area-1",
      project_id: null,
      name: "Task One",
      status: "inbox",
      is_completed: false,
      is_archived: false,
    },
  ],
  notes: [
    {
      id: "note-1",
      user_id: "user-1",
      area_id: "area-1",
      project_id: null,
      topic_id: null,
      name: "Note One",
      slug: "note-one",
      type: "note",
      status: "inbox",
      favorite: false,
      pin: false,
      is_archived: false,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    },
  ],
  resources: [
    {
      id: "res-1",
      user_id: "user-1",
      area_id: "area-1",
      project_id: null,
      topic_id: "topic-1",
      name: "Resource One",
      url: "https://example.com",
      type: "link",
      status: "inbox",
      favorite: false,
      is_archived: false,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    },
  ],
  goal_areas: [],
  goal_projects: [],
  goal_tasks: [],
  project_areas: [],
  task_areas: [{ task_id: "task-1", area_id: "area-1" }],
  note_areas: [{ note_id: "note-1", area_id: "area-1" }],
  note_projects: [],
  note_notebooks: [{ note_id: "note-1", notebook: "Inbox" }],
  resource_areas: [{ resource_id: "res-1", area_id: "area-1" }],
  goal_notes: [{ note_id: "note-1", goal_id: "goal-1" }],
  task_notes: [{ note_id: "note-1", task_id: "task-1" }],
  goal_resources: [{ resource_id: "res-1", goal_id: "goal-1" }],
  task_resources: [{ resource_id: "res-1", task_id: "task-1" }],
  topics: [{ id: "topic-1", name: "Topic One" }],
});

describe("serverFetchAreaDetail hydration parity", () => {
  it("hydrates notes with goal and task links", async () => {
    const supabase = makeSupabase(baseTables());
    const result = await serverFetchAreaDetail(supabase, "user-1", "area-one");

    const note = result.notes[0];
    expect(note.linkedGoalIds).toContain("goal-1");
    expect(note.linkedTaskIds).toContain("task-1");
    expect(note.linkedAreaIds).toContain("area-1");
  });

  it("hydrates resources with goal and task links", async () => {
    const supabase = makeSupabase(baseTables());
    const result = await serverFetchAreaDetail(supabase, "user-1", "area-one");

    const resource = result.resources[0];
    expect(resource.linkedGoalIds).toContain("goal-1");
    expect(resource.linkedTaskIds).toContain("task-1");
  });

  it("includes topic names for resource topic ids", async () => {
    const supabase = makeSupabase(baseTables());
    const result = await serverFetchAreaDetail(supabase, "user-1", "area-one");

    expect(result.topicNames).toEqual([{ id: "topic-1", name: "Topic One" }]);
  });
});

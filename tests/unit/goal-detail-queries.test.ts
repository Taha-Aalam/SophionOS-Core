import { describe, expect, it } from "vitest";

import { serverFetchGoalDetail } from "../../src/lib/queries/goal-detail.queries";

/**
 * Minimal thenable Supabase stub. Each chained method returns the same builder
 * so any combination of .select/.eq/.in/.order resolves to the rows registered
 * for that table. Rows can carry MULTIPLE shapes at once (e.g. goal_notes rows
 * expose both `{ note }` and `{ note_id, goal_id }`) so a single table can back
 * the embedded-join read and the junction read the production code performs.
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
  goals: [
    {
      id: "goal-uuid-1",
      user_id: "user-1",
      area_id: null,
      name: "Goal One",
      description: null,
      term: "short",
      priority: "medium",
      target_date: null,
      progress: 0,
      is_completed: false,
      is_archived: false,
      slug: "goal-one",
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    },
  ],
  goal_areas: [{ area_id: "area-1" }],
  goal_projects: [],
  goal_tasks: [
    {
      task: {
        id: "task-1",
        user_id: "user-1",
        name: "Task One",
        status: "inbox",
        project_id: null,
        area_id: null,
        is_completed: false,
        is_archived: false,
      },
    },
  ],
  goal_notes: [
    {
      // embedded-join shape (step: select "note:notes(*)")
      note: {
        id: "note-1",
        user_id: "user-1",
        area_id: null,
        project_id: null,
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
      // junction shape (note -> goal links)
      note_id: "note-1",
      goal_id: "goal-uuid-1",
    },
  ],
  goal_resources: [
    {
      resource: {
        id: "res-1",
        user_id: "user-1",
        area_id: null,
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
      resource_id: "res-1",
      goal_id: "goal-uuid-1",
    },
  ],
  note_areas: [{ note_id: "note-1", area_id: "area-1" }],
  note_projects: [],
  task_notes: [{ note_id: "note-1", task_id: "task-1" }],
  note_notebooks: [
    { note_id: "note-1", notebook: "Inbox" },
    { note_id: "note-1", notebook: "Ideas" },
  ],
  resource_areas: [{ resource_id: "res-1", area_id: "area-1" }],
  task_resources: [{ resource_id: "res-1", task_id: "task-1" }],
  topics: [{ id: "topic-1", name: "Topic One" }],
  tasks: [],
});

describe("serverFetchGoalDetail hydration parity", () => {
  it("hydrates notes with notebooks, goal, task and area links", async () => {
    const supabase = makeSupabase(baseTables());
    const result = await serverFetchGoalDetail(supabase, "user-1", "goal-one");

    const note = result.notes[0];
    expect(note.notebooks).toEqual(["Ideas", "Inbox"]);
    expect(note.linkedGoalIds).toContain("goal-uuid-1");
    expect(note.linkedTaskIds).toContain("task-1");
    expect(note.linkedAreaIds).toContain("area-1");
  });

  it("hydrates resources with goal and task links", async () => {
    const supabase = makeSupabase(baseTables());
    const result = await serverFetchGoalDetail(supabase, "user-1", "goal-one");

    const resource = result.resources[0];
    expect(resource.linkedGoalIds).toContain("goal-uuid-1");
    expect(resource.linkedTaskIds).toContain("task-1");
  });

  it("includes topic names for resource topic ids", async () => {
    const supabase = makeSupabase(baseTables());
    const result = await serverFetchGoalDetail(supabase, "user-1", "goal-one");

    expect(result.topicNames).toEqual([{ id: "topic-1", name: "Topic One" }]);
  });
});

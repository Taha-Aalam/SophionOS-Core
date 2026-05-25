import { describe, expect, it } from "vitest";

import { serverFetchGoals } from "@/lib/queries/goals.queries";
import { serverFetchNotes } from "@/lib/queries/notes.queries";
import { serverFetchProjects } from "@/lib/queries/projects.queries";
import { serverFetchResources } from "@/lib/queries/resources.queries";
import { serverFetchTasks } from "@/lib/queries/tasks.queries";

type QueryRow = Record<string, unknown>;

class MockSupabaseQuery {
  private readonly filters: Array<(row: QueryRow) => boolean> = [];

  constructor(
    private readonly rows: QueryRow[],
  ) {}

  select(_selection: string) {
    return this;
  }

  eq(field: string, value: unknown) {
    this.filters.push((row) => row[field] === value);
    return this;
  }

  in(field: string, values: unknown[]) {
    const allowed = new Set(values);
    this.filters.push((row) => allowed.has(row[field]));
    return this;
  }

  order(_field: string, _options?: { ascending?: boolean }) {
    return this;
  }

  async maybeSingle() {
    return { data: this.applyFilters()[0] ?? null };
  }

  then<TResult1 = { data: QueryRow[] }, TResult2 = never>(
    onfulfilled?: ((value: { data: QueryRow[] }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) {
    return Promise.resolve({ data: this.applyFilters() }).then(onfulfilled, onrejected);
  }

  private applyFilters(): QueryRow[] {
    return this.rows.filter((row) => this.filters.every((filter) => filter(row)));
  }
}

function createMockSupabase(fixtures: Record<string, QueryRow[]>) {
  return {
    from(table: string) {
      return new MockSupabaseQuery(fixtures[table] ?? []);
    },
  };
}

describe("server query hydration", () => {
  it("hydrates goals with linked area ids and recomputed progress", async () => {
    const supabase = createMockSupabase({
      goals: [
        {
          id: "goal-1",
          user_id: "user-1",
          area_id: "area-1",
          name: "Goal",
          description: null,
          term: "mid",
          priority: "medium",
          target_date: null,
          progress: 7,
          is_completed: false,
          is_archived: false,
          slug: "goal",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      goal_areas: [{ goal_id: "goal-1", area_id: "area-2" }],
      goal_projects: [],
      goal_tasks: [
        { goal_id: "goal-1", task: { is_completed: true, is_archived: false, project_id: null } },
        { goal_id: "goal-1", task: { is_completed: false, is_archived: false, project_id: null } },
      ],
      goal_notes: [],
      goal_resources: [],
      note_projects: [],
      tasks: [],
      notes: [],
      resources: [],
    });

    const [goal] = await serverFetchGoals(supabase as never, "user-1", { status: "all" });

    expect(goal?.linkedAreaIds).toEqual(["area-1", "area-2"]);
    expect(goal?.progress).toBe(50);
    expect(goal?.taskCount).toBe(1);
  });

  it("matches client progress math for goal-linked notes already covered by linked projects", async () => {
    const supabase = createMockSupabase({
      goals: [
        {
          id: "goal-1",
          user_id: "user-1",
          area_id: "area-1",
          name: "Goal",
          description: null,
          term: "mid",
          priority: "medium",
          target_date: null,
          progress: 0,
          is_completed: false,
          is_archived: false,
          slug: "goal",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      goal_areas: [],
      goal_projects: [
        {
          goal_id: "goal-1",
          project: { id: "project-1", status: "active", is_archived: false, progress: 0 },
        },
      ],
      goal_tasks: [],
      goal_notes: [
        {
          goal_id: "goal-1",
          note: { id: "note-1", status: "saved", is_archived: false, project_id: null },
        },
      ],
      goal_resources: [],
      note_projects: [{ note_id: "note-1", project_id: "project-1" }],
      tasks: [],
      notes: [],
      resources: [],
    });

    const [goal] = await serverFetchGoals(supabase as never, "user-1", { status: "all" });

    expect(goal?.progress).toBe(0);
  });

  it("hydrates projects with linked area ids", async () => {
    const supabase = createMockSupabase({
      projects: [
        {
          id: "project-1",
          user_id: "user-1",
          area_id: "area-1",
          name: "Project",
          description: null,
          status: "active",
          priority: "medium",
          start_date: null,
          due_date: null,
          progress: 0,
          is_archived: false,
          slug: "project",
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      project_areas: [{ project_id: "project-1", area_id: "area-2" }],
      goal_projects: [{ project_id: "project-1", goal_id: "goal-1" }],
    });

    const [project] = await serverFetchProjects(supabase as never, "user-1", { status: "all" });

    expect(project?.linkedAreaIds).toEqual(["area-1", "area-2"]);
    expect(project?.linkedGoalIds).toEqual(["goal-1"]);
  });

  it("hydrates tasks with linked areas, goals, and projects", async () => {
    const supabase = createMockSupabase({
      tasks: [
        {
          id: "task-1",
          user_id: "user-1",
          area_id: "area-1",
          project_id: null,
          name: "Task",
          description: null,
          status: "inbox",
          priority: "medium",
          due_date: null,
          is_completed: false,
          is_focused: false,
          is_important: false,
          is_urgent: false,
          completed_at: null,
          smart_priority: null,
          is_archived: false,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      task_areas: [{ task_id: "task-1", area_id: "area-2" }],
      goal_tasks: [{ task_id: "task-1", goal_id: "goal-1" }],
      task_projects: [{ task_id: "task-1", project_id: "project-1" }],
    });

    const [task] = await serverFetchTasks(supabase as never, "user-1");

    expect(task?.linkedAreaIds).toEqual(["area-1", "area-2"]);
    expect(task?.linkedGoalIds).toEqual(["goal-1"]);
    expect(task?.linkedProjectIds).toEqual(["project-1"]);
  });

  it("hydrates notes with linked areas and projects", async () => {
    const supabase = createMockSupabase({
      notes: [
        {
          id: "note-1",
          user_id: "user-1",
          area_id: "area-1",
          project_id: null,
          topic_id: null,
          name: "Note",
          slug: "note",
          content: null,
          type: "text",
          status: "active",
          favorite: false,
          pin: false,
          is_archived: false,
          metadata: null,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      note_areas: [{ note_id: "note-1", area_id: "area-2" }],
      note_projects: [{ note_id: "note-1", project_id: "project-1" }],
      note_notebooks: [
        { note_id: "note-1", notebook: "Ideas" },
        { note_id: "note-1", notebook: "Work" },
      ],
    });

    const [note] = await serverFetchNotes(supabase as never, "user-1", { includeArchived: true });

    expect(note?.linkedAreaIds).toEqual(["area-1", "area-2"]);
    expect(note?.linkedProjectIds).toEqual(["project-1"]);
    expect(note?.notebooks).toEqual(["Ideas", "Work"]);
  });

  it("hydrates resources with linked area ids", async () => {
    const supabase = createMockSupabase({
      resources: [
        {
          id: "resource-1",
          user_id: "user-1",
          area_id: "area-1",
          project_id: null,
          topic_id: null,
          name: "Resource",
          url: null,
          type: "link",
          status: "active",
          favorite: false,
          is_archived: false,
          metadata: null,
          created_at: "2026-01-01T00:00:00.000Z",
          updated_at: "2026-01-01T00:00:00.000Z",
        },
      ],
      resource_areas: [{ resource_id: "resource-1", area_id: "area-2" }],
    });

    const [resource] = await serverFetchResources(supabase as never, "user-1");

    expect(resource?.linkedAreaIds).toEqual(["area-1", "area-2"]);
  });
});

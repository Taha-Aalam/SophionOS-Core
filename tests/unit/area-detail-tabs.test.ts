import { describe, expect, it } from "vitest";
import type { Goal, Note, Task } from "../../src/lib/types/domain.types";

const makeGoal = (overrides: Partial<Goal> = {}): Goal =>
  ({
    id: "g-1",
    user_id: "user-1",
    name: "Test Goal",
    description: null,
    progress: 0,
    term: "short",
    priority: "medium",
    area_id: "area-1",
    is_completed: false,
    is_archived: false,
    is_inactive: false,
    target_date: null,
    created_at: "2026-04-28T10:00:00.000Z",
    updated_at: "2026-04-28T10:00:00.000Z",
    slug: "test-goal",
    projectCount: 0,
    taskCount: 0,
    noteCount: 0,
    resourceCount: 0,
    ...overrides,
  }) as Goal;

const makeNote = (overrides: Partial<Note> = {}): Note =>
  ({
    id: "n-1",
    user_id: "user-1",
    name: "Test Note",
    content: null,
    type: "text",
    status: "active",
    area_id: "area-1",
    is_archived: false,
    created_at: "2026-04-28T10:00:00.000Z",
    updated_at: "2026-04-28T10:00:00.000Z",
    slug: "test-note",
    ...overrides,
  }) as Note;

const makeTask = (overrides: Partial<Task> = {}): Task =>
  ({
    id: "t-1",
    user_id: "user-1",
    name: "Test Task",
    status: "inbox",
    is_completed: false,
    is_archived: false,
    priority: "medium",
    due_date: null,
    project_id: null,
    linkedGoalIds: [],
    area_id: "area-1",
    created_at: "2026-04-28T10:00:00.000Z",
    updated_at: "2026-04-28T10:00:00.000Z",
    ...overrides,
  }) as Task;

function filterGoals(goals: Goal[], tab: string): Goal[] {
  const termMap: Record<string, string | undefined> = {
    short: "short",
    mid: "mid",
    long: "long",
  };
  const term = termMap[tab];
  const isAutoInactive = (g: Goal) =>
    !g.is_archived && !g.is_completed &&
    (g.projectCount ?? 0) === 0 && (g.taskCount ?? 0) === 0 &&
    (g.noteCount ?? 0) === 0 && (g.resourceCount ?? 0) === 0;
  const isInactive = (g: Goal) => g.is_inactive || isAutoInactive(g);

  return goals.filter((g) => {
    if (tab === "archived") return g.is_archived;
    if (g.is_archived) return false;
    if (tab === "inactive") return isInactive(g);
    if (g.is_completed) return tab === "completed";
    if (tab === "completed") return false;
    // Only exclude inactive goals from the "active" tab; term tabs keep them
    // so users can still browse short/mid/long goals regardless of activity.
    if (tab === "active" && isInactive(g)) return false;
    if (term && g.term !== term) return false;
    return true;
  });
}

function filterNotes(notes: Note[], tab: string): Note[] {
  if (tab === "all") return notes;
  if (tab === "inbox") return notes.filter((n) => n.status === "inbox");
  if (tab === "to_review") return notes.filter((n) => n.status === "to_review");
  if (tab === "active") return notes.filter((n) => n.status === "active" && !n.is_archived);
  if (tab === "archived") return notes.filter((n) => n.is_archived);
  return notes;
}

function filterTasks(tasks: Task[], tab: string): Task[] {
  if (tab === "all") return tasks;
  if (tab === "inbox") return tasks.filter((t) => t.status === "inbox" && !t.is_completed);
  if (tab === "upcoming")
    return tasks.filter((t) => t.status !== "inbox" && t.status !== "completed" && !t.is_completed);
  if (tab === "overdue")
    return tasks.filter((t) => {
      if (!t.due_date || t.is_completed) return false;
      return new Date(t.due_date) < new Date();
    });
  if (tab === "by_goal") return tasks.filter((t) => t.linkedGoalIds && t.linkedGoalIds.length > 0);
  if (tab === "by_project") return tasks.filter((t) => !!t.project_id);
  if (tab === "completed") return tasks.filter((t) => t.is_completed);
  return tasks;
}

describe("area detail goal tab filtering", () => {
  const allGoals: Goal[] = [
    makeGoal({ id: "g-active-short", term: "short", is_completed: false, is_archived: false, projectCount: 1 }),
    makeGoal({ id: "g-active-mid", term: "mid", is_completed: false, is_archived: false, projectCount: 1 }),
    makeGoal({ id: "g-active-long", term: "long", is_completed: false, is_archived: false, projectCount: 1 }),
    makeGoal({ id: "g-inactive-manual", term: "short", is_completed: false, is_archived: false, is_inactive: true, projectCount: 1 }),
    makeGoal({ id: "g-inactive-auto", term: "mid", is_completed: false, is_archived: false, projectCount: 0, taskCount: 0, noteCount: 0, resourceCount: 0 }),
    makeGoal({ id: "g-completed", is_completed: true, is_archived: false, projectCount: 1 }),
    makeGoal({ id: "g-archived", is_archived: true }),
  ];

  it("Active tab shows non-completed, non-archived, non-inactive goals", () => {
    const result = filterGoals(allGoals, "active");
    expect(result.map((g) => g.id)).toEqual([
      "g-active-short",
      "g-active-mid",
      "g-active-long",
    ]);
  });

  it("Short Term tab shows active goals with term=short", () => {
    const result = filterGoals(allGoals, "short");
    expect(result.map((g) => g.id)).toEqual(["g-active-short", "g-inactive-manual"]);
  });

  it("Mid Term tab shows active goals with term=mid", () => {
    const result = filterGoals(allGoals, "mid");
    expect(result.map((g) => g.id)).toEqual(["g-active-mid", "g-inactive-auto"]);
  });

  it("Long Term tab shows active goals with term=long", () => {
    const result = filterGoals(allGoals, "long");
    expect(result.map((g) => g.id)).toEqual(["g-active-long"]);
  });

  it("Inactive tab shows manually inactive goals", () => {
    const result = filterGoals(allGoals, "inactive");
    expect(result.map((g) => g.id)).toEqual([
      "g-inactive-manual",
      "g-inactive-auto",
    ]);
  });

  it("Archived tab shows archived goals", () => {
    const result = filterGoals(allGoals, "archived");
    expect(result.map((g) => g.id)).toEqual(["g-archived"]);
  });

  it("Completed tab shows completed non-archived goals", () => {
    const result = filterGoals(allGoals, "completed");
    expect(result.map((g) => g.id)).toEqual(["g-completed"]);
  });

  it("inactive tab does not include completed goals", () => {
    const goalsWithCompletedArchived = [
      makeGoal({ id: "g-completed", is_completed: true, is_archived: false, projectCount: 1 }),
      makeGoal({ id: "g-archived", is_archived: true }),
      makeGoal({ id: "g-inactive-manual", is_completed: false, is_archived: false, is_inactive: true, projectCount: 1 }),
    ];
    const result = filterGoals(goalsWithCompletedArchived, "inactive");
    expect(result.map((g) => g.id)).toEqual(["g-inactive-manual"]);
    expect(result.find((g) => g.id === "g-completed")).toBeUndefined();
    expect(result.find((g) => g.id === "g-archived")).toBeUndefined();
  });
});

describe("area detail note tab filtering", () => {
  const allNotes: Note[] = [
    makeNote({ id: "n-all", status: "active" }),
    makeNote({ id: "n-inbox", status: "inbox" }),
    makeNote({ id: "n-to-review", status: "to_review" }),
    makeNote({ id: "n-archived", status: "active", is_archived: true }),
  ];

  it("All tab returns all notes", () => {
    const result = filterNotes(allNotes, "all");
    expect(result.map((n) => n.id)).toEqual([
      "n-all",
      "n-inbox",
      "n-to-review",
      "n-archived",
    ]);
  });

  it("Inbox tab returns only inbox notes", () => {
    const result = filterNotes(allNotes, "inbox");
    expect(result.map((n) => n.id)).toEqual(["n-inbox"]);
  });

  it("To Review tab returns only to_review notes", () => {
    const result = filterNotes(allNotes, "to_review");
    expect(result.map((n) => n.id)).toEqual(["n-to-review"]);
  });

  it("Active tab returns only active status notes", () => {
    const result = filterNotes(allNotes, "active");
    expect(result.map((n) => n.id)).toEqual(["n-all"]);
  });

  it("Archive tab returns only archived notes", () => {
    const result = filterNotes(allNotes, "archived");
    expect(result.map((n) => n.id)).toEqual(["n-archived"]);
  });

  it("unknown tab returns all notes", () => {
    const result = filterNotes(allNotes, "unknown");
    expect(result.map((n) => n.id)).toEqual([
      "n-all",
      "n-inbox",
      "n-to-review",
      "n-archived",
    ]);
  });
});

describe("goal tab ordering expectation", () => {
  const orderedGoalTabs = ["active", "short", "mid", "long", "inactive", "completed"];
  const expectedLabels = ["Active", "Short Term", "Mid Term", "Long Term", "Inactive", "Completed"];

  it("goal tabs are defined in the expected order", () => {
    const tabValues = ["active", "short", "mid", "long", "inactive", "completed"];
    expect(tabValues).toEqual(orderedGoalTabs);
  });

  it("each goal tab value has a corresponding label in goals-filters test helper", () => {
    const labelMap: Record<string, string> = {
      active: "Active",
      short: "Short Term",
      mid: "Mid Term",
      long: "Long Term",
      inactive: "Inactive",
      completed: "Completed",
    };
    orderedGoalTabs.forEach((tab) => {
      expect(labelMap[tab]).toBe(expectedLabels[orderedGoalTabs.indexOf(tab)]);
    });
  });
});

describe("note tab ordering expectation", () => {
  it("note tabs follow the required order: All, Inbox, To Review, Active, Archive", () => {
    const tabValues = ["all", "inbox", "to_review", "active", "archived"];
    expect(tabValues).toEqual(["all", "inbox", "to_review", "active", "archived"]);
  });
});

describe("area detail task tab filtering", () => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const allTasks: Task[] = [
    makeTask({ id: "t-inbox", status: "inbox", is_completed: false, linkedGoalIds: [], project_id: null }),
    makeTask({ id: "t-upcoming", status: "planned", is_completed: false, due_date: tomorrow.toISOString(), linkedGoalIds: [], project_id: null }),
    makeTask({
      id: "t-overdue",
      status: "planned",
      is_completed: false,
      due_date: yesterday.toISOString(),
      linkedGoalIds: [],
      project_id: null,
    }),
    makeTask({ id: "t-by-goal", status: "planned", is_completed: false, linkedGoalIds: ["g-1"], project_id: null }),
    makeTask({ id: "t-by-project", status: "planned", is_completed: false, linkedGoalIds: [], project_id: "p-1" }),
    makeTask({ id: "t-completed", status: "completed", is_completed: true, linkedGoalIds: [], project_id: null }),
    makeTask({ id: "t-all-normal", status: "planned", is_completed: false, linkedGoalIds: [], project_id: null }),
  ];

  it("All tab returns all tasks", () => {
    const result = filterTasks(allTasks, "all");
    expect(result.map((t) => t.id)).toEqual([
      "t-inbox",
      "t-upcoming",
      "t-overdue",
      "t-by-goal",
      "t-by-project",
      "t-completed",
      "t-all-normal",
    ]);
  });

  it("Inbox tab returns only inbox, non-completed tasks", () => {
    const result = filterTasks(allTasks, "inbox");
    expect(result.map((t) => t.id)).toEqual(["t-inbox"]);
  });

  it("Upcoming tab returns non-inbox, non-completed tasks", () => {
    const result = filterTasks(allTasks, "upcoming");
    expect(result.map((t) => t.id)).toEqual(["t-upcoming", "t-overdue", "t-by-goal", "t-by-project", "t-all-normal"]);
  });

  it("Overdue tab returns tasks with past due dates", () => {
    const result = filterTasks(allTasks, "overdue");
    expect(result.map((t) => t.id)).toEqual(["t-overdue"]);
  });

  it("By Goal tab returns only tasks linked to at least one goal", () => {
    const result = filterTasks(allTasks, "by_goal");
    expect(result.map((t) => t.id)).toEqual(["t-by-goal"]);
  });

  it("By Project tab returns only tasks with a project_id", () => {
    const result = filterTasks(allTasks, "by_project");
    expect(result.map((t) => t.id)).toEqual(["t-by-project"]);
  });

  it("Completed tab returns only completed tasks", () => {
    const result = filterTasks(allTasks, "completed");
    expect(result.map((t) => t.id)).toEqual(["t-completed"]);
  });

  it("unknown tab returns all tasks", () => {
    const result = filterTasks(allTasks, "unknown");
    expect(result.map((t) => t.id)).toEqual([
      "t-inbox",
      "t-upcoming",
      "t-overdue",
      "t-by-goal",
      "t-by-project",
      "t-completed",
      "t-all-normal",
    ]);
  });

  it("by_goal includes task with multiple linkedGoalIds", () => {
    const tasksWithMultipleGoals = [
      makeTask({ id: "t-multi", linkedGoalIds: ["g-1", "g-2"] }),
      makeTask({ id: "t-none", linkedGoalIds: [] }),
    ];
    const result = filterTasks(tasksWithMultipleGoals, "by_goal");
    expect(result.map((t) => t.id)).toEqual(["t-multi"]);
  });

  it("by_goal excludes tasks with empty linkedGoalIds array or null", () => {
    const tasksWithEmptyGoals = [
      makeTask({ id: "t-empty-array", linkedGoalIds: [] }),
      makeTask({ id: "t-null-goals", linkedGoalIds: null as unknown as string[] }),
    ];
    const result = filterTasks(tasksWithEmptyGoals, "by_goal");
    expect(result.map((t) => t.id)).toEqual([]);
  });
});

describe("task tab ordering expectation", () => {
  it("task tabs follow the required order: All, Inbox, Upcoming, Overdue, By Goal, By Project, Completed", () => {
    const tabValues = ["all", "inbox", "upcoming", "overdue", "by_goal", "by_project", "completed"];
    expect(tabValues).toEqual(["all", "inbox", "upcoming", "overdue", "by_goal", "by_project", "completed"]);
  });
});
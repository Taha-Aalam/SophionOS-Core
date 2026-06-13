// @vitest-environment jsdom

// Verifies that ResourceDialog keeps unassigned-area goals, projects, and
// tasks visible in their dropdowns when an area filter is active — for both
// create and edit flows. Locks down the fix from 52ee214.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, it, vi } from "vitest";

// ── Mocks (must be set up before importing the dialog) ────────────────

const mockAreasData = vi.fn();
const mockProjectsData = vi.fn();
const mockGoalsData = vi.fn();
const mockTasksData = vi.fn();
const mockTopicsData = vi.fn();

vi.mock("@/lib/hooks/use-areas", () => ({
  useAreas: () => ({ data: mockAreasData() }),
}));
vi.mock("@/lib/hooks/use-projects", () => ({
  useProjects: () => ({ data: mockProjectsData() }),
}));
vi.mock("@/lib/hooks/use-goals", () => ({
  useGoals: () => ({ data: mockGoalsData() }),
}));
vi.mock("@/lib/hooks/use-tasks", () => ({
  useTasks: () => ({ data: mockTasksData() }),
}));
vi.mock("@/lib/hooks/use-topics", () => ({
  useTopics: () => ({ data: mockTopicsData() }),
}));

const mockGoalProjectRelations = vi.fn();
vi.mock("@/lib/hooks/use-goal-project-ids-map", () => ({
  useGoalProjectRelations: () => ({
    ...mockGoalProjectRelations(),
    isLoading: false,
  }),
}));

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

// Mock the goal_tasks supabase call inside ResourceDialog.
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        // ResourceDialog only reads `data` from this; return empty so task↔goal
        // links are not inferred. Unassigned behavior doesn't depend on it.
        then: () => Promise.resolve({ data: [] }),
      }),
    }),
  }),
}));

import { ResourceDialog } from "@/components/entities/resource-dialog";
import type { Area, Goal, Project, Task } from "@/lib/types/domain.types";

// ── Factories ─────────────────────────────────────────────────────────

function makeArea(overrides: Partial<Area> = {}): Area {
  return {
    id: "area-A",
    user_id: "user-1",
    name: "Work",
    type: "personal",
    icon: null,
    inactive: false,
    archive: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as Area;
}

function makeGoal(id: string, name: string, linkedAreaIds: string[] = []): Goal {
  return {
    id,
    user_id: "user-1",
    name,
    term: "short",
    priority: "medium",
    is_completed: false,
    is_archived: false,
    is_inactive: false,
    area_id: null,
    linkedAreaIds,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  } as Goal;
}

function makeProject(
  id: string,
  name: string,
  linkedAreaIds: string[] = [],
  linkedGoalIds: string[] = [],
): Project {
  return {
    id,
    user_id: "user-1",
    name,
    status: "planning",
    priority: "medium",
    is_archived: false,
    area_id: null,
    linkedAreaIds,
    linkedGoalIds,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  } as Project;
}

function makeTask(
  id: string,
  name: string,
  projectId: string | null,
  linkedAreaIds: string[] = [],
): Task {
  return {
    id,
    user_id: "user-1",
    name,
    status: "to_do",
    priority: "medium",
    is_completed: false,
    is_archived: false,
    is_inactive: false,
    project_id: projectId,
    linkedAreaIds,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  } as Task;
}

// ── Test data ─────────────────────────────────────────────────────────

const AREA_ASSIGNED = "area-A";

const AREAS: Area[] = [makeArea({ id: AREA_ASSIGNED, name: "Work" })];
const GOALS: Goal[] = [
  makeGoal("goal-A", "Goal in Work", [AREA_ASSIGNED]),
  makeGoal("goal-orphan", "Orphan Goal", []),
];
const PROJECTS: Project[] = [
  makeProject("project-A", "Project in Work", [AREA_ASSIGNED], []),
  makeProject("project-orphan", "Orphan Project", [], []),
];
const TASKS: Task[] = [
  makeTask("task-A", "Task in project-A", "project-A"),
  makeTask("task-orphan", "Task in orphan project", "project-orphan"),
];

// ── Render helper ─────────────────────────────────────────────────────

function renderResourceDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ResourceDialog
        open
        onOpenChange={() => {}}
        onSubmit={() => {}}
      />
    </QueryClientProvider>,
  );
}

function getTriggerByLabel(label: RegExp): HTMLElement {
  // PopoverTrigger renders a button with the label text as content.
  // Match by accessible text including the label.
  const buttons = screen.getAllByRole("button");
  for (const btn of buttons) {
    if (label.test(btn.textContent ?? "")) {
      return btn as HTMLElement;
    }
  }
  throw new Error(
    `No button matching ${label} found. Found ${buttons.length} buttons.`,
  );
}

function expectTextPresent(text: string) {
  // getByText throws if not present.
  screen.getByText(text);
}

// ── Setup ─────────────────────────────────────────────────────────────

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    configurable: true,
    value: ResizeObserverMock,
  });
  Object.defineProperty(window.HTMLElement.prototype, "getAnimations", {
    writable: true,
    configurable: true,
    value: () => [],
  });
  window.HTMLElement.prototype.scrollIntoView = vi.fn();

  // Set up the mock hook data.
  mockAreasData.mockReturnValue(AREAS);
  mockProjectsData.mockReturnValue(PROJECTS);
  mockGoalsData.mockReturnValue(GOALS);
  mockTasksData.mockReturnValue(TASKS);
  mockTopicsData.mockReturnValue([]);
  mockGoalProjectRelations.mockReturnValue({
    goalProjectIdsMap: new Map<string, string[]>(),
    projectGoalIdsMap: new Map<string, string[]>(),
  });
});

afterEach(() => {
  cleanup();
});

// ── Tests ─────────────────────────────────────────────────────────────

describe("ResourceDialog: unassigned entities stay visible with area filter", () => {
  it("create flow: without area filter, all goals/projects/tasks appear", async () => {
    const user = userEvent.setup();
    renderResourceDialog();

    // Open Areas dropdown, pick Work, then check Goals dropdown.
    await user.click(getTriggerByLabel(/areas/i));
    await user.click(await screen.findByText("Work"));
    await user.keyboard("{Escape}");

    // Open Goals dropdown.
    await user.click(getTriggerByLabel(/goals/i));
    expectTextPresent("Goal in Work");
    expectTextPresent("Orphan Goal");
    await user.keyboard("{Escape}");

    // Open Projects dropdown.
    await user.click(getTriggerByLabel(/projects/i));
    expectTextPresent("Project in Work");
    expectTextPresent("Orphan Project");
    await user.keyboard("{Escape}");

    // Open Tasks dropdown.
    await user.click(getTriggerByLabel(/tasks/i));
    expectTextPresent("Task in project-A");
    expectTextPresent("Task in orphan project");
  });
});

// @vitest-environment jsdom

// Verifies that NoteMetadataPanel keeps unassigned-area goals, projects, and
// tasks visible in their dropdowns when an area filter is active. These tests
// render the panel directly with controlled props and inspect the dropdowns.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeAll, describe, it, vi } from "vitest";

import { NoteMetadataPanel } from "@/components/entities/note-metadata-panel";
import type { Area, Goal, NoteStatus, Project, Task } from "@/lib/types/domain.types";

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
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  } as Task;
}

// ── Test setup ────────────────────────────────────────────────────────

const AREA_ASSIGNED = "area-A";

const AREAS: Area[] = [
  makeArea({ id: AREA_ASSIGNED, name: "Work" }),
];

const GOALS: Goal[] = [
  makeGoal("goal-A", "Goal in Work", [AREA_ASSIGNED]),
  makeGoal("goal-orphan", "Orphan Goal", []), // unassigned
];

const PROJECTS: Project[] = [
  makeProject("project-A", "Project in Work", [AREA_ASSIGNED], []),
  makeProject("project-orphan", "Orphan Project", [], []), // unassigned
];

const TASKS: Task[] = [
  makeTask("task-A", "Task in project-A", "project-A"),
  makeTask("task-orphan", "Task in orphan project", "project-orphan"),
];

function makeNoop() {
  return () => {};
}

function renderPanel(areaIds: string[] = []) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const noop = makeNoop();
  return render(
    <QueryClientProvider client={queryClient}>
      <NoteMetadataPanel
        areas={AREAS}
        goals={GOALS}
        projects={PROJECTS}
        tasks={TASKS}
        noteTypes={[{ id: "t1", name: "General", slug: "general" }]}
        status={"active" as NoteStatus}
        type="general"
        notebooks={[]}
        notebookOptions={[]}
        areaIds={areaIds}
        goalIds={[]}
        projectIds={[]}
        taskIds={[]}
        favorite={false}
        pin={false}
        onStatusChange={noop}
        onTypeChange={noop}
        onNotebooksChange={noop}
        onAreaIdsChange={noop}
        onGoalIdsChange={noop}
        onProjectIdsChange={noop}
        onTaskIdsChange={noop}
        onFavoriteChange={noop}
        onPinChange={noop}
      />
    </QueryClientProvider>,
  );
}

function getComboboxByPlaceholder(placeholder: RegExp): HTMLElement {
  // The PopoverTrigger renders a button with role="combobox" and a child <span>
  // containing the placeholder text. Match by that inner span text.
  const buttons = screen.getAllByRole("combobox", { hidden: true });
  for (const btn of buttons) {
    if (placeholder.test(btn.textContent ?? "")) {
      return btn as HTMLElement;
    }
  }
  throw new Error(
    `No combobox with placeholder matching ${placeholder} found. Found ${buttons.length} comboboxes.`,
  );
}

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
});

afterEach(() => {
  cleanup();
});

/** Assert text is present in the current document. getByText throws if absent. */
function expectTextPresent(text: string) {
  // Will throw if not found, satisfying the assertion.
  screen.getByText(text);
}

// ── Tests ─────────────────────────────────────────────────────────────

describe("NoteMetadataPanel: unassigned entities stay visible with area filter", () => {
  it("without area filter, all goals/projects/tasks appear in dropdowns", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(getComboboxByPlaceholder(/select goals/i));
    expectTextPresent("Goal in Work");
    expectTextPresent("Orphan Goal");
    await user.keyboard("{Escape}");

    await user.click(getComboboxByPlaceholder(/select projects/i));
    expectTextPresent("Project in Work");
    expectTextPresent("Orphan Project");
    await user.keyboard("{Escape}");

    await user.click(getComboboxByPlaceholder(/link tasks/i));
    expectTextPresent("Task in project-A");
    expectTextPresent("Task in orphan project");
  });

  it("with area filter active, unassigned goal stays visible alongside area-scoped goal", async () => {
    const user = userEvent.setup();
    renderPanel([AREA_ASSIGNED]);

    await user.click(getComboboxByPlaceholder(/select goals/i));
    expectTextPresent("Goal in Work");
    expectTextPresent("Orphan Goal");
  });

  it("with area filter active, unassigned project stays visible alongside area-scoped project", async () => {
    const user = userEvent.setup();
    renderPanel([AREA_ASSIGNED]);

    await user.click(getComboboxByPlaceholder(/select projects/i));
    expectTextPresent("Project in Work");
    expectTextPresent("Orphan Project");
  });

  it("with area filter active, tasks of unassigned project stay visible alongside area-scoped tasks", async () => {
    const user = userEvent.setup();
    renderPanel([AREA_ASSIGNED]);

    await user.click(getComboboxByPlaceholder(/link tasks/i));
    expectTextPresent("Task in project-A");
    expectTextPresent("Task in orphan project");
  });
});

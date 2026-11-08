// @vitest-environment jsdom

import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TaskProcessForm } from "@/components/entities/inbox-task-process-form";

/**
 * Same contract as the resource/note process form tests: the task process
 * form's save handler sends area/goal/project link fields unconditionally
 * (including the singular task scalar project_id), so a linked project the
 * cross-filter hides would reach the PATCH body as an explicit clear and
 * silently delete the task's project junction row AND null the scalar.
 * The preselected guard keeps every stored link visible and saveable.
 */
const hooks = vi.hoisted(() => ({
  updateMutate: vi.fn(),
}));

vi.mock("@/lib/hooks/use-tasks", () => ({
  useUpdateTask: () => ({ mutate: hooks.updateMutate, isPending: false }),
}));

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
  hooks.updateMutate.mockClear();
});

// The linked project carries no goal links; picking goal-a in the form
// cross-filters it out of the candidate list (the filtered list stays
// non-empty because another project carries goal-a), which is the condition
// under which the unguarded strip removed the stored link.
const LINKED_PROJECT = {
  id: "project-1",
  name: "Website",
  area_id: null,
  linkedAreaIds: [],
  linkedGoalIds: [],
};
const OTHER_PROJECT = {
  id: "project-2",
  name: "Side project",
  area_id: null,
  linkedAreaIds: [],
  linkedGoalIds: ["goal-a"],
};
const GOAL_A = { id: "goal-a", name: "Goal A", area_id: null, linkedAreaIds: [] };
const GOAL_B = { id: "goal-b", name: "Goal B", area_id: null, linkedAreaIds: [] };

function makeTask(overrides: Record<string, unknown> = {}) {
  return {
    id: "task-1",
    user_id: "user-1",
    name: "Linked task",
    description: null,
    status: "todo",
    priority: null,
    due_date: null,
    is_completed: false,
    is_focused: false,
    is_important: false,
    is_urgent: false,
    is_archived: false,
    area_id: null,
    project_id: null,
    linkedAreaIds: [] as string[],
    linkedGoalIds: [] as string[],
    linkedProjectIds: [] as string[],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as never;
}

function renderForm(task: ReturnType<typeof makeTask>) {
  return render(
    <TaskProcessForm
      task={task}
      areaOptions={[]}
      goalOptions={[GOAL_A, GOAL_B]}
      projectOptions={[LINKED_PROJECT, OTHER_PROJECT]}
      onClose={() => {}}
    />,
  );
}

function savedInput() {
  expect(hooks.updateMutate).toHaveBeenCalledTimes(1);
  return hooks.updateMutate.mock.calls[0][0].input as Record<string, unknown>;
}

describe("TaskProcessForm save payload", () => {
  it("picking an unrelated goal preserves the stored project link", async () => {
    const user = userEvent.setup();
    renderForm(makeTask({ linkedProjectIds: ["project-1"] }));

    // File the task under Goal A — a deliberate, ordinary pick unrelated to
    // the project the task is already linked to.
    await user.click(screen.getByRole("button", { name: /select goal/i }));
    await user.click(await screen.findByRole("menuitem", { name: /Goal A/ }));
    await user.click(screen.getByRole("button", { name: /Process/i }));

    const input = savedInput();
    expect(input.goal_ids).toEqual(["goal-a"]);
    // Before the preselected guard this payload carried project_ids: [] and
    // project_id: null — deleting the task's project junction row and
    // nulling the scalar while the user never touched the project picker.
    expect(input.project_ids).toEqual(["project-1"]);
    expect(input.project_id).toBe("project-1");
  });

  it("an explicit user clear of the project picker still unlinks", async () => {
    const user = userEvent.setup();
    renderForm(makeTask({ linkedProjectIds: ["project-1"] }));

    // The task form's project trigger shows "1 selected" (no selectedLabel).
    // No other picker is populated in this fixture, so the name is unique.
    await user.click(screen.getByRole("button", { name: "1 selected" }));
    await user.click(await screen.findByRole("menuitem", { name: /Website/ }));
    await user.click(screen.getByRole("button", { name: /Process/i }));

    const input = savedInput();
    expect(input.project_ids).toEqual([]);
    expect(input.project_id).toBeNull();
  });

  it("processing a context-less task sends empty link arrays", async () => {
    const user = userEvent.setup();
    renderForm(makeTask());

    await user.click(screen.getByRole("button", { name: /Process/i }));

    const input = savedInput();
    expect(input.project_ids).toEqual([]);
    expect(input.goal_ids).toEqual([]);
  });
});

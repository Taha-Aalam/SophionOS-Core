// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { TaskDialog } from "@/components/entities/task-dialog";
import { TASK_REPEAT_CYCLE } from "@/lib/utils/constants";

vi.mock("@/lib/hooks/use-areas", () => ({
  useAreas: () => ({ data: [], isLoading: false }),
  useAreasByIds: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/lib/hooks/use-goals", () => ({
  useGoals: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/lib/hooks/use-projects", () => ({
  useProjects: () => ({ data: [], isLoading: false }),
}));

vi.mock("@/lib/hooks/use-tasks", () => ({
  useCreateTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useTaskWithRelations: () => ({ data: undefined }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: async () => ({ data: [] }),
    }),
  }),
}));

function renderDialog(task?: Parameters<typeof TaskDialog>[0]["task"]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <TaskDialog open onOpenChange={() => {}} task={task ?? null} />
    </QueryClientProvider>,
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

function futureDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split("T")[0];
}

describe("TaskDialog recurring-task UI", () => {
  it("renders the recurring checkbox under the Focus / Important / Urgent row", () => {
    renderDialog();

    expect(screen.getByText("Focus")).toBeDefined();
    expect(screen.getByText("Important")).toBeDefined();
    expect(screen.getByText("Urgent")).toBeDefined();

    const label = screen.getByText("Make the task as recurring task");
    expect(label).toBeDefined();
  });

  it("hides the recurrence panel by default", () => {
    renderDialog();
    expect(screen.queryByTestId("task-dialog-recurrence-panel")).toBeNull();
  });

  it("reveals the recurrence panel when the checkbox is toggled on", async () => {
    const user = userEvent.setup();
    renderDialog();

    // The Checkbox component renders as role="checkbox"; the 4th one is the
    // recurring checkbox (Focus, Important, Urgent, Recurring).
    const checkboxes = screen.getAllByRole("checkbox");
    const recurringCheckbox = checkboxes[3];
    expect(recurringCheckbox).toBeDefined();
    await user.click(recurringCheckbox);

    expect(await screen.findByTestId("task-dialog-recurrence-panel")).toBeDefined();
  });

  it("hides the recurrence panel when the checkbox is toggled off again", async () => {
    const user = userEvent.setup();
    renderDialog();

    const checkboxes = screen.getAllByRole("checkbox");
    const recurringCheckbox = checkboxes[3];
    expect(recurringCheckbox).toBeDefined();
    await user.click(recurringCheckbox);
    expect(await screen.findByTestId("task-dialog-recurrence-panel")).toBeDefined();
    await user.click(recurringCheckbox);
    await waitFor(() => {
      expect(screen.queryByTestId("task-dialog-recurrence-panel")).toBeNull();
    });
  });

  it("shows a placeholder next-due-date message when the panel opens with no inputs", async () => {
    const user = userEvent.setup();
    renderDialog();

    const checkboxes = screen.getAllByRole("checkbox");
    const recurringCheckbox = checkboxes[3];
    expect(recurringCheckbox).toBeDefined();
    await user.click(recurringCheckbox);

    const preview = await screen.findByTestId("task-dialog-next-due-date-preview");
    expect(preview.textContent).toMatch(/set due date/i);
  });

  it("renders without crashing when the task has all recurrence fields set", () => {
    renderDialog({
      id: "t-1",
      user_id: "u-1",
      name: "Daily standup",
      description: null,
      status: "todo",
      priority: "medium",
      due_date: futureDate(1),
      is_completed: false,
      is_focused: false,
      is_important: false,
      is_urgent: false,
      completed_at: null,
      previous_status: null,
      smart_priority: 1,
      is_archived: false,
      is_recurring: true,
      repeat_every: 1,
      repeat_cycle: TASK_REPEAT_CYCLE.DAYS,
      recurrence_source_task_id: null,
      area_id: null,
      project_id: null,
      created_at: "2026-06-05T00:00:00Z",
      updated_at: "2026-06-05T00:00:00Z",
    } as never);

    const label = screen.getByText("Make the task as recurring task");
    expect(label).toBeDefined();
  });

  it("renders the panel immediately for an existing recurring task", () => {
    renderDialog({
      id: "t-1",
      user_id: "u-1",
      name: "Daily standup",
      description: null,
      status: "todo",
      priority: "medium",
      due_date: futureDate(1),
      is_completed: false,
      is_focused: false,
      is_important: false,
      is_urgent: false,
      completed_at: null,
      previous_status: null,
      smart_priority: 1,
      is_archived: false,
      is_recurring: true,
      repeat_every: 1,
      repeat_cycle: TASK_REPEAT_CYCLE.DAYS,
      recurrence_source_task_id: null,
      area_id: null,
      project_id: null,
      created_at: "2026-06-05T00:00:00Z",
      updated_at: "2026-06-05T00:00:00Z",
    } as never);

    // The recurrence panel should be visible because is_recurring is true.
    const panel = screen.getByTestId("task-dialog-recurrence-panel");
    expect(panel).toBeDefined();
  });
});

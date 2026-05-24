import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { TaskListItem } from "@/components/entities/task-list-item";
import type { Task } from "@/lib/types/domain.types";
import { getTaskLinkedProjectIds, taskMatchesProjectId } from "@/lib/utils/tasks";

function createTask(overrides: Partial<Task> = {}): Task {
  const now = new Date().toISOString();
  return {
    id: "task-1",
    user_id: "user-1",
    area_id: null,
    project_id: null,
    name: "Test Task",
    description: null,
    priority: "medium",
    status: "todo",
    due_date: null,
    is_completed: false,
    is_focused: false,
    is_important: false,
    is_urgent: false,
    is_archived: false,
    smart_priority: 0,
    completed_at: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  } as Task;
}

const noopHandlers = {
  onCompletionToggle: vi.fn(),
  onFocusToggle: vi.fn(),
  onNameSave: vi.fn(),
};

describe("TaskListItem multi-project badge display", () => {
  it("renders a separate badge for each linked project", () => {
    const html = renderToStaticMarkup(
      <TaskListItem
        task={createTask({ project_id: "p1", linkedProjectIds: ["p1", "p2"] })}
        linkedProjectNames={["Launch site", "Customer onboarding"]}
        {...noopHandlers}
      />,
    );
    expect(html).toContain("Launch site");
    expect(html).toContain("Customer onboarding");
  });

  it("renders three badges for three linked projects", () => {
    const html = renderToStaticMarkup(
      <TaskListItem
        task={createTask({ linkedProjectIds: ["p1", "p2", "p3"] })}
        linkedProjectNames={["P1", "P2", "P3"]}
        {...noopHandlers}
      />,
    );
    expect(html).toContain("P1");
    expect(html).toContain("P2");
    expect(html).toContain("P3");
  });

  it("falls back to projectName prop when linkedProjectNames is empty", () => {
    const html = renderToStaticMarkup(
      <TaskListItem
        task={createTask({ project_id: "p1" })}
        projectName="Legacy project"
        {...noopHandlers}
      />,
    );
    expect(html).toContain("Legacy project");
  });
});

describe("getTaskLinkedProjectIds / taskMatchesProjectId helpers", () => {
  it("returns the linkedProjectIds when present", () => {
    const task = createTask({ project_id: "p1", linkedProjectIds: ["p1", "p2"] });
    expect(getTaskLinkedProjectIds(task)).toEqual(["p1", "p2"]);
  });

  it("falls back to [project_id] when linkedProjectIds is missing or empty", () => {
    const taskOne = createTask({ project_id: "p1" });
    expect(getTaskLinkedProjectIds(taskOne)).toEqual(["p1"]);

    const taskTwo = createTask({ project_id: "p1", linkedProjectIds: [] });
    expect(getTaskLinkedProjectIds(taskTwo)).toEqual(["p1"]);
  });

  it("returns [] when neither project_id nor linkedProjectIds is set", () => {
    const task = createTask();
    expect(getTaskLinkedProjectIds(task)).toEqual([]);
  });

  it("matches a project id present in linkedProjectIds", () => {
    const task = createTask({ project_id: "p1", linkedProjectIds: ["p1", "p2"] });
    expect(taskMatchesProjectId(task, "p2")).toBe(true);
    expect(taskMatchesProjectId(task, "p3")).toBe(false);
  });
});

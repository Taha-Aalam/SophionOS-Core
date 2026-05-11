import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { TaskListItem } from "@/components/entities/task-list-item";
import type { Task } from "@/lib/types/domain.types";

function createTask(overrides: Partial<Task> = {}): Task {
  const now = new Date().toISOString();
  return {
    id: "task-1",
    user_id: "user-1",
    area_id: null,
    goal_id: null,
    project_id: null,
    name: "Test Task",
    description: null,
    priority: "medium",
    status: "todo",
    due_date: null,
    is_completed: false,
    is_focused: false,
    is_archived: false,
    smart_priority: null,
    slug: "test-task",
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

describe("TaskListItem multi-area badge display", () => {
  it("renders a separate badge for each linked area", () => {
    const html = renderToStaticMarkup(
      <TaskListItem
        task={createTask()}
        linkedAreaNames={["Health", "Career"]}
        linkedAreaIcons={["🏃", "💼"]}
        {...noopHandlers}
      />,
    );
    expect(html).toContain("Health");
    expect(html).toContain("Career");
    expect(html).not.toContain("+1");
    expect(html).not.toContain("+2");
  });

  it("renders correct icon per area badge", () => {
    const html = renderToStaticMarkup(
      <TaskListItem
        task={createTask()}
        linkedAreaNames={["Health", "Career"]}
        linkedAreaIcons={["🏃", "💼"]}
        {...noopHandlers}
      />,
    );
    expect(html).toContain("🏃");
    expect(html).toContain("💼");
  });

  it("renders a single badge for a single area", () => {
    const html = renderToStaticMarkup(
      <TaskListItem
        task={createTask()}
        linkedAreaNames={["Health"]}
        linkedAreaIcons={["🏃"]}
        {...noopHandlers}
      />,
    );
    expect(html).toContain("Health");
    expect(html).toContain("🏃");
    expect(html).not.toContain("+");
  });

  it("falls back to areaName when linkedAreaNames not provided", () => {
    const html = renderToStaticMarkup(
      <TaskListItem
        task={createTask()}
        areaName="Legacy Area"
        {...noopHandlers}
      />,
    );
    expect(html).toContain("Legacy Area");
  });

  it("renders no area badges when no area information provided", () => {
    const html = renderToStaticMarkup(
      <TaskListItem task={createTask()} {...noopHandlers} />,
    );
    expect(html).not.toContain("+1");
  });
});
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { TaskListItem } from "@/components/entities/task-list-item";
import type { Task } from "@/lib/types/domain.types";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "t1",
    user_id: "u1",
    area_id: null,
    project_id: null,
    name: "Test task",
    description: null,
    status: "todo",
    priority: "medium",
    due_date: null,
    is_completed: false,
    is_focused: false,
    is_important: false,
    is_urgent: false,
    completed_at: null,
    smart_priority: null,
    is_archived: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("TaskListItem archive/restore toggle", () => {
  it("renders Archive for active task", () => {
    const html = renderToStaticMarkup(
      <TaskListItem
        task={makeTask({ is_archived: false })}
        onCompletionToggle={vi.fn()}
        onFocusToggle={vi.fn()}
        onNameSave={vi.fn()}
        onArchiveToggle={vi.fn()}
      />,
    );

    expect(html).toContain("Archive");
    expect(html).not.toContain("Restore");
  });

  it("renders Restore for archived task", () => {
    const html = renderToStaticMarkup(
      <TaskListItem
        task={makeTask({ is_archived: true })}
        onCompletionToggle={vi.fn()}
        onFocusToggle={vi.fn()}
        onNameSave={vi.fn()}
        onArchiveToggle={vi.fn()}
      />,
    );

    expect(html).toContain("Restore");
    expect(html).not.toContain("Archive");
  });
});

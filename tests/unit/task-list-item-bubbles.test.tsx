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

describe("TaskListItem multi-goal badge display", () => {
  it("renders a separate badge for each linked goal", () => {
    const html = renderToStaticMarkup(
      <TaskListItem
        task={createTask()}
        linkedGoalNames={["Run a marathon", "Read 24 books"]}
        {...noopHandlers}
      />,
    );
    expect(html).toContain("Run a marathon");
    expect(html).toContain("Read 24 books");
    // No "+N" overflow indicator — each goal must render its own pill.
    expect(html).not.toContain("+1");
    expect(html).not.toContain("+2");
  });

  it("renders three badges for three linked goals", () => {
    const html = renderToStaticMarkup(
      <TaskListItem
        task={createTask()}
        linkedGoalNames={["G1", "G2", "G3"]}
        {...noopHandlers}
      />,
    );
    expect(html).toContain("G1");
    expect(html).toContain("G2");
    expect(html).toContain("G3");
    expect(html).not.toContain("+1");
    expect(html).not.toContain("+2");
  });

  it("renders a single badge for a single goal", () => {
    const html = renderToStaticMarkup(
      <TaskListItem
        task={createTask()}
        linkedGoalNames={["Only goal"]}
        {...noopHandlers}
      />,
    );
    expect(html).toContain("Only goal");
    expect(html).not.toContain("+");
  });

  it("renders no goal badges when no goal information provided", () => {
    const html = renderToStaticMarkup(
      <TaskListItem task={createTask()} {...noopHandlers} />,
    );
    // The Target icon is only rendered alongside a goal badge,
    // so its absence indicates no goal pill rendered.
    expect(html).not.toContain("lucide-target");
  });
});

describe("TaskListItem due date badge display", () => {
  it("renders a due date badge when task has a due_date", () => {
    const html = renderToStaticMarkup(
      <TaskListItem
        task={createTask({ due_date: "2030-06-15" })}
        {...noopHandlers}
      />,
    );
    expect(html).toMatch(/Jun\s*15/);
  });

  it("does not render a due date badge when task has no due_date", () => {
    const html = renderToStaticMarkup(
      <TaskListItem task={createTask({ due_date: null })} {...noopHandlers} />,
    );
    expect(html).not.toMatch(/Jun\s*15/);
  });
});

describe("TaskListItem badge order", () => {
  it("renders badges in the order: Area → Goal → Project → Due date", () => {
    const html = renderToStaticMarkup(
      <TaskListItem
        task={createTask({ due_date: "2030-06-15" })}
        linkedAreaNames={["Career"]}
        linkedAreaIcons={["💼"]}
        linkedGoalNames={["Promotion"]}
        projectName="Q3 Initiative"
        {...noopHandlers}
      />,
    );

    const areaIdx = html.indexOf("Career");
    const goalIdx = html.indexOf("Promotion");
    const projectIdx = html.indexOf("Q3 Initiative");
    const dueIdx = html.search(/Jun\s*15/);

    expect(areaIdx).toBeGreaterThan(-1);
    expect(goalIdx).toBeGreaterThan(-1);
    expect(projectIdx).toBeGreaterThan(-1);
    expect(dueIdx).toBeGreaterThan(-1);
    expect(areaIdx).toBeLessThan(goalIdx);
    expect(goalIdx).toBeLessThan(projectIdx);
    expect(projectIdx).toBeLessThan(dueIdx);
  });
});

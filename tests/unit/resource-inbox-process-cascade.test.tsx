/**
 * Tests for the 4D cross-field cascade in inbox ResourceProcessForm.
 *
 * Strategy: render the form to static markup and verify which options
 * appear. Topic is orthogonal to the 4D cascade and is rendered
 * unfiltered.
 */
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/hooks/use-resources", () => ({
  useUpdateResource: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { ResourceInboxProcessForm } from "@/components/entities/resource-inbox-process-form";
import type { Resource } from "@/lib/types/domain.types";

const baseResource: Resource = {
  id: "res-1",
  user_id: "user-1",
  name: "My link",
  slug: "my-link",
  url: null,
  description: null,
  type: "website",
  status: "inbox",
  area_id: null,
  project_id: null,
  topic_id: null,
  is_archived: false,
  favorite: false,
  created_at: "2026-06-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
} as Resource;

const areaOptions = [
  { id: "area-a", name: "Area A", icon: null },
  { id: "area-b", name: "Area B", icon: null },
];

const goalOptions = [
  { id: "goal-a", name: "Goal A", area_id: "area-a" as string | null, linkedAreaIds: [] },
  { id: "goal-b", name: "Goal B", area_id: "area-b" as string | null, linkedAreaIds: [] },
];

const projectOptions = [
  { id: "proj-a", name: "Project A", area_id: null, linkedAreaIds: [], linkedGoalIds: ["goal-a"] },
  { id: "proj-b", name: "Project B", area_id: null, linkedAreaIds: [], linkedGoalIds: ["goal-b"] },
];

const taskOptions = [
  { id: "task-a", name: "Task A", area_id: null, linkedAreaIds: [], linkedGoalIds: ["goal-a"], project_id: "proj-a" },
  { id: "task-b", name: "Task B", area_id: null, linkedAreaIds: [], linkedGoalIds: ["goal-b"], project_id: "proj-b" },
];

const topicOptions = [
  { id: "topic-a", name: "Topic A" },
  { id: "topic-b", name: "Topic B" },
];

const projectGoalIdsMap = new Map<string, string[]>([
  ["proj-a", ["goal-a"]],
  ["proj-b", ["goal-b"]],
]);
const taskGoalIdsMap = new Map<string, string[]>([
  ["task-a", ["goal-a"]],
  ["task-b", ["goal-b"]],
]);

function renderForm(resource: Resource): string {
  return renderToStaticMarkup(
    <ResourceInboxProcessForm
      resource={resource}
      areaOptions={areaOptions}
      goalOptions={goalOptions}
      projectOptions={projectOptions}
      taskOptions={taskOptions}
      topicOptions={topicOptions}
      projectGoalIdsMap={projectGoalIdsMap}
      taskGoalIdsMap={taskGoalIdsMap}
      onClose={() => {}}
    />,
  );
}

describe("ResourceInboxProcessForm 4D cascade", () => {
  it("case 1: with no selections, all five triggers show 'Select…' placeholders", () => {
    const html = renderForm(baseResource);
    expect(html).toContain("Select area…");
    expect(html).toContain("Select goal…");
    expect(html).toContain("Select project…");
    expect(html).toContain("Select task…");
    expect(html).toContain("Select topic…");
  });

  it("case 2: one area selected → '1 selected' badge for area, placeholders for the rest", () => {
    const html = renderForm({
      ...baseResource,
      linkedAreaIds: ["area-a"],
    });
    expect(html).toContain("1 selected");
    expect(html).toContain("Select goal…");
    expect(html).toContain("Select project…");
    expect(html).toContain("Select task…");
    expect(html).toContain("Select topic…");
  });

  it("case 3: one goal selected → '1 selected' badge for goal, placeholders for the rest", () => {
    const html = renderForm({
      ...baseResource,
      linkedGoalIds: ["goal-a"],
    });
    expect(html).toContain("1 selected");
    expect(html).toContain("Select area…");
    expect(html).toContain("Select project…");
    expect(html).toContain("Select task…");
    expect(html).toContain("Select topic…");
  });

  it("case 4: one project selected → project shows the project name (selectedLabel), placeholders for the rest", () => {
    const html = renderForm({
      ...baseResource,
      project_id: "proj-a",
    });
    // The project selector shows the selected project's name (selectedLabel path)
    expect(html).toContain("Project A");
    expect(html).toContain("Select area…");
    expect(html).toContain("Select goal…");
    expect(html).toContain("Select task…");
    expect(html).toContain("Select topic…");
  });

  it("case 5: one task selected → '1 selected' badge for task, placeholders for the rest", () => {
    const html = renderForm({
      ...baseResource,
      linkedTaskIds: ["task-a"],
    });
    expect(html).toContain("1 selected");
    expect(html).toContain("Select area…");
    expect(html).toContain("Select goal…");
    expect(html).toContain("Select project…");
    expect(html).toContain("Select topic…");
  });

  it("case 6: multiple selections across dimensions render without error", () => {
    // Static render test — full cascade behavior requires client-side re-renders
    // which renderToStaticMarkup cannot simulate. This case verifies no crash.
    const html = renderForm({
      ...baseResource,
      linkedAreaIds: ["area-a", "area-b"],
      linkedGoalIds: ["goal-a", "goal-b"],
      linkedProjectIds: ["proj-a", "proj-b"],
      linkedTaskIds: ["task-a", "task-b"],
    });
    // Basic sanity: form renders with all dimension labels present
    expect(html).toContain("Area");
    expect(html).toContain("Goal");
    expect(html).toContain("Project");
    expect(html).toContain("Task");
    expect(html).toContain("Topic");
  });

  it("case 7: topic orthogonality — picking a topic alone does not affect area/goal/project/task placeholders", () => {
    const html = renderForm({
      ...baseResource,
      topic_id: "topic-a",
    });
    // Topic selected: trigger shows the topic name (selectedLabel path)
    expect(html).toContain("Topic A");
    // All PARA placeholders still shown (cascade not affected by topic)
    expect(html).toContain("Select area…");
    expect(html).toContain("Select goal…");
    expect(html).toContain("Select project…");
    expect(html).toContain("Select task…");
  });
});

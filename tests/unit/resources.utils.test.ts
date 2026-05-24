import { describe, expect, it } from "vitest";

import { getEffectiveResourceProjectIds } from "@/lib/utils/resources";
import type { Resource, Task } from "@/lib/types/domain.types";

function resource(overrides: Partial<Resource> = {}): Resource {
  return {
    id: "resource-1",
    user_id: "user-1",
    area_id: null,
    project_id: "project-direct",
    topic_id: null,
    name: "Resource",
    url: null,
    type: "website",
    status: "inbox",
    favorite: false,
    is_archived: false,
    metadata: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    linkedGoalIds: [],
    linkedTaskIds: [],
    linkedAreaIds: [],
    ...overrides,
  } as Resource;
}

describe("getEffectiveResourceProjectIds", () => {
  it("returns the deduped union of direct, task-derived, and goal-derived project ids", () => {
    const tasksById = new Map<string, Pick<Task, "project_id" | "linkedProjectIds">>([
      ["task-1", { project_id: "project-task", linkedProjectIds: ["project-task", "project-shared"] }],
    ]);
    const goalProjectIdsMap = new Map<string, string[]>([
      ["goal-1", ["project-goal", "project-shared"]],
    ]);

    expect(
      getEffectiveResourceProjectIds({
        resource: resource({ linkedGoalIds: ["goal-1"], linkedTaskIds: ["task-1"] }),
        tasksById,
        goalProjectIdsMap,
      }),
    ).toEqual(["project-direct", "project-task", "project-shared", "project-goal"]);
  });
});

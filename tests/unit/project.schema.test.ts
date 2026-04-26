import { describe, expect, it } from "vitest";

import { PRIORITY, PROJECT_STATUS } from "../../src/lib/utils/constants";
import {
  createProjectSchema,
  updateProjectSchema,
} from "../../src/lib/validators/project.schema";

describe("project schemas", () => {
  it("normalizes empty relationship and date fields while accepting goal links", () => {
    const result = createProjectSchema.parse({
      area_id: "",
      name: "Restore Projects",
      priority: PRIORITY.HIGH,
      status: PROJECT_STATUS.PLANNING,
      start_date: "",
      due_date: "2026-05-15",
      goal_ids: ["11111111-1111-4111-8111-111111111111"],
    });

    expect(result).toMatchObject({
      area_id: null,
      name: "Restore Projects",
      priority: PRIORITY.HIGH,
      status: PROJECT_STATUS.PLANNING,
      start_date: null,
      due_date: "2026-05-15",
      goal_ids: ["11111111-1111-4111-8111-111111111111"],
      progress: 0,
      is_archived: false,
    });
  });

  it("rejects invalid goal ids", () => {
    expect(() =>
      createProjectSchema.parse({
        name: "Invalid goal links",
        goal_ids: ["not-a-uuid"],
      }),
    ).toThrow();
  });

  it("keeps update schema strict", () => {
    expect(() =>
      updateProjectSchema.parse({
        status: PROJECT_STATUS.ACTIVE,
        unexpected: true,
      }),
    ).toThrow();
  });
});

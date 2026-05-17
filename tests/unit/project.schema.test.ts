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
      due_date: "2027-05-15",
      goal_ids: ["11111111-1111-4111-8111-111111111111"],
    });

    expect(result).toMatchObject({
      area_id: null,
      area_ids: [],
      name: "Restore Projects",
      priority: PRIORITY.HIGH,
      status: PROJECT_STATUS.PLANNING,
      start_date: null,
      due_date: "2027-05-15",
      goal_ids: ["11111111-1111-4111-8111-111111111111"],
      progress: 0,
      is_archived: false,
    });
  });

  it("accepts area_ids array with valid UUIDs", () => {
    const result = createProjectSchema.parse({
      area_ids: [
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222",
      ],
      name: "Multi Area Project",
      priority: PRIORITY.MEDIUM,
      status: PROJECT_STATUS.PLANNING,
    });

    expect(result.area_ids).toEqual([
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
    ]);
  });

  it("rejects invalid area_ids", () => {
    expect(() =>
      createProjectSchema.parse({
        name: "Bad area ids",
        area_ids: ["not-a-uuid"],
      }),
    ).toThrow();
  });

  it("preserves area_ids order and uses first as primary area_id", () => {
    const ids = [
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
      "11111111-1111-4111-8111-111111111111",
    ];

    const result = createProjectSchema.parse({
      name: "Project",
      area_ids: ids,
    });

    expect(result.area_ids).toEqual([
      "11111111-1111-4111-8111-111111111111",
      "22222222-2222-4222-8222-222222222222",
      "11111111-1111-4111-8111-111111111111",
    ]);
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

  it("allows optional area_ids in update schema", () => {
    const result = updateProjectSchema.parse({
      area_ids: ["11111111-1111-4111-8111-111111111111"],
    });

    expect(result.area_ids).toEqual(["11111111-1111-4111-8111-111111111111"]);
  });
});

import { describe, expect, it } from "vitest";

import {
  deriveNoteStatus,
  deriveProjectStatus,
  deriveResourceStatus,
  deriveTaskStatus,
} from "@/lib/utils/status-routing";

describe("deriveTaskStatus", () => {
  it("returns inbox with no area, goal, or project", () => {
    expect(deriveTaskStatus({})).toBe("inbox");
  });
  it("returns todo when an area_id is present", () => {
    expect(deriveTaskStatus({ area_id: "a" })).toBe("todo");
  });
  it("returns todo when area_ids is non-empty", () => {
    expect(deriveTaskStatus({ area_ids: ["a"] })).toBe("todo");
  });
  it("returns todo when a project is present", () => {
    expect(deriveTaskStatus({ project_ids: ["p"] })).toBe("todo");
  });
  it("returns todo when a goal is present", () => {
    expect(deriveTaskStatus({ goal_ids: ["g"] })).toBe("todo");
  });
  it("ignores empty arrays", () => {
    expect(
      deriveTaskStatus({ area_ids: [], goal_ids: [], project_ids: [] }),
    ).toBe("inbox");
  });
});

describe("deriveNoteStatus", () => {
  it("returns inbox with no context", () => {
    expect(deriveNoteStatus({})).toBe("inbox");
  });
  it("returns to_review when a goal is present", () => {
    expect(deriveNoteStatus({ goal_ids: ["g"] })).toBe("to_review");
  });
  it("returns to_review when a topic is present", () => {
    expect(deriveNoteStatus({ topic_id: "t" })).toBe("to_review");
  });
  it("returns to_review when a project is present", () => {
    expect(deriveNoteStatus({ project_id: "p" })).toBe("to_review");
  });
});

describe("deriveResourceStatus", () => {
  it("returns inbox with no context", () => {
    expect(deriveResourceStatus({})).toBe("inbox");
  });
  it("returns to_review when an area is present", () => {
    expect(deriveResourceStatus({ area_ids: ["a"] })).toBe("to_review");
  });
  it("returns to_review when a topic is present", () => {
    expect(deriveResourceStatus({ topic_id: "t" })).toBe("to_review");
  });
});

describe("deriveProjectStatus", () => {
  it("returns inbox with no area and no goal", () => {
    expect(deriveProjectStatus({})).toBe("inbox");
  });
  it("returns inbox when an area is present but dates are missing", () => {
    expect(deriveProjectStatus({ area_ids: ["a"] })).toBe("inbox");
  });
  it("returns inbox when a goal is present but dates are missing", () => {
    expect(deriveProjectStatus({ goal_ids: ["g"] })).toBe("inbox");
  });
  it("returns planning when an area and both dates are present", () => {
    expect(
      deriveProjectStatus({
        area_ids: ["a"],
        start_date: "2026-06-01",
        due_date: "2026-07-01",
      }),
    ).toBe("planning");
  });
  it("returns planning when a goal and both dates are present", () => {
    expect(
      deriveProjectStatus({
        goal_ids: ["g"],
        start_date: "2026-06-01",
        due_date: "2026-07-01",
      }),
    ).toBe("planning");
  });
  it("returns inbox when only start_date is set", () => {
    expect(
      deriveProjectStatus({
        area_ids: ["a"],
        start_date: "2026-06-01",
      }),
    ).toBe("inbox");
  });
  it("returns inbox when only due_date is set", () => {
    expect(
      deriveProjectStatus({
        area_ids: ["a"],
        due_date: "2026-07-01",
      }),
    ).toBe("inbox");
  });
});

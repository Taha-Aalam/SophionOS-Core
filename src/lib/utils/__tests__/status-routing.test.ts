import { describe, expect, it } from "vitest";

import {
  deriveNoteStatus,
  deriveProjectStatus,
  deriveResourceStatus,
  deriveTaskStatus,
} from "@/lib/utils/status-routing";

describe("deriveTaskStatus", () => {
  it("returns inbox with no area and no project", () => {
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
  it("ignores empty arrays", () => {
    expect(deriveTaskStatus({ area_ids: [], project_ids: [] })).toBe("inbox");
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
  it("returns planning when an area is present", () => {
    expect(deriveProjectStatus({ area_ids: ["a"] })).toBe("planning");
  });
  it("returns planning when a goal is present", () => {
    expect(deriveProjectStatus({ goal_ids: ["g"] })).toBe("planning");
  });
});

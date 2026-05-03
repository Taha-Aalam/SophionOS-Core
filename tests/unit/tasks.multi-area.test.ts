import { describe, expect, it } from "vitest";

import type { Task } from "../../src/lib/types/domain.types";
import { getTaskLinkedAreaIds, taskMatchesAreaId } from "../../src/lib/utils/tasks";

const areaA = "11111111-1111-4111-8111-111111111111";
const areaB = "22222222-2222-4222-8222-222222222222";
const areaC = "33333333-3333-4333-8333-333333333333";

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    user_id: "user-1",
    area_id: null,
    project_id: null,
    name: "Test Task",
    description: null,
    status: "inbox",
    priority: "medium",
    due_date: null,
    is_completed: false,
    is_focused: false,
    is_important: false,
    is_urgent: false,
    is_archived: false,
    completed_at: null,
    smart_priority: 0,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as Task;
}

describe("getTaskLinkedAreaIds", () => {
  it("returns linkedAreaIds when hydrated and non-empty", () => {
    const task = makeTask({ area_id: areaA, linkedAreaIds: [areaA, areaB] });
    expect(getTaskLinkedAreaIds(task)).toEqual([areaA, areaB]);
  });

  it("falls back to [area_id] when linkedAreaIds is empty", () => {
    const task = makeTask({ area_id: areaA, linkedAreaIds: [] });
    expect(getTaskLinkedAreaIds(task)).toEqual([areaA]);
  });

  it("falls back to [area_id] when linkedAreaIds is absent", () => {
    const task = makeTask({ area_id: areaA });
    expect(getTaskLinkedAreaIds(task)).toEqual([areaA]);
  });

  it("returns [] when both area_id is null and linkedAreaIds is absent", () => {
    const task = makeTask({ area_id: null });
    expect(getTaskLinkedAreaIds(task)).toEqual([]);
  });

  it("returns linkedAreaIds even when area_id differs from first entry", () => {
    const task = makeTask({ area_id: areaC, linkedAreaIds: [areaA, areaB] });
    expect(getTaskLinkedAreaIds(task)).toEqual([areaA, areaB]);
  });
});

describe("taskMatchesAreaId", () => {
  it("matches when areaId is in linkedAreaIds", () => {
    const task = makeTask({ area_id: areaA, linkedAreaIds: [areaA, areaB] });
    expect(taskMatchesAreaId(task, areaB)).toBe(true);
  });

  it("does not match when areaId is not in linkedAreaIds", () => {
    const task = makeTask({ area_id: areaA, linkedAreaIds: [areaA, areaB] });
    expect(taskMatchesAreaId(task, areaC)).toBe(false);
  });

  it("matches via fallback area_id when linkedAreaIds absent", () => {
    const task = makeTask({ area_id: areaA });
    expect(taskMatchesAreaId(task, areaA)).toBe(true);
  });

  it("does not match when task has no area and linkedAreaIds absent", () => {
    const task = makeTask({ area_id: null });
    expect(taskMatchesAreaId(task, areaA)).toBe(false);
  });

  it("matches a task linked to multiple areas for any of its areas", () => {
    const task = makeTask({ area_id: areaA, linkedAreaIds: [areaA, areaB, areaC] });
    expect(taskMatchesAreaId(task, areaA)).toBe(true);
    expect(taskMatchesAreaId(task, areaB)).toBe(true);
    expect(taskMatchesAreaId(task, areaC)).toBe(true);
  });
});

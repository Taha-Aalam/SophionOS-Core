import { describe, expect, it } from "vitest";

import {
  buildCompletePatch,
  buildUncompletePatch,
  resolveTaskCompletionOnUpdate,
} from "@/lib/utils/task-completion";

const NOW = "2026-06-01T00:00:00.000Z";

describe("buildCompletePatch", () => {
  it("marks completed and stashes the prior status", () => {
    expect(buildCompletePatch("todo", NOW)).toEqual({
      is_completed: true,
      completed_at: NOW,
      status: "completed",
      previous_status: "todo",
    });
  });
  it("does not overwrite previous_status when already completed", () => {
    expect(buildCompletePatch("completed", NOW)).toEqual({
      is_completed: true,
      completed_at: NOW,
      status: "completed",
    });
  });
});

describe("buildUncompletePatch", () => {
  it("restores the stored previous status", () => {
    expect(buildUncompletePatch("in_progress", "inbox")).toEqual({
      is_completed: false,
      completed_at: null,
      status: "in_progress",
      previous_status: null,
    });
  });
  it("falls back when previous_status is null", () => {
    expect(buildUncompletePatch(null, "todo")).toEqual({
      is_completed: false,
      completed_at: null,
      status: "todo",
      previous_status: null,
    });
  });
});

describe("resolveTaskCompletionOnUpdate", () => {
  const base = { fallbackStatus: "todo" as const, now: NOW };

  it("returns no completion changes when neither field is in the payload", () => {
    expect(
      resolveTaskCompletionOnUpdate({
        ...base,
        current: { status: "todo", is_completed: false, previous_status: null },
      }),
    ).toEqual({});
  });

  it("entering completed via status sets is_completed and stashes prev", () => {
    expect(
      resolveTaskCompletionOnUpdate({
        ...base,
        incomingStatus: "completed",
        current: { status: "in_progress", is_completed: false, previous_status: null },
      }),
    ).toEqual({
      status: "completed",
      is_completed: true,
      completed_at: NOW,
      previous_status: "in_progress",
    });
  });

  it("leaving completed via status clears completion flags", () => {
    expect(
      resolveTaskCompletionOnUpdate({
        ...base,
        incomingStatus: "todo",
        current: { status: "completed", is_completed: true, previous_status: "in_progress" },
      }),
    ).toEqual({
      status: "todo",
      is_completed: false,
      completed_at: null,
      previous_status: null,
    });
  });

  it("checking is_completed (no status) mirrors to status=completed", () => {
    expect(
      resolveTaskCompletionOnUpdate({
        ...base,
        incomingIsCompleted: true,
        current: { status: "todo", is_completed: false, previous_status: null },
      }),
    ).toEqual({
      status: "completed",
      is_completed: true,
      completed_at: NOW,
      previous_status: "todo",
    });
  });

  it("unchecking is_completed (no status) restores previous_status", () => {
    expect(
      resolveTaskCompletionOnUpdate({
        ...base,
        incomingIsCompleted: false,
        current: { status: "completed", is_completed: true, previous_status: "in_progress" },
      }),
    ).toEqual({
      status: "in_progress",
      is_completed: false,
      completed_at: null,
      previous_status: null,
    });
  });

  it("no-op when target completed state already matches", () => {
    expect(
      resolveTaskCompletionOnUpdate({
        ...base,
        incomingStatus: "completed",
        current: { status: "completed", is_completed: true, previous_status: "todo" },
      }),
    ).toEqual({});
  });
});

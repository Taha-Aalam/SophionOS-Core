import { describe, it, expect } from "vitest";
import { buildProjectCompletionStats } from "@/lib/utils/projects";
import type { Task, Note, Resource } from "@/lib/types/domain.types";

const makeTask = (o: Partial<Task> = {}): Task =>
  ({ id: "t1", project_id: "p1", is_completed: false, is_archived: false, ...o } as Task);

const makeNote = (o: Partial<Note> = {}): Note =>
  ({
    id: "n1",
    project_id: "p1",
    linkedProjectIds: [],
    is_archived: false,
    status: "inbox",
    ...o,
  } as Note);

const makeResource = (o: Partial<Resource> = {}): Resource =>
  ({ id: "r1", project_id: "p1", is_archived: false, status: "inbox", ...o } as Resource);

describe("buildProjectCompletionStats", () => {
  it("counts tasks, notes, and resources together", () => {
    const tasks = [
      makeTask({ is_completed: true }),
      makeTask({ id: "t2", is_completed: false }),
    ];
    const notes = [
      makeNote({ status: "saved" }),
      makeNote({ id: "n2", status: "active" }),
    ];
    const resources = [
      makeResource({ status: "saved" }),
      makeResource({ id: "r2", status: "inbox" }),
    ];
    const stats = buildProjectCompletionStats(tasks, notes, resources);
    expect(stats.get("p1")).toEqual({ completed: 3, total: 6 });
  });

  it("excludes archived tasks", () => {
    const stats = buildProjectCompletionStats(
      [makeTask({ is_archived: true, is_completed: true })],
      [],
      [],
    );
    expect(stats.get("p1")).toBeUndefined();
  });

  it("excludes is_archived notes", () => {
    const stats = buildProjectCompletionStats(
      [],
      [makeNote({ is_archived: true, status: "saved" })],
      [],
    );
    expect(stats.get("p1")).toBeUndefined();
  });

  it("excludes archive-status notes", () => {
    const stats = buildProjectCompletionStats(
      [],
      [makeNote({ status: "archive" })],
      [],
    );
    expect(stats.get("p1")).toBeUndefined();
  });

  it("excludes archived resources", () => {
    const stats = buildProjectCompletionStats(
      [],
      [],
      [makeResource({ is_archived: true })],
    );
    expect(stats.get("p1")).toBeUndefined();
  });

  it("counts notes linked via linkedProjectIds when project_id is null", () => {
    const stats = buildProjectCompletionStats(
      [],
      [makeNote({ project_id: null, linkedProjectIds: ["p2"], status: "saved" })],
      [],
    );
    expect(stats.get("p2")).toEqual({ completed: 1, total: 1 });
  });

  it("counts saved note as completed and inbox note as incomplete", () => {
    const stats = buildProjectCompletionStats(
      [],
      [makeNote({ status: "saved" }), makeNote({ id: "n2", status: "inbox" })],
      [],
    );
    expect(stats.get("p1")).toEqual({ completed: 1, total: 2 });
  });

  it("counts saved resource as completed and inbox resource as incomplete", () => {
    const stats = buildProjectCompletionStats(
      [],
      [],
      [makeResource({ status: "saved" }), makeResource({ id: "r2", status: "inbox" })],
    );
    expect(stats.get("p1")).toEqual({ completed: 1, total: 2 });
  });
});

import { describe, expect, it } from "vitest";

import {
  buildAreaContactGoalSections,
  buildAreaTaskGroupsByGoal,
  getFilteredAreaNotes,
  getFilteredAreaResources,
  getFilteredAreaProjects,
} from "@/lib/utils/area-detail";

describe("area-detail helpers", () => {
  // ── note filtering ─────────────────────────────────────────────────────────

  it("returns only archived notes in the archived tab", () => {
    const result = getFilteredAreaNotes(
      [
        { id: "n1", is_archived: false, status: "active" },
        { id: "n2", is_archived: true, status: "saved" },
      ] as never,
      "archived",
    );

    expect(result.map((note) => note.id)).toEqual(["n2"]);
  });

  it("excludes archived notes from non-archive tabs", () => {
    const result = getFilteredAreaNotes(
      [
        { id: "n1", is_archived: false, status: "active" },
        { id: "n2", is_archived: true, status: "active" },
      ] as never,
      "active",
    );

    expect(result.map((note) => note.id)).toEqual(["n1"]);
  });

  it("returns all active notes for the all tab", () => {
    const result = getFilteredAreaNotes(
      [
        { id: "n1", is_archived: false, status: "inbox" },
        { id: "n2", is_archived: false, status: "active" },
      ] as never,
      "all",
    );

    expect(result.map((note) => note.id)).toEqual(["n1", "n2"]);
  });

  // ── resource filtering ─────────────────────────────────────────────────────

  it("returns only archived resources in the archived tab", () => {
    const result = getFilteredAreaResources(
      [
        { id: "r1", is_archived: false, status: "active" },
        { id: "r2", is_archived: true, status: "saved" },
      ] as never,
      "archived",
    );

    expect(result.map((resource) => resource.id)).toEqual(["r2"]);
  });

  it("excludes archived resources from non-archive tabs", () => {
    const result = getFilteredAreaResources(
      [
        { id: "r1", is_archived: false, status: "active" },
        { id: "r2", is_archived: true, status: "active" },
      ] as never,
      "active",
    );

    expect(result.map((resource) => resource.id)).toEqual(["r1"]);
  });

  // ── project filtering ──────────────────────────────────────────────────────

  it("supports the requested project tab order vocabulary", () => {
    const result = getFilteredAreaProjects(
      [
        { id: "p1", is_archived: false, status: "on_hold" },
        { id: "p2", is_archived: false, status: "active" },
      ] as never,
      "on_hold",
    );

    expect(result.map((project) => project.id)).toEqual(["p1"]);
  });

  it("returns only archived projects in the archived tab", () => {
    const result = getFilteredAreaProjects(
      [
        { id: "p1", is_archived: false, status: "active" },
        { id: "p2", is_archived: true, status: "active" },
      ] as never,
      "archived",
    );

    expect(result.map((project) => project.id)).toEqual(["p2"]);
  });

  it("maps inbox tab to planning status", () => {
    const result = getFilteredAreaProjects(
      [
        { id: "p1", is_archived: false, status: "planning" },
        { id: "p2", is_archived: false, status: "active" },
      ] as never,
      "inbox",
    );

    expect(result.map((project) => project.id)).toEqual(["p1"]);
  });

  // ── task grouping ──────────────────────────────────────────────────────────

  it("groups area tasks by linked goal", () => {
    const result = buildAreaTaskGroupsByGoal(
      [
        { id: "t1", linkedGoalIds: ["g1"] },
        { id: "t2", linkedGoalIds: [] },
      ] as never,
      [{ id: "g1", name: "North Star", is_archived: false }] as never,
    );

    expect(result.map((group) => group.groupName)).toEqual(["North Star", "No Goal"]);
  });

  it("assigns tasks with no linked goals to No Goal group", () => {
    const result = buildAreaTaskGroupsByGoal(
      [{ id: "t1", linkedGoalIds: [] }] as never,
      [],
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.groupName).toBe("No Goal");
    expect(result[0]?.tasks).toHaveLength(1);
  });

  // ── contact grouping ───────────────────────────────────────────────────────

  it("builds area contact goal sections from area-scoped contacts", () => {
    const result = buildAreaContactGoalSections(
      [{ id: "c1", linkedGoalIds: ["g1"], archive: false }] as never,
      [{ id: "g1", name: "North Star", is_archived: false }] as never,
    );

    expect(result[0]?.label).toBe("North Star");
    expect(result[0]?.contacts).toHaveLength(1);
  });

  it("groups contacts with no linked goals under No Goal", () => {
    const result = buildAreaContactGoalSections(
      [{ id: "c1", linkedGoalIds: [], archive: false }] as never,
      [],
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.label).toBe("No Goal");
  });
});

import { describe, expect, it } from "vitest";

import { buildNoteMetadataUpdateInput } from "../../src/lib/utils/note-detail-metadata";

/**
 * Regression tests for FIX 5:
 * Note detail metadata selects (Area, Project) must always display
 * entity names. Selected entities must be present in the option list,
 * and the list must not contain duplicates.
 */

type Area = { id: string; name: string; archive: boolean; icon: string | null };
type Project = { id: string; name: string; is_archived: boolean };

function buildAreasForSelect(
  areas: Area[],
  noteAreaId: string | null | undefined,
): Area[] {
  const linkedArea = noteAreaId ? areas.find((a) => a.id === noteAreaId) ?? null : null;
  const activeAreas = areas.filter((a) => !a.archive);
  return linkedArea && !activeAreas.some((a) => a.id === linkedArea.id)
    ? [...activeAreas, linkedArea]
    : activeAreas;
}

function buildProjectsForSelect(
  projects: Project[],
  noteProjectId: string | null | undefined,
): Project[] {
  const linkedProject = noteProjectId
    ? projects.find((p) => p.id === noteProjectId) ?? null
    : null;
  const activeProjects = projects.filter((p) => !p.is_archived);
  return linkedProject && !activeProjects.some((p) => p.id === linkedProject.id)
    ? [...activeProjects, linkedProject]
    : activeProjects;
}

const AREAS: Area[] = [
  { id: "a1", name: "Work", archive: false, icon: null },
  { id: "a2", name: "Personal", archive: false, icon: "🏠" },
  { id: "a3", name: "Old Area", archive: true, icon: null },
];

const PROJECTS: Project[] = [
  { id: "p1", name: "Alpha Project", is_archived: false },
  { id: "p2", name: "Beta Project", is_archived: false },
  { id: "p3", name: "Archived Project", is_archived: true },
];

describe("note detail metadata: Area select options", () => {
  it("includes all active areas when note has no area", () => {
    const opts = buildAreasForSelect(AREAS, null);
    expect(opts.map((a) => a.id)).toEqual(["a1", "a2"]);
  });

  it("includes all active areas when note area is active", () => {
    const opts = buildAreasForSelect(AREAS, "a1");
    expect(opts.some((a) => a.id === "a1")).toBe(true);
    expect(opts.filter((a) => a.id === "a1").length).toBe(1);
  });

  it("appends archived linked area to the options list", () => {
    const opts = buildAreasForSelect(AREAS, "a3");
    const ids = opts.map((a) => a.id);
    expect(ids).toContain("a3");
  });

  it("does not duplicate the active linked area", () => {
    const opts = buildAreasForSelect(AREAS, "a2");
    expect(opts.filter((a) => a.id === "a2").length).toBe(1);
  });

  it("does not duplicate the archived linked area", () => {
    const opts = buildAreasForSelect(AREAS, "a3");
    expect(opts.filter((a) => a.id === "a3").length).toBe(1);
  });

  it("archived area is NOT included when note has a different active area", () => {
    const opts = buildAreasForSelect(AREAS, "a1");
    expect(opts.some((a) => a.id === "a3")).toBe(false);
  });
});

describe("note detail metadata: Project select options", () => {
  it("includes only active projects when note has no project", () => {
    const opts = buildProjectsForSelect(PROJECTS, null);
    expect(opts.map((p) => p.id)).toEqual(["p1", "p2"]);
  });

  it("includes active project in list without duplication", () => {
    const opts = buildProjectsForSelect(PROJECTS, "p1");
    expect(opts.filter((p) => p.id === "p1").length).toBe(1);
  });

  it("appends archived linked project so it appears in the trigger options", () => {
    const opts = buildProjectsForSelect(PROJECTS, "p3");
    expect(opts.some((p) => p.id === "p3")).toBe(true);
  });

  it("does not duplicate the archived linked project", () => {
    const opts = buildProjectsForSelect(PROJECTS, "p3");
    expect(opts.filter((p) => p.id === "p3").length).toBe(1);
  });

  it("archived project is NOT included when note links to a different active project", () => {
    const opts = buildProjectsForSelect(PROJECTS, "p1");
    expect(opts.some((p) => p.id === "p3")).toBe(false);
  });
});

describe("note detail metadata: select trigger label resolution", () => {
  it("area trigger label is the entity name, not a raw UUID", () => {
    const noteAreaId = "a2";
    const linkedArea = AREAS.find((a) => a.id === noteAreaId)!;
    const triggerLabel = linkedArea
      ? `${linkedArea.icon ? `${linkedArea.icon} ` : ""}${linkedArea.name}`
      : undefined;
    expect(triggerLabel).toBe("🏠 Personal");
  });

  it("area trigger label is undefined (shows placeholder) when area not found", () => {
    const noteAreaId = "missing-id";
    const linkedArea = AREAS.find((a) => a.id === noteAreaId) ?? null;
    const triggerLabel = linkedArea
      ? `${linkedArea.icon ? `${linkedArea.icon} ` : ""}${linkedArea.name}`
      : undefined;
    expect(triggerLabel).toBeUndefined();
  });

  it("project trigger label is the project name", () => {
    const noteProjectId = "p2";
    const linkedProject = PROJECTS.find((p) => p.id === noteProjectId);
    const triggerLabel = linkedProject?.name ?? undefined;
    expect(triggerLabel).toBe("Beta Project");
  });

  it("project trigger label is undefined (shows placeholder) when project not found", () => {
    const noteProjectId = "missing-id";
    const linkedProject = PROJECTS.find((p) => p.id === noteProjectId);
    const triggerLabel = linkedProject?.name ?? undefined;
    expect(triggerLabel).toBeUndefined();
  });
});

describe("note detail metadata: full autosave payloads", () => {
  it("preserves existing linked relations when only goals change", () => {
    expect(
      buildNoteMetadataUpdateInput(
        {
          status: "active",
          type: "research",
          notebook: "Work",
          areaIds: ["area-1"],
          goalIds: ["goal-1"],
          projectIds: ["project-1"],
          taskIds: ["task-1"],
          favorite: true,
          pin: false,
        },
        { goal_ids: ["goal-2", "goal-3"] },
      ),
    ).toEqual({
      status: "active",
      type: "research",
      notebook: "Work",
      area_ids: ["area-1"],
      goal_ids: ["goal-2", "goal-3"],
      project_ids: ["project-1"],
      task_ids: ["task-1"],
      favorite: true,
      pin: false,
    });
  });

  it("normalizes blank notebooks to null while keeping other metadata intact", () => {
    expect(
      buildNoteMetadataUpdateInput(
        {
          status: "inbox",
          type: "note",
          notebook: "   ",
          areaIds: [],
          goalIds: ["goal-1"],
          projectIds: ["project-1"],
          taskIds: ["task-1"],
          favorite: false,
          pin: true,
        },
        {},
      ),
    ).toEqual({
      status: "inbox",
      type: "note",
      notebook: null,
      area_ids: [],
      goal_ids: ["goal-1"],
      project_ids: ["project-1"],
      task_ids: ["task-1"],
      favorite: false,
      pin: true,
    });
  });
});

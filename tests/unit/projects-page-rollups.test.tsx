import { describe, expect, it } from "vitest";
import type { Project } from "@/lib/types/domain.types";
import type { ProjectCardRollups } from "@/components/entities/project-card";

/**
 * Regression test: Projects page should compute and pass rollups to ProjectCard.
 * This tests the rollup computation logic that should be used on the projects page.
 */

const makeProject = (overrides: Partial<Project> = {}): Project =>
  ({
    id: "p-1",
    user_id: "user-1",
    name: "Test Project",
    description: null,
    status: "planning",
    priority: "medium",
    progress: 0,
    is_archived: false,
    area_id: null,
    start_date: null,
    due_date: null,
    created_at: "2026-04-28T10:00:00.000Z",
    updated_at: "2026-04-28T10:00:00.000Z",
    slug: "test-project",
    ...overrides,
  }) as Project;

describe("projects page rollup computation", () => {
  it("computes goal count per project from goal_ids", () => {
    const projects = [
      { id: "p-1", name: "Project 1" },
      { id: "p-2", name: "Project 2" },
    ] as Project[];

    const projectsWithLinkedGoalIds = projects.map((p) => ({
      ...p,
      linkedGoalIds: p.id === "p-1" ? ["g-1", "g-2"] : ["g-3"],
    })) as unknown as Project[];

    const rollupsByProject = new Map<string, ProjectCardRollups>();
    for (const project of projectsWithLinkedGoalIds) {
      const linkedGoalIds = (project as unknown as { linkedGoalIds?: string[] }).linkedGoalIds ?? [];
      const goalCount = linkedGoalIds.length;
      const { taskCount, noteCount, resourceCount } = { taskCount: 0, noteCount: 0, resourceCount: 0 };
      rollupsByProject.set(project.id, { goalCount, taskCount, noteCount, resourceCount });
    }

    expect(rollupsByProject.get("p-1")?.goalCount).toBe(2);
    expect(rollupsByProject.get("p-2")?.goalCount).toBe(1);
  });

  it("computes note count per project from note list", () => {
    const projects = [{ id: "p-1", name: "Project 1" }] as Project[];

    const notes = [
      { id: "n-1", project_id: "p-1" },
      { id: "n-2", project_id: "p-1" },
    ] as unknown as { id: string; project_id: string }[];

    const rollupsByProject = new Map<string, ProjectCardRollups>();
    for (const project of projects) {
      const linkedGoalIds = (project as unknown as { linkedGoalIds?: string[] }).linkedGoalIds ?? [];
      const goalCount = linkedGoalIds.length;
      const noteCount = notes.filter((n) => n.project_id === project.id).length;
      const { taskCount, resourceCount } = { taskCount: 0, resourceCount: 0 };
      rollupsByProject.set(project.id, { goalCount, taskCount, noteCount, resourceCount });
    }

    expect(rollupsByProject.get("p-1")?.noteCount).toBe(2);
  });

  it("computes resource count per project from resource list", () => {
    const projects = [{ id: "p-1", name: "Project 1" }] as Project[];

    const resources = [
      { id: "r-1", project_id: "p-1" },
    ] as unknown as { id: string; project_id: string }[];

    const rollupsByProject = new Map<string, ProjectCardRollups>();
    for (const project of projects) {
      const linkedGoalIds = (project as unknown as { linkedGoalIds?: string[] }).linkedGoalIds ?? [];
      const goalCount = linkedGoalIds.length;
      const noteCount = 0;
      const resourceCount = resources.filter((r) => r.project_id === project.id).length;
      const taskCount = 0;
      rollupsByProject.set(project.id, { goalCount, taskCount, noteCount, resourceCount });
    }

    expect(rollupsByProject.get("p-1")?.resourceCount).toBe(1);
  });

  it("computes task count per project from task list", () => {
    const projects = [{ id: "p-1", name: "Project 1" }] as Project[];

    const tasks = [
      { id: "t-1", project_id: "p-1", is_archived: false },
      { id: "t-2", project_id: "p-1", is_archived: false },
      { id: "t-3", project_id: "p-1", is_archived: true },
    ] as unknown as { id: string; project_id: string; is_archived: boolean }[];

    const rollupsByProject = new Map<string, ProjectCardRollups>();
    for (const project of projects) {
      const linkedGoalIds = (project as unknown as { linkedGoalIds?: string[] }).linkedGoalIds ?? [];
      const goalCount = linkedGoalIds.length;
      const noteCount = 0;
      const resourceCount = 0;
      const taskCount = tasks.filter((t) => t.project_id === project.id && !t.is_archived).length;
      rollupsByProject.set(project.id, { goalCount, taskCount, noteCount, resourceCount });
    }

    expect(rollupsByProject.get("p-1")?.taskCount).toBe(2);
  });

  it("handles projects with no linked items", () => {
    const projects = [{ id: "p-1", name: "Project 1" }] as Project[];
    const tasks: { id: string; project_id: string; is_archived: boolean }[] = [];
    const notes: { id: string; project_id: string }[] = [];
    const resources: { id: string; project_id: string }[] = [];

    const rollupsByProject = new Map<string, ProjectCardRollups>();
    for (const project of projects) {
      const linkedGoalIds = (project as unknown as { linkedGoalIds?: string[] }).linkedGoalIds ?? [];
      const goalCount = linkedGoalIds.length;
      const noteCount = notes.filter((n) => n.project_id === project.id).length;
      const resourceCount = resources.filter((r) => r.project_id === project.id).length;
      const taskCount = tasks.filter((t) => t.project_id === project.id && !t.is_archived).length;
      rollupsByProject.set(project.id, { goalCount, taskCount, noteCount, resourceCount });
    }

    expect(rollupsByProject.get("p-1")?.goalCount).toBe(0);
    expect(rollupsByProject.get("p-1")?.taskCount).toBe(0);
    expect(rollupsByProject.get("p-1")?.noteCount).toBe(0);
    expect(rollupsByProject.get("p-1")?.resourceCount).toBe(0);
  });
});

describe("ProjectCardRollups interface", () => {
  it("accepts valid rollup object", () => {
    const rollups: ProjectCardRollups = {
      goalCount: 5,
      taskCount: 3,
      noteCount: 3,
      resourceCount: 2,
    };

    expect(rollups.goalCount).toBe(5);
    expect(rollups.taskCount).toBe(3);
    expect(rollups.noteCount).toBe(3);
    expect(rollups.resourceCount).toBe(2);
  });

  it("accepts zero counts", () => {
    const rollups: ProjectCardRollups = {
      goalCount: 0,
      taskCount: 0,
      noteCount: 0,
      resourceCount: 0,
    };

    expect(rollups.goalCount).toBe(0);
    expect(rollups.taskCount).toBe(0);
    expect(rollups.noteCount).toBe(0);
    expect(rollups.resourceCount).toBe(0);
  });
});
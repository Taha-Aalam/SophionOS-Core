import { describe, expect, it } from "vitest";

import { mergeProjectQueryResults } from "@/lib/utils/projects";
import type { Project } from "@/lib/types/domain.types";

function buildProject(overrides: Partial<Project>): Project {
  return {
    area_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    description: null,
    due_date: null,
    id: "project-id",
    is_archived: false,
    name: "Project",
    priority: "medium",
    progress: 0,
    start_date: null,
    status: "planning",
    updated_at: "2026-01-01T00:00:00.000Z",
    user_id: "user-id",
    ...overrides,
  };
}

describe("mergeProjectQueryResults", () => {
  it("keeps archived projects available when active and archived queries are combined", () => {
    const activeProject = buildProject({ id: "active-1", name: "Active project" });
    const archivedProject = buildProject({
      id: "archived-1",
      is_archived: true,
      name: "Archived project",
      status: "archived",
    });

    const mergedProjects = mergeProjectQueryResults([activeProject], [archivedProject]);

    expect(mergedProjects).toEqual([activeProject, archivedProject]);
  });

  it("deduplicates projects by id when a project appears in both query results", () => {
    const archivedProject = buildProject({
      id: "project-1",
      is_archived: true,
      name: "Archived project",
      status: "archived",
    });

    const mergedProjects = mergeProjectQueryResults([archivedProject], [archivedProject]);

    expect(mergedProjects).toEqual([archivedProject]);
  });
});

import { describe, expect, it } from "vitest";

import {
  buildProjectDetailHref,
  getProjectSlug,
  resolveProjectBySlug,
} from "../../src/lib/utils/project-urls";

const baseProject = {
  area_id: null,
  created_at: "2026-04-24T00:00:00.000Z",
  description: null,
  due_date: null,
  id: "project-1",
  is_archived: false,
  name: "Restore Projects",
  priority: "medium",
  progress: 0,
  slug: "restore-projects",
  start_date: null,
  status: "planning",
  updated_at: "2026-04-24T00:00:00.000Z",
  user_id: "user-1",
} as const;

describe("project URL helpers", () => {
  it("builds detail href from stored slug", () => {
    expect(buildProjectDetailHref(baseProject as never)).toBe("/projects/restore-projects");
  });

  it("builds detail href from name when slug is missing", () => {
    const project = { ...baseProject, slug: undefined } as unknown as typeof baseProject;
    expect(buildProjectDetailHref(project as never)).toBe("/projects/restore-projects");
  });

  it("resolves a project by slug", () => {
    const list = [
      baseProject,
      { ...baseProject, id: "project-2", slug: "second-project" },
    ] as never[];

    expect(resolveProjectBySlug(list, "restore-projects")).toEqual(
      expect.objectContaining({ id: "project-1" }),
    );
    expect(resolveProjectBySlug(list, "missing")).toBeUndefined();
  });

  it("getProjectSlug normalizes a name", () => {
    expect(getProjectSlug("My New Project")).toBe("my-new-project");
  });
});

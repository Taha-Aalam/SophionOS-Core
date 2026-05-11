import { describe, expect, it } from "vitest";

import { buildProjectDetailHref } from "@/lib/utils/project-urls";
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
    slug: "project",
    start_date: null,
    status: "planning",
    updated_at: "2026-01-01T00:00:00.000Z",
    user_id: "user-id",
    ...overrides,
  };
}

describe("buildProjectDetailHref", () => {
  it("returns /projects/<slug> when slug is available", () => {
    const project = buildProject({ slug: "my-project", name: "My Project" });
    expect(buildProjectDetailHref(project)).toBe("/projects/my-project");
  });

  it("falls back to slugified name when slug is null", () => {
    const project = buildProject({ slug: undefined, name: "My Project" });
    expect(buildProjectDetailHref(project)).toBe("/projects/my-project");
  });

  it("uses the slugified name for unnamed projects", () => {
    const project = buildProject({ slug: undefined, name: "Build the App!" });
    expect(buildProjectDetailHref(project)).toBe("/projects/build-the-app");
  });

  it("handles special characters in name", () => {
    const project = buildProject({ slug: undefined, name: "Build & Test (Phase 1)" });
    expect(buildProjectDetailHref(project)).toBe("/projects/build-test-phase-1");
  });
});

describe("project returnTo integration", () => {
  it("generates a returnTo URL for a project detail page", () => {
    const project = buildProject({ slug: "my-project" });
    const href = buildProjectDetailHref(project);
    const returnTo = "/areas/my-area";
    const fullHref = `${href}?returnTo=${encodeURIComponent(returnTo)}`;
    expect(fullHref).toBe("/projects/my-project?returnTo=%2Fareas%2Fmy-area");
  });

  it("generates a returnTo URL for a note detail page", () => {
    const noteSlug = "my-note";
    const returnTo = "/areas/my-area";
    const fullHref = `/notes/${noteSlug}?returnTo=${encodeURIComponent(returnTo)}`;
    expect(fullHref).toBe("/notes/my-note?returnTo=%2Fareas%2Fmy-area");
  });
});
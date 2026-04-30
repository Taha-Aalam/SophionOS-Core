import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { ProjectCard } from "@/components/entities/project-card";
import type { Project } from "@/lib/types/domain.types";

function createProject(overrides: Partial<Project> = {}): Project {
  const now = new Date().toISOString();
  return {
    id: "proj-1",
    user_id: "user-1",
    area_id: null,
    name: "Test Project",
    description: null,
    status: "planning",
    priority: "medium",
    start_date: null,
    due_date: null,
    progress: 0,
    is_archived: false,
    slug: "test-project",
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe("ProjectCard multi-area display", () => {
  it("renders a single area chip when only one area is linked", () => {
    const html = renderToStaticMarkup(
      <ProjectCard project={createProject()} areaNames={["Health"]} />,
    );
    expect(html).toContain("Health");
    expect(html).not.toContain("+1");
  });

  it("renders up to two area chips and a +N overflow chip for additional areas", () => {
    const html = renderToStaticMarkup(
      <ProjectCard
        project={createProject()}
        areaNames={["Health", "Career", "Family", "Finance"]}
      />,
    );
    expect(html).toContain("Health");
    expect(html).toContain("Career");
    expect(html).not.toContain("Family");
    expect(html).not.toContain("Finance");
    expect(html).toContain("+2");
  });

  it("falls back to areaName when areaNames is not provided", () => {
    const html = renderToStaticMarkup(
      <ProjectCard project={createProject()} areaName="Legacy Area" />,
    );
    expect(html).toContain("Legacy Area");
  });

  it("shows Unassigned when no area information is available", () => {
    const html = renderToStaticMarkup(<ProjectCard project={createProject()} />);
    expect(html).toContain("Unassigned");
  });
});

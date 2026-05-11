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

describe("ProjectCard metadata layout", () => {
  it("shows relationship counts (Goals, Tasks, Notes, Resources) in one row when rollups provided", () => {
    const html = renderToStaticMarkup(
      <ProjectCard
        project={createProject()}
        rollups={{
          goalCount: 3,
          taskCount: 5,
          noteCount: 2,
          resourceCount: 1,
        }}
      />,
    );
    expect(html).toContain("🎯");
    expect(html).toContain("3");
    expect(html).toContain("5");
    expect(html).toContain("📝");
    expect(html).toContain("2");
    expect(html).toContain("🔗");
    expect(html).toContain("1");
  });

  it("shows due date on separate row from relationship counts", () => {
    const html = renderToStaticMarkup(
      <ProjectCard
        project={createProject({ due_date: "2026-12-31" })}
        rollups={{
          goalCount: 1,
          taskCount: 2,
          noteCount: 0,
          resourceCount: 0,
        }}
      />,
    );
    expect(html).toContain("🎯");
    expect(html).toContain("1");
    expect(html).toContain("d left");
  });

it("shows all relationship counts even when some are zero", () => {
    const html = renderToStaticMarkup(
      <ProjectCard
        project={createProject()}
        rollups={{
          goalCount: 0,
          taskCount: 0,
          noteCount: 0,
          resourceCount: 0,
        }}
      />
    );
    expect(html).toContain("🎯");
    expect(html).toContain("0");
    expect(html).toContain("☑️");
    expect(html).toContain("0");
    expect(html).toContain("📝");
    expect(html).toContain("0");
    expect(html).toContain("🔗");
    expect(html).toContain("0");
  });

  it("uses the emoji-style task icon (☑️) matching area cards", () => {
    const html = renderToStaticMarkup(
      <ProjectCard
        project={createProject()}
        rollups={{
          goalCount: 0,
          taskCount: 3,
          noteCount: 0,
          resourceCount: 0,
        }}
      />
    );
    expect(html).toContain("☑️");
    expect(html).toContain("3");
  });
});

describe("ProjectCard area icon rendering", () => {
  it("renders provided area icon text when areaIcons supplied", () => {
    const html = renderToStaticMarkup(
      <ProjectCard
        project={createProject()}
        areaNames={["Work", "Health"]}
        areaIcons={["💼", "🏃"]}
      />,
    );
    expect(html).toContain("💼");
    expect(html).toContain("🏃");
    expect(html).toContain("Work");
    expect(html).toContain("Health");
  });

  it("falls back gracefully when areaIcons not provided", () => {
    const html = renderToStaticMarkup(
      <ProjectCard project={createProject()} areaNames={["Work"]} />,
    );
    expect(html).toContain("Work");
    expect(html).not.toContain("💼");
  });

  it("uses null-safe per-slot fallback", () => {
    const html = renderToStaticMarkup(
      <ProjectCard
        project={createProject()}
        areaNames={["Work", "Health"]}
        areaIcons={["💼", null]}
      />,
    );
    expect(html).toContain("💼");
    expect(html).toContain("Work");
    expect(html).toContain("Health");
  });
});

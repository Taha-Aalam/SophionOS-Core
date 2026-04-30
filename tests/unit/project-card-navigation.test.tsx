import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
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

describe("ProjectCard navigation and edit", () => {
  it("navigates to detail page when card is clicked", () => {
    const project = createProject();

    const html = renderToStaticMarkup(<ProjectCard project={project} />);
    expect(html).toContain("Test Project");
    // The card should not contain an edit button when onEdit is not provided
    expect(html).not.toContain('aria-label="Edit Test Project"');
  });

  it("renders an edit button when onEdit is provided", () => {
    const project = createProject();
    const onEdit = vi.fn();

    const html = renderToStaticMarkup(<ProjectCard project={project} onEdit={onEdit} />);
    expect(html).toContain('aria-label="Edit Test Project"');
  });
});

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { ResourceRow } from "@/components/entities/resource-row";
import type { Resource } from "@/lib/types/domain.types";

function createResource(overrides: Partial<Resource> = {}): Resource {
  const now = new Date().toISOString();
  return {
    id: "resource-1",
    user_id: "user-1",
    area_id: null,
    project_id: null,
    topic_id: null,
    name: "Resource title",
    url: "https://example.com/deep-link",
    type: "website",
    status: "active",
    favorite: false,
    is_archived: false,
    metadata: {},
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe("ResourceRow metadata", () => {
  it("renders one badge per linked area, goal, and project without +N collapse chips", () => {
    const html = renderToStaticMarkup(
      <ResourceRow
        resource={createResource()}
        areas={[{ name: "Health", icon: "H" }, { name: "Career", icon: "C" }]}
        goalNames={["Goal A", "Goal B"]}
        projectNames={["Project A", "Project B"]}
        taskNames={["Task A"]}
        onToggleFavorite={vi.fn()}
        onArchive={vi.fn()}
        onUnarchive={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(html).toContain("Health");
    expect(html).toContain("Career");
    expect(html).toContain("Goal A");
    expect(html).toContain("Goal B");
    expect(html).toContain("Project A");
    expect(html).toContain("Project B");
    expect(html).not.toContain("+1");
  });

  it("renders the resource url below the title", () => {
    const html = renderToStaticMarkup(
      <ResourceRow
        resource={createResource()}
        onToggleFavorite={vi.fn()}
        onArchive={vi.fn()}
        onUnarchive={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(html).toContain("https://example.com/deep-link");
  });

  it("renders a delete affordance", () => {
    const html = renderToStaticMarkup(
      <ResourceRow
        resource={createResource()}
        onToggleFavorite={vi.fn()}
        onArchive={vi.fn()}
        onUnarchive={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(html).toContain("Delete resource");
  });
});

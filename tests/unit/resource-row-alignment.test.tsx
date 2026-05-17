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
    name: "test url 4",
    url: "https://example.com/test-url-4",
    type: "website",
    status: "to_review",
    favorite: false,
    is_archived: false,
    metadata: {},
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe("ResourceRow alignment", () => {
  it("keeps row cells vertically centered when badge columns wrap", () => {
    const html = renderToStaticMarkup(
      <ResourceRow
        resource={createResource()}
        areaName={["Test Area"]}
        goalNames={["Test Multi area goal"]}
        projectName="Test 8"
        taskNames={["Test 17"]}
        onToggleFavorite={vi.fn()}
        onArchive={vi.fn()}
        onUnarchive={vi.fn()}
      />,
    );

    expect(html).toMatch(/class="group flex items-center gap-3 border-b border-border\/40 px-4 py-2\.5 transition-colors hover:bg-muted\/30"/);
    expect(html).not.toContain("group flex items-start");
  });
});

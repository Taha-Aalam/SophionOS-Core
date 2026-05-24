// @vitest-environment jsdom

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ResourcesByGroupView } from "@/components/views/resources-by-group-view";
import type { Resource } from "@/lib/types/domain.types";

function resource(id: string, name: string): Resource {
  const now = new Date().toISOString();
  return {
    id,
    user_id: "user-1",
    area_id: null,
    project_id: null,
    topic_id: null,
    name,
    url: null,
    type: "website",
    status: "inbox",
    favorite: false,
    is_archived: false,
    metadata: {},
    created_at: now,
    updated_at: now,
  };
}

describe("ResourcesByGroupView", () => {
  it("renders collapsible group headers with counts and resource rows", () => {
    render(
      <ResourcesByGroupView
        groups={[{ groupId: "topic-1", groupName: "AI", resources: [resource("r1", "Alpha"), resource("r2", "Beta")] }]}
        getAreas={() => []}
        getGoalNames={() => []}
        getProjectNames={() => []}
        getTaskNames={() => []}
        getTopicName={() => undefined}
        onToggleFavorite={vi.fn()}
        onArchive={vi.fn()}
        onUnarchive={vi.fn()}
        onDelete={vi.fn()}
        onEdit={vi.fn()}
      />,
    );

    expect(screen.getByText("AI")).not.toBeNull();
    expect(screen.getByText("2 resources")).not.toBeNull();
    expect(screen.getByText("Alpha")).not.toBeNull();
    expect(screen.getByText("Beta")).not.toBeNull();
  });
});

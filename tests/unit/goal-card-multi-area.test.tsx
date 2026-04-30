import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { GoalCard } from "@/components/entities/goal-card";
import type { Goal } from "@/lib/types/domain.types";

function createGoal(overrides: Partial<Goal> = {}): Goal {
  const now = new Date().toISOString();
  return {
    id: "goal-1",
    user_id: "user-1",
    area_id: null,
    name: "Test Goal",
    description: null,
    term: "short",
    priority: "medium",
    target_date: null,
    progress: 0,
    slug: "test-goal",
    is_archived: false,
    is_completed: false,
    created_at: now,
    updated_at: now,
    ...overrides,
  } as Goal;
}

describe("GoalCard multi-area display", () => {
  it("renders a single area chip when only one area is linked", () => {
    const html = renderToStaticMarkup(
      <GoalCard goal={createGoal()} areaNames={["Health"]} />,
    );
    expect(html).toContain("Health");
    expect(html).not.toContain("+1");
  });

  it("renders up to two area chips and a +N overflow chip for additional areas", () => {
    const html = renderToStaticMarkup(
      <GoalCard goal={createGoal()} areaNames={["Health", "Career", "Family", "Finance"]} />,
    );
    expect(html).toContain("Health");
    expect(html).toContain("Career");
    expect(html).not.toContain("Family");
    expect(html).not.toContain("Finance");
    expect(html).toContain("+2");
  });

  it("falls back to areaName when areaNames is not provided", () => {
    const html = renderToStaticMarkup(
      <GoalCard goal={createGoal()} areaName="Legacy Area" />,
    );
    expect(html).toContain("Legacy Area");
  });

  it("shows Unassigned when no area information is available", () => {
    const html = renderToStaticMarkup(<GoalCard goal={createGoal()} />);
    expect(html).toContain("Unassigned");
  });
});

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { Area, Goal, Project, Task } from "@/lib/types/domain.types";

// ── Factories ────────────────────────────────────────────────────────

function makeArea(overrides: Partial<Area> = {}): Area {
  return {
    id: "area-1",
    user_id: "user-1",
    name: "Test Area",
    type: "personal",
    icon: null,
    inactive: false,
    archive: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as Area;
}

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: "goal-1",
    user_id: "user-1",
    name: "Test Goal",
    term: "short",
    priority: "medium",
    is_completed: false,
    is_archived: false,
    area_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as Goal;
}

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-1",
    user_id: "user-1",
    name: "Test Project",
    status: "planning",
    priority: "medium",
    is_archived: false,
    area_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as Project;
}

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "task-1",
    user_id: "user-1",
    name: "Test Task",
    status: "inbox",
    priority: "medium",
    is_completed: false,
    is_archived: false,
    is_focused: false,
    due_date: null,
    area_id: null,
    goal_id: null,
    project_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as Task;
}

// ── Component test ───────────────────────────────────────────────────

// The component uses next/navigation hooks (useRouter). We mock the module
// so renderToStaticMarkup does not blow up outside a Next.js context.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Lazy import after mock so the mock is in place.
const { ContactDetailRelationshipSections } = await import(
  "@/components/entities/contact-detail-relationship-sections"
);

const noop = () => {};
const noopStr = (_arg: string) => {};

function renderSection(
  overrides: Partial<
    React.ComponentProps<typeof ContactDetailRelationshipSections>
  > = {},
) {
  const defaults: React.ComponentProps<
    typeof ContactDetailRelationshipSections
  > = {
    linkedAreas: [],
    linkedGoals: [],
    linkedProjects: [],
    linkedTasks: [],
    linkedNotes: [],
    allAreas: [],
    allProjects: [],
    allResources: [],
    onUnlinkArea: noop,
    onUnlinkGoal: noop,
    onUnlinkProject: noop,
    onUnlinkTask: noop,
    onTaskCompletionToggle: noop,
    onTaskFocusToggle: noop,
    onTaskNameSave: noop,
    onTaskEdit: noop,
    returnTo: "/contacts/test-contact",
    areaTab: "all",
    onAreaTabChange: noopStr,
    goalTab: "active",
    onGoalTabChange: noopStr,
    projectTab: "all",
    onProjectTabChange: noopStr,
    taskTab: "all",
    onTaskTabChange: noopStr,
  };

  return renderToStaticMarkup(
    <ContactDetailRelationshipSections {...defaults} {...overrides} />,
  );
}

describe("ContactDetailRelationshipSections", () => {
  it("renders all four section shells", () => {
    const html = renderSection();
    expect(html).toContain('id="contact-areas"');
    expect(html).toContain('id="contact-goals"');
    expect(html).toContain('id="contact-projects"');
    expect(html).toContain('id="contact-tasks"');
  });

  it("renders section headings", () => {
    const html = renderSection();
    // heading prop overrides entityType for areas; others use lowercase entityType with CSS capitalize
    expect(html).toContain(">Areas</h2>");
    expect(html).toContain(">goals</h2>");
    expect(html).toContain(">projects</h2>");
    expect(html).toContain(">tasks</h2>");
  });

  it("renders area cards for linked areas", () => {
    const html = renderSection({
      linkedAreas: [
        makeArea({ id: "a1", name: "Health" }),
        makeArea({ id: "a2", name: "Work" }),
      ],
      allAreas: [
        makeArea({ id: "a1", name: "Health" }),
        makeArea({ id: "a2", name: "Work" }),
      ],
    });
    expect(html).toContain("Health");
    expect(html).toContain("Work");
  });

  it("renders goal cards for linked goals", () => {
    const html = renderSection({
      linkedGoals: [makeGoal({ id: "g1", name: "Run Marathon" })],
    });
    expect(html).toContain("Run Marathon");
  });

  it("renders project cards for linked projects", () => {
    const html = renderSection({
      linkedProjects: [makeProject({ id: "p1", name: "Build App" })],
    });
    expect(html).toContain("Build App");
  });

  it("renders task list items for linked tasks", () => {
    const html = renderSection({
      linkedTasks: [makeTask({ id: "t1", name: "Buy supplies" })],
    });
    expect(html).toContain("Buy supplies");
  });

  it("shows empty state when no linked entities", () => {
    const html = renderSection();
    expect(html).toContain("No areas linked");
    expect(html).toContain("No goals linked");
    expect(html).toContain("No projects linked");
    expect(html).toContain("No tasks linked");
  });

  it("filters entities by active tab", () => {
    const html = renderSection({
      linkedGoals: [
        makeGoal({ id: "g1", name: "Active Goal", is_completed: false, is_archived: false }),
        makeGoal({ id: "g2", name: "Completed Goal", is_completed: true, is_archived: false }),
      ],
      goalTab: "completed",
    });
    expect(html).not.toContain("Active Goal");
    expect(html).toContain("Completed Goal");
  });

  it("renders tab buttons with counts", () => {
    const html = renderSection({
      linkedTasks: [
        makeTask({ id: "t1", status: "inbox", is_completed: false }),
        makeTask({ id: "t2", status: "inbox", is_completed: false }),
      ],
    });
    // Tab buttons should show count badges
    expect(html).toContain("Inbox");
    expect(html).toContain("All");
  });

  it("renders unlink buttons on area cards", () => {
    const html = renderSection({
      linkedAreas: [makeArea({ id: "a1", name: "Health" })],
      allAreas: [makeArea({ id: "a1", name: "Health" })],
    });
    // The unlink button should be rendered (as a small ghost button with Unlink icon)
    expect(html).toContain("</svg>"); // lucide icon renders an svg
  });
});

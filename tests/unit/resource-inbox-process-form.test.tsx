// @vitest-environment jsdom

import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ResourceInboxProcessForm } from "@/components/entities/resource-inbox-process-form";

/**
 * The inbox process form is the primary triage UI for captured resources.
 * Its save handler sends ALL link fields unconditionally
 * (resource-inbox-process-form.tsx handleSave), so whatever the pickers
 * hold at save time is exactly what resourceService.update will write to
 * the junction tables. The #153 ruling (generalised): a link field the
 * user did not touch must leave stored links untouched; only an explicit
 * clear (the user emptying a picker they can see) may remove links.
 *
 * The edit dialog keeps already-linked entities visible by passing the
 * dialog's own picks as the preselected argument to every computeFiltered*
 * call (resource-dialog.tsx:323-338) — the shared filter layer's escape
 * hatch that exists precisely so cross-filtering never strips valid links.
 * These tests pin the same contract on the process form: a resource whose
 * stored links are mutually cross-constraining (project filed under one
 * area, resource linked to another) must survive a plain process save.
 *
 * Stored-state proof for the request shapes below lives in the PR's Step 0
 * observation record: PATCH bodies carrying present-but-empty
 * project_ids/area_ids delete the resource_projects / resource_areas rows
 * silently.
 */
const hooks = vi.hoisted(() => ({
  updateMutate: vi.fn(),
}));

vi.mock("@/lib/hooks/use-resources", () => ({
  useUpdateResource: () => ({ mutate: hooks.updateMutate, isPending: false }),
}));

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  Object.defineProperty(window, "ResizeObserver", {
    writable: true,
    configurable: true,
    value: ResizeObserverMock,
  });

  Object.defineProperty(window.HTMLElement.prototype, "getAnimations", {
    writable: true,
    configurable: true,
    value: () => [],
  });

  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  cleanup();
  hooks.updateMutate.mockClear();
});

// Project filed under area-b; the area the resource is linked to is a
// DIFFERENT area. A second project filed under area-1 keeps the filtered
// candidate list non-empty (computeFilteredProjects falls back to the full
// list only when the intersection collapses to nothing), which is the
// condition under which the unguarded strip removes the linked project.
// Both links on the resource are ordinary: they were made via the edit
// dialog, which protects cross-picks.
const LINKED_PROJECT = {
  id: "project-1",
  name: "Website",
  area_id: "area-b",
  linkedAreaIds: ["area-b"],
  linkedGoalIds: [],
};
const OTHER_PROJECT = {
  id: "project-2",
  name: "Side project",
  area_id: "area-1",
  linkedAreaIds: ["area-1"],
  linkedGoalIds: [],
};
const LINKED_AREA = { id: "area-1", name: "Home", icon: null };

function makeResource(overrides: Record<string, unknown> = {}) {
  return {
    id: "res-1",
    name: "Linked resource",
    url: null,
    type: "website",
    status: "to_review",
    favorite: false,
    is_archived: false,
    area_id: null,
    topic_id: null,
    linkedAreaIds: [] as string[],
    linkedGoalIds: [] as string[],
    linkedProjectIds: [] as string[],
    linkedTaskIds: [] as string[],
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  } as never;
}

function renderForm(resource: ReturnType<typeof makeResource>) {
  return render(
    <ResourceInboxProcessForm
      resource={resource}
      areaOptions={[LINKED_AREA]}
      goalOptions={[]}
      projectOptions={[LINKED_PROJECT, OTHER_PROJECT]}
      taskOptions={[]}
      topicOptions={[]}
      projectGoalIdsMap={new Map()}
      taskGoalIdsMap={new Map()}
      onClose={() => {}}
    />,
  );
}

function savedInput() {
  expect(hooks.updateMutate).toHaveBeenCalledTimes(1);
  return hooks.updateMutate.mock.calls[0][0].input as Record<string, unknown>;
}

describe("ResourceInboxProcessForm save payload", () => {
  it("a plain process save preserves stored project and area links", async () => {
    const user = userEvent.setup();
    // The resource is linked to project-1 (filed under area-b) AND to
    // area-1 — no picker is touched, the user just processes the resource.
    renderForm(
      makeResource({
        linkedProjectIds: ["project-1"],
        linkedAreaIds: ["area-1"],
      }),
    );

    await user.click(screen.getByRole("button", { name: /Process/i }));

    const input = savedInput();
    // Before the preselected guard this payload carried project_ids: [] and
    // area_ids: []/area_id: null — the exact request shapes that delete the
    // resource_projects and resource_areas rows (step-0 killing operations).
    expect(input.project_ids).toEqual(["project-1"]);
    expect(input.area_ids).toEqual(["area-1"]);
    expect(input.area_id).toBe("area-1");
  });

  it("the linked project stays visible in its picker so the user can clear it deliberately", async () => {
    renderForm(
      makeResource({
        linkedProjectIds: ["project-1"],
        linkedAreaIds: ["area-1"],
      }),
    );

    // Cross-constrained by the linked area, the project must still be
    // offered (preselected escape hatch), otherwise the user cannot even
    // SEE the link the form is about to destroy. The trigger shows the
    // linked project's name as the selected label.
    await userEvent.setup().click(screen.getByRole("button", { name: /Website/i }));
    expect(await screen.findByRole("menuitem", { name: /Website/ })).toBeInTheDocument();
  });

  it("an explicit user clear of the project picker still unlinks", async () => {
    const user = userEvent.setup();
    // No area link: the project picker is unconstrained on both sides, so
    // this exercises the deliberate-clear path identically before and after
    // the preselected guard.
    renderForm(makeResource({ linkedProjectIds: ["project-1"] }));

    // With the project linked and no area picks, the trigger shows the
    // project's name as the selected label.
    await user.click(screen.getByRole("button", { name: /Website/i }));
    await user.click(await screen.findByRole("menuitem", { name: /Website/ }));
    await user.click(screen.getByRole("button", { name: /Process/i }));

    const input = savedInput();
    expect(input.project_ids).toEqual([]);
  });

  it("processing a context-less resource sends empty link arrays", async () => {
    const user = userEvent.setup();
    renderForm(makeResource());

    await user.click(screen.getByRole("button", { name: /Process/i }));

    const input = savedInput();
    expect(input.project_ids).toEqual([]);
    expect(input.area_ids).toEqual([]);
  });
});

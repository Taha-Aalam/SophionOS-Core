// @vitest-environment jsdom

import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ContactRelationshipManager } from "@/components/entities/contact-relationship-manager";

/**
 * Family-audit finding (this PR): the contact relationship manager (and the
 * contact edit dialog, via the same shared engine) reproduces the process-form
 * wipe on a fifth surface. It stages the stored links on open, auto-cleans
 * them through cleanInvalidSelections (contact-relationship-filters.ts) —
 * which has NO preselected exemption — and handleSave sends ALL four link
 * fields unconditionally. For a contact whose stored links cross-constrain
 * each other (project filed under area-b + contact linked to area-1), the
 * engine filters each link out of the other's candidate list, the auto-clean
 * strips both, and a plain save with zero edits emits
 * {"area_ids":[],"goal_ids":[],"project_ids":[],"task_ids":[]} — an explicit
 * clear the user never made. contactService.update → syncContactLinks then
 * deletes the contact_areas and contact_projects rows.
 *
 * The #153 ruling (generalised) pins the contract here too: a link the user
 * did not touch must stay visible in its picker and survive a plain save;
 * only a deliberate clear may remove it.
 *
 * NOTE for reviewers: this test fails on master (both links stripped and
 * saved as empty arrays) and passes after the preselected guard in the
 * shared contact engine.
 */

const hooks = vi.hoisted(() => ({
  onSave: vi.fn(),
}));

const fixtures = vi.hoisted(() => ({
  AREAS: [
    { id: "area-1", name: "Home", icon: null, archive: false },
    { id: "area-b", name: "Work", icon: null, archive: false },
  ],
  PROJECTS: [
    { id: "project-1", name: "Website", is_archived: false, area_id: "area-b", linkedAreaIds: ["area-b"] },
    // A second project filed under area-1 keeps filteredProjects non-empty
    // (no empty-candidates fallback), which is the condition under which the
    // unguarded auto-clean strips the stored project link — the manager's
    // real-world shape (K4 in the step-0 observation record).
    { id: "project-2", name: "Side project", is_archived: false, area_id: "area-1", linkedAreaIds: ["area-1"] },
  ],
}));

vi.mock("@/lib/hooks/use-areas", () => ({
  useAreas: () => ({ data: fixtures.AREAS }),
}));
vi.mock("@/lib/hooks/use-goals", () => ({
  useGoals: () => ({ data: [] }),
}));
vi.mock("@/lib/hooks/use-projects", () => ({
  useProjects: () => ({ data: fixtures.PROJECTS }),
}));
vi.mock("@/lib/hooks/use-tasks", () => ({
  useTasks: () => ({ data: [] }),
}));
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: () => ({
      select: () => Promise.resolve({ data: [], error: null }),
    }),
  }),
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
  hooks.onSave.mockClear();
});

function renderManager() {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ContactRelationshipManager
        open
        onOpenChange={() => {}}
        contactName="Jane Doe"
        initialAreaIds={["area-1"]}
        initialGoalIds={[]}
        initialProjectIds={["project-1"]}
        initialTaskIds={[]}
        onSave={hooks.onSave}
      />
    </QueryClientProvider>,
  );
}

describe("ContactRelationshipManager save payload", () => {
  it("a plain save preserves stored area and project links that cross-constrain each other", async () => {
    const user = userEvent.setup();
    renderManager();

    // The stored links cross-constrain (project-1 filed under area-b, the
    // contact linked to area-1). Before the preselected guard the auto-clean
    // strips BOTH on open and this save emits area_ids: [] / project_ids: []
    // — the contact-surface killing payload.
    await user.click(screen.getByRole("button", { name: /Save Relationships/i }));

    expect(hooks.onSave).toHaveBeenCalledTimes(1);
    const links = hooks.onSave.mock.calls[0][0] as Record<string, string[]>;
    expect(links.area_ids).toEqual(["area-1"]);
    expect(links.project_ids).toEqual(["project-1"]);
  });

  it("the stored links stay visible in their pickers so the user can clear them deliberately", async () => {
    const user = userEvent.setup();
    renderManager();

    // Both staged pickers show "1 selected"; disambiguate by section label.
    // Options live inside the dropdowns — open each picker and assert the
    // stored link is still offered (preselected escape hatch).
    const areasSection = screen.getByText("Areas").closest("div")!;
    await user.click(within(areasSection).getByRole("button"));
    expect(await screen.findByRole("menuitem", { name: /Home/ })).toBeInTheDocument();

    const projectsSection = screen.getByText("Projects").closest("div")!;
    await user.click(within(projectsSection).getByRole("button"));
    expect(await screen.findByRole("menuitem", { name: /Website/ })).toBeInTheDocument();
  });
});

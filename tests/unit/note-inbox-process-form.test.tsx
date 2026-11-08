// @vitest-environment jsdom

import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NoteInboxProcessForm } from "@/components/entities/note-inbox-process-form";

/**
 * Same contract as the resource process form tests: the note process form's
 * save handler sends ALL link fields unconditionally, so a link the
 * cross-filter hides (and useValidIds strips) would reach the PATCH body as
 * an explicit clear and silently delete the note's stored junction rows.
 * The preselected guard keeps every stored link visible and saveable.
 */
const hooks = vi.hoisted(() => ({
  updateMutate: vi.fn(),
}));

vi.mock("@/lib/hooks/use-notes", () => ({
  useUpdateNote: () => ({ mutate: hooks.updateMutate, isPending: false }),
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

function makeNote(overrides: Record<string, unknown> = {}) {
  return {
    id: "note-1",
    name: "Linked note",
    content: null,
    type: "note",
    status: "to_review",
    favorite: false,
    pin: false,
    is_archived: false,
    notebook: null,
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

function renderForm(note: ReturnType<typeof makeNote>) {
  return render(
    <NoteInboxProcessForm
      note={note}
      areaOptions={[LINKED_AREA]}
      goalOptions={[]}
      projectOptions={[LINKED_PROJECT, OTHER_PROJECT]}
      taskOptions={[]}
      notebookOptions={[]}
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

describe("NoteInboxProcessForm save payload", () => {
  it("a plain process save preserves stored project and area links", async () => {
    const user = userEvent.setup();
    renderForm(
      makeNote({
        linkedProjectIds: ["project-1"],
        linkedAreaIds: ["area-1"],
      }),
    );

    await user.click(screen.getByRole("button", { name: /Process/i }));

    const input = savedInput();
    expect(input.project_ids).toEqual(["project-1"]);
    expect(input.project_id).toBe("project-1");
    expect(input.area_ids).toEqual(["area-1"]);
    expect(input.area_id).toBe("area-1");
  });

  it("an explicit user clear of the project picker still unlinks", async () => {
    const user = userEvent.setup();
    renderForm(makeNote({ linkedProjectIds: ["project-1"] }));

    // The note form's project trigger shows "1 selected" (no selectedLabel).
    // No other picker is populated in this fixture, so the name is unique.
    await user.click(screen.getByRole("button", { name: "1 selected" }));
    await user.click(await screen.findByRole("menuitem", { name: /Website/ }));
    await user.click(screen.getByRole("button", { name: /Process/i }));

    const input = savedInput();
    expect(input.project_ids).toEqual([]);
    expect(input.project_id).toBeNull();
  });

  it("processing a context-less note sends empty link arrays", async () => {
    const user = userEvent.setup();
    renderForm(makeNote());

    await user.click(screen.getByRole("button", { name: /Process/i }));

    const input = savedInput();
    expect(input.project_ids).toEqual([]);
    expect(input.area_ids).toEqual([]);
  });
});

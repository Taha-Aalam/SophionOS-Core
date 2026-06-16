// @vitest-environment jsdom

// cmdk uses ResizeObserver internally; jsdom does not implement it.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error - jsdom global stub
globalThis.ResizeObserver = ResizeObserverMock;

// cmdk also calls scrollIntoView on highlighted items; jsdom has it on
// Element.prototype in modern versions but not always, so stub defensively.
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {};
}
// matchMedia is occasionally touched by cmdk; stub to silence warnings.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = () =>
    ({
      matches: false,
      media: "",
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as never;
}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { CommandPalette } from "@/components/layout/command-palette";
import { useUIStore } from "@/lib/stores/ui.store";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Auth: keep `user` undefined so useCreateArea(user?.id) receives undefined —
// but the actual store call is mocked, so it doesn't matter.
vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

// Data hooks: return small fixture sets so the search results groups are
// populated for some tests, and empty for others.
vi.mock("@/lib/hooks/use-areas", () => ({
  useAreas: () => ({
    data: [
      { id: "a1", slug: "health", name: "Health", archive: false },
      { id: "a2", slug: "career", name: "Career", archive: false },
    ],
  }),
  useCreateArea: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/lib/hooks/use-topics", () => ({
  useTopics: () => ({
    data: [{ id: "t1", name: "Productivity", inactive: false }],
  }),
  useCreateTopic: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateTopic: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/lib/hooks/use-tasks", () => ({
  useTasks: () => ({
    data: [{ id: "task-1", name: "Buy groceries", is_archived: false }],
  }),
  useCreateTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateTask: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
}));
vi.mock("@/lib/hooks/use-goals", () => ({
  useGoals: () => ({ data: [] }),
  useCreateGoal: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateGoal: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/lib/hooks/use-projects", () => ({
  useProjects: () => ({ data: [] }),
  useCreateProject: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateProject: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/lib/hooks/use-notes", () => ({
  useNotes: () => ({ data: [] }),
  useCreateNote: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateNote: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/lib/hooks/use-resources", () => ({
  useResources: () => ({
    data: [{ id: "r1", name: "Example Site", is_archived: false }],
  }),
  useCreateResource: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useUpdateResource: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
}));
vi.mock("@/lib/hooks/use-contacts", () => ({
  useContacts: () => ({
    data: [{ id: "c1", slug: "jane-doe", name: "Jane Doe", archive: false }],
  }),
  useCreateContact: () => ({ mutate: vi.fn() }),
  useUpdateContact: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/lib/hooks/use-keyboard", () => ({
  useKeyboardShortcut: vi.fn(),
}));

// Sentinel-bearing dialog mocks. The sentinel exposes the dialog name + the
// `open` prop so tests can assert whether a given dialog was actually opened.
function makeDialogMock(name: string) {
  function DialogSentinel({ open }: { open: boolean }) {
    return open ? <div data-testid={`dialog-${name}`}>{`open:${name}`}</div> : null;
  }
  DialogSentinel.displayName = `${name}DialogSentinel`;
  return DialogSentinel;
}

vi.mock("@/components/entities/area-dialog", () => ({
  AreaDialog: makeDialogMock("area"),
}));
vi.mock("@/components/entities/goal-dialog", () => ({
  GoalDialog: makeDialogMock("goal"),
}));
vi.mock("@/components/entities/project-dialog", () => ({
  ProjectDialog: makeDialogMock("project"),
}));
vi.mock("@/components/entities/task-dialog", () => ({
  TaskDialog: makeDialogMock("task"),
}));
vi.mock("@/components/entities/contact-dialog", () => ({
  ContactDialog: makeDialogMock("contact"),
}));
vi.mock("@/components/entities/resource-dialog", () => ({
  ResourceDialog: makeDialogMock("resource"),
}));
vi.mock("@/components/entities/topic-dialog", () => ({
  TopicDialog: makeDialogMock("topic"),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function openPalette() {
  useUIStore.setState({ commandPaletteOpen: true });
}

function renderPalette() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CommandPalette />
    </QueryClientProvider>,
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("CommandPalette", () => {
  beforeEach(() => {
    pushMock.mockClear();
    useUIStore.setState({ commandPaletteOpen: false });
  });

  it("renders Core and System nav groups in sidebar order with the right labels", () => {
    openPalette();
    renderPalette();

    const core = screen.getByRole("group", { name: /Core/i });
    const system = screen.getByRole("group", { name: /System/i });

    // textContent contains the leading emoji glyph (which may include the
    // variation selector U+FE0F). Compare on the textContent of each option
    // element itself by matching the text of the trailing label only.
    const expectedCore = [
      "Dashboard", "Areas", "Goals", "Projects", "Tasks",
      "Notes", "Resources", "Topics", "Contacts",
    ];
    const expectedSystem = ["My Day", "Inbox", "Knowledge Hub"];

    for (const label of [...expectedCore, ...expectedSystem]) {
      // Each option's textContent ends with the label.
      expect(
        within(core).queryByText(label) ?? within(system).queryByText(label),
      ).toBeTruthy();
    }

    // Verify ordering by index in the DOM.
    const coreOptions = within(core).getAllByRole("option");
    const coreLabelsInOrder = expectedCore.map((label) =>
      coreOptions.findIndex((el) => el.textContent?.endsWith(label) ?? false),
    );
    expect(coreLabelsInOrder).toEqual(coreLabelsInOrder.map((_, i) => i));
  });

  it("renders the eight Create actions", () => {
    openPalette();
    renderPalette();

    const createGroup = screen.getByRole("group", { name: /Create/i });
    const labels = within(createGroup)
      .getAllByRole("option")
      .map((el) => el.textContent);
    expect(labels).toEqual([
      "🗺️Create area",
      "🎯Create goal",
      "📁Create project",
      "☑️Create task",
      "📝Create note",
      "🔗Create resource",
      "👥Create contact",
      "🏷️Create topic",
    ]);
  });

  it("opens the TaskDialog sentinel when 'Create task' is selected", async () => {
    openPalette();
    renderPalette();
    const user = userEvent.setup();

    expect(screen.queryByTestId("dialog-task")).not.toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: "Create task" }));

    expect(screen.getByTestId("dialog-task")).toBeInTheDocument();
  });

  it("navigates to the area detail page by slug with a stamped returnTo", async () => {
    openPalette();
    renderPalette();
    const user = userEvent.setup();

    const input = screen.getByPlaceholderText(/Search or create/i);
    await user.type(input, "heal");

    await user.click(screen.getByRole("option", { name: /Health/ }));

    expect(pushMock).toHaveBeenCalledWith(expect.stringMatching(/^\/areas\/health\?returnTo=/));
    expect(screen.queryByTestId("dialog-area")).not.toBeInTheDocument();
  });

  it("navigates to the contact detail page by slug (not uuid) with a stamped returnTo", async () => {
    openPalette();
    renderPalette();
    const user = userEvent.setup();

    const input = screen.getByPlaceholderText(/Search or create/i);
    await user.type(input, "jane");

    await user.click(screen.getByRole("option", { name: /Jane Doe/ }));

    expect(pushMock).toHaveBeenCalledWith(expect.stringMatching(/^\/contacts\/jane-doe\?returnTo=/));
    expect(screen.queryByTestId("dialog-contact")).not.toBeInTheDocument();
  });

  it("navigates to the new-note page (no dialog) when 'Create note' is selected", async () => {
    openPalette();
    renderPalette();
    const user = userEvent.setup();

    await user.click(screen.getByRole("option", { name: "Create note" }));

    expect(pushMock).toHaveBeenCalledWith(expect.stringContaining("/notes/new"));
    expect(screen.queryByTestId("dialog-note")).not.toBeInTheDocument();
  });

  it("opens the TaskDialog sentinel in edit mode when an existing task is selected", async () => {
    openPalette();
    renderPalette();
    const user = userEvent.setup();

    const input = screen.getByPlaceholderText(/Search or create/i);
    await user.type(input, "groceries");

    await user.click(screen.getByRole("option", { name: /Buy groceries/ }));
    expect(screen.getByTestId("dialog-task")).toBeInTheDocument();
  });

  it("opens the ResourceDialog sentinel in edit mode when an existing resource is selected", async () => {
    openPalette();
    renderPalette();
    const user = userEvent.setup();

    const input = screen.getByPlaceholderText(/Search or create/i);
    await user.type(input, "example");

    await user.click(screen.getByRole("option", { name: /Example Site/ }));
    expect(screen.getByTestId("dialog-resource")).toBeInTheDocument();
  });

  it("renders the My Day nav icon tinted orange", () => {
    openPalette();
    renderPalette();
    const myDay = screen.getByRole("option", { name: /My Day/ });
    const svg = myDay.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("class") ?? "").toContain("text-orange-500");
  });

  it("renders the Knowledge Hub nav icon tinted blue", () => {
    openPalette();
    renderPalette();
    const knowledge = screen.getByRole("option", { name: /Knowledge Hub/ });
    const svg = knowledge.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("class") ?? "").toContain("text-blue-500");
  });

  it("does not force selected command-item svg icons to the foreground color", () => {
    openPalette();
    renderPalette();
    const myDay = screen.getByRole("option", { name: /My Day/ });
    // The washing-out override lived on the command-item wrapper. It must be gone
    // so a highlighted (data-selected) row keeps its brand-colored svg icon.
    expect(myDay.className).not.toContain("data-selected:*:[svg]:text-foreground");
  });
});

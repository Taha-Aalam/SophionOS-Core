// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element -- test doubles for next/image and the avatar primitive */

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error - jsdom global stub
globalThis.ResizeObserver = ResizeObserverMock;
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {};
}
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = () =>
    ({
      matches: false,
      media: "",
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      },
    }) as unknown as MediaQueryList;
}

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Sidebar } from "@/components/layout/sidebar";
import { CommandPalette } from "@/components/layout/command-palette";
import { useUIStore } from "@/lib/stores/ui.store";

const USER = {
  id: "u1",
  name: "taha hassan",
  email: "taha@example.com",
  imageUrl: "https://img.clerk.com/taha.png",
};

const authState: { user: typeof USER | null } = { user: USER };
const setThemeMock = vi.fn();

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({ user: authState.user }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/dashboard",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark", setTheme: setThemeMock }),
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-slot="avatar" className={className}>
      {children}
    </div>
  ),
  AvatarImage: ({ src, alt }: { src?: string; alt?: string }) => (
    <img data-slot="avatar-image" src={src} alt={alt} />
  ),
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="avatar-fallback">{children}</div>
  ),
}));

vi.mock("@/lib/hooks/use-areas", () => ({
  useAreas: () => ({ data: [] }),
  useCreateArea: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/lib/hooks/use-topics", () => ({
  useTopics: () => ({ data: [] }),
}));
vi.mock("@/lib/hooks/use-tasks", () => ({
  useTasks: () => ({ data: [] }),
}));
vi.mock("@/lib/hooks/use-goals", () => ({
  useGoals: () => ({ data: [] }),
}));
vi.mock("@/lib/hooks/use-projects", () => ({
  useProjects: () => ({ data: [] }),
}));
vi.mock("@/lib/hooks/use-notes", () => ({
  useNotes: () => ({ data: [] }),
}));
vi.mock("@/lib/hooks/use-resources", () => ({
  useResources: () => ({ data: [] }),
  useCreateResource: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useUpdateResource: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
}));
vi.mock("@/lib/hooks/use-contacts", () => ({
  useContacts: () => ({ data: [] }),
  useCreateContact: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/components/entities/area-dialog", () => ({ AreaDialog: () => null }));
vi.mock("@/components/entities/goal-dialog", () => ({ GoalDialog: () => null }));
vi.mock("@/components/entities/project-dialog", () => ({ ProjectDialog: () => null }));
vi.mock("@/components/entities/task-dialog", () => ({ TaskDialog: () => null }));
vi.mock("@/components/entities/contact-dialog", () => ({ ContactDialog: () => null }));
vi.mock("@/components/entities/resource-dialog", () => ({ ResourceDialog: () => null }));
vi.mock("@/components/entities/topic-dialog", () => ({ TopicDialog: () => null }));

function renderSidebar({ collapsed }: { collapsed: boolean }) {
  useUIStore.setState({ isDesktopSidebarOpen: !collapsed });
  return render(<Sidebar />);
}

function renderSidebarAndPalette({ collapsed }: { collapsed: boolean }) {
  useUIStore.setState({ isDesktopSidebarOpen: !collapsed, commandPaletteOpen: false });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Sidebar />
      <CommandPalette />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  authState.user = USER;
  setThemeMock.mockReset();
  useUIStore.setState({ commandPaletteOpen: false, isDesktopSidebarOpen: true });
});

describe("Sidebar — search bar placement and expanded-only rendering", () => {
  it("renders the bar in the expanded footer above the Settings divider", () => {
    renderSidebar({ collapsed: false });

    const search = screen.getByRole("button", { name: "Search" });
    expect(search).toHaveAttribute("type", "button");
    expect(search).toHaveAttribute("aria-label", "Search");
    expect(search).toHaveAttribute("aria-keyshortcuts", "meta+k ctrl+k");
    expect(search.textContent).toContain("Search");
    expect(search.textContent).toContain("⌘K");
    expect(search.querySelector("svg")).not.toBeNull();

    // Footer block holds the divider border; the bar is its first child,
    // before Settings, theme, and user chip.
    const footer = search.parentElement as HTMLElement;
    expect(footer.className).toContain("shrink-0");
    expect(footer.className).toContain("border-t");

    const settings = screen.getByRole("link", { name: "Settings" });
    const theme = screen.getByRole("button", { name: "Light mode" });
    const profile = screen.getByRole("link", { name: "Open profile: Taha Hassan" });
    expect(search.compareDocumentPosition(settings) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(search.compareDocumentPosition(theme) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(search.compareDocumentPosition(profile) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // Nav remains a scroll region above the pinned footer.
    const nav = screen.getByRole("navigation");
    expect(nav.className).toContain("flex-1");
    expect(nav.className).toContain("overflow-y-auto");
    expect(nav.contains(search)).toBe(false);
  });

  it("renders no bar and no placeholder element when collapsed", () => {
    renderSidebar({ collapsed: true });

    expect(screen.queryByRole("button", { name: "Search" })).not.toBeInTheDocument();
    expect(screen.queryByText("Search")).not.toBeInTheDocument();
    expect(screen.queryByText("⌘K")).not.toBeInTheDocument();
    expect(document.querySelectorAll('button[aria-label="Search"]')).toHaveLength(0);

    // The rest of the footer survives collapsed.
    expect(screen.getByRole("link", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Light mode" })).toBeInTheDocument();
  });
});

describe("Sidebar — search bar opens the existing palette exactly once", () => {
  it("opens the palette on click from closed, single transition", async () => {
    const user = userEvent.setup();
    renderSidebar({ collapsed: false });

    let transitions = 0;
    const unsub = useUIStore.subscribe((state, prev) => {
      if (state.commandPaletteOpen !== prev.commandPaletteOpen) transitions += 1;
    });

    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(useUIStore.getState().commandPaletteOpen).toBe(true);
    expect(transitions).toBe(1);
    unsub();
  });

  it("does not toggle closed when already open (open, not toggle)", async () => {
    const user = userEvent.setup();
    useUIStore.setState({ commandPaletteOpen: true });
    renderSidebar({ collapsed: false });

    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(useUIStore.getState().commandPaletteOpen).toBe(true);
  });
});

describe("Global shortcut — opens the same palette once in both sidebar states", () => {
  it.each([
    { collapsed: false, initial: { key: "k", ctrlKey: true } },
    { collapsed: true, initial: { key: "k", ctrlKey: true } },
    { collapsed: true, initial: { key: "k", metaKey: true } },
    { collapsed: false, initial: { key: "k", metaKey: true } },
  ])(
    "toggles exactly once per press (collapsed: $collapsed)",
    ({ collapsed, initial }) => {
      renderSidebarAndPalette({ collapsed });

      expect(useUIStore.getState().commandPaletteOpen).toBe(false);
      fireEvent.keyDown(document.body, initial);
      expect(useUIStore.getState().commandPaletteOpen).toBe(true);

      // A duplicate listener would toggle twice per press and end where it
      // started; a second press must toggle back exactly once.
      fireEvent.keyDown(document.body, initial);
      expect(useUIStore.getState().commandPaletteOpen).toBe(false);
    },
  );
});

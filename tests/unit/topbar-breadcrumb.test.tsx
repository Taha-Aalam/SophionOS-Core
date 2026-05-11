import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { Topbar } from "@/components/layout/topbar";

const mockUsePathname = vi.fn();
const mockUseGoalsData = vi.fn();
const mockUseUIStorePageTitle = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark", setTheme: vi.fn() }),
}));

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({
    user: { email: "user@example.com", user_metadata: { name: "Test User" } },
    signOut: vi.fn(),
  }),
}));

vi.mock("@/lib/stores/ui.store", () => ({
  useUIStore: () => ({
    openMobileNav: vi.fn(),
    pageTitle: mockUseUIStorePageTitle(),
  }),
}));

vi.mock("@/lib/hooks/use-goals", () => ({
  useGoals: () => ({ data: mockUseGoalsData() }),
}));

vi.mock("@/lib/utils/goal-urls", () => ({
  buildGoalDetailHref: (goal: { slug?: string; name: string }) =>
    `/goals/${goal.slug ?? "generated-slug"}`,
}));

vi.mock("@/components/ui/avatar", () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="avatar">{children}</div>
  ),
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="avatar-fallback">{children}</div>
  ),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="dropdown-menu">{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="dropdown-menu-trigger">{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="dropdown-menu-content">{children}</div>
  ),
  DropdownMenuGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="dropdown-menu-group">{children}</div>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="dropdown-menu-label">{children}</div>
  ),
  DropdownMenuSeparator: () => <div data-slot="dropdown-menu-separator" />,
  DropdownMenuItem: ({ children }: { children: React.ReactNode }) => (
    <div data-slot="dropdown-menu-item">{children}</div>
  ),
}));

describe("Topbar breadcrumb slug resolution", () => {
  it("renders pageTitle for goal slug route when pageTitle is set", () => {
    mockUsePathname.mockReturnValue("/goals/step-20-command-center");
    mockUseGoalsData.mockReturnValue([]);
    mockUseUIStorePageTitle.mockReturnValue("Step 20 Command Center");

    const html = renderToStaticMarkup(<Topbar />);
    expect(html).toContain("Step 20 Command Center");
  });

  it("renders raw slug when on /goals/<slug> and pageTitle is not yet set", () => {
    mockUsePathname.mockReturnValue("/goals/step-20-command-center");
    mockUseGoalsData.mockReturnValue([]);
    mockUseUIStorePageTitle.mockReturnValue(null);

    const html = renderToStaticMarkup(<Topbar />);
    expect(html).toContain("step-20-command-center");
  });

  it("renders 'goals' for /goals (no slug)", () => {
    mockUsePathname.mockReturnValue("/goals");
    mockUseGoalsData.mockReturnValue([]);
    mockUseUIStorePageTitle.mockReturnValue(null);

    const html = renderToStaticMarkup(<Topbar />);
    expect(html).toContain("Goals");
  });

  it("renders pageTitle for UUID-based goal routes", () => {
    mockUsePathname.mockReturnValue(
      "/goals/550e8400-e29b-41d4-a716-446655440000",
    );
    mockUseGoalsData.mockReturnValue([]);
    mockUseUIStorePageTitle.mockReturnValue("Goal Detail");

    const html = renderToStaticMarkup(<Topbar />);
    expect(html).toContain("Goal Detail");
  });

  it("renders raw slug for 'test-4' when pageTitle not set (loading state)", () => {
    mockUsePathname.mockReturnValue("/goals/test-4");
    mockUseGoalsData.mockReturnValue([]);
    mockUseUIStorePageTitle.mockReturnValue(null);

    const html = renderToStaticMarkup(<Topbar />);
    expect(html).toContain("test-4");
    expect(html).not.toContain("copy");
  });

  it("renders pageTitle for /projects/<slug> routes", () => {
    mockUsePathname.mockReturnValue("/projects/restore-projects");
    mockUseGoalsData.mockReturnValue([]);
    mockUseUIStorePageTitle.mockReturnValue("Restore Projects");

    const html = renderToStaticMarkup(<Topbar />);
    expect(html).toContain("Restore Projects");
  });

  it("renders pageTitle for /projects/<uuid> routes", () => {
    mockUsePathname.mockReturnValue("/projects/550e8400-e29b-41d4-a716-446655440000");
    mockUseGoalsData.mockReturnValue([]);
    mockUseUIStorePageTitle.mockReturnValue("Project Detail");

    const html = renderToStaticMarkup(<Topbar />);
    expect(html).toContain("Project Detail");
  });
});
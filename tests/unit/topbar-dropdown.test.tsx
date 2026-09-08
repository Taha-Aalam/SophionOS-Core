import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({
    resolvedTheme: "dark",
    setTheme: vi.fn(),
  }),
}));

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({
    user: {
      id: "user_123",
      email: "user@example.com",
      name: "Test User",
      imageUrl: null,
    },
    signOut: vi.fn(),
  }),
}));

vi.mock("@/lib/stores/ui.store", () => ({
  useUIStore: () => ({
    openMobileNav: vi.fn(),
    pageTitle: null,
  }),
}));

vi.mock("@/lib/hooks/use-goals", () => ({
  useGoals: () => ({
    data: [],
  }),
}));

vi.mock("@/lib/utils/goal-urls", () => ({
  buildGoalDetailHref: (goal: { slug?: string; name: string }) => `/goals/${goal.slug ?? "slug"}`,
}));

vi.mock("@/lib/hooks/use-subscription", () => ({
  useSubscription: () => ({
    data: { tier: "free", isPaid: false, cohortMember: false },
    loading: false,
  }),
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
  DropdownMenuTrigger: ({
    children,
    render,
  }: {
    children?: React.ReactNode;
    render?: React.ReactElement;
  }) => (
    <div data-slot="dropdown-menu-trigger">
      {render}
      {children}
    </div>
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

import { Topbar } from "@/components/layout/topbar";

describe("Topbar profile dropdown", () => {
  it("renders name and email in the topbar profile trigger", () => {
    const html = renderToStaticMarkup(<Topbar />);

    expect(html).toContain('data-slot="dropdown-menu-trigger"');
    expect(html).toContain("Test User");
    expect(html).toContain("user@example.com");
  });
});

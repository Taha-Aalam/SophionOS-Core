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
      email: "user@example.com",
      user_metadata: {
        name: "Test User",
      },
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

import { Topbar } from "@/components/layout/topbar";

describe("Topbar profile dropdown", () => {
  it("wraps the profile label in a dropdown menu group", () => {
    const html = renderToStaticMarkup(<Topbar />);

    expect(html).toContain('data-slot="dropdown-menu-group"');
    expect(html).toContain('data-slot="dropdown-menu-label"');
    expect(html).toMatch(
      /data-slot="dropdown-menu-group".*data-slot="dropdown-menu-label">user@example.com/s,
    );
  });
});

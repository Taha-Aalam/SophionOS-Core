// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element -- test doubles for next/image and the avatar primitive */

// base-ui's sheet observes element size; jsdom has no ResizeObserver.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error - jsdom global stub
globalThis.ResizeObserver = ResizeObserverMock;

import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { MobileNav } from "@/components/layout/mobile-nav";
import { useUIStore } from "@/lib/stores/ui.store";

const USER = {
  id: "u1",
  name: "taha hassan",
  email: "taha@example.com",
  imageUrl: "https://img.clerk.com/taha.png",
};

const authState: { user: typeof USER | null } = { user: USER };

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({ user: authState.user, signOut: vi.fn() }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark", setTheme: vi.fn() }),
}));

// Avatar primitives defer to image-loading state that never resolves in jsdom.
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

function renderOpenSheet() {
  useUIStore.setState({ isMobileNavOpen: true });
  return render(<MobileNav />);
}

describe("MobileNav — profile avatar", () => {
  beforeEach(() => {
    authState.user = USER;
  });

  it("renders the user's profile image, not an initials-only circle", () => {
    renderOpenSheet();

    const name = screen.getByText("Taha Hassan");
    const row = name.parentElement as HTMLElement;
    const image = row.querySelector('[data-slot="avatar-image"]');

    expect(image).not.toBeNull();
    expect(image).toHaveAttribute("src", USER.imageUrl);
  });

  it("falls back to the same initials as the header when the user has no image", () => {
    authState.user = { ...USER, imageUrl: null };
    renderOpenSheet();

    const name = screen.getByText("Taha Hassan");
    const row = name.parentElement as HTMLElement;

    expect(row.querySelector('[data-slot="avatar-image"]')).toBeNull();
    expect(within(row).getByText("TA")).toBeInTheDocument();
  });
});

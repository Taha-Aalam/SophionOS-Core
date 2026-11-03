// @vitest-environment jsdom
/* eslint-disable @next/next/no-img-element -- test doubles for next/image and the avatar primitive */

// base-ui tooltips observe element size; jsdom has no ResizeObserver.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error - jsdom global stub
globalThis.ResizeObserver = ResizeObserverMock;

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Sidebar } from "@/components/layout/sidebar";
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
  usePathname: () => "/dashboard",
}));

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ resolvedTheme: "dark", setTheme: setThemeMock }),
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

function renderSidebar({ collapsed }: { collapsed: boolean }) {
  useUIStore.setState({ isDesktopSidebarOpen: !collapsed });
  return render(<Sidebar />);
}

describe("Sidebar — collapsed rail expand control", () => {
  beforeEach(() => {
    authState.user = USER;
    setThemeMock.mockReset();
  });

  it("floats a bubble on the rail's right edge instead of sitting inline by the logo", () => {
    renderSidebar({ collapsed: true });

    // Exactly one expand control — the inline arrow beside the logo is gone.
    const expandButtons = screen.getAllByRole("button", { name: "Expand sidebar" });
    expect(expandButtons).toHaveLength(1);

    const bubble = expandButtons[0];
    const floatingWrapper = bubble.parentElement as HTMLElement;

    // Out of the rail's layout flow, straddling the right edge at logo height.
    expect(floatingWrapper.className).toContain("absolute");
    expect(floatingWrapper.className).toContain("right-0");
    expect(floatingWrapper.className).toContain("top-6");
    expect(floatingWrapper.className).toContain("translate-x-1/2");

    // Circular, and hover/focus revealed rather than always-on.
    expect(bubble.className).toContain("rounded-full");
    expect(bubble.className).toContain("opacity-0");
    expect(bubble.className).toContain("group-hover/sidebar:opacity-100");
    expect(bubble.className).toContain("focus-visible:opacity-100");
    // Touch devices keep a dimmed, tappable affordance.
    expect(bubble.className).toContain("pointer-coarse:opacity-70");

    // Still mounted and reachable by keyboard even while invisible.
    expect(bubble).toBeInTheDocument();
    expect(bubble).not.toHaveAttribute("tabindex", "-1");
    expect(bubble).not.toHaveAttribute("aria-hidden", "true");
  });

  it("expands the rail and keeps the persisted store as the single source of truth", async () => {
    const user = userEvent.setup();
    renderSidebar({ collapsed: true });

    await user.click(screen.getByRole("button", { name: "Expand sidebar" }));

    expect(useUIStore.getState().isDesktopSidebarOpen).toBe(true);
    expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Expand sidebar" })).not.toBeInTheDocument();
  });

  it("leaves the open-state collapse control untouched", () => {
    renderSidebar({ collapsed: false });

    expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Expand sidebar" })).not.toBeInTheDocument();
  });
});

describe("Sidebar — theme toggle centering", () => {
  beforeEach(() => {
    authState.user = USER;
  });

  it("uses a block-level box so mx-auto can centre it in the collapsed rail", async () => {
    renderSidebar({ collapsed: true });

    const toggle = await screen.findByRole("button", { name: "Light mode" });

    // `inline-flex` (the Button default) ignores `mx-auto` — that was the
    // off-centre bug. `flex` + `mx-auto` + a fixed size-10 box centres it.
    expect(toggle.className).toContain("flex");
    expect(toggle.className).not.toContain("inline-flex");
    expect(toggle.className).toContain("mx-auto");
    expect(toggle.className).toContain("size-10");
    expect(toggle.className).toContain("justify-center");
  });

  it("still toggles the theme from the rail", async () => {
    const user = userEvent.setup();
    renderSidebar({ collapsed: true });

    await user.click(await screen.findByRole("button", { name: "Light mode" }));

    expect(setThemeMock).toHaveBeenCalledWith("light");
  });
});

describe("Sidebar — profile avatar", () => {
  beforeEach(() => {
    authState.user = USER;
  });

  it("renders the user's profile image in the collapsed rail", () => {
    renderSidebar({ collapsed: true });

    const profileLink = screen.getByRole("link", { name: "Open profile: Taha Hassan" });
    const image = profileLink.querySelector('[data-slot="avatar-image"]');

    expect(image).not.toBeNull();
    expect(image).toHaveAttribute("src", USER.imageUrl);
  });

  it("renders the user's profile image in the open sidebar", () => {
    renderSidebar({ collapsed: false });

    const profileLink = screen.getByRole("link", { name: "Open profile: Taha Hassan" });
    const image = profileLink.querySelector('[data-slot="avatar-image"]');

    expect(image).not.toBeNull();
    expect(image).toHaveAttribute("src", USER.imageUrl);
  });

  it("falls back to the same initials as the header when the user has no image", () => {
    authState.user = { ...USER, imageUrl: null };
    renderSidebar({ collapsed: true });

    const profileLink = screen.getByRole("link", { name: "Open profile: Taha Hassan" });
    expect(profileLink.querySelector('[data-slot="avatar-image"]')).toBeNull();
    expect(within(profileLink).getByText("TA")).toBeInTheDocument();
  });
});

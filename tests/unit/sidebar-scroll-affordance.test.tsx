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

import { fireEvent, render, screen } from "@testing-library/react";
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
  useTheme: () => ({ resolvedTheme: "dark", setTheme: vi.fn() }),
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

function renderSidebar({ collapsed }: { collapsed: boolean }) {
  useUIStore.setState({ isDesktopSidebarOpen: !collapsed });
  return render(<Sidebar />);
}

/** jsdom has no layout: stand in for the scroll container's real metrics. */
function setNavMetrics(
  nav: HTMLElement,
  { scrollHeight, clientHeight, scrollTop }: { scrollHeight: number; clientHeight: number; scrollTop: number },
) {
  Object.defineProperty(nav, "scrollHeight", { configurable: true, value: scrollHeight });
  Object.defineProperty(nav, "clientHeight", { configurable: true, value: clientHeight });
  Object.defineProperty(nav, "scrollTop", { configurable: true, writable: true, value: scrollTop });
  fireEvent.scroll(nav);
}

const getNav = () => screen.getByRole("navigation");

beforeEach(() => {
  authState.user = USER;
  vi.restoreAllMocks();
  // jsdom has no matchMedia; drop any stub left by a previous test.
  delete (window as unknown as { matchMedia?: unknown }).matchMedia;
});

describe("collapsed rail — scrollbar replacement", () => {
  it("keeps the native scrollbar hidden in the nav region only", () => {
    renderSidebar({ collapsed: true });
    const nav = getNav();

    expect(nav.className).toContain("overflow-y-auto");
    expect(nav.className).toContain("overscroll-contain");
    expect(nav.className).toContain("[scrollbar-width:none]");
    expect(nav.className).toContain("[&::-webkit-scrollbar]:hidden");
  });

  it("leaves the expanded sidebar's native scrollbar untouched", () => {
    renderSidebar({ collapsed: false });
    const nav = getNav();

    expect(nav.className).toContain("overflow-y-auto");
    expect(nav.className).not.toContain("[scrollbar-width:none]");
    expect(nav.className).not.toContain("[&::-webkit-scrollbar]:hidden");
  });

  it("scrolls only the nav list — theme and profile controls stay outside the region", async () => {
    renderSidebar({ collapsed: true });
    const nav = getNav();

    const themeToggle = await screen.findByRole("button", { name: "Light mode" });
    const profile = screen.getByRole("link", { name: "Open profile: Taha Hassan" });

    expect(nav.contains(themeToggle)).toBe(false);
    expect(nav.contains(profile)).toBe(false);
    // Navigation icons stay inside it.
    expect(nav.contains(screen.getByRole("link", { name: "Dashboard" }))).toBe(true);
  });
});

describe("collapsed rail — overflow cues", () => {
  it("shows the bottom fade + chevron when more items exist below", () => {
    renderSidebar({ collapsed: true });
    setNavMetrics(getNav(), { scrollHeight: 600, clientHeight: 500, scrollTop: 0 });

    expect(screen.getByRole("button", { name: "More options" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Scroll up" })).not.toBeInTheDocument();

    const rail = screen.getByRole("navigation").parentElement as HTMLElement;
    const fades = rail.querySelectorAll('[aria-hidden="true"][class*="pointer-events-none"]');
    // Only the bottom edge is clipped at the top of the list.
    expect(fades).toHaveLength(1);
  });

  it("adds the top fade while scrolled, still cueing further down", () => {
    renderSidebar({ collapsed: true });
    setNavMetrics(getNav(), { scrollHeight: 600, clientHeight: 500, scrollTop: 50 });

    expect(screen.getByRole("button", { name: "More options" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Scroll up" })).not.toBeInTheDocument();

    const rail = screen.getByRole("navigation").parentElement as HTMLElement;
    const fades = rail.querySelectorAll('[aria-hidden="true"][class*="pointer-events-none"]');
    expect(fades).toHaveLength(2);
  });

  it("switches to a chevron-up at the top edge once the end is reached", () => {
    renderSidebar({ collapsed: true });
    setNavMetrics(getNav(), { scrollHeight: 600, clientHeight: 500, scrollTop: 100 });

    expect(screen.queryByRole("button", { name: "More options" })).not.toBeInTheDocument();
    const up = screen.getByRole("button", { name: "Scroll up" });
    expect(up).toBeInTheDocument();

    const rail = screen.getByRole("navigation").parentElement as HTMLElement;
    const fades = rail.querySelectorAll('[aria-hidden="true"][class*="pointer-events-none"]');
    expect(fades).toHaveLength(1);
  });

  it("shows no cue when the list fits (tall screens and expanded sidebar)", () => {
    renderSidebar({ collapsed: true });
    setNavMetrics(getNav(), { scrollHeight: 400, clientHeight: 400, scrollTop: 0 });

    expect(screen.queryByRole("button", { name: "More options" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Scroll up" })).not.toBeInTheDocument();
  });

  it("keeps cues out of the expanded sidebar even when it overflows", () => {
    renderSidebar({ collapsed: false });
    setNavMetrics(getNav(), { scrollHeight: 900, clientHeight: 500, scrollTop: 0 });

    expect(screen.queryByRole("button", { name: "More options" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Scroll up" })).not.toBeInTheDocument();
  });
});

describe("collapsed rail — chevron behaviour", () => {
  it("scrolls the nav by roughly one viewport when clicked", async () => {
    const user = userEvent.setup();
    renderSidebar({ collapsed: true });
    const nav = getNav();
    const scrollBy = vi.fn();
    nav.scrollBy = scrollBy as unknown as HTMLElement["scrollBy"];

    setNavMetrics(nav, { scrollHeight: 900, clientHeight: 500, scrollTop: 0 });
    await user.click(screen.getByRole("button", { name: "More options" }));

    expect(scrollBy).toHaveBeenCalledTimes(1);
    const [options] = scrollBy.mock.calls[0] as [{ top: number; behavior: string }];
    expect(options.top).toBeGreaterThan(0);
    expect(options.top).toBeLessThanOrEqual(500);
    expect(options.behavior).toBe("smooth");
  });

  it("scrolls up one viewport from the end", async () => {
    const user = userEvent.setup();
    renderSidebar({ collapsed: true });
    const nav = getNav();
    const scrollBy = vi.fn();
    nav.scrollBy = scrollBy as unknown as HTMLElement["scrollBy"];

    setNavMetrics(nav, { scrollHeight: 900, clientHeight: 500, scrollTop: 400 });
    await user.click(screen.getByRole("button", { name: "Scroll up" }));

    const [options] = scrollBy.mock.calls[0] as [{ top: number; behavior: string }];
    expect(options.top).toBeLessThan(0);
    expect(options.behavior).toBe("smooth");
  });

  it("honors prefers-reduced-motion by scrolling without animation", async () => {
    const user = userEvent.setup();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: (query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });

    renderSidebar({ collapsed: true });
    const nav = getNav();
    const scrollBy = vi.fn();
    nav.scrollBy = scrollBy as unknown as HTMLElement["scrollBy"];

    setNavMetrics(nav, { scrollHeight: 900, clientHeight: 500, scrollTop: 0 });
    await user.click(screen.getByRole("button", { name: "More options" }));

    const [options] = scrollBy.mock.calls[0] as [{ top: number; behavior: string }];
    expect(options.behavior).toBe("auto");
  });
});

describe("collapsed rail — keyboard reachability", () => {
  it("scrolls a tabbed-to item into view", () => {
    renderSidebar({ collapsed: true });
    const nav = getNav();
    const contacts = screen.getByRole("link", { name: "Contacts" });
    const scrollIntoView = vi.fn();
    contacts.scrollIntoView = scrollIntoView;

    fireEvent.focusIn(contacts);

    expect(nav.contains(contacts)).toBe(true);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" });
  });
});

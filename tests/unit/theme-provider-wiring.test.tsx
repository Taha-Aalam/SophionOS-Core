// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { captured } = vi.hoisted(() => ({
  captured: { props: null as Record<string, unknown> | null },
}));

// Capture what the app actually configures, independent of next-themes' own
// behaviour (pinned separately in theme-first-paint.test.tsx).
vi.mock("next-themes", () => ({
  ThemeProvider: ({
    children,
    ...props
  }: { children: React.ReactNode } & Record<string, unknown>) => {
    captured.props = props;
    return <div data-testid="next-themes">{children}</div>;
  },
}));

import { ThemeProvider } from "@/components/providers/theme-provider";

describe("ThemeProvider — wiring", () => {
  it("defaults to dark, ignores the OS, and toggles the `dark` class", () => {
    render(
      <ThemeProvider nonce="abc123">
        <span>child</span>
      </ThemeProvider>,
    );

    expect(captured.props).toMatchObject({
      // Tailwind's dark: variant is a class selector — `data-theme` (the
      // library default) would never match it.
      attribute: "class",
      defaultTheme: "dark",
      enableSystem: false,
      storageKey: "sophionos-theme",
      nonce: "abc123",
    });
  });

  it("passes the CSP nonce through so the pre-paint script is allowed to run", () => {
    render(
      <ThemeProvider nonce="per-request-nonce">
        <span>child</span>
      </ThemeProvider>,
    );

    expect(captured.props?.nonce).toBe("per-request-nonce");
  });
});

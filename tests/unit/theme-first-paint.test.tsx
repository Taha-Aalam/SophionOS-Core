// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ThemeProvider } from "@/components/providers/theme-provider";

const STORAGE_KEY = "sophionos-theme";

/** jsdom ships no matchMedia; next-themes calls it on mount. */
function stubMatchMedia(prefersDark: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: prefersDark && query.includes("dark"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as never;
}

/**
 * next-themes applies the theme from an inline script that is serialized into
 * the document before first paint. jsdom does not execute scripts injected via
 * innerHTML, so run the emitted payload by hand — that payload *is* the first
 * paint, and this is the only way to assert on it without a real browser.
 */
function runFirstPaintScript() {
  const script = document.querySelector("script");
  expect(script).not.toBeNull();
  new Function(script!.innerHTML)();
  return script!;
}

describe("ThemeProvider — first paint", () => {
  beforeEach(() => {
    stubMatchMedia(false);
    window.localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    window.localStorage.clear();
    document.documentElement.className = "";
  });

  it("paints dark when no preference has been stored", () => {
    render(
      <ThemeProvider>
        <span>child</span>
      </ThemeProvider>,
    );

    runFirstPaintScript();

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("does not fall back to the OS preference", () => {
    // Pretend the OS asks for light. With enableSystem={false} it must not win.
    stubMatchMedia(false);

    render(
      <ThemeProvider>
        <span>child</span>
      </ThemeProvider>,
    );

    runFirstPaintScript();

    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("keeps a stored explicit choice — light stays light", () => {
    window.localStorage.setItem(STORAGE_KEY, "light");

    render(
      <ThemeProvider>
        <span>child</span>
      </ThemeProvider>,
    );

    runFirstPaintScript();

    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

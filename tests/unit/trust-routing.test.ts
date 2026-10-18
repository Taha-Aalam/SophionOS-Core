import { readFileSync } from "node:fs";
import { join } from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { breadcrumbLabels, trustNavItems } from "@/components/layout/navigation";
import { TrustPage } from "@/components/trust/trust-page";
import { isActiveNavigationPath } from "@/lib/auth/auth-routing";

export const TRUST_HREFS = [
  "/terms",
  "/privacy",
  "/security",
  "/subprocessors",
  "/data-and-ai",
  "/responsible-disclosure",
] as const;

export const SRC = new URL("../../src", import.meta.url).pathname;

describe("trust navigation", () => {
  it("lists exactly the six policy routes in reading order", () => {
    expect(trustNavItems.map((item) => item.href)).toEqual([...TRUST_HREFS]);
  });

  it("has a unique href and a visible label for every item", () => {
    const hrefs = trustNavItems.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const item of trustNavItems) {
      expect(item.label.trim().length).toBeGreaterThan(0);
      expect(typeof item.icon).toBe("object");
    }
  });

  it("uses the full Responsible Disclosure label", () => {
    const disclosure = trustNavItems.find(
      (item) => item.href === "/responsible-disclosure",
    );
    expect(disclosure?.label).toBe("Responsible Disclosure");
  });

  it("gives every policy segment a readable breadcrumb label", () => {
    for (const href of TRUST_HREFS) {
      const segment = href.slice(1);
      expect(breadcrumbLabels[segment], segment).toBeTruthy();
      expect(breadcrumbLabels[segment], segment).not.toBe(segment);
    }
    expect(breadcrumbLabels["responsible-disclosure"]).toBe("Responsible Disclosure");
    expect(breadcrumbLabels["data-and-ai"]).toBe("Data & AI");
  });

  it("highlights only the current policy page in the sidebar", () => {
    for (const current of TRUST_HREFS) {
      const active = TRUST_HREFS.filter((href) =>
        isActiveNavigationPath(current, href),
      );
      expect(active, current).toEqual([current]);
    }
  });
});

// This file is .ts (vitest's esbuild config here does not load JSX from it),
// so build the element with createElement.
const renderTrust = (title: string, description: string) =>
  renderToStaticMarkup(
    createElement(
      TrustPage,
      { emoji: "🔒", title, description },
      createElement("p", null, "Body"),
    ),
  );

describe("TrustPage heading block", () => {
  it("copies the app h1 class string exactly (font-heading included)", () => {
    const html = renderTrust("Privacy", "d");
    expect(html).toContain('class="text-2xl font-bold tracking-tight font-heading"');
    expect(html).toContain(">Privacy</h1>");
  });

  it("copies the app description rhythm exactly", () => {
    const html = renderTrust("Privacy", "How we handle it.");
    expect(html).toContain('class="text-muted-foreground text-sm mt-1"');
    expect(html).toContain("How we handle it.");
  });

  it("uses one measured column, not a wide frame with a narrow body", () => {
    const html = renderTrust("Privacy", "d");
    expect(html).toContain("max-w-3xl");
    expect(html).not.toContain("max-w-7xl"); // review D1: dead right gutter
    expect(html).toContain("content-fade-in reveal-stagger");
    expect(html).toContain("legal-doc");
  });

  it("marks the decorative emoji aria-hidden", () => {
    expect(renderTrust("Privacy", "d")).toContain('aria-hidden="true"');
  });
});

describe("legal-doc stylesheet", () => {
  const css = () => readFileSync(join(SRC, "app", "globals.css"), "utf8");

  it("contains a table containment rule (review D4)", () => {
    expect(css()).toMatch(/\.legal-doc table\s*\{[^}]*display:\s*block/);
    expect(css()).toMatch(/\.legal-doc table\s*\{[^}]*overflow-x:\s*auto/);
  });

  it("gives inline code a tight leading and the mono token (review N1)", () => {
    expect(css()).toMatch(/\.legal-doc code\s*\{[^}]*line-height:\s*1\.4/);
    expect(css()).toMatch(/\.legal-doc code\s*\{[^}]*font-family:\s*var\(--font-mono\)/);
  });

  it("did not add Tailwind Typography as a dependency", () => {
    const pkg = readFileSync(join(SRC, "..", "package.json"), "utf8");
    expect(pkg).not.toContain("@tailwindcss/typography");
  });
});

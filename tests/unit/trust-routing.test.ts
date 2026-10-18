import { existsSync, readFileSync, readdirSync } from "node:fs";
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

function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return filesUnder(full);
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
  });
}

describe("trust route group", () => {
  it("keeps every policy page under the (trust) group", () => {
    for (const href of TRUST_HREFS) {
      const segment = href.slice(1);
      expect(existsSync(join(SRC, "app", "(trust)", segment, "page.tsx")), segment).toBe(true);
      expect(existsSync(join(SRC, "app", segment)), `${segment} must not stay at app root`).toBe(false);
    }
  });

  it("no longer ships the legacy trust page shell", () => {
    expect(existsSync(join(SRC, "components", "trust", "trust-page-shell.tsx"))).toBe(false);
    const offenders = filesUnder(SRC).filter((file) =>
      readFileSync(file, "utf8").includes("trust-page-shell"),
    );
    expect(offenders).toEqual([]);
  });

  it("wraps every policy page in TrustPage, never a page-level header", () => {
    for (const href of TRUST_HREFS) {
      const source = readFileSync(join(SRC, "app", "(trust)", href.slice(1), "page.tsx"), "utf8");
      expect(source, href).toContain("<TrustPage");
      expect(source, href).not.toContain("<header");
    }
  });

  it("stamps every policy page with a version and effective date", () => {
    for (const href of TRUST_HREFS) {
      const source = readFileSync(join(SRC, "app", "(trust)", href.slice(1), "page.tsx"), "utf8");
      expect(source, href).toContain("<PolicyMeta");
      expect(source, href).toMatch(/version="\d+\.\d+"/);
      expect(source, href).toMatch(/effective="[A-Z][a-z]+ \d+, \d{4}"/);
    }
  });

  it("never resurrects the retired Lifetime tier", () => {
    for (const href of TRUST_HREFS) {
      const source = readFileSync(join(SRC, "app", "(trust)", href.slice(1), "page.tsx"), "utf8");
      expect(source, href).not.toMatch(/<td>Lifetime<\/td>/);
      expect(source, href).not.toMatch(/\$150 one-time, first/);
    }
  });

  it("states the founding seat exactly as the marketing site sells it", () => {
    const source = readFileSync(join(SRC, "app", "(trust)", "terms", "page.tsx"), "utf8");
    expect(source).toContain("$150");
    expect(source).toContain("1 year of Pro");
    expect(source).toContain("2 years of Power");
    expect(source).toContain("14 days");
    for (const plan of ["Free", "Pro", "Power", "Business"]) {
      expect(source, plan).toContain(`<td>${plan}</td>`);
    }
  });
});

describe("privacy coverage beyond US and EU", () => {
  const privacy = () => readFileSync(join(SRC, "app", "(trust)", "privacy", "page.tsx"), "utf8");

  it("carries a GDPR notice for European users", () => {
    expect(privacy()).toContain("Notice to European users");
    expect(privacy()).toContain("Legal bases");
  });

  it("carries a U.S. state privacy notice", () => {
    expect(privacy()).toContain("Notice to U.S. state residents");
    expect(privacy()).toContain("CCPA");
  });

  it("carries an India DPDP notice with the statutory anchors", () => {
    const html = privacy();
    expect(html).toContain("Digital Personal Data Protection Act, 2023");
    expect(html).toContain("Data Protection Board of India");
    expect(html).toContain("Data Principal");
    expect(html).toContain("Data Fiduciary");
    // Rule 14(3): grievance response never later than 90 days.
    expect(html).toContain("90");
    // Rule 7(2)(b): detailed intimation to the Board within 72 hours.
    expect(html).toContain("72");
  });

  it("does not promise an erasure duty only large intermediaries carry", () => {
    // Rule 8 of the DPDP Rules applies to the Third Schedule classes, not to us.
    expect(privacy()).toContain("Third Schedule");
  });
});

describe("public access (blocker: never login-wall a legal document)", () => {
  const layout = () =>
    readFileSync(join(SRC, "app", "(trust)", "layout.tsx"), "utf8");

  it("never redirects to sign-in or anywhere else", () => {
    expect(layout()).not.toContain("redirectToSignIn");
    expect(layout()).not.toContain("redirect(");
  });

  it("keeps a signed-out branch whose logo links home", () => {
    expect(layout()).toContain("signedIn");
    expect(layout()).toContain('href="/"');
  });

  it("does not gate on onboarding completion", () => {
    expect(layout()).not.toContain("resolveDashboardDestination");
    expect(layout()).not.toContain("/onboarding");
  });
});

describe("shell height model (blocker D2: long documents must scroll)", () => {
  const layout = () =>
    readFileSync(join(SRC, "app", "(trust)", "layout.tsx"), "utf8");

  it("constrains the column around <main> so h-screen cannot clip it", () => {
    expect(layout()).toContain("min-h-0");
  });

  it("does not pin a fixed height on small viewports", () => {
    expect(layout()).toContain("min-h-screen");
    expect(layout()).toMatch(/lg:hidden/);
  });

  it("contains scroll chaining inside the desktop main pane", () => {
    expect(layout()).toContain("overscroll-contain");
  });
});

describe("trust nav wiring", () => {
  it("renders the Policies group in both the sidebar and the mobile drawer", () => {
    for (const file of [
      join(SRC, "components", "layout", "sidebar.tsx"),
      join(SRC, "components", "layout", "mobile-nav.tsx"),
    ]) {
      const source = readFileSync(file, "utf8");
      expect(source, file).toContain("trustNavItems");
      expect(source, file).toContain("Policies");
    }
  });

  it("keeps the Policies group above the sidebar footer block", () => {
    const source = readFileSync(join(SRC, "components", "layout", "sidebar.tsx"), "utf8");
    // Review N6: Settings/Theme/avatar stay anchored below a scrolling nav.
    expect(source.indexOf("trustNavItems")).toBeLessThan(
      source.indexOf("border-t border-sidebar-border"),
    );
  });
});

describe("policy reachability outside the app shell", () => {
  it("emails a footer link for every policy page", () => {
    const source = readFileSync(
      join(SRC, "lib", "notifications", "compose-brief.ts"),
      "utf8",
    );
    for (const href of TRUST_HREFS) {
      expect(source, href).toContain(`path: "${href}"`);
    }
  });

  it("tracks the marketing-site footer as a known limitation", () => {
    const doc = readFileSync(join(SRC, "..", "docs", "known-limitations.md"), "utf8");
    expect(doc).toContain("/responsible-disclosure");
  });
});

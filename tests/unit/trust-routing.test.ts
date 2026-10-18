import { describe, expect, it } from "vitest";

import { breadcrumbLabels, trustNavItems } from "@/components/layout/navigation";
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

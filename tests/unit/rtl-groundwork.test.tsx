// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";

import { I18nProvider, useI18n } from "@/components/providers/i18n-provider";
import { isRtl, LOCALES } from "@/lib/i18n/config";

vi.mock("@/components/providers/auth-provider", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));
vi.mock("@/lib/i18n/loaders", () => ({
  loadLocaleDictionary: async () => ({}),
}));

function LocaleSwitch() {
  const { locale, setLocale } = useI18n();
  return (
    <button onClick={() => void setLocale(locale === "ar" ? "en" : "ar", false)}>
      switch
    </button>
  );
}

describe("RTL groundwork", () => {
  it("marks only ar, ur, fa and he as right-to-left", () => {
    expect(LOCALES.filter((l) => isRtl(l.code)).map((l) => l.code)).toEqual([
      "ar", "ur", "fa", "he",
    ]);
  });

  it("flips the root direction and language live, in both directions", async () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <I18nProvider initialLocale="en" hasStoredLocale>
          <LocaleSwitch />
        </I18nProvider>
      </QueryClientProvider>,
    );
    const root = document.documentElement;
    await waitFor(() => expect(root.dir).toBe("ltr"));
    expect(root.lang).toBe("en");

    await userEvent.click(screen.getByRole("button", { name: "switch" }));
    await waitFor(() => expect(root.dir).toBe("rtl"));
    expect(root.lang).toBe("ar");

    await userEvent.click(screen.getByRole("button", { name: "switch" }));
    await waitFor(() => expect(root.dir).toBe("ltr"));
    expect(root.lang).toBe("en");
  });

  it("flips only directional icons in the shared icon layer", () => {
    const css = readFileSync(
      join(process.cwd(), "src/components/icons/rtl.css"),
      "utf8",
    );
    for (const icon of ["chevron-left", "chevron-right", "arrow-left", "arrow-right", "send"]) {
      expect(css, icon).toContain(`lucide-${icon}`);
    }
    for (const nonDirectional of ["search", "clock", "chart", "logo"]) {
      expect(css, nonDirectional).not.toContain(`lucide-${nonDirectional}`);
    }
  });
});

// The shell and shared UI start with 62 physical declarations; each one is
// either converted to a logical utility or listed here as intentionally
// direction-independent (centred dialogs, symmetric overlaps, physical sheet
// sides, transform pairs already guarded with `rtl:`). New physical styling
// fails the guard until it is converted or explicitly added to this list.
const EXAMINED = new Set([
  "data-[side=left]:left-0", "data-[side=left]:border-r",
  "data-[side=left]:data-ending-style:translate-x-[-2.5rem]",
  "data-[side=left]:data-starting-style:translate-x-[-2.5rem]",
  "data-[side=right]:right-0", "data-[side=right]:border-l",
  "data-[side=right]:data-ending-style:translate-x-[2.5rem]",
  "data-[side=right]:data-starting-style:translate-x-[2.5rem]",
  "translate-x-1/2", "rtl:-translate-x-1/2", "-translate-x-1", "rtl:translate-x-1",
  "group-hover/sidebar:translate-x-0", "focus:translate-x-0", "focus-visible:translate-x-0",
  "data-[side=inline-end]:-left-1", "data-[side=inline-start]:-right-1",
  "data-[side=left]:-right-1", "data-[side=right]:-left-1",
  "translate-x-full", "rtl:-translate-x-full",
  "left-1/2", "-translate-x-1/2", "-space-x-2", "after:-inset-x-3",
]);

const PHYSICAL = /^(?:-?(?:m[lr]|p[lr]|left|right|inset-x|text-left|text-right|border-l|border-r|rounded-l|rounded-r|rounded-tl|rounded-tr|rounded-bl|rounded-br|translate-x|space-x|scroll-ml|scroll-mr)(?:-\S*)?|border-l|border-r|rounded-l|rounded-r|left|right|inset-x|divide-x)$/;

describe("shell physical-styling guard", () => {
  it("has no unexamined physical direction-sensitive declaration", () => {
    const root = join(process.cwd(), "src");
    const dirs = ["components/layout", "components/ui", "components/providers", "components/settings", "components/icons"];
    const files = [
      "app/layout.tsx", "app/(dashboard)/layout.tsx", "app/(trust)/layout.tsx", "app/(auth)/layout.tsx",
    ];
    function walk(dir: string, out: string[] = []): string[] {
      for (const entry of readdirSync(dir)) {
        const p = join(dir, entry);
        if (statSync(p).isDirectory()) walk(p, out);
        else if (/\.tsx?$/.test(p)) out.push(p);
      }
      return out;
    }
    const unexamined: string[] = [];
    for (const rel of [...dirs.flatMap((d) => walk(join(root, d))), ...files.map((f) => join(root, f))]) {
      const src = readFileSync(rel, "utf8");
      for (const m of src.matchAll(/className\s*=\s*(?:\{)?(["'`])([^"'`\n]*)\1/g)) {
        for (const raw of m[2].split(/\s+/)) {
          const base = raw.split(":").at(-1)!;
          if (PHYSICAL.test(base) && !EXAMINED.has(raw)) {
            unexamined.push(`${rel.slice(root.length + 1)} → ${raw}`);
          }
        }
      }
    }
    expect(unexamined).toEqual([]);
  });
});

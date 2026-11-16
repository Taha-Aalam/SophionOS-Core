import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import ProgressRing, { resolveProgressRingOffset } from "@/components/charts/progress-ring";
import { formatPickerLabel, toIsoString } from "@/components/ui/date-picker";
import {
  supportsScrollDrivenAnimations,
  supportsStartingStyle,
} from "@/lib/utils/native-features";

const src = (path: string) =>
  readFileSync(fileURLToPath(new URL(`../../${path}`, import.meta.url)), "utf8");

const globals = () => src("src/app/globals.css");

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("C5 — sibling-index stagger (dynamic-sibling-animations)", () => {
  it("keeps today's delays as the live fallback path", () => {
    const css = globals();
    expect(css).toContain("@supports not (animation-delay: calc(sibling-index() * 1ms))");
    for (const delay of [
      "40ms", "80ms", "120ms", "160ms", "200ms", "0ms", "50ms", "100ms",
      "150ms", "240ms", "60ms", "180ms", "300ms", "360ms", "420ms",
    ]) {
      expect(css).toContain(`animation-delay: ${delay};`);
    }
    expect(css).toContain(".momentum-ring-segment:nth-of-type(4)");
    expect(css).toContain(".reveal-stagger > *:nth-child(n + 8)");
  });

  it("takes the native path only behind @supports, with parity-preserving caps", () => {
    const css = globals();
    expect(css).toContain("@supports (animation-delay: calc(sibling-index() * 1ms))");
    expect(css).toContain("calc((sibling-index() - 1) * 40ms)");
    expect(css).toContain("min(calc((sibling-index() - 1) * 50ms), 240ms)");
    expect(css).toContain("min(calc((sibling-index() - 1) * 60ms), 420ms)");

    // sibling-index() is 1-based; the -1 form reproduces each enumerated delay.
    const cockpitFallback = [0, 50, 100, 150, 200, 240, 240, 240];
    const revealFallback = [0, 60, 120, 180, 240, 300, 360, 420, 420];
    for (let i = 1; i <= 8; i += 1) {
      expect(Math.min((i - 1) * 50, 240)).toBe(cockpitFallback[i - 1]);
    }
    for (let i = 1; i <= 9; i += 1) {
      expect(Math.min((i - 1) * 60, 420)).toBe(revealFallback[i - 1]);
    }
  });
});

describe("C6 — sidebar scroll cues (scrollytelling)", () => {
  it("gates the native path on both scroll-timeline capabilities", () => {
    const nativeProps = [
      "animation-timeline: scroll()",
      "animation-range: 0% 100%",
      "scroll-timeline-name: --sidebar-nav-scroll",
      "timeline-scope: --sidebar-nav-scroll",
    ];
    const supports = vi.fn((value: string) => nativeProps.includes(value));
    vi.stubGlobal("window", { CSS: { supports } });
    expect(supportsScrollDrivenAnimations()).toBe(true);

    vi.stubGlobal("window", {
      CSS: {
        supports: (value: string) => value === "animation-timeline: scroll()",
      },
    });
    expect(supportsScrollDrivenAnimations()).toBe(false); // partial support => fallback

    vi.stubGlobal("window", {});
    expect(supportsScrollDrivenAnimations()).toBe(false);
  });

  it("renders both cue paths in the sidebar with the JS chevrons intact", () => {
    const sidebar = src("src/components/layout/sidebar.tsx");
    // Fallback: today's measured fades still present.
    expect(sidebar).toContain("!nativeScrollCues && navScroll.canScrollDown");
    expect(sidebar).toContain("!nativeScrollCues && navScroll.canScrollUp");
    // Native: scroll-driven fades behind the feature gate.
    expect(sidebar).toContain("nativeScrollCues ? (");
    expect(sidebar).toContain("sidebar-scroll-cue--top");
    expect(sidebar).toContain("sidebar-scroll-cue--bottom");
    // Parity: chevrons keep the canScrollUp && !canScrollDown rule in both paths.
    expect(sidebar).toContain("!navScroll.canScrollDown && navScroll.canScrollUp");

    const css = globals();
    expect(css).toContain("@supports ((animation-timeline: scroll()) and (animation-range: 0% 100%) and (scroll-timeline-name: --sidebar-nav-scroll) and (timeline-scope: --sidebar-nav-scroll))");
    expect(css).toContain("scroll-timeline: --sidebar-nav-scroll block");
    expect(css).toContain("animation-range: 0% 10%");
    expect(css).toContain("animation-range: 90% 100%");
  });
});

describe("C7 — progress ring entry (@starting-style)", () => {
  it("resolves the fallback to today's circumference -> target transition", () => {
    const circumference = 2 * Math.PI * 28;
    const target = circumference * 0.75;
    expect(resolveProgressRingOffset(false, false, target, circumference)).toBe(circumference);
    expect(resolveProgressRingOffset(false, true, target, circumference)).toBe(target);
  });

  it("hands the initial offset to CSS in the native path", () => {
    expect(resolveProgressRingOffset(true, false, 10, 100)).toBeUndefined();
    expect(resolveProgressRingOffset(true, true, 10, 100)).toBeUndefined();

    const html = renderToStaticMarkup(<ProgressRingHarness />);
    expect(html).toContain("progress-ring__progress");
    expect(html).toContain("--ring-start-offset");
    expect(html).toContain("--ring-target-offset");

    // SSR is the fallback path: the initial offset MUST be inline, otherwise
    // the unconditional CSS rule would paint the final offset (parity bug).
    const circumference = 2 * Math.PI * 28;
    const inline = html.match(/stroke-dashoffset:([0-9.]+)/);
    expect(inline).not.toBeNull();
    expect(Number(inline?.[1])).toBeCloseTo(circumference, 6);
  });

  it("feature-detects the at-rule without relying on CSS.supports at-rule syntax", () => {
    expect(supportsStartingStyle()).toBe(false); // node: no document
    const css = globals();
    expect(css).toContain("@starting-style");
    expect(css).toContain("stroke-dashoffset: var(--ring-start-offset)");
    expect(src("src/lib/utils/native-features.ts")).toContain(
      '"@starting-style { .__starting-style-probe { opacity: 0; } }"',
    );
  });
});

// Small harness keeps the SSR assertion independent of the component's default props.
function ProgressRingHarness() {
  return <ProgressRing percentage={75} />;
}

describe("C9 — convertible disclosure/button sites", () => {
  it("converts the two non-heading triggers to native buttons", () => {
    const calendar = src("src/components/views/calendar-view.tsx");
    const contact = src("src/components/entities/contact-dialog.tsx");
    const dayTask = calendar.slice(
      calendar.indexOf("dayTasks.map"),
      calendar.indexOf("{task.name}"),
    );
    expect(dayTask).toContain("<button");
    expect(dayTask).toContain('type="button"');
    expect(dayTask).not.toContain('role="button"');
    expect(dayTask).not.toContain("onKeyDown");

    const upload = contact.slice(
      contact.indexOf("type=\"file\""),
      contact.indexOf("{displayImage && !isUploading"),
    );
    expect(upload).toContain("<button");
    expect(upload).toContain('type="button"');
    expect(upload).not.toContain('role="button"');
    expect(upload).not.toContain("onKeyDown");
    // Drag-and-drop contract preserved.
    expect(upload).toContain("onDragOver");
    expect(upload).toContain("onDrop={handleDrop}");
  });

  it("leaves all eight heading-bearing group headers untouched", () => {
    const files = [
      "tasks-by-group-view", "notes-by-group-view", "resources-by-group-view",
      "areas-by-type-view", "projects-by-area-view", "projects-by-goal-view",
      "contacts-by-category-view", "contacts-follow-up-view",
    ];
    for (const file of files) {
      expect(src(`src/components/views/${file}.tsx`)).toContain('role="button"');
    }
  });
});

describe("C10 — date-fns formatting to Intl", () => {
  it("preserves both formatted outputs", () => {
    const date = new Date(2026, 10, 16, 12);
    expect(toIsoString(date)).toBe("2026-11-16");
    expect(formatPickerLabel(date)).toBe("Nov 16, 2026");
    expect(src("src/components/ui/date-picker.tsx")).not.toContain("format, isValid");
  });
});

describe("C11 — native validation enhancement on simple surfaces", () => {
  it("preserves the inline editor's empty-draft behaviour while adding validity UI", () => {
    const editor = src("src/components/entities/task-inline-editor.tsx");
    expect(editor).toContain("noValidate");
    expect(editor).toContain("required");
    expect(editor).toContain("native-validate");
    expect(editor).toContain("aria-invalid=");
    expect(editor).toContain("onBlur={commit}");

    const prefs = src("src/app/(dashboard)/settings/preferences/page.tsx");
    expect(prefs).toContain('name="language"');
    expect(prefs).toContain('name="timezone"');
    expect(prefs.match(/required/g)?.length).toBeGreaterThanOrEqual(2);
    // Base UI SelectTrigger is a <button>, so :user-invalid cannot match it;
    // validity styling is only asserted on the inline editor's real <input>.
    expect(prefs).not.toContain("native-validate");
    expect(globals()).toContain(".native-validate:is(:user-invalid, .user-invalid-fallback)");
  });
});

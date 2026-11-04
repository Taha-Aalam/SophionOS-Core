// @vitest-environment jsdom

/**
 * Detail-route loading-boundary contract.
 *
 * Background: `loading.tsx` in a segment wraps that segment's `page.tsx` *and*
 * every nested segment. A `loading.tsx` sitting directly on `areas/` therefore
 * also wraps `areas/[id]`. When the `areas` subtree mounts fresh — i.e. any
 * entry into a detail route that does not start from the list page, such as a
 * dashboard card, the command palette, a cross-entity link, or a hard load —
 * React commits the outer (list) fallback first and only then the inner
 * (detail) fallback, producing `list skeleton → detail skeleton → content`.
 *
 * The fix moves each list page and its `loading.tsx` into a `(list)` route
 * group, so the list fallback only ever wraps the list page and the detail
 * segment is the outermost boundary on a detail navigation.
 *
 * These tests pin the three things that can regress:
 *   1. route-tree shape  — no list loading boundary above a detail segment;
 *   2. fallback identity — a detail route's fallback is the shared detail
 *      skeleton, never the list skeleton;
 *   3. mounted-branch identity — the `isLoading` branch of the detail content
 *      renders that same shared skeleton, so fallback → loading → content is
 *      one continuous placeholder.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { cleanup, render } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";

import * as detailSkeletons from "@/components/entities/detail-skeletons";

import AreasListLoading from "@/app/(dashboard)/areas/(list)/loading";
import AreaDetailLoading from "@/app/(dashboard)/areas/[id]/loading";
import ContactsListLoading from "@/app/(dashboard)/contacts/(list)/loading";
import ContactDetailLoading from "@/app/(dashboard)/contacts/[id]/loading";
import GoalsListLoading from "@/app/(dashboard)/goals/(list)/loading";
import GoalDetailLoading from "@/app/(dashboard)/goals/[id]/loading";
import NotesListLoading from "@/app/(dashboard)/notes/(list)/loading";
import NoteDetailLoading from "@/app/(dashboard)/notes/[id]/loading";
import ProjectsListLoading from "@/app/(dashboard)/projects/(list)/loading";
import ProjectDetailLoading from "@/app/(dashboard)/projects/[id]/loading";
import TopicsListLoading from "@/app/(dashboard)/topics/(list)/loading";
import TopicDetailLoading from "@/app/(dashboard)/topics/[id]/loading";

const APP = path.join(process.cwd(), "src", "app", "(dashboard)");

type EntityCase = {
  /** URL segment, e.g. "areas". */
  segment: string;
  /** Exported shared skeleton component name. */
  skeleton: keyof typeof detailSkeletons;
  /** aria-label carried by that skeleton. */
  ariaLabel: string;
  ListLoading: React.ComponentType;
  DetailLoading: React.ComponentType;
};

const ENTITIES: EntityCase[] = [
  {
    segment: "areas",
    skeleton: "AreaDetailSkeleton",
    ariaLabel: "Loading area details",
    ListLoading: AreasListLoading,
    DetailLoading: AreaDetailLoading,
  },
  {
    segment: "goals",
    skeleton: "GoalDetailSkeleton",
    ariaLabel: "Loading goal details",
    ListLoading: GoalsListLoading,
    DetailLoading: GoalDetailLoading,
  },
  {
    segment: "projects",
    skeleton: "ProjectDetailSkeleton",
    ariaLabel: "Loading project details",
    ListLoading: ProjectsListLoading,
    DetailLoading: ProjectDetailLoading,
  },
  {
    segment: "notes",
    skeleton: "NoteDetailSkeleton",
    ariaLabel: "Loading note",
    ListLoading: NotesListLoading,
    DetailLoading: NoteDetailLoading,
  },
  {
    segment: "topics",
    skeleton: "TopicDetailSkeleton",
    ariaLabel: "Loading topic details",
    ListLoading: TopicsListLoading,
    DetailLoading: TopicDetailLoading,
  },
  {
    segment: "contacts",
    skeleton: "ContactDetailSkeleton",
    ariaLabel: "Loading contact details",
    ListLoading: ContactsListLoading,
    DetailLoading: ContactDetailLoading,
  },
];

function markupOf(Component: React.ComponentType): string {
  const { container } = render(React.createElement(Component));
  return container.innerHTML;
}

afterEach(() => {
  cleanup();
});

describe("detail loading boundary: route-tree shape", () => {
  it.each(ENTITIES)(
    "$segment has no loading.tsx at the segment root (it would wrap [id])",
    ({ segment }) => {
      expect(existsSync(path.join(APP, segment, "loading.tsx"))).toBe(false);
      expect(existsSync(path.join(APP, segment, "page.tsx"))).toBe(false);
    },
  );

  it.each(ENTITIES)("$segment keeps the list boundary inside (list)", ({ segment }) => {
    expect(existsSync(path.join(APP, segment, "(list)", "loading.tsx"))).toBe(true);
    expect(existsSync(path.join(APP, segment, "(list)", "page.tsx"))).toBe(true);
  });

  it.each(ENTITIES)("$segment keeps a detail boundary on [id]", ({ segment }) => {
    expect(existsSync(path.join(APP, segment, "[id]", "loading.tsx"))).toBe(true);
    expect(existsSync(path.join(APP, segment, "[id]", "page.tsx"))).toBe(true);
  });
});

describe("detail loading boundary: fallback renders the detail skeleton", () => {
  it.each(ENTITIES)(
    "$segment detail fallback is the shared $skeleton",
    ({ skeleton, DetailLoading }) => {
      const Shared = detailSkeletons[skeleton] as React.ComponentType;
      expect(markupOf(DetailLoading)).toBe(markupOf(Shared));
    },
  );

  it.each(ENTITIES)(
    "$segment detail fallback carries its own aria-label",
    ({ ariaLabel, DetailLoading }) => {
      const { container } = render(React.createElement(DetailLoading));
      expect(container.querySelector(`[aria-label="${ariaLabel}"]`)).not.toBeNull();
    },
  );

  it.each(ENTITIES)(
    "$segment detail fallback is NOT the list skeleton",
    ({ ListLoading, DetailLoading }) => {
      const listMarkup = markupOf(ListLoading);
      const detailMarkup = markupOf(DetailLoading);
      expect(detailMarkup).not.toBe(listMarkup);
      // List fallbacks are anonymous placeholders; detail fallbacks announce
      // themselves with role="status" plus a page-specific label, so a list
      // fallback leaking into a detail route is detectable by the missing
      // status role and the wrong shape.
      expect(detailMarkup).toContain('role="status"');
      expect(listMarkup).not.toContain('role="status"');
    },
  );
});

describe("detail loading boundary: mounted branch uses the same skeleton", () => {
  it.each(ENTITIES)(
    "$segment detail content renders $skeleton while loading",
    ({ segment, skeleton }) => {
      const source = readFileSync(
        path.join(APP, segment, "[id]", `${segment.replace(/s$/, "")}-detail-content.tsx`),
        "utf8",
      );
      expect(source).toContain(`import { ${skeleton} } from "@/components/entities/detail-skeletons"`);
      expect(source).toMatch(new RegExp(`return <${skeleton} />;`));
    },
  );
});

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
 *   2. fallback identity — a detail route's fallback *delegates* to the shared
 *      detail skeleton (no inline copy) and renders exactly its output;
 *   3. mounted-branch identity — the `isLoading` branch of the detail content
 *      returns that same shared skeleton, so fallback → loading → content is
 *      one continuous placeholder.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { cleanup, render } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";

import * as detailSkeletons from "@/components/entities/detail-skeletons";
import { NewNoteSkeleton } from "@/components/entities/new-note-skeleton";

import AreasListLoading from "@/app/(dashboard)/areas/(list)/loading";
import AreaDetailLoading from "@/app/(dashboard)/areas/[id]/loading";
import ContactsListLoading from "@/app/(dashboard)/contacts/(list)/loading";
import ContactDetailLoading from "@/app/(dashboard)/contacts/[id]/loading";
import GoalsListLoading from "@/app/(dashboard)/goals/(list)/loading";
import GoalDetailLoading from "@/app/(dashboard)/goals/[id]/loading";
import NotesListLoading from "@/app/(dashboard)/notes/(list)/loading";
import NoteDetailLoading from "@/app/(dashboard)/notes/[id]/loading";
import NewNoteLoading from "@/app/(dashboard)/notes/new/loading";
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
  /** `*-detail-content.tsx` file stem. */
  contentFile: string;
  ListLoading: React.ComponentType;
  DetailLoading: React.ComponentType;
};

const ENTITIES: EntityCase[] = [
  {
    segment: "areas",
    skeleton: "AreaDetailSkeleton",
    ariaLabel: "Loading area details",
    contentFile: "area-detail-content.tsx",
    ListLoading: AreasListLoading,
    DetailLoading: AreaDetailLoading,
  },
  {
    segment: "goals",
    skeleton: "GoalDetailSkeleton",
    ariaLabel: "Loading goal details",
    contentFile: "goal-detail-content.tsx",
    ListLoading: GoalsListLoading,
    DetailLoading: GoalDetailLoading,
  },
  {
    segment: "projects",
    skeleton: "ProjectDetailSkeleton",
    ariaLabel: "Loading project details",
    contentFile: "project-detail-content.tsx",
    ListLoading: ProjectsListLoading,
    DetailLoading: ProjectDetailLoading,
  },
  {
    segment: "notes",
    skeleton: "NoteDetailSkeleton",
    ariaLabel: "Loading note",
    contentFile: "note-detail-content.tsx",
    ListLoading: NotesListLoading,
    DetailLoading: NoteDetailLoading,
  },
  {
    segment: "topics",
    skeleton: "TopicDetailSkeleton",
    ariaLabel: "Loading topic details",
    contentFile: "topic-detail-content.tsx",
    ListLoading: TopicsListLoading,
    DetailLoading: TopicDetailLoading,
  },
  {
    segment: "contacts",
    skeleton: "ContactDetailSkeleton",
    ariaLabel: "Loading contact details",
    contentFile: "contact-detail-content.tsx",
    ListLoading: ContactsListLoading,
    DetailLoading: ContactDetailLoading,
  },
];

function read(...parts: string[]): string {
  return readFileSync(path.join(APP, ...parts), "utf8");
}

function markupOf(Component: React.ComponentType): string {
  const { container } = render(React.createElement(Component));
  return container.innerHTML;
}

afterEach(() => {
  cleanup();
});

describe("route-tree shape", () => {
  it.each(ENTITIES)(
    "$segment has no loading.tsx at the segment root (it would wrap [id])",
    ({ segment }) => {
      // This is the regression guard: a `loading.tsx` or `page.tsx` directly
      // under the entity segment re-creates the list boundary above `[id]`,
      // and with it the list-skeleton flash on every detail entry.
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

describe("detail fallback delegates to the shared skeleton", () => {
  it.each(ENTITIES)(
    "$segment loading.tsx imports $skeleton instead of inlining skeleton markup",
    ({ segment, skeleton }) => {
      const source = read(segment, "[id]", "loading.tsx");
      expect(source).toContain(`import { ${skeleton} } from "@/components/entities/detail-skeletons"`);
      // Inline `<Skeleton />` markup would mean a second copy that can drift
      // from the component the mounted loading state renders.
      expect(source).not.toContain("<Skeleton");
    },
  );

  it.each(ENTITIES)(
    "$segment fallback renders exactly the shared $skeleton output",
    ({ skeleton, DetailLoading }) => {
      const Shared = detailSkeletons[skeleton] as React.ComponentType;
      expect(markupOf(DetailLoading)).toBe(markupOf(Shared));
    },
  );

  it.each(ENTITIES)(
    "$segment fallback carries its own aria-label and is not the list fallback",
    ({ ariaLabel, ListLoading, DetailLoading }) => {
      const detail = render(React.createElement(DetailLoading));
      expect(detail.container.querySelector(`[aria-label="${ariaLabel}"]`)).not.toBeNull();
      cleanup();
      const detailMarkup = markupOf(DetailLoading);
      const listMarkup = markupOf(ListLoading);
      expect(detailMarkup).not.toBe(listMarkup);
    },
  );
});

describe("mounted loading branch uses the same skeleton", () => {
  it.each(ENTITIES)(
    "$segment detail content returns $skeleton from its loading guard",
    ({ segment, skeleton, contentFile }) => {
      const source = read(segment, "[id]", contentFile);
      expect(source).toContain(
        `import { ${skeleton} } from "@/components/entities/detail-skeletons"`,
      );
      // Matches `if (isLoading) { return <XDetailSkeleton />; }` across the
      // guards actually used: isLoading, isLoadingProject, topicLoading, …
      const guard = new RegExp(
        `if\\s*\\(\\s*\\w*[Ll]oading\\w*\\s*\\)\\s*\\{\\s*return <${skeleton} />;`,
      );
      expect(source).toMatch(guard);
    },
  );
});

describe("new-note composer has its own boundary", () => {
  it("notes/new owns a loading.tsx that is not the notes list skeleton", () => {
    expect(existsSync(path.join(APP, "notes", "new", "loading.tsx"))).toBe(true);
    expect(markupOf(NewNoteLoading)).toBe(markupOf(NewNoteSkeleton));
    expect(markupOf(NewNoteLoading)).not.toBe(markupOf(NotesListLoading));
  });

  it("notes/new page returns NewNoteSkeleton from its loading guard", () => {
    const source = read("notes", "new", "page.tsx");
    expect(source).toContain(
      'import { NewNoteSkeleton } from "@/components/entities/new-note-skeleton"',
    );
    expect(source).toMatch(/if\s*\(\s*isLoading\s*\)\s*\{\s*return <NewNoteSkeleton \/>;/);
  });
});

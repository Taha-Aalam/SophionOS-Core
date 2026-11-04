import { Skeleton } from "@/components/ui/skeleton";
import { sectionGap } from "@/components/ui/layout";
import { cn } from "@/lib/utils";

/**
 * Shared loading skeletons for entity detail pages.
 *
 * Each detail page renders its skeleton in TWO places that must stay in sync:
 * the route-level `loading.tsx` and the inline `if (isLoading)` branch in
 * `*-detail-content.tsx`. Importing these components from a single source keeps
 * them identical and lets the skeleton mirror the multi-section final render
 * (each section is a `GoalDetailSection`: accent-bar heading + action buttons +
 * a TabsList + content rows) instead of collapsing into one block.
 */

const PAGE_WRAPPER =
  "reveal-stagger flex flex-col gap-6 p-6 content-column-grid mx-auto w-full";

function BreadcrumbSkeleton() {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="size-6 rounded" />
      <Skeleton className="h-4 w-12" />
      <Skeleton className="h-4 w-12" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}

function HeaderCardSkeleton({
  iconClassName,
  rollupCount,
}: {
  iconClassName: string;
  rollupCount: number;
}) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-start justify-between gap-4 p-6">
        <div className="flex items-start gap-4">
          <Skeleton className={`${iconClassName} shrink-0`} />
          <div className="space-y-3">
            <Skeleton className="h-8 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
      </div>
      {/* Rollup chips */}
      <div className="flex flex-wrap items-center gap-4 px-6 pb-4">
        {Array.from({ length: rollupCount }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/**
 * Mirrors a single `GoalDetailSection` in its loading state: accent-bar heading
 * with action buttons, a TabsList bar, and the `space-y-3` list of content rows.
 */
function SectionSkeleton({ variant = "list" }: { variant?: "list" | "cards" }) {
  if (variant === "cards") {
    return (
      <section className="scroll-mt-20">
        {/* Section header: accent bar + heading + Link/New buttons */}
        <div className="mb-4 flex items-center gap-3">
          <Skeleton className="h-5 w-1 rounded-full" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="ml-auto h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
        {/* TabsList */}
        <Skeleton className="h-9 w-full max-w-xl rounded-md" />
        {/* Card grid */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="scroll-mt-20">
      {/* Section header: accent bar + heading + Link/New buttons */}
      <div className="mb-4 flex items-center gap-3">
        <Skeleton className="h-5 w-1 rounded-full" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="ml-auto h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
      {/* TabsList */}
      <Skeleton className="h-9 w-full max-w-xl rounded-md" />
      {/* TabsContent rows */}
      <div className="mt-4 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </section>
  );
}

export function AreaDetailSkeleton() {
  return (
    <div className={PAGE_WRAPPER} aria-busy="true" role="status" aria-label="Loading area details">
      <BreadcrumbSkeleton />
      <HeaderCardSkeleton iconClassName="w-16 h-16 rounded-lg" rollupCount={5} />
      {/* Goals (cards), Projects (cards), Tasks (list), Notes (list), Resources (list), People (cards) */}
      <SectionSkeleton variant="cards" />
      <SectionSkeleton variant="cards" />
      <SectionSkeleton />
      <SectionSkeleton />
      <SectionSkeleton />
      <SectionSkeleton variant="cards" />
    </div>
  );
}

export function GoalDetailSkeleton() {
  return (
    <div className={PAGE_WRAPPER} aria-busy="true" role="status" aria-label="Loading goal details">
      <BreadcrumbSkeleton />
      <HeaderCardSkeleton
        iconClassName="w-20 h-20 rounded-full"
        rollupCount={4}
      />
      {/* Projects (cards), Tasks (list), Notes (list), Resources (list), People (cards) */}
      <SectionSkeleton variant="cards" />
      <SectionSkeleton />
      <SectionSkeleton />
      <SectionSkeleton />
      <SectionSkeleton variant="cards" />
    </div>
  );
}

export function ProjectDetailSkeleton() {
  return (
    <div className={PAGE_WRAPPER} aria-busy="true" role="status" aria-label="Loading project details">
      <BreadcrumbSkeleton />
      <HeaderCardSkeleton
        iconClassName="w-20 h-20 rounded-full"
        rollupCount={4}
      />
      {/* Goals, Tasks, Notes, Resources, People */}
      {Array.from({ length: 5 }).map((_, i) => (
        <SectionSkeleton key={i} />
      ))}
    </div>
  );
}

export function TopicDetailSkeleton() {
  return (
    <div className={PAGE_WRAPPER} aria-busy="true" role="status" aria-label="Loading topic details">
      <BreadcrumbSkeleton />
      <HeaderCardSkeleton iconClassName="w-14 h-14 rounded-lg" rollupCount={2} />
      {/* Notes, Resources */}
      {Array.from({ length: 2 }).map((_, i) => (
        <SectionSkeleton key={i} />
      ))}
    </div>
  );
}

export function ContactDetailSkeleton() {
  return (
    <div className={PAGE_WRAPPER} aria-busy="true" role="status" aria-label="Loading contact details">
      <BreadcrumbSkeleton />
      {/* Main card: avatar header + stats row + tabs strip */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-start gap-4 p-6">
          <Skeleton className="size-16 rounded-full shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Skeleton className="size-9 rounded-md" />
            <Skeleton className="size-9 rounded-md" />
            <Skeleton className="size-9 rounded-md" />
          </div>
        </div>
        {/* Stats row */}
        <div className="flex gap-3 border-t px-6 py-3">
          <Skeleton className="h-12 flex-1 rounded-md" />
          <Skeleton className="h-12 flex-1 rounded-md" />
        </div>
        {/* Tabs */}
        <div className="flex border-t">
          <Skeleton className="h-10 flex-1 rounded-none" />
          <Skeleton className="h-10 flex-1 rounded-none" />
        </div>
      </div>
      {/* Properties card */}
      <div className="rounded-xl border bg-card">
        <div className="px-6 py-4">
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="border-t px-6 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Relationships summary card */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
        <div className="border-t px-6 py-3">
          <div className="flex gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-4 w-20" />
            ))}
          </div>
        </div>
      </div>
      {/* Relationship sections: Areas, Goals, Projects, Tasks */}
      {Array.from({ length: 4 }).map((_, i) => (
        <SectionSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Note detail is the one detail surface that is a single-column editor rather
 * than a stack of relationship sections, so it gets its own shape: the header
 * bar (back button + breadcrumb + status badge + action icons) followed by the
 * title field and the editor body.
 *
 * Lives here, next to the other detail skeletons, because it is rendered from
 * two places that must stay identical: `notes/[id]/loading.tsx` (route
 * fallback) and the `isLoading` branch of `note-detail-content.tsx`.
 */
export function NoteDetailSkeleton() {
  return (
    <div
      className={cn(PAGE_WRAPPER, sectionGap)}
      aria-busy="true"
      role="status"
      aria-label="Loading note"
    >
      {/* Top bar: back button + breadcrumb on the left, status badge and
          actions right-aligned. Mirrors the real header, which wraps onto two
          rows when the breadcrumb is long. */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-2.5">
        <div className="flex min-w-0 max-w-full items-center gap-2">
          <Skeleton className="size-7 rounded" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="size-7 rounded" />
          <Skeleton className="size-7 rounded" />
          <Skeleton className="size-7 rounded" />
        </div>
      </div>

      {/* Editor: title field + the bordered editor surface (toolbar strip on
          top, writing area below), matching NoteEditor's chrome. */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-9 w-64" />
        <div className="flex min-h-[400px] w-full flex-1 flex-col overflow-hidden rounded-lg border border-border bg-background">
          <div className="flex items-center gap-1 border-b border-border px-2 py-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="size-6 rounded" />
            ))}
          </div>
          <Skeleton className="m-4 flex-1 rounded-md" />
        </div>
      </div>
    </div>
  );
}

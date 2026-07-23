import { Skeleton } from "@/components/ui/skeleton";
import { cardGrid } from "@/components/ui/layout";

/**
 * Single full-page skeleton that mirrors DashboardContent layout:
 * GreetingBar → analytics (KPI + panels) → Active Areas/Goals/Projects/Tasks/Notes/Resources.
 * Used by the route loading UI and the client isLoading state so users only ever
 * see one continuous skeleton that matches the real dashboard.
 */
function SectionHeaderSkeleton() {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="mt-1 h-8 w-1 shrink-0 rounded-full bg-muted-foreground/20" />
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-5 w-7 rounded-full" />
          </div>
          <Skeleton className="mt-1 h-4 w-56" />
        </div>
      </div>
    </div>
  );
}

/** Matches GalleryGrid: sm:2 / lg:3 / xl:4 (Active Areas). */
function AreaGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-48 rounded-xl" />
      ))}
    </div>
  );
}

/** Matches project card grid: md:2 / xl:3. */
function ProjectGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-48 rounded-xl" />
      ))}
    </div>
  );
}

function RowListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="rounded-xl border border-border/70">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 border-b border-border/40 px-4 py-2.5 last:border-0"
        >
          <Skeleton className="size-4 rounded" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="hidden h-4 w-24 md:block" />
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="size-8 rounded-md" />
        </div>
      ))}
    </div>
  );
}

/** Mirrors DashboardAnalyticsPanels structure (KPI, pairs, heatmap+health, risk). */
export function DashboardAnalyticsSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      {/* KpiStrip */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[5.5rem] rounded-xl" />
        ))}
      </div>

      {/* ExecutionLoad + GoalMomentum */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Skeleton className="h-56 rounded-xl" />
        <Skeleton className="h-56 rounded-xl" />
      </div>

      {/* ActivityHeatmap + WorkHealth (xl: 3/5 + 2/5, matched height) */}
      <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-5">
        <Skeleton className="h-48 w-full rounded-xl xl:col-span-3" />
        <Skeleton className="h-48 w-full rounded-xl xl:col-span-2" />
      </div>

      {/* KnowledgePipeline + ContextNetworkMini */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Skeleton className="h-52 rounded-xl" />
        <Skeleton className="h-52 rounded-xl" />
      </div>

      {/* RelationshipRiskPanel */}
      <Skeleton className="h-44 w-full rounded-xl" />
    </div>
  );
}

export function DashboardPageSkeleton() {
  return (
    <div
      className="reveal-stagger mx-auto flex w-full max-w-7xl flex-col gap-8 p-6"
      aria-busy="true"
      role="status"
      aria-label="Loading dashboard"
    >
      {/* GreetingBar — title + subtitle */}
      <div className="space-y-1.5">
        <Skeleton className="h-8 w-56 sm:w-72" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>

      {/* Analytics block */}
      <section className="min-w-0" aria-label="Dashboard analytics">
        <DashboardAnalyticsSkeleton />
      </section>

      <div className="h-px w-full bg-border/60" aria-hidden="true" />

      {/* Active Areas */}
      <section>
        <SectionHeaderSkeleton />
        <div className="mt-4">
          <AreaGridSkeleton />
        </div>
      </section>

      {/* Active Goals */}
      <section>
        <SectionHeaderSkeleton />
        <div className="mt-4">
          <div className={cardGrid}>
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        </div>
      </section>

      {/* Active Projects */}
      <section>
        <SectionHeaderSkeleton />
        <div className="mt-4">
          <ProjectGridSkeleton />
        </div>
      </section>

      {/* Active Tasks */}
      <section>
        <SectionHeaderSkeleton />
        <div className="mt-4">
          <RowListSkeleton />
        </div>
      </section>

      {/* Active Notes */}
      <section>
        <SectionHeaderSkeleton />
        <div className="mt-4">
          <RowListSkeleton />
        </div>
      </section>

      {/* Active Resources */}
      <section>
        <SectionHeaderSkeleton />
        <div className="mt-4">
          <RowListSkeleton />
        </div>
      </section>
    </div>
  );
}

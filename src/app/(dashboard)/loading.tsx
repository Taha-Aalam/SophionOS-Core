import { Skeleton } from "@/components/ui/skeleton";
import { cardGrid } from "@/components/ui/layout";

function SectionHeaderSkeleton() {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="mt-1.5 h-full min-h-[2.5rem] w-px shrink-0 rounded-full bg-muted-foreground/20" />
        <div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="mt-1 h-4 w-56" />
        </div>
      </div>
    </div>
  );
}

function CardGridSkeleton({ count = 3 }: { count?: number }) {
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
    <div className="rounded-lg border border-border">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-border/40 px-4 py-2.5 last:border-0">
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

export default function DashboardLoading() {
  return (
    <div className="reveal-stagger mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 sm:gap-8 sm:p-6">
      {/* GreetingBar skeleton */}
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      {/* Active Areas */}
      <section className="flex flex-col gap-4">
        <SectionHeaderSkeleton />
        <CardGridSkeleton count={3} />
      </section>

      {/* Active Goals */}
      <section className="flex flex-col gap-4">
        <SectionHeaderSkeleton />
        <div className={cardGrid}>
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </section>

      {/* Active Projects */}
      <section className="flex flex-col gap-4">
        <SectionHeaderSkeleton />
        <CardGridSkeleton count={3} />
      </section>

      {/* Active Tasks */}
      <section className="flex flex-col gap-4">
        <SectionHeaderSkeleton />
        <RowListSkeleton count={3} />
      </section>

      {/* Active Notes */}
      <section className="flex flex-col gap-4">
        <SectionHeaderSkeleton />
        <RowListSkeleton count={3} />
      </section>

      {/* Active Resources */}
      <section className="flex flex-col gap-4">
        <SectionHeaderSkeleton />
        <RowListSkeleton count={3} />
      </section>
    </div>
  );
}

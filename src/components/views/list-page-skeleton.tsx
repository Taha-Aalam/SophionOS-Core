import { Skeleton } from "@/components/ui/skeleton";

export function ResourceRowSkeleton() {
  return (
    <div className="flex items-center gap-3 border-b border-border/40 px-4 py-2.5">
      <Skeleton className="h-5 flex-1" />
      <Skeleton className="h-5 w-48 hidden md:inline-flex" />
      <Skeleton className="size-8" />
      <Skeleton className="size-8" />
      <Skeleton className="size-8" />
      <Skeleton className="size-8" />
    </div>
  );
}

/**
 * Shared fallback for tabbed list routes (tasks, notes, projects, …). Matches
 * the header + tab-strip + filter-row + rows layout so the streamed skeleton
 * lines up with real content and avoids a layout shift on hydration.
 */
export function ListPageSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6" aria-busy="true" role="status" aria-label="Loading">
      <div className="flex items-center justify-between border-b border-border/50 pb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <Skeleton className="h-10 w-28" />
      </div>

      <div className="flex h-auto w-full flex-nowrap gap-0 overflow-x-auto border-b border-transparent pb-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-none" />
        ))}
      </div>

      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";
import { contentColumnGrid, sectionGap } from "@/components/ui/layout";
import { cn } from "@/lib/utils";

export default function TopicsLoading() {
  return (
    <div className={cn("reveal-stagger flex flex-col", contentColumnGrid, sectionGap)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-md" />
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-10 w-28 rounded-md" />
      </div>

      {/* Underline tab strip — Active, Favorite, Inactive, By Area, All, Archived */}
      <div className="flex h-auto w-full flex-nowrap gap-0 overflow-x-auto border-b border-transparent pb-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-none" />
        ))}
      </div>

      {/* TopicCard grid */}
      <div className="mt-4 grid gap-[var(--grid-gap-sm)] sm:gap-[var(--grid-gap)] sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

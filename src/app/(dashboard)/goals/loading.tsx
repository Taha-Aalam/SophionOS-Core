import { Skeleton } from "@/components/ui/skeleton";
import { cardGrid, contentColumnGrid, sectionGap } from "@/components/ui/layout";
import { cn } from "@/lib/utils";

export default function GoalsLoading() {
  return (
    <div className={cn("reveal-stagger flex flex-col", contentColumnGrid, sectionGap)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-md" />
          <div className="space-y-1.5">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <Skeleton className="h-10 w-28 rounded-md" />
      </div>

      {/* Underline tab strip — Active, Short Term, Mid Term, Long Term, Inactive, Completed, Archive */}
      <div className="flex h-auto w-full flex-nowrap gap-0 overflow-x-auto border-b border-transparent pb-0">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-none" />
        ))}
      </div>

      {/* GoalCard grid */}
      <div className={cardGrid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

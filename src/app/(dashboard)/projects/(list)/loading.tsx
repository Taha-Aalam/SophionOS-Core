import { Skeleton } from "@/components/ui/skeleton";
import { contentColumnGrid, sectionGap } from "@/components/ui/layout";
import { cn } from "@/lib/utils";

export default function ProjectsLoading() {
  return (
    <div className={cn("reveal-stagger flex flex-col", contentColumnGrid, sectionGap)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-md" />
          <div className="space-y-1.5">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      {/* Underline tab strip — All, Inbox, Planning, In Progress, On Hold, Completed, By Status, By Area, By Goal, Archive */}
      <div className="flex h-auto w-full flex-nowrap gap-0 overflow-x-auto border-b border-transparent pb-0">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-none" />
        ))}
      </div>

      {/* ProjectCard grid */}
      <div className="mt-6 grid grid-cols-1 gap-[var(--grid-gap-sm)] sm:gap-[var(--grid-gap)] md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

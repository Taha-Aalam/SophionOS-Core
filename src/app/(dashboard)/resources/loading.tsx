import { Skeleton } from "@/components/ui/skeleton";

export default function ResourcesLoading() {
  return (
    <div className="reveal-stagger flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-border/50 py-5">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Tab strip — matches 11 tabs */}
      <div className="border-b border-border/50 px-6 pt-4">
        <div className="flex h-auto flex-nowrap gap-0 bg-transparent p-0">
          {Array.from({ length: 11 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-[4.5rem] rounded-none px-4 py-2" />
          ))}
        </div>
      </div>

      {/* Filter row */}
      <div className="flex items-center gap-3 border-b border-border/30 px-6 py-3">
        <Skeleton className="size-3.5 shrink-0" />
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-7 w-[120px] rounded-md" />
          <Skeleton className="h-7 w-16 rounded-md" />
          <Skeleton className="h-7 w-16 rounded-md" />
          <Skeleton className="h-7 w-16 rounded-md" />
          <Skeleton className="h-7 w-16 rounded-md" />
        </div>
      </div>

      {/* Row list — matches ResourceRow structure */}
      <div className="flex flex-col">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-border/40 px-4 py-2.5"
          >
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="hidden h-5 w-48 md:inline-flex" />
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
            <Skeleton className="size-8 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

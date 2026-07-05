import { Skeleton } from "@/components/ui/skeleton";

function SectionHeaderSkeleton() {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <Skeleton className="mt-1.5 h-10 w-1 shrink-0 rounded-full" />
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <Skeleton className="h-8 w-28 shrink-0 rounded-md" />
    </div>
  );
}

export default function KnowledgeHubLoading() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <Skeleton className="size-8 rounded-md" />
        <div>
          <Skeleton className="h-7 w-48" />
          <Skeleton className="mt-1 h-4 w-96" />
        </div>
      </div>

      {/* Search bar */}
      <Skeleton className="h-10 max-w-xl rounded-md" />

      <div className="space-y-12">
        {/* Topics section */}
        <section>
          <SectionHeaderSkeleton />
          {/* 6 tabs: Active, Favorite, Inactive, By Area, All, Archived */}
          <div className="mt-4 overflow-x-auto rounded-md bg-muted/50 p-1">
            <div className="flex gap-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-20 rounded-md" />
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        </section>

        {/* Notes section */}
        <section>
          <SectionHeaderSkeleton />
          {/* 13 tabs underline strip */}
          <div className="mt-4 overflow-x-auto border-b border-border/50">
            <div className="flex gap-0">
              {Array.from({ length: 13 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-16 rounded-none" />
              ))}
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-border/40 px-4 py-2.5 last:border-0"
              >
                <Skeleton className="size-4 rounded" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="hidden h-4 w-24 md:block" />
                <Skeleton className="size-8 rounded-md" />
                <Skeleton className="size-8 rounded-md" />
                <Skeleton className="size-8 rounded-md" />
              </div>
            ))}
          </div>
        </section>

        {/* Resources section */}
        <section>
          <SectionHeaderSkeleton />
          {/* 11 tabs underline strip */}
          <div className="mt-4 overflow-x-auto border-b border-border/50">
            <div className="flex gap-0">
              {Array.from({ length: 11 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-16 rounded-none" />
              ))}
            </div>
          </div>
          <div className="mt-4 rounded-lg border border-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-border/40 px-4 py-2.5 last:border-0"
              >
                <Skeleton className="h-5 flex-1" />
                <Skeleton className="hidden h-5 w-48 md:inline-flex" />
                <Skeleton className="size-8 rounded-md" />
                <Skeleton className="size-8 rounded-md" />
                <Skeleton className="size-8 rounded-md" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

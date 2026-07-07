import { Skeleton } from "@/components/ui/skeleton";

function SectionHeaderSkeleton() {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <Skeleton className="mt-1.5 h-10 w-px shrink-0 rounded-full" />
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

function UnderlineTabSkeleton({ count }: { count: number }) {
  return (
    <div className="border-b border-border/50 px-6 pt-4">
      <div className="flex h-auto flex-nowrap gap-0 bg-transparent p-0">
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-[4.5rem] rounded-none px-4 py-2" />
        ))}
      </div>
    </div>
  );
}

export default function KnowledgeHubLoading() {
  return (
    <div
      className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full"
      aria-busy="true"
      role="status"
      aria-label="Loading knowledge hub"
    >
      {/* Header — icon + title row, subtitle below */}
      <div>
        <div className="flex items-center gap-2.5">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-7 w-48" />
        </div>
        <Skeleton className="mt-1 h-4 w-96" />
      </div>

      {/* Search bar */}
      <Skeleton className="h-10 max-w-xl rounded-md" />

      <div className="space-y-12">
        {/* Topics section */}
        <section>
          <SectionHeaderSkeleton />
          {/* 6 tabs: Active, Favorite, Inactive, By Area, All, Archived */}
          <UnderlineTabSkeleton count={6} />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        </section>

        {/* Notes section */}
        <section>
          <SectionHeaderSkeleton />
          {/* 13 tabs: All, Inbox, To Review, Active, Pinned, Favorites, By Area, By Goal, By Project, By Topic, By Notebook, Completed, Archived */}
          <UnderlineTabSkeleton count={13} />
          <div className="mt-4 flex flex-col">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex cursor-pointer items-center gap-3 border-b border-border/40 px-4 py-2.5"
              >
                <Skeleton className="h-5 flex-1" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </section>

        {/* Resources section */}
        <section>
          <SectionHeaderSkeleton />
          {/* 10 tabs: All, Inbox, To Review, Active, Favorites, By Topic, By Area, By Goal, By Project, Completed, Archived */}
          <UnderlineTabSkeleton count={10} />
          <div className="mt-4 flex flex-col">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 border-b border-border/40 px-4 py-2.5"
              >
                <Skeleton className="h-5 flex-1" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

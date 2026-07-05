import { Skeleton } from "@/components/ui/skeleton";

function InboxItemSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
      <Skeleton className="h-5 w-10 rounded-full" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-7 w-20" />
    </div>
  );
}

export default function InboxLoading() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="border-b border-border/50 py-5">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-md" />
          <div>
            <Skeleton className="h-7 w-28" />
            <Skeleton className="mt-1 h-4 w-48" />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 py-6">
        {/* Section headers + items — matches inbox entity groups */}
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <InboxItemSkeleton key={i} />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-28" />
          <div className="flex flex-col gap-2">
            <InboxItemSkeleton key={0} />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-28" />
          <div className="flex flex-col gap-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <InboxItemSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

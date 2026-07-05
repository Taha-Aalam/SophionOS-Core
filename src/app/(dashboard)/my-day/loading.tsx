import { Skeleton } from "@/components/ui/skeleton";

function TaskRowSkeleton() {
  return (
    <div className="flex items-center gap-3 border-b border-border/40 px-4 py-2.5">
      <Skeleton className="size-4 rounded" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

function SectionHeaderSkeleton() {
  return (
    <div className="flex items-start gap-3">
      <Skeleton className="mt-1.5 h-10 w-1 shrink-0 rounded-full" />
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
  );
}

export default function MyDayLoading() {
  return (
    <div className="reveal-stagger flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="border-b border-border/50 py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-6 rounded" />
            <div>
              <Skeleton className="h-7 w-32" />
              <Skeleton className="mt-1 h-4 w-48" />
            </div>
          </div>
          <Skeleton className="h-9 w-32 rounded-md" />
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {/* Due Today section */}
        <section>
          <SectionHeaderSkeleton />
          <div className="mt-4 flex flex-col gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <TaskRowSkeleton key={i} />
            ))}
          </div>
        </section>

        {/* Focus section */}
        <section>
          <SectionHeaderSkeleton />
          <div className="mt-4 flex flex-col gap-1">
            {Array.from({ length: 2 }).map((_, i) => (
              <TaskRowSkeleton key={i} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

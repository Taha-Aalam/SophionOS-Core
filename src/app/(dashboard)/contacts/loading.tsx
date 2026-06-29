import { Skeleton } from "@/components/ui/skeleton";

export default function ContactsLoading() {
  return (
    <div className="reveal-stagger flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border/50 py-5">
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-md" />
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      {/* Underline tab strip — All, Favorite, Follow-up, By Group, By Project, By Area, By Goal, Archive */}
      <div className="flex h-auto w-full flex-nowrap gap-0 overflow-x-auto border-b border-transparent pb-0">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-none" />
        ))}
      </div>

      {/* ContactCard grid */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

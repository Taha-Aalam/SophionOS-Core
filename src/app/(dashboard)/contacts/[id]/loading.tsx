import { Skeleton } from "@/components/ui/skeleton";

export default function ContactDetailLoading() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="size-6 rounded" />
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-24" />
      </div>
      {/* Contact header card skeleton */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-start gap-4 p-6">
          <Skeleton className="size-16 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-5 w-24 rounded-md" />
            </div>
          </div>
        </div>
        {/* Stats row */}
        <div className="flex gap-3 border-t px-6 py-3">
          <Skeleton className="flex-1 h-10 rounded-md" />
          <Skeleton className="flex-1 h-10 rounded-md" />
        </div>
        {/* Tabs */}
        <div className="flex border-t">
          <Skeleton className="flex-1 h-9 rounded-none" />
          <Skeleton className="flex-1 h-9 rounded-none" />
        </div>
      </div>
      {/* Tab content skeleton */}
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export default function ContactDetailLoading() {
  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <Skeleton className="h-8 w-32" />
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-full max-w-md" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    </div>
  );
}

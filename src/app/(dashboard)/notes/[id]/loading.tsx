import { Skeleton } from "@/components/ui/skeleton";

export default function NoteDetailLoading() {
  return (
    <div className="reveal-stagger flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full" aria-busy="true" role="status" aria-label="Loading note">
      {/* Top bar: back button + breadcrumb + badges */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Skeleton className="size-7 rounded" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="size-7 rounded" />
          <Skeleton className="size-7 rounded" />
          <Skeleton className="size-7 rounded" />
        </div>
      </div>

      {/* Editor area */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col p-6 gap-4">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="min-h-[400px] w-full flex-1 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Loading shape for the "new note" composer.
 *
 * `notes/new` is a client page, so it normally renders immediately — but while
 * its route chunk loads React can suspend, and without a boundary of its own
 * the nearest fallback would be the *notes list* skeleton (before the list
 * boundary moved into `notes/(list)/`) or the dashboard skeleton (after).
 * Neither matches the composer, so it owns its own boundary.
 *
 * Rendered from two places that must stay identical: `notes/new/loading.tsx`
 * (route fallback) and the `isLoading` branch of `notes/new/page.tsx`.
 */
export function NewNoteSkeleton() {
  return (
    <div
      className={cn("flex flex-col gap-6 p-6 content-column-grid mx-auto w-full")}
      aria-busy="true"
      role="status"
      aria-label="Loading new note"
    >
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Skeleton className="h-96 lg:col-span-2" />
        <Skeleton className="h-96" />
      </div>
    </div>
  );
}

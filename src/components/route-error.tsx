"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Shared segment-level error UI. Next.js renders the nearest error.tsx as a
 * Client Component when a descendant throws during render, isolating the throw
 * to that subtree instead of blanking the whole app. `reset` re-renders the
 * segment so a transient failure (e.g. a flaky query) can recover in place.
 */
export function RouteError({
  error,
  reset,
  title = "Something went wrong",
  description = "This section failed to load. You can try again without leaving the page.",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
}) {
  useEffect(() => {
    // Surface to the console (and any future error reporter) for diagnosis.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
      <Button onClick={() => reset()} variant="outline">
        Try again
      </Button>
    </div>
  );
}

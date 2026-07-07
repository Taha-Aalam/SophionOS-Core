"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
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
    <div className="reveal-once flex flex-col items-center justify-center px-4 py-16 text-center" role="alert">
      <div className="mb-5 rounded-xl bg-destructive/10 p-2 ring-1 ring-destructive/20">
        <div className="flex size-16 items-center justify-center rounded-lg bg-card shadow-soft ring-1 ring-foreground/10">
          <AlertTriangle className="size-7 text-destructive" strokeWidth={1.5} />
        </div>
      </div>
      <h3 className="mb-1.5 text-lg font-medium tracking-tight">{title}</h3>
      <p className="mb-5 max-w-sm text-sm text-muted-foreground">{description}</p>
      <Button onClick={() => reset()} variant="outline" className="gap-2">
        <RefreshCw className="size-4" />
        Try again
      </Button>
    </div>
  );
}

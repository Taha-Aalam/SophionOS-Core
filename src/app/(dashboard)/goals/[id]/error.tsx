"use client";

import { RouteError } from "@/components/route-error";

export default function GoalDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="This goal could not be loaded"
      description="Something went wrong loading this goal. Try again, or head back to your goals list."
    />
  );
}

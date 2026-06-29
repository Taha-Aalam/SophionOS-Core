"use client";

import { RouteError } from "@/components/route-error";

export default function AreaDetailError({
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
      title="This area could not be loaded"
      description="Something went wrong loading this area. Try again, or head back to your areas list."
    />
  );
}

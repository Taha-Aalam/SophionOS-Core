"use client";

import { RouteError } from "@/components/route-error";

export default function ProjectDetailError({
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
      title="This project could not be loaded"
      description="Something went wrong loading this project. Try again, or head back to your projects list."
    />
  );
}

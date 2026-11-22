"use client";

import { useEffect } from "react";

import { installErrorListeners } from "@/lib/bug-report/capture";

/**
 * Installs the window error/unhandledrejection capture listeners once for
 * the dashboard shell. Renders nothing; capture is passive and local-only.
 */
export function BugReportCaptureProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    installErrorListeners();
  }, []);
  return <>{children}</>;
}

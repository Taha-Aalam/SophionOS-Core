"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { captureError } from "@/lib/bug-report/capture";
import { OPEN_BUG_REPORT_EVENT } from "@/lib/bug-report/config";
import { BUG_REPORT_STRINGS } from "@/lib/bug-report/strings";

interface BugReportBoundaryProps {
  children: React.ReactNode;
}

interface BugReportBoundaryState {
  error: Error | null;
}

/**
 * Error boundary around the dashboard shell. Records the error into the
 * local capture buffer (scrubbed, never sent anywhere) and offers a fallback
 * with "Report this", which opens the bug-report dialog via the window event.
 */
export class BugReportBoundary extends React.Component<
  BugReportBoundaryProps,
  BugReportBoundaryState
> {
  state: BugReportBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BugReportBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error): void {
    captureError(error);
  }

  private handleRetry = (): void => {
    this.setState({ error: null });
  };

  private handleReport = (): void => {
    window.dispatchEvent(new CustomEvent(OPEN_BUG_REPORT_EVENT));
  };

  render(): React.ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div
        role="alert"
        className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center"
      >
        <div className="mb-5 rounded-xl bg-destructive/10 p-2 ring-1 ring-destructive/20">
          <div className="flex size-16 items-center justify-center rounded-lg bg-card shadow-soft ring-1 ring-foreground/10">
            <AlertTriangle className="size-7 text-destructive" strokeWidth={1.5} />
          </div>
        </div>
        <h3 className="mb-1.5 text-lg font-medium tracking-tight">
          {BUG_REPORT_STRINGS.boundaryTitle}
        </h3>
        <p className="mb-5 max-w-sm text-sm text-muted-foreground">
          {BUG_REPORT_STRINGS.boundaryDescription}
        </p>
        <div className="flex gap-2">
          <Button onClick={this.handleRetry} variant="outline" className="gap-2">
            <RefreshCw className="size-4" />
            {BUG_REPORT_STRINGS.boundaryRetry}
          </Button>
          <Button onClick={this.handleReport} className="gap-2">
            {BUG_REPORT_STRINGS.boundaryReport}
          </Button>
        </div>
      </div>
    );
  }
}

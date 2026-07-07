"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An unexpected error occurred. Please try again.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="reveal-once flex flex-col items-center justify-center px-4 py-16 text-center" role="alert">
      <div className="mb-5 rounded-xl bg-destructive/10 p-2 ring-1 ring-destructive/20">
        <div className="flex size-16 items-center justify-center rounded-lg bg-card shadow-soft ring-1 ring-foreground/10">
          <AlertTriangle className="size-7 text-destructive" strokeWidth={1.5} />
        </div>
      </div>
      <h3 className="mb-1.5 text-lg font-medium tracking-tight">{title}</h3>
      <p className="mb-5 max-w-sm text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw className="size-4" />
          Try again
        </Button>
      )}
    </div>
  );
}

"use client";

import React from "react";
import { ArrowRight, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  isLoading?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  isLoading = false,
}: EmptyStateProps) {
  return (
    <div className="reveal-once flex flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-5 rounded-xl bg-muted/40 p-2 ring-1 ring-foreground/5">
        <div className="flex size-16 items-center justify-center rounded-lg bg-card shadow-soft ring-1 ring-foreground/10">
          <Icon className="size-7 text-muted-foreground" strokeWidth={1.5} />
        </div>
      </div>
      <h3 className="mb-1.5 text-lg font-medium tracking-tight">{title}</h3>
      <p className="mb-5 max-w-sm text-sm text-muted-foreground">{description}</p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          disabled={isLoading}
          className="group/cta h-9 gap-2 rounded-full pl-4 pr-1.5 transition-all duration-300 ease-[var(--ease-out-quint)] active:scale-[0.98]"
        >
          {actionLabel}
          <span className="flex size-6 items-center justify-center rounded-full bg-primary-foreground/15 transition-transform duration-300 ease-[var(--ease-out-back)] group-hover/cta:translate-x-0.5">
            <ArrowRight className="size-3.5" />
          </span>
        </Button>
      )}
    </div>
  );
}
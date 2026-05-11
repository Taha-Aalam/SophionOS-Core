"use client";

import React from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Resource } from "@/lib/types/domain.types";

const STATUS_COLORS: Record<string, string> = {
  inbox: "bg-slate-100 text-slate-700 dark:bg-slate-800",
  to_review: "bg-amber-100 text-amber-700 dark:bg-amber-900",
  active: "bg-green-100 text-green-700 dark:bg-green-900",
};

interface ResourceTableProps {
  resources: Resource[];
  onToggleFavorite: (id: string, favorite: boolean) => void;
  onEdit?: (resource: Resource) => void;
}

export function ResourceTable({
  resources,
  onToggleFavorite,
  onEdit,
}: ResourceTableProps) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-3 py-2">
        <span className="w-20 text-xs font-medium text-muted-foreground">Status</span>
        <span className="flex-1 text-xs font-medium text-muted-foreground">Name</span>
        <span className="hidden w-20 text-xs font-medium text-muted-foreground sm:inline">
          Type
        </span>
      </div>
      {resources.map((resource) => (
        <div
          key={resource.id}
          role={onEdit ? "button" : undefined}
          tabIndex={onEdit ? 0 : undefined}
          onClick={onEdit ? () => onEdit(resource) : undefined}
          onKeyDown={onEdit ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onEdit(resource); } } : undefined}
          className={`flex items-center gap-3 border-b border-border/40 px-3 py-2.5 hover:bg-muted/30${onEdit ? " cursor-pointer" : ""}`}
        >
          <Badge
            variant="secondary"
            className={cn(
              "w-20 text-xs",
              STATUS_COLORS[resource.status],
            )}
          >
            {resource.status.replace("_", " ")}
          </Badge>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{resource.name}</p>
            {resource.url && (
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-xs text-muted-foreground hover:text-primary"
                onClick={(e) => e.stopPropagation()}
              >
                {resource.url}
              </a>
            )}
          </div>
          <Badge variant="outline" className="hidden w-20 text-xs sm:inline">
            {resource.type}
          </Badge>
          <button
            type="button"
            onClick={() =>
              onToggleFavorite(resource.id, !resource.favorite)
            }
            className={cn(
              "shrink-0 text-sm",
              resource.favorite ? "text-rose-500" : "text-muted-foreground/40",
            )}
          >
            {resource.favorite ? "★" : "☆"}
          </button>
        </div>
      ))}
    </div>
  );
}
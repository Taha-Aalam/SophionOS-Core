"use client";

import React from "react";
import {
  Archive,
  ArchiveRestore,
  Map as LucideMap,
  Pencil,
  Star,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { Resource } from "@/lib/types/domain.types";

import { DeleteEntityPopover } from "./delete-entity-popover";

const STATUS_COLORS: Record<string, string> = {
  inbox: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  to_review: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  active: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
};

const TYPE_COLORS: Record<string, string> = {
  website: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  article: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  video: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  document: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  podcast: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  social_media: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
  tool: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
};

interface AreaInfo {
  name: string;
  icon?: string | null;
}

interface ResourceRowProps {
  resource: Resource;
  areas?: AreaInfo[];
  goalNames?: string[];
  projectNames?: string[];
  taskNames?: string[];
  topicName?: string;
  onToggleFavorite: (id: string, favorite: boolean) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onDelete: (id: string) => void;
  onSaveStatusChange?: (id: string, saved: boolean) => void;
  onEdit?: (resource: Resource) => void;
}

export function ResourceRow({
  resource,
  areas = [],
  goalNames = [],
  projectNames = [],
  taskNames = [],
  topicName,
  onToggleFavorite,
  onArchive,
  onUnarchive,
  onDelete,
  onSaveStatusChange,
  onEdit,
}: ResourceRowProps) {
  const handleEdit = () => {
    onEdit?.(resource);
  };

  const handleRowClick = () => {
    if (resource.url) {
      window.open(resource.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      className="group flex cursor-pointer items-center gap-3 border-b border-border/40 px-4 py-2.5 transition-colors hover:bg-muted/30"
      onClick={handleRowClick}
    >
      {/* Save checkbox */}
      {onSaveStatusChange && (
        <span onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={resource.status === "completed"}
            onCheckedChange={(checked) => onSaveStatusChange(resource.id, checked === true)}
            className="shrink-0"
          />
        </span>
      )}

      {/* Status + Type — LEFT of name */}
      <div className="hidden md:flex shrink-0 items-center gap-1">
        <Badge
          variant="outline"
          className={cn("text-[10px] uppercase leading-none", STATUS_COLORS[resource.status])}
        >
          {resource.status === "completed" ? "Done" : resource.status.replace("_", " ")}
        </Badge>
        <Badge
          variant="secondary"
          className={cn("text-[10px] leading-none", TYPE_COLORS[resource.type])}
        >
          {resource.type.replace("_", " ")}
        </Badge>
      </div>

      {/* Name + URL subtitle */}
      <div className="min-w-0 flex-1 self-center">
        <span className="block truncate font-medium">{resource.name}</span>
        {resource.url ? (
          <span className="block truncate text-xs text-muted-foreground">{resource.url}</span>
        ) : null}
      </div>

      {/* Metadata cluster — all badges, no +N collapse, smaller */}
      <div className="hidden md:flex shrink-0 items-center gap-1 flex-wrap">
        {topicName && (
          <Badge variant="outline" className="gap-1 text-[10px] leading-none font-normal">
            <span className="text-[10px] leading-none">🏷️</span>
            {topicName}
          </Badge>
        )}
        {areas.slice(0, 2).map((area) => (
          <Badge key={`${resource.id}-area-${area.name}`} variant="outline" className="gap-1 text-[10px] leading-none font-normal">
            {area.icon ? (
              <span className="text-[10px] leading-none">{area.icon}</span>
            ) : (
              <LucideMap className="size-2.5" />
            )}
            {area.name}
          </Badge>
        ))}
        {areas.length > 2 && (
          <Badge variant="secondary" className="text-[10px] leading-none font-normal">
            +{areas.length - 2}
          </Badge>
        )}
        {goalNames.slice(0, 2).map((name) => (
          <Badge key={`${resource.id}-goal-${name}`} variant="outline" className="gap-1 text-[10px] leading-none font-normal">
            <span className="text-[10px] leading-none">🎯</span>
            {name}
          </Badge>
        ))}
        {goalNames.length > 2 && (
          <Badge variant="secondary" className="text-[10px] leading-none font-normal">
            +{goalNames.length - 2}
          </Badge>
        )}
        {projectNames.slice(0, 2).map((name) => (
          <Badge key={`${resource.id}-project-${name}`} variant="outline" className="gap-1 text-[10px] leading-none font-normal">
            <span className="text-[10px] leading-none">📁</span>
            {name}
          </Badge>
        ))}
        {projectNames.length > 2 && (
          <Badge variant="secondary" className="text-[10px] leading-none font-normal">
            +{projectNames.length - 2}
          </Badge>
        )}
        {taskNames.slice(0, 2).map((name) => (
          <Badge key={`${resource.id}-task-${name}`} variant="outline" className="gap-1 text-[10px] leading-none font-normal">
            <span className="text-[10px] leading-none">☑️</span>
            {name}
          </Badge>
        ))}
        {taskNames.length > 2 && (
          <Badge variant="secondary" className="text-[10px] leading-none font-normal">
            +{taskNames.length - 2}
          </Badge>
        )}
      </div>

      {/* Action buttons — Favorite, Edit, Archive, Delete */}
      <div
        className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Favorite */}
        <button
          type="button"
          onClick={() => onToggleFavorite(resource.id, !resource.favorite)}
          className={cn(
            "rounded-md p-1.5 text-muted-foreground transition-colors hover:text-yellow-400",
            resource.favorite && "text-yellow-500",
          )}
          title={resource.favorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Star className={cn("size-3.5", resource.favorite && "fill-current")} />
        </button>

        {/* Edit */}
        <button
          type="button"
          onClick={handleEdit}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Edit resource"
        >
          <Pencil className="size-3.5" />
        </button>

        {/* Archive / Restore */}
        <button
          type="button"
          onClick={() => {
            if (resource.is_archived) {
              onUnarchive(resource.id);
            } else {
              onArchive(resource.id);
            }
          }}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-red-500"
          title={resource.is_archived ? "Restore" : "Archive"}
        >
          {resource.is_archived ? (
            <ArchiveRestore className="size-3.5" />
          ) : (
            <Archive className="size-3.5" />
          )}
        </button>

        {/* Delete */}
        <DeleteEntityPopover
          variant="row"
          entityLabel="resource"
          entityName={resource.name}
          requireTypedConfirmation={false}
          onConfirm={() => onDelete(resource.id)}
        />
      </div>
    </div>
  );
}

export function ResourceRowSkeleton() {
  return (
    <div className="flex items-center gap-3 border-b border-border/40 px-4 py-2.5">
      <div className="h-5 flex-1 animate-pulse rounded bg-muted" />
      <div className="h-5 w-48 animate-pulse rounded bg-muted hidden md:inline-flex" />
      <div className="size-8 animate-pulse rounded bg-muted" />
      <div className="size-8 animate-pulse rounded bg-muted" />
      <div className="size-8 animate-pulse rounded bg-muted" />
      <div className="size-8 animate-pulse rounded bg-muted" />
    </div>
  );
}

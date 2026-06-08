"use client";

import React from "react";
import {
  Archive,
  ArchiveRestore,
  ExternalLink,
  Map as LucideMap,
  Star,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Resource } from "@/lib/types/domain.types";
import type { ResourceStatus } from "@/lib/utils/constants";

import { DeleteEntityPopover } from "./delete-entity-popover";

const STATUS_COLORS: Record<string, string> = {
  inbox: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  to_review: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  saved: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
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
  onStatusChange?: (id: string, status: ResourceStatus) => void;
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
  onEdit,
}: ResourceRowProps) {
  const handleEdit = () => {
    onEdit?.(resource);
  };

  return (
    <div className="group flex items-center gap-3 border-b border-border/40 px-4 py-2.5 transition-colors hover:bg-muted/30">
      {/* Status + Type — LEFT of name */}
      <div className="hidden md:flex shrink-0 items-center gap-1">
        <Badge
          variant="outline"
          className={cn("text-[10px] uppercase", STATUS_COLORS[resource.status])}
        >
          {resource.status.replace("_", " ")}
        </Badge>
        <Badge
          variant="secondary"
          className={cn("text-xs", TYPE_COLORS[resource.type])}
        >
          {resource.type.replace("_", " ")}
        </Badge>
      </div>

      {/* Name + URL subtitle */}
      <div className="min-w-0 flex-1 self-center">
        <button
          type="button"
          onClick={handleEdit}
          className="w-full text-left"
          title="Edit resource"
        >
          <span className="block truncate font-medium hover:underline">{resource.name}</span>
        </button>
        {resource.url ? (
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="block truncate text-xs text-muted-foreground hover:underline"
          >
            {resource.url}
          </a>
        ) : null}
      </div>

      {/* Metadata cluster — all badges, no +N collapse */}
      <div className="hidden md:flex shrink-0 items-center gap-1.5 flex-wrap">
        {topicName && (
          <Badge variant="outline" className="gap-1 text-xs font-normal">
            <span className="text-xs leading-none">🏷️</span>
            {topicName}
          </Badge>
        )}
        {areas.slice(0, 2).map((area) => (
          <Badge key={`${resource.id}-area-${area.name}`} variant="outline" className="gap-1 text-xs font-normal">
            {area.icon ? (
              <span className="text-xs leading-none">{area.icon}</span>
            ) : (
              <LucideMap className="size-3" />
            )}
            {area.name}
          </Badge>
        ))}
        {areas.length > 2 && (
          <Badge variant="secondary" className="text-xs font-normal">
            +{areas.length - 2}
          </Badge>
        )}
        {goalNames.slice(0, 2).map((name) => (
          <Badge key={`${resource.id}-goal-${name}`} variant="outline" className="gap-1 text-xs font-normal">
            <span className="text-xs leading-none">🎯</span>
            {name}
          </Badge>
        ))}
        {goalNames.length > 2 && (
          <Badge variant="secondary" className="text-xs font-normal">
            +{goalNames.length - 2}
          </Badge>
        )}
        {projectNames.slice(0, 2).map((name) => (
          <Badge key={`${resource.id}-project-${name}`} variant="outline" className="gap-1 text-xs font-normal">
            <span className="text-xs leading-none">📁</span>
            {name}
          </Badge>
        ))}
        {projectNames.length > 2 && (
          <Badge variant="secondary" className="text-xs font-normal">
            +{projectNames.length - 2}
          </Badge>
        )}
        {taskNames.slice(0, 2).map((name) => (
          <Badge key={`${resource.id}-task-${name}`} variant="outline" className="gap-1 text-xs font-normal">
            <span className="text-xs leading-none">☑️</span>
            {name}
          </Badge>
        ))}
        {taskNames.length > 2 && (
          <Badge variant="secondary" className="text-xs font-normal">
            +{taskNames.length - 2}
          </Badge>
        )}
      </div>

      {/* Open Link */}
      <div className="w-8 flex justify-center self-center">
        {resource.url ? (
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Open link"
          >
            <ExternalLink className="size-3.5" />
          </a>
        ) : (
          <span
            className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground/40"
            title="No URL"
          >
            <ExternalLink className="size-3.5" />
          </span>
        )}
      </div>

      {/* Favorite — star style matching contact card */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(resource.id, !resource.favorite);
        }}
        className={cn(
          "shrink-0 rounded-md p-1.5 transition-colors",
          resource.favorite
            ? "text-yellow-500"
            : "text-muted-foreground/20 opacity-0 hover:text-yellow-400 group-hover:opacity-100",
        )}
        title={resource.favorite ? "Remove from favorites" : "Add to favorites"}
      >
        <Star className={cn("size-3.5", resource.favorite && "fill-current")} />
      </button>

      {/* Archive / Delete — task-row style */}
      <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
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

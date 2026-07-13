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
import { cn, safeHttpUrl } from "@/lib/utils";
import type { Resource } from "@/lib/types/domain.types";
import { STATUS_COLORS, RESOURCE_TYPE_COLORS } from "@/lib/constants/entity-colors";

import { DeleteEntityPopover } from "./delete-entity-popover";
import { useClickableProps } from "@/components/ui/clickable";

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
    const safeUrl = safeHttpUrl(resource.url);
    if (safeUrl) {
      window.open(safeUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      className="group flex cursor-pointer items-center gap-3 border-b border-border/40 px-4 py-2.5 transition-colors hover:bg-muted/30"
      onClick={handleRowClick}
      {...useClickableProps(handleRowClick)}
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
          className={cn("text-2xs uppercase leading-none", STATUS_COLORS[resource.status])}
        >
          {resource.status === "completed" ? "Done" : resource.status.replace("_", " ")}
        </Badge>
        <Badge
          variant="secondary"
          className={cn("text-2xs leading-none", RESOURCE_TYPE_COLORS[resource.type])}
        >
          {resource.type.replace("_", " ")}
        </Badge>
      </div>

      {/* Name + URL subtitle */}
      <div className="min-w-0 flex-1 self-center">
        <span className="block font-medium max-md:text-sm max-md:leading-tight max-md:break-words md:truncate">
          {resource.name}
        </span>
        {resource.url ? (
          <span className="block truncate text-xs text-muted-foreground">{resource.url}</span>
        ) : null}
      </div>

      {/* Metadata cluster — all badges, no +N collapse, smaller */}
      <div className="hidden md:flex shrink-0 items-center gap-1 flex-wrap">
        {topicName && (
          <Badge variant="outline" className="gap-1 text-2xs leading-none font-normal">
            <span className="text-2xs leading-none">🏷️</span>
            {topicName}
          </Badge>
        )}
        {areas.slice(0, 2).map((area) => (
          <Badge key={`${resource.id}-area-${area.name}`} variant="outline" className="gap-1 text-2xs leading-none font-normal">
            {area.icon ? (
              <span className="text-2xs leading-none">{area.icon}</span>
            ) : (
              <LucideMap className="size-2.5" />
            )}
            {area.name}
          </Badge>
        ))}
        {areas.length > 2 && (
          <Badge variant="secondary" className="text-2xs leading-none font-normal">
            +{areas.length - 2}
          </Badge>
        )}
        {goalNames.slice(0, 2).map((name) => (
          <Badge key={`${resource.id}-goal-${name}`} variant="outline" className="gap-1 text-2xs leading-none font-normal">
            <span className="text-2xs leading-none">🎯</span>
            {name}
          </Badge>
        ))}
        {goalNames.length > 2 && (
          <Badge variant="secondary" className="text-2xs leading-none font-normal">
            +{goalNames.length - 2}
          </Badge>
        )}
        {projectNames.slice(0, 2).map((name) => (
          <Badge key={`${resource.id}-project-${name}`} variant="outline" className="gap-1 text-2xs leading-none font-normal">
            <span className="text-2xs leading-none">📁</span>
            {name}
          </Badge>
        ))}
        {projectNames.length > 2 && (
          <Badge variant="secondary" className="text-2xs leading-none font-normal">
            +{projectNames.length - 2}
          </Badge>
        )}
        {taskNames.slice(0, 2).map((name) => (
          <Badge key={`${resource.id}-task-${name}`} variant="outline" className="gap-1 text-2xs leading-none font-normal">
            <span className="text-2xs leading-none">☑️</span>
            {name}
          </Badge>
        ))}
        {taskNames.length > 2 && (
          <Badge variant="secondary" className="text-2xs leading-none font-normal">
            +{taskNames.length - 2}
          </Badge>
        )}
      </div>

      {/* Favorite — always visible when starred, hover-only otherwise (like note-row) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(resource.id, !resource.favorite);
        }}
        className={cn(
          "shrink-0 rounded-md p-1.5 transition-colors",
          resource.favorite
            ? "text-amber-500"
            : "text-muted-foreground/40 hover:text-amber-400",
        )}
        aria-label={resource.favorite ? "Unfavorite" : "Favorite"}
      >
        <Star className={cn("size-3.5", resource.favorite && "fill-current")} />
      </button>

      {/* Action buttons — Edit, Archive, Delete */}
      <div
        className="flex shrink-0 items-center gap-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Edit */}
        <button
          type="button"
          onClick={handleEdit}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Edit resource"
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
          aria-label={resource.is_archived ? "Restore" : "Archive"}
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

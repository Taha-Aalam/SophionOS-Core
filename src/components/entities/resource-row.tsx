"use client";

import { ExternalLink, Heart, HeartOff, Archive, ArchiveRestore } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { Resource } from "@/lib/types/domain.types";
import type { ResourceStatus, ResourceType } from "@/lib/utils/constants";

const STATUS_COLORS: Record<string, string> = {
  inbox: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  to_review: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
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

interface ResourceRowProps {
  resource: Resource;
  areaName?: string;
  projectName?: string;
  topicName?: string;
  onToggleFavorite: (id: string, favorite: boolean) => void;
  onArchive: (id: string) => void;
  onStatusChange?: (id: string, status: ResourceStatus) => void;
}

export function ResourceRow({
  resource,
  areaName,
  projectName,
  topicName,
  onToggleFavorite,
  onArchive,
}: ResourceRowProps) {
  const handleOpenLink = () => {
    if (resource.url) {
      window.open(resource.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="group flex items-center gap-3 border-b border-border py-3 transition-colors hover:bg-accent/30">
      {/* Status */}
      <Badge variant="secondary" className={cn("text-xs whitespace-nowrap", STATUS_COLORS[resource.status])}>
        {resource.status.replace("_", " ")}
      </Badge>

      {/* Name */}
      <div className="min-w-0 flex-1">
        <span className="truncate font-medium">{resource.name}</span>
      </div>

      {/* Type */}
      <Badge variant="secondary" className={cn("text-xs whitespace-nowrap hidden sm:inline-flex", TYPE_COLORS[resource.type])}>
        {resource.type.replace("_", " ")}
      </Badge>

      {/* Topics */}
      {topicName && (
        <Badge variant="outline" className="text-xs hidden md:inline-flex">
          {topicName}
        </Badge>
      )}

      {/* Areas */}
      {areaName && (
        <Badge variant="outline" className="text-xs hidden lg:inline-flex">
          {areaName}
        </Badge>
      )}

      {/* Projects */}
      {projectName && (
        <Badge variant="outline" className="text-xs hidden xl:inline-flex">
          {projectName}
        </Badge>
      )}

      {/* Open Link */}
      <Button
        variant="ghost"
        size="sm"
        className="size-8 p-0"
        onClick={handleOpenLink}
        disabled={!resource.url}
        title={resource.url ? "Open link" : "No URL"}
      >
        <ExternalLink className="size-3.5" />
      </Button>

      {/* Star / Favorite */}
      <button
        type="button"
        onClick={() => onToggleFavorite(resource.id, !resource.favorite)}
        className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
        title={resource.favorite ? "Remove from favorites" : "Add to favorites"}
      >
        {resource.favorite ? (
          <Heart className="size-4 fill-rose-500 text-rose-500" />
        ) : (
          <HeartOff className="size-4" />
        )}
      </button>

      {/* Archive */}
      <button
        type="button"
        onClick={() => onArchive(resource.id)}
        className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
        title={resource.is_archived ? "Restore" : "Archive"}
      >
        {resource.is_archived ? (
          <ArchiveRestore className="size-4" />
        ) : (
          <Archive className="size-4" />
        )}
      </button>
    </div>
  );
}

export function ResourceRowSkeleton() {
  return (
    <div className="flex items-center gap-3 border-b border-border py-3">
      <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
      <div className="h-5 w-32 animate-pulse rounded bg-muted" />
      <div className="h-5 w-20 animate-pulse rounded-full bg-muted hidden sm:inline-flex" />
      <div className="h-5 w-16 animate-pulse rounded bg-muted hidden md:inline-flex" />
      <div className="flex-1" />
      <div className="size-8 animate-pulse rounded bg-muted" />
      <div className="size-4 animate-pulse rounded bg-muted" />
      <div className="size-4 animate-pulse rounded bg-muted" />
    </div>
  );
}
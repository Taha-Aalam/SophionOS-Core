"use client";

import React, { memo } from "react";
import { useRouter } from "next/navigation";
import { Heart, HeartOff, Tag, Pencil, Archive, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { TopicWithCounts } from "@/lib/services/topic.service";
import { cn } from "@/lib/utils";
import { encodeReturnTo } from "@/lib/utils/return-to";

interface TopicCardProps {
  topic: TopicWithCounts;
  areaNames?: Map<string, string>;
  areaIcons?: Map<string, string | null>;
  duplicateIndex?: number;
  returnTo?: string;
  onToggleFavorite?: (id: string, favorite: boolean) => void;
  onEdit?: (topic: TopicWithCounts) => void;
  onArchive?: (topic: TopicWithCounts) => void;
  onRestore?: (topic: TopicWithCounts) => void;
  compact?: boolean;
}

const TopicCardComponent = ({
  topic,
  areaNames = new Map(),
  areaIcons = new Map(),
  duplicateIndex,
  returnTo,
  onToggleFavorite,
  onEdit,
  onArchive,
  onRestore,
  compact = false,
}: TopicCardProps) => {
  const router = useRouter();
  const linkedAreas = topic.linkedAreaIds ?? [];

  return (
    <Card
      className={cn(
        "group cursor-pointer transition-all hover:ring-2 hover:ring-primary/20",
        topic.inactive && "opacity-60"
      )}
      onClick={() => {
        const href = returnTo
          ? `/topics/${topic.slug ?? topic.id}?returnTo=${encodeReturnTo(returnTo)}`
          : `/topics/${topic.slug ?? topic.id}`;
        router.push(href);
      }}
    >
      <CardContent className={cn("p-4", !compact && "p-5")}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Tag className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <h3 className="font-medium truncate">
                {topic.name}
                {duplicateIndex != null && duplicateIndex > 1 && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    copy {duplicateIndex}
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                {topic.inactive && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    Inactive
                  </Badge>
                )}
                {linkedAreas.slice(0, compact ? 1 : 3).map((areaId) => {
                  const areaName = areaNames.get(areaId);
                  if (!areaName) return null;
                  const icon = areaIcons.get(areaId);
                  return (
                    <Badge key={areaId} variant="secondary" className="text-xs">
                      {icon ? <span className="mr-0.5 text-[10px] leading-none">{icon}</span> : null}
                      {areaName}
                    </Badge>
                  );
                })}
                {linkedAreas.length > (compact ? 1 : 3) && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    +{linkedAreas.length - (compact ? 1 : 3)} more
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite?.(topic.id, !topic.favorite);
              }}
              aria-label={topic.favorite ? "Remove from favorites" : "Add to favorites"}
            >
              {topic.favorite ? (
                <Heart className="size-4 fill-rose-500 text-rose-500" />
              ) : (
                <HeartOff className="size-4 text-muted-foreground" />
              )}
            </Button>
            {onEdit && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(topic);
                }}
                aria-label="Edit topic"
              >
                <Pencil className="size-4" />
              </Button>
            )}
            {onArchive && !topic.is_archived && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive(topic);
                }}
                aria-label="Archive topic"
              >
                <Archive className="size-4 text-muted-foreground" />
              </Button>
            )}
            {onRestore && topic.is_archived && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onRestore(topic);
                }}
                aria-label="Restore topic"
              >
                <RotateCcw className="size-4 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>

        {!compact && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm">
              <span className="font-medium text-amber-600 dark:text-amber-400">{topic.notesCount}</span>
              <span className="text-muted-foreground">Notes</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm">
              <span className="font-medium text-violet-600 dark:text-violet-400">{topic.resourcesCount}</span>
              <span className="text-muted-foreground">Resources</span>
            </div>
          </div>
        )}

        {compact && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs">
              <span className="font-medium text-amber-600 dark:text-amber-400">{topic.notesCount}</span>
              <span className="text-muted-foreground">Notes</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs">
              <span className="font-medium text-violet-600 dark:text-violet-400">{topic.resourcesCount}</span>
              <span className="text-muted-foreground">Resources</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const TopicCard = memo(TopicCardComponent, (prev, next) => {
  return (
    prev.topic.id === next.topic.id &&
    prev.topic.name === next.topic.name &&
    prev.topic.favorite === next.topic.favorite &&
    prev.topic.inactive === next.topic.inactive &&
    prev.topic.is_archived === next.topic.is_archived &&
    prev.topic.notesCount === next.topic.notesCount &&
    prev.topic.resourcesCount === next.topic.resourcesCount &&
    prev.duplicateIndex === next.duplicateIndex &&
    prev.areaNames === next.areaNames &&
    prev.areaIcons === next.areaIcons &&
    prev.compact === next.compact
  );
});
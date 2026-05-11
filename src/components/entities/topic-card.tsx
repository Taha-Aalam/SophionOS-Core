"use client";

import React, { memo } from "react";
import { useRouter } from "next/navigation";
import { Heart, HeartOff, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { TopicWithCounts } from "@/lib/services/topic.service";
import { cn } from "@/lib/utils";

interface TopicCardProps {
  topic: TopicWithCounts;
  areaNames?: Map<string, string>;
  duplicateIndex?: number;
  onToggleFavorite?: (id: string, favorite: boolean) => void;
  onEdit?: (topic: TopicWithCounts) => void;
  compact?: boolean;
}

const TopicCardComponent = ({
  topic,
  areaNames = new Map(),
  duplicateIndex,
  onToggleFavorite,
  onEdit,
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
      onClick={() => router.push(`/topics/${topic.id}`)}
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
                  return (
                    <Badge key={areaId} variant="secondary" className="text-xs">
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
                <span className="size-4 text-muted-foreground text-sm">✏️</span>
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
    prev.topic.notesCount === next.topic.notesCount &&
    prev.topic.resourcesCount === next.topic.resourcesCount &&
    prev.duplicateIndex === next.duplicateIndex &&
    prev.areaNames === next.areaNames &&
    prev.compact === next.compact
  );
});
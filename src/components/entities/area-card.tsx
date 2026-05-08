"use client";

import React, { memo } from "react";
import { useRouter } from "next/navigation";
import { Archive, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Area } from "@/lib/types/domain.types";
import { normalizeAreaType } from "@/lib/utils/areas";

interface AreaCardProps {
  area: Area;
  goalsCount?: number;
  projectsCount?: number;
  tasksCount?: number;
  notesCount?: number;
  duplicateIndex?: number;
  onEdit?: (area: Area) => void;
  onArchive?: (area: Area) => void;
  isArchiving?: boolean;
  onRestore?: (area: Area) => void;
  isRestoring?: boolean;
  onDelete?: (area: Area) => void;
  isDeleting?: boolean;
}

const AREA_TYPE_COLORS: Record<string, string> = {
  business: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  personal: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  studies: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
};

const AreaCardComponent = ({
  area,
  goalsCount = 0,
  projectsCount = 0,
  tasksCount = 0,
  notesCount = 0,
  duplicateIndex,
  onEdit,
  onArchive,
  isArchiving = false,
  onRestore,
  isRestoring = false,
  onDelete,
  isDeleting = false,
}: AreaCardProps) => {
  const router = useRouter();
  const isArchived = area.archive;
  const isInactive = area.inactive;
  const areaType = normalizeAreaType(area.type);

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:ring-2 hover:ring-primary/20",
        isArchived && "opacity-60 grayscale"
      )}
      onClick={() => !isArchived && router.push(`/areas/${area.slug || area.id}`)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {area.icon ? (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                style={{ backgroundColor: area.color ? `${area.color}20` : "var(--muted)" }}
              >
                {area.icon}
              </div>
            ) : (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0 font-bold"
                style={{ backgroundColor: area.color ? `${area.color}20` : "var(--muted)", color: area.color || "var(--foreground)" }}
              >
                {area.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h3 className="font-medium truncate">
                {area.name}
                {duplicateIndex != null && duplicateIndex > 1 && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    copy {duplicateIndex}
                  </span>
                )}
              </h3>
              <div className="flex items-center gap-1 mt-1">
                <Badge
                  variant="secondary"
                  className={cn("text-xs", AREA_TYPE_COLORS[areaType.toLowerCase()])}
                >
                  {areaType}
                </Badge>
                {isInactive && !isArchived && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    No activity
                  </Badge>
                )}
                {isArchived && (
                  <Badge variant="outline" className="text-xs">
                    <Archive className="size-3 mr-1" />
                    Archived
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {!isArchived && (
            <div className="flex items-center gap-1">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(area);
                  }}
                  aria-label="Edit area"
                >
                  <Pencil className="size-4" />
                </Button>
              )}
              {onArchive && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive(area);
                  }}
                  disabled={isArchiving}
                  aria-label="Archive area"
                >
                  <Archive className="size-4" />
                </Button>
              )}
            </div>
          )}

          {isArchived && (
            <div className="flex items-center gap-1">
              {onRestore && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRestore(area);
                  }}
                  disabled={isRestoring}
                  aria-label="Restore area"
                >
                  <RotateCcw className="size-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(area);
                  }}
                  disabled={isDeleting}
                  aria-label="Delete area permanently"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        {area.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
            {area.description}
          </p>
        )}
      </CardHeader>

      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1" title="Goals">
            <span className="text-xs">🎯</span>
            <span>{goalsCount}</span>
          </div>
          <div className="flex items-center gap-1" title="Projects">
            <span className="text-xs">📁</span>
            <span>{projectsCount}</span>
          </div>
          <div className="flex items-center gap-1" title="Tasks">
            <span className="text-xs">☑️</span>
            <span>{tasksCount}</span>
          </div>
          <div className="flex items-center gap-1" title="Notes">
            <span className="text-xs">📝</span>
            <span>{notesCount}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const AreaCard = memo(AreaCardComponent, (prevProps, nextProps) => {
  // Custom comparison function to determine if props are equal
  return (
    prevProps.area.id === nextProps.area.id &&
    prevProps.area.name === nextProps.area.name &&
    prevProps.area.description === nextProps.area.description &&
    prevProps.area.color === nextProps.area.color &&
    prevProps.area.icon === nextProps.area.icon &&
    prevProps.area.type === nextProps.area.type &&
    prevProps.area.archive === nextProps.area.archive &&
    prevProps.area.inactive === nextProps.area.inactive &&
    prevProps.goalsCount === nextProps.goalsCount &&
    prevProps.projectsCount === nextProps.projectsCount &&
    prevProps.tasksCount === nextProps.tasksCount &&
    prevProps.notesCount === nextProps.notesCount &&
    prevProps.duplicateIndex === nextProps.duplicateIndex &&
    prevProps.isArchiving === nextProps.isArchiving &&
    prevProps.isRestoring === nextProps.isRestoring &&
    prevProps.isDeleting === nextProps.isDeleting
  );
});

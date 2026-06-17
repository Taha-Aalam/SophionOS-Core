"use client";

import React, { useState } from "react";
import { Plus, ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { GalleryGrid } from "@/components/views/gallery-grid";
import { AreaCard } from "@/components/entities/area-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Area } from "@/lib/types/domain.types";
import type { AreaRollups, GroupedAreas } from "@/lib/utils/areas";
import { AREA_TYPE_COLORS, AREA_TYPE_FALLBACK } from "@/lib/constants/entity-colors";

interface AreasByTypeViewProps {
  groupedAreas: GroupedAreas[];
  rollupsByAreaId?: Map<string, AreaRollups>;
  duplicateIndices?: Map<string, number>;
  isLoading?: boolean;
  onEdit?: (area: Area) => void;
  onArchive?: (area: Area) => void;
  isArchiving?: boolean;
  onCreateArea: (type: string) => void;
}

function getTypeBadgeClass(type: string): string {
  return AREA_TYPE_COLORS[type.toLowerCase()] ?? AREA_TYPE_FALLBACK;
}

function CollapsibleSection({
  type,
  areas,
  rollupsByAreaId,
  duplicateIndices,
  onEdit,
  onArchive,
  isArchiving,
  onCreateArea,
}: {
  type: string;
  areas: Area[];
  rollupsByAreaId?: Map<string, AreaRollups>;
  duplicateIndices?: Map<string, number>;
  onEdit?: (area: Area) => void;
  onArchive?: (area: Area) => void;
  isArchiving?: boolean;
  onCreateArea: (type: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);

  // Filter out archived areas - they should not appear in "by type" view
  const activeAreas = areas.filter((area) => !area.archive);

  return (
    <div className="mb-6">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className="w-full flex items-center gap-2 mb-3 group cursor-pointer"
      >
        <span className="text-muted-foreground transition-transform">
          {isOpen ? (
            <ChevronDownIcon className="size-4" />
          ) : (
            <ChevronRightIcon className="size-4" />
          )}
        </span>
        <Badge className={cn("text-xs font-medium", getTypeBadgeClass(type))}>
          {type}
        </Badge>
        <span className="text-sm text-muted-foreground">
          ({activeAreas.length} {activeAreas.length === 1 ? "area" : "areas"})
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onCreateArea(type);
          }}
          title={`Create ${type} area`}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {isOpen && (
        <>
          <GalleryGrid>
            {activeAreas.map((area) => (
              <AreaCard
                key={area.id}
                area={area}
                goalsCount={rollupsByAreaId?.get(area.id)?.goalsCount}
                projectsCount={rollupsByAreaId?.get(area.id)?.projectsCount}
                tasksCount={rollupsByAreaId?.get(area.id)?.tasksCount}
                notesCount={rollupsByAreaId?.get(area.id)?.notesCount}
                resourcesCount={rollupsByAreaId?.get(area.id)?.resourcesCount}
                duplicateIndex={duplicateIndices?.get(area.id)}
                onEdit={onEdit}
                onArchive={onArchive}
                isArchiving={isArchiving}
              />
            ))}
            <button
              onClick={() => onCreateArea(type)}
              className="flex flex-col items-center justify-center gap-2 h-48 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-all text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <Plus className="size-8" />
              <span className="text-sm font-medium">New {type} Area</span>
            </button>
          </GalleryGrid>
        </>
      )}
    </div>
  );
}

export function AreasByTypeView({
  groupedAreas,
  rollupsByAreaId,
  duplicateIndices,
  isLoading,
  onEdit,
  onArchive,
  isArchiving,
  onCreateArea,
}: AreasByTypeViewProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-6 w-32 mb-3" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-48 rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (groupedAreas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground mb-4">No areas found</p>
        <Button onClick={() => onCreateArea("Personal")}>
          <Plus className="size-4 mr-2" />
          Create Your First Area
        </Button>
      </div>
    );
  }

  return (
    <div>
      {groupedAreas.map(({ type, areas }) => (
        <CollapsibleSection
          key={type}
          type={type}
          areas={areas}
          rollupsByAreaId={rollupsByAreaId}
          duplicateIndices={duplicateIndices}
          onEdit={onEdit}
          onArchive={onArchive}
          isArchiving={isArchiving}
          onCreateArea={onCreateArea}
        />
      ))}
    </div>
  );
}

"use client";

import {
  ChevronDownIcon,
  Filter,
} from "lucide-react";
import React from "react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const ALL_PRIORITY_VALUE = "__all_priority__";

const filterPopoverContentClassName = "w-80 max-w-[calc(100vw-2rem)] overflow-x-hidden p-2";
const filterOptionClassName =
  "flex w-full cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm leading-5 transition-colors hover:bg-muted/40";
const filterOptionLabelClassName = "min-w-0 flex-1 whitespace-normal break-words text-sm";

interface TasksFilterBarProps {
  filterPriority: string;
  onFilterPriorityChange: (value: string) => void;
  filterAreaIds: string[];
  onFilterAreaIdsChange: (ids: string[]) => void;
  filterGoalIds: string[];
  onFilterGoalIdsChange: (ids: string[]) => void;
  filterProjectIds: string[];
  onFilterProjectIdsChange: (ids: string[]) => void;
  areaPopoverOpen: boolean;
  onAreaPopoverOpenChange: (open: boolean) => void;
  goalPopoverOpen: boolean;
  onGoalPopoverOpenChange: (open: boolean) => void;
  projectPopoverOpen: boolean;
  onProjectPopoverOpenChange: (open: boolean) => void;
  activeAreas: { id: string; name: string; icon?: string | null; archive?: boolean }[];
  activeGoals: { id: string; name: string; is_archived?: boolean }[];
  activeProjects: { id: string; name: string; is_archived?: boolean }[];
  hasFilters: boolean;
  onClearFilters: () => void;
}

export function TasksFilterBar({
  filterPriority,
  onFilterPriorityChange,
  filterAreaIds,
  onFilterAreaIdsChange,
  filterGoalIds,
  onFilterGoalIdsChange,
  filterProjectIds,
  onFilterProjectIdsChange,
  areaPopoverOpen,
  onAreaPopoverOpenChange,
  goalPopoverOpen,
  onGoalPopoverOpenChange,
  projectPopoverOpen,
  onProjectPopoverOpenChange,
  activeAreas,
  activeGoals,
  activeProjects,
  hasFilters,
  onClearFilters,
}: TasksFilterBarProps) {
  const selectedAreaLabels = filterAreaIds
    .map((id) => activeAreas.find((a) => a.id === id))
    .filter(Boolean)
    .map(
      (a) =>
        `${(a as { icon?: string }).icon ? `${(a as { icon?: string }).icon} ` : ""}${(a as { name: string }).name}`,
    );

  const selectedGoalLabels = filterGoalIds
    .map((id) => activeGoals.find((g) => g.id === id))
    .filter(Boolean)
    .map((g) => (g as { name: string }).name);

  const selectedProjectLabels = filterProjectIds
    .map((id) => activeProjects.find((p) => p.id === id))
    .filter(Boolean)
    .map((p) => (p as { name: string }).name);

  return (
    <div className="flex items-center gap-3 border-b border-border/30 px-6 py-3">
      <Filter className="size-3.5 shrink-0 text-muted-foreground" />
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filterPriority || ALL_PRIORITY_VALUE}
          onValueChange={(value) =>
            onFilterPriorityChange(value === ALL_PRIORITY_VALUE ? "" : (value ?? ""))
          }
        >
          <SelectTrigger className="h-9 sm:h-7 w-[120px] text-xs">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_PRIORITY_VALUE}>All priorities</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Popover open={areaPopoverOpen} onOpenChange={onAreaPopoverOpenChange}>
          <PopoverTrigger
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-9 sm:h-7 gap-1 px-2 py-0 text-xs font-normal",
            )}
          >
            {filterAreaIds.length === 0 ? (
              "Area"
            ) : (
              <span className="flex items-center gap-1">
                <span className="max-w-[100px] truncate">{selectedAreaLabels[0]}</span>
                {selectedAreaLabels.length > 1 && (
                  <Badge variant="secondary" className="h-4 px-1 text-2xs">
                    +{selectedAreaLabels.length - 1}
                  </Badge>
                )}
              </span>
            )}
            <ChevronDownIcon className="size-3 text-muted-foreground" />
          </PopoverTrigger>
          <PopoverContent className={filterPopoverContentClassName}>
            <div className="space-y-1">
              {activeAreas.length === 0 && (
                <p className="px-2 py-1 text-xs text-muted-foreground">No areas available.</p>
              )}
              <ScrollArea className="max-h-60 w-full">
                {activeAreas.map((area) => {
                  const checked = filterAreaIds.includes(area.id);
                  return (
                    <label key={area.id} className={filterOptionClassName}>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) => {
                          onFilterAreaIdsChange(
                            next === true
                              ? Array.from(new Set([...filterAreaIds, area.id]))
                              : filterAreaIds.filter((id) => id !== area.id),
                          );
                        }}
                      />
                      <span className={filterOptionLabelClassName}>
                        {area.icon ? `${area.icon} ` : ""}
                        {area.name}
                      </span>
                    </label>
                  );
                })}
              </ScrollArea>
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={goalPopoverOpen} onOpenChange={onGoalPopoverOpenChange}>
          <PopoverTrigger
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-9 sm:h-7 gap-1 px-2 py-0 text-xs font-normal",
            )}
          >
            {filterGoalIds.length === 0 ? (
              "Goal"
            ) : (
              <span className="flex items-center gap-1">
                <span className="max-w-[100px] truncate">{selectedGoalLabels[0]}</span>
                {selectedGoalLabels.length > 1 && (
                  <Badge variant="secondary" className="h-4 px-1 text-2xs">
                    +{selectedGoalLabels.length - 1}
                  </Badge>
                )}
              </span>
            )}
            <ChevronDownIcon className="size-3 text-muted-foreground" />
          </PopoverTrigger>
          <PopoverContent className={filterPopoverContentClassName}>
            <div className="space-y-1">
              {activeGoals.length === 0 && (
                <p className="px-2 py-1 text-xs text-muted-foreground">No goals available.</p>
              )}
              <ScrollArea className="max-h-60 w-full">
                {activeGoals.map((goal) => {
                  const checked = filterGoalIds.includes(goal.id);
                  return (
                    <label key={goal.id} className={filterOptionClassName}>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) => {
                          onFilterGoalIdsChange(
                            next === true
                              ? Array.from(new Set([...filterGoalIds, goal.id]))
                              : filterGoalIds.filter((id) => id !== goal.id),
                          );
                        }}
                      />
                      <span className={filterOptionLabelClassName}>{goal.name}</span>
                    </label>
                  );
                })}
              </ScrollArea>
            </div>
          </PopoverContent>
        </Popover>

        <Popover open={projectPopoverOpen} onOpenChange={onProjectPopoverOpenChange}>
          <PopoverTrigger
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-9 sm:h-7 gap-1 px-2 py-0 text-xs font-normal",
            )}
          >
            {filterProjectIds.length === 0 ? (
              "Project"
            ) : (
              <span className="flex items-center gap-1">
                <span className="max-w-[100px] truncate">{selectedProjectLabels[0]}</span>
                {selectedProjectLabels.length > 1 && (
                  <Badge variant="secondary" className="h-4 px-1 text-2xs">
                    +{selectedProjectLabels.length - 1}
                  </Badge>
                )}
              </span>
            )}
            <ChevronDownIcon className="size-3 text-muted-foreground" />
          </PopoverTrigger>
          <PopoverContent className={filterPopoverContentClassName}>
            <div className="space-y-1">
              {activeProjects.length === 0 && (
                <p className="px-2 py-1 text-xs text-muted-foreground">
                  No projects available.
                </p>
              )}
              <ScrollArea className="max-h-60 w-full">
                {activeProjects.map((project) => {
                  const checked = filterProjectIds.includes(project.id);
                  return (
                    <label key={project.id} className={filterOptionClassName}>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) => {
                          onFilterProjectIdsChange(
                            next === true
                              ? Array.from(new Set([...filterProjectIds, project.id]))
                              : filterProjectIds.filter((id) => id !== project.id),
                          );
                        }}
                      />
                      <span className={filterOptionLabelClassName}>{project.name}</span>
                    </label>
                  );
                })}
              </ScrollArea>
            </div>
          </PopoverContent>
        </Popover>

        {hasFilters && (
          <button
            onClick={onClearFilters}
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

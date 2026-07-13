"use client";

import React, { useMemo, useState } from "react";
import {
  BookOpen,
  ChevronDownIcon,
  Filter,
  Search,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  NOTES_SEARCH_PLACEHOLDER,
} from "@/lib/utils/note-page-display";

export const ALL_STATUS_VALUE = "__all_status__";
export const ALL_NOTEBOOK_VALUE = "__all_notebooks__";

interface AreaOption {
  id: string;
  name: string;
  icon?: string | null;
}

interface GoalOption {
  id: string;
  name: string;
}

interface ProjectOption {
  id: string;
  name: string;
}

interface TaskOption {
  id: string;
  name: string;
}

export interface NotesFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filterStatus: string;
  onFilterStatusChange: (value: string) => void;
  filterAreaIds: string[];
  onFilterAreaIdsChange: (ids: string[]) => void;
  filterGoalIds: string[];
  onFilterGoalIdsChange: (ids: string[]) => void;
  filterProjectIds: string[];
  onFilterProjectIdsChange: (ids: string[]) => void;
  filterTaskIds: string[];
  onFilterTaskIdsChange: (ids: string[]) => void;
  filterNotebook: string;
  onFilterNotebookChange: (value: string) => void;
  activeAreas: AreaOption[];
  activeGoals: GoalOption[];
  activeProjects: ProjectOption[];
  allTasks: TaskOption[];
  notebooks: string[];
  onClearFilters: () => void;
}

export function NotesFilterBar({
  search,
  onSearchChange,
  filterStatus,
  onFilterStatusChange,
  filterAreaIds,
  onFilterAreaIdsChange,
  filterGoalIds,
  onFilterGoalIdsChange,
  filterProjectIds,
  onFilterProjectIdsChange,
  filterTaskIds,
  onFilterTaskIdsChange,
  filterNotebook,
  onFilterNotebookChange,
  activeAreas,
  activeGoals,
  activeProjects,
  allTasks,
  notebooks,
  onClearFilters,
}: NotesFilterBarProps) {
  const [areaPopoverOpen, setAreaPopoverOpen] = useState(false);
  const [goalPopoverOpen, setGoalPopoverOpen] = useState(false);
  const [projectPopoverOpen, setProjectPopoverOpen] = useState(false);
  const [taskPopoverOpen, setTaskPopoverOpen] = useState(false);

  const hasFilters = Boolean(
    filterStatus ||
      filterAreaIds.length > 0 ||
      filterGoalIds.length > 0 ||
      filterProjectIds.length > 0 ||
      filterTaskIds.length > 0 ||
      filterNotebook !== ALL_NOTEBOOK_VALUE ||
      search.trim(),
  );

  const selectedAreaLabels = useMemo(
    () =>
      filterAreaIds
        .map((id) => activeAreas.find((a) => a.id === id))
        .filter(Boolean)
        .map((a) => `${a!.icon ? `${a!.icon} ` : ""}${a!.name}`),
    [filterAreaIds, activeAreas],
  );

  const selectedGoalLabels = useMemo(
    () =>
      filterGoalIds
        .map((id) => activeGoals.find((g) => g.id === id))
        .filter(Boolean)
        .map((g) => g!.name),
    [filterGoalIds, activeGoals],
  );

  const selectedProjectLabels = useMemo(
    () =>
      filterProjectIds
        .map((id) => activeProjects.find((p) => p.id === id))
        .filter(Boolean)
        .map((p) => p!.name),
    [filterProjectIds, activeProjects],
  );

  const selectedTaskLabels = useMemo(
    () =>
      filterTaskIds
        .map((id) => allTasks.find((t) => t.id === id))
        .filter(Boolean)
        .map((t) => t!.name),
    [filterTaskIds, allTasks],
  );

  const filterPopoverContentClassName = "w-80 max-w-[calc(100vw-2rem)] overflow-x-hidden p-2";
  const filterOptionClassName =
    "flex w-full cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm leading-5 transition-colors hover:bg-muted/40";
  const filterOptionLabelClassName = "min-w-0 flex-1 whitespace-normal break-words text-sm";

  return (
    <div className="flex items-center gap-3 border-b border-border/30 px-6 py-3">
      <Filter className="size-3.5 shrink-0 text-muted-foreground" />
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={NOTES_SEARCH_PLACEHOLDER}
            className="h-10 sm:h-8 w-44 pl-8 text-xs"
          />
        </div>

        <Select
          value={filterStatus || ALL_STATUS_VALUE}
          onValueChange={(value) =>
            onFilterStatusChange(value === ALL_STATUS_VALUE ? "" : (value || ""))
          }
        >
          <SelectTrigger className="h-10 sm:h-8 w-[160px] sm:w-52 sm:w-48 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUS_VALUE}>All statuses</SelectItem>
            <SelectItem value="inbox">Inbox</SelectItem>
            <SelectItem value="to_review">To Review</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="archive">Archive</SelectItem>
          </SelectContent>
        </Select>

        <Popover open={areaPopoverOpen} onOpenChange={setAreaPopoverOpen}>
          <PopoverTrigger
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-10 sm:h-8 gap-1 px-2 py-0 text-xs font-normal",
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

        <Popover open={goalPopoverOpen} onOpenChange={setGoalPopoverOpen}>
          <PopoverTrigger
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-10 sm:h-8 gap-1 px-2 py-0 text-xs font-normal",
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

        <Popover open={projectPopoverOpen} onOpenChange={setProjectPopoverOpen}>
          <PopoverTrigger
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-10 sm:h-8 gap-1 px-2 py-0 text-xs font-normal",
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
                <p className="px-2 py-1 text-xs text-muted-foreground">No projects available.</p>
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

        <Popover open={taskPopoverOpen} onOpenChange={setTaskPopoverOpen}>
          <PopoverTrigger
            className={cn(
              buttonVariants({ variant: "outline" }),
              "h-10 sm:h-8 gap-1 px-2 py-0 text-xs font-normal",
            )}
          >
            {filterTaskIds.length === 0 ? (
              "Task"
            ) : (
              <span className="flex items-center gap-1">
                <span className="max-w-[100px] truncate">{selectedTaskLabels[0]}</span>
                {selectedTaskLabels.length > 1 && (
                  <Badge variant="secondary" className="h-4 px-1 text-2xs">
                    +{selectedTaskLabels.length - 1}
                  </Badge>
                )}
              </span>
            )}
            <ChevronDownIcon className="size-3 text-muted-foreground" />
          </PopoverTrigger>
          <PopoverContent className={filterPopoverContentClassName}>
            <div className="space-y-1">
              {allTasks.length === 0 && (
                <p className="px-2 py-1 text-xs text-muted-foreground">No tasks available.</p>
              )}
              <ScrollArea className="max-h-60 w-full">
                {allTasks.map((task) => {
                  const checked = filterTaskIds.includes(task.id);
                  return (
                    <label key={task.id} className={filterOptionClassName}>
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) => {
                          onFilterTaskIdsChange(
                            next === true
                              ? Array.from(new Set([...filterTaskIds, task.id]))
                              : filterTaskIds.filter((id) => id !== task.id),
                          );
                        }}
                      />
                      <span className={filterOptionLabelClassName}>{task.name}</span>
                    </label>
                  );
                })}
              </ScrollArea>
            </div>
          </PopoverContent>
        </Popover>

        <Select
          value={filterNotebook}
          onValueChange={(value) => onFilterNotebookChange(value || "")}
        >
          <SelectTrigger className="h-10 sm:h-8 w-[160px] sm:w-52 text-xs">
            <SelectValue placeholder="Notebook" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_NOTEBOOK_VALUE}>All notebooks</SelectItem>
            {notebooks.map((nb) => (
              <SelectItem key={nb} value={nb}>
                <BookOpen className="mr-1 inline size-3" />
                {nb}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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

"use client";

import React, { useMemo, useState } from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpdateProject } from "@/lib/hooks/use-projects";
import { useValidIds } from "@/lib/hooks/use-valid-ids";
import type { Note, Project, Resource, Task } from "@/lib/types/domain.types";
import { PROJECT_STATUS } from "@/lib/utils/constants";
import { relativeTime } from "@/lib/utils/dates";
import { getNoteLinkedAreaIds } from "@/lib/utils/notes";
import { getResourceLinkedAreaIds } from "@/lib/utils/resources";
import { cn } from "@/lib/utils";
import {
  filterProjectDialogAreas,
  filterProjectDialogGoals,
} from "@/lib/utils/project-dialog-filters";
import { TaskProcessForm } from "@/components/entities/inbox-task-process-form";
import { NoteInboxProcessForm } from "@/components/entities/note-inbox-process-form";
import { ResourceInboxProcessForm } from "@/components/entities/resource-inbox-process-form";

// Entity-type icons — match the emoji rollups used on project-card / area-card.
export const PROJECT_ICON = "📁";
export const TASK_ICON = "☑️";
export const NOTE_ICON = "📝";
export const RESOURCE_ICON = "🔗";

// ─── Compact DropdownMenu multi-select (matches project/task-dialog style) ─

interface CompactDropdownMultiSelectProps {
  label: string;
  placeholder: string;
  selectedCount: number;
  candidates: { id: string; name: string; icon?: string | null }[];
  isSelected: (id: string) => boolean;
  onToggle: (id: string) => void;
  onClear: () => void;
  emptyMessage: string;
  renderSelected?: () => React.ReactNode;
}

function CompactDropdownMultiSelect({
  label,
  placeholder,
  selectedCount,
  candidates,
  isSelected,
  onToggle,
  onClear,
  emptyMessage,
  renderSelected,
}: CompactDropdownMultiSelectProps) {
  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <DropdownMenu>
          <DropdownMenuTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
            {selectedCount === 0 ? placeholder : `${selectedCount} selected`}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 max-h-80">
            <DropdownMenuItem
              onSelect={(e) => e.preventDefault()}
              onClick={onClear}
              className="text-xs"
            >
              Clear selection
            </DropdownMenuItem>
            <div className="max-h-64 overflow-y-auto">
              {candidates.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">{emptyMessage}</div>
              ) : (
                candidates.map((opt) => {
                  const checked = isSelected(opt.id);
                  return (
                    <DropdownMenuItem
                      key={opt.id}
                      onSelect={(e) => e.preventDefault()}
                      onClick={() => onToggle(opt.id)}
                      className="flex items-center gap-2"
                    >
                      <span className="pointer-events-none">
                        <Checkbox checked={checked} />
                      </span>
                      {opt.icon ? `${opt.icon} ` : ""}
                      {opt.name}
                    </DropdownMenuItem>
                  );
                })
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {renderSelected?.()}
    </div>
  );
}

// ─── Project processing form ────────────────────────────────────────────────

interface ProjectProcessFormProps {
  project: Project;
  areaOptions: { id: string; name: string; icon?: string | null }[];
  goalOptions: {
    id: string;
    name: string;
    area_id: string | null;
    linkedAreaIds?: string[];
  }[];
  onClose: () => void;
}

export function ProjectProcessForm({
  project,
  areaOptions,
  goalOptions,
  onClose,
}: ProjectProcessFormProps) {
  const updateProject = useUpdateProject();
  const [rawAreaIds, setRawAreaIds] = useState<string[]>(
    project.linkedAreaIds ?? (project.area_id ? [project.area_id] : []),
  );
  const [rawGoalIds, setRawGoalIds] = useState<string[]>(project.linkedGoalIds ?? []);
  const [startDate, setStartDate] = useState<string>(project.start_date ?? "");
  const [dueDate, setDueDate] = useState<string>(project.due_date ?? "");
  const [status, _setStatus] = useState<string>(
    project.status ?? PROJECT_STATUS.ACTIVE,
  );

  const toggleArea = (id: string) =>
    setRawAreaIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const toggleGoal = (id: string) =>
    setRawGoalIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  // Mirror project-dialog: narrow visible goals by selected areas and
  // visible areas by selected goals; prune any selected ids that fall
  // out of the visible set.
  const visibleGoals = useMemo(
    () => filterProjectDialogGoals(goalOptions, rawAreaIds),
    [goalOptions, rawAreaIds],
  );
  const visibleAreas = useMemo(
    () => filterProjectDialogAreas(areaOptions, goalOptions, rawAreaIds, rawGoalIds),
    [areaOptions, goalOptions, rawAreaIds, rawGoalIds],
  );

  // Derive filtered ID subsets from raw user picks, stripping any IDs
  // no longer present in the corresponding visible set. Done at render
  // time instead of via useEffect reconciliation, to avoid the
  // cascading-render anti-pattern flagged by react-hooks/set-state-in-effect.
  const goalIds = useValidIds(rawGoalIds, visibleGoals.map((goal) => goal.id));
  const areaIds = useValidIds(rawAreaIds, visibleAreas.map((area) => area.id));

  const handleSave = () => {
    updateProject.mutate(
      {
        id: project.id,
        input: {
          area_id: areaIds[0] ?? null,
          area_ids: areaIds,
          goal_ids: goalIds,
          start_date: startDate || null,
          due_date: dueDate || null,
          status: status as Project["status"],
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="mt-2 grid gap-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <CompactDropdownMultiSelect
          label="Area"
          placeholder="Select area…"
          selectedCount={areaIds.length}
          candidates={visibleAreas}
          isSelected={(id) => areaIds.includes(id)}
          onToggle={toggleArea}
          onClear={() => setRawAreaIds([])}
          emptyMessage={
            areaOptions.length === 0
              ? "No areas available."
              : goalIds.length > 0
                ? "No areas match selected goals."
                : "No areas available."
          }
          renderSelected={() =>
            areaIds.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {areaIds
                  .map((id) => areaOptions.find((a) => a.id === id))
                  .filter((a): a is { id: string; name: string; icon?: string | null } =>
                    Boolean(a),
                  )
                  .map((area) => (
                    <Badge
                      key={area.id}
                      variant="secondary"
                      className="flex items-center gap-1 text-2xs"
                    >
                      {area.icon ? `${area.icon} ` : ""}
                      {area.name}
                      <button
                        type="button"
                        onClick={() => toggleArea(area.id)}
                        className="ml-1 rounded-full p-0.5 hover:bg-muted"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
              </div>
            ) : null
          }
        />

        <CompactDropdownMultiSelect
          label="Goal"
          placeholder="Select goal…"
          selectedCount={goalIds.length}
          candidates={visibleGoals}
          isSelected={(id) => goalIds.includes(id)}
          onToggle={toggleGoal}
          onClear={() => setRawGoalIds([])}
          emptyMessage={
            goalOptions.length === 0
              ? "No goals available."
              : areaIds.length > 0
                ? "No goals in selected areas."
                : "No goals available."
          }
          renderSelected={() =>
            goalIds.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {goalIds
                  .map((id) => goalOptions.find((g) => g.id === id))
                  .filter(
                    (g): g is {
                      id: string;
                      name: string;
                      area_id: string | null;
                      linkedAreaIds?: string[];
                    } => Boolean(g),
                  )
                  .map((goal) => (
                    <Badge
                      key={goal.id}
                      variant="secondary"
                      className="flex items-center gap-1 text-2xs"
                    >
                      {goal.name}
                      <button
                        type="button"
                        onClick={() => toggleGoal(goal.id)}
                        className="ml-1 rounded-full p-0.5 hover:bg-muted"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
              </div>
            ) : null
          }
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">Start Date</span>
          <DatePicker
            value={startDate || null}
            onChange={(v) => setStartDate(v ?? "")}
            placeholder="Pick start date"
          />
        </div>
        <div className="grid gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">End Date</span>
          <DatePicker
            value={dueDate || null}
            onChange={(v) => setDueDate(v ?? "")}
            min={startDate || undefined}
            placeholder="Pick end date"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <Badge
          variant="secondary"
          className="gap-1 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
        >
          {PROJECT_ICON} project
        </Badge>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={handleSave}
            disabled={updateProject.isPending}
          >
            Process
          </Button>
          <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Inbox row wrappers ─────────────────────────────────────────────────────

interface InboxProjectRowProps {
  project: Project;
  areaOptions: { id: string; name: string; icon?: string | null }[];
  goalOptions: {
    id: string;
    name: string;
    area_id: string | null;
    linkedAreaIds?: string[];
  }[];
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}

export function InboxProjectRow({
  project,
  areaOptions,
  goalOptions,
  expanded,
  onExpand,
  onCollapse,
}: InboxProjectRowProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-card p-3 transition-colors",
        expanded && "border-primary/40 bg-accent/20",
      )}
    >
      <div className="flex items-center gap-3">
        <Badge
          variant="secondary"
          className="shrink-0 gap-1 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
        >
          <span className="text-xs">{PROJECT_ICON}</span> project
        </Badge>

        <span className="min-w-0 flex-1 truncate text-sm font-medium">{project.name}</span>

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-muted-foreground">{relativeTime(project.created_at)}</span>
          {expanded ? (
            <button
              onClick={onCollapse}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Cancel"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <Button size="sm" variant="outline" className="h-9 text-xs sm:h-7" onClick={onExpand}>
              Process
            </Button>
          )}
        </div>
      </div>

      {expanded && (
        <ProjectProcessForm
          project={project}
          areaOptions={areaOptions}
          goalOptions={goalOptions}
          onClose={onCollapse}
        />
      )}
    </div>
  );
}

interface InboxTaskRowProps {
  task: Task;
  areaOptions: { id: string; name: string; icon?: string | null }[];
  goalOptions: {
    id: string;
    name: string;
    area_id: string | null;
    linkedAreaIds?: string[];
  }[];
  projectOptions: { id: string; name: string }[];
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}

export function InboxTaskRow({
  task,
  areaOptions,
  goalOptions,
  projectOptions,
  expanded,
  onExpand,
  onCollapse,
}: InboxTaskRowProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-card p-3 transition-colors",
        expanded && "border-primary/40 bg-accent/20",
      )}
    >
      <div className="flex items-center gap-3">
        <Badge
          variant="secondary"
          className="shrink-0 gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
        >
          <span className="text-xs">{TASK_ICON}</span> task
        </Badge>

        <span className="min-w-0 flex-1 truncate text-sm font-medium">{task.name}</span>

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-muted-foreground">{relativeTime(task.created_at)}</span>
          {expanded ? (
            <button
              onClick={onCollapse}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Cancel"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <Button size="sm" variant="outline" className="h-9 text-xs sm:h-7" onClick={onExpand}>
              Process
            </Button>
          )}
        </div>
      </div>

      {expanded && (
        <TaskProcessForm
          task={task}
          areaOptions={areaOptions}
          goalOptions={goalOptions}
          projectOptions={projectOptions}
          onClose={onCollapse}
        />
      )}
    </div>
  );
}

interface InboxNoteRowProps {
  note: Note;
  areaName?: string;
  areaOptions: { id: string; name: string; icon?: string | null }[];
  goalOptions: {
    id: string;
    name: string;
    area_id: string | null;
    linkedAreaIds?: string[];
  }[];
  projectOptions: { id: string; name: string }[];
  taskOptions: { id: string; name: string }[];
  notebookOptions: string[];
  projectGoalIdsMap: Map<string, string[]>;
  taskGoalIdsMap: Map<string, string[]>;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}

export function InboxNoteRow({
  note,
  areaName,
  areaOptions,
  goalOptions,
  projectOptions,
  taskOptions,
  notebookOptions,
  projectGoalIdsMap,
  taskGoalIdsMap,
  expanded,
  onExpand,
  onCollapse,
}: InboxNoteRowProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-card p-3 transition-colors",
        expanded && "border-primary/40 bg-accent/20",
      )}
    >
      <div className="flex items-center gap-3">
        <Badge
          variant="secondary"
          className="shrink-0 gap-1 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
        >
          <span className="text-xs">{NOTE_ICON}</span> note
        </Badge>

        <span className="min-w-0 flex-1 truncate text-sm font-medium">{note.name}</span>

        <div className="flex shrink-0 items-center gap-2">
          {areaName && (
            <span className="hidden text-xs text-muted-foreground sm:block">{areaName}</span>
          )}
          <span className="text-xs text-muted-foreground">{relativeTime(note.created_at)}</span>
          {expanded ? (
            <button
              onClick={onCollapse}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Cancel"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <Button size="sm" variant="outline" className="h-9 text-xs sm:h-7" onClick={onExpand}>
              Process
            </Button>
          )}
        </div>
      </div>

      {expanded && (
        <NoteInboxProcessForm
          note={note}
          areaOptions={areaOptions}
          goalOptions={goalOptions}
          projectOptions={projectOptions}
          taskOptions={taskOptions}
          notebookOptions={notebookOptions}
          projectGoalIdsMap={projectGoalIdsMap}
          taskGoalIdsMap={taskGoalIdsMap}
          onClose={onCollapse}
        />
      )}
    </div>
  );
}

interface InboxResourceRowProps {
  resource: Resource;
  areaName?: string;
  areaOptions: { id: string; name: string; icon?: string | null }[];
  goalOptions: {
    id: string;
    name: string;
    area_id: string | null;
    linkedAreaIds?: string[];
  }[];
  projectOptions: { id: string; name: string }[];
  taskOptions: { id: string; name: string }[];
  topicOptions: { id: string; name: string }[];
  projectGoalIdsMap: Map<string, string[]>;
  taskGoalIdsMap: Map<string, string[]>;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}

export function InboxResourceRow({
  resource,
  areaName,
  areaOptions,
  goalOptions,
  projectOptions,
  taskOptions,
  topicOptions,
  projectGoalIdsMap,
  taskGoalIdsMap,
  expanded,
  onExpand,
  onCollapse,
}: InboxResourceRowProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-card p-3 transition-colors",
        expanded && "border-primary/40 bg-accent/20",
      )}
    >
      <div className="flex items-center gap-3">
        <Badge
          variant="secondary"
          className="shrink-0 gap-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
        >
          <span className="text-xs">{RESOURCE_ICON}</span> resource
        </Badge>

        <span className="min-w-0 flex-1 truncate text-sm font-medium">{resource.name}</span>

        <div className="flex shrink-0 items-center gap-2">
          {areaName && (
            <span className="hidden text-xs text-muted-foreground sm:block">{areaName}</span>
          )}
          <span className="text-xs text-muted-foreground">{relativeTime(resource.created_at)}</span>
          {expanded ? (
            <button
              onClick={onCollapse}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Cancel"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <Button size="sm" variant="outline" className="h-9 text-xs sm:h-7" onClick={onExpand}>
              Process
            </Button>
          )}
        </div>
      </div>

      {expanded && (
        <ResourceInboxProcessForm
          resource={resource}
          areaOptions={areaOptions}
          goalOptions={goalOptions}
          projectOptions={projectOptions}
          taskOptions={taskOptions}
          topicOptions={topicOptions}
          projectGoalIdsMap={projectGoalIdsMap}
          taskGoalIdsMap={taskGoalIdsMap}
          onClose={onCollapse}
        />
      )}
    </div>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

export function InboxItemSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
      <Skeleton className="h-5 w-10 rounded-full" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-7 w-20" />
    </div>
  );
}

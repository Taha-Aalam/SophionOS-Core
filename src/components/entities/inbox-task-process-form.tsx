"use client";

import React, { useEffect, useMemo, useState } from "react";
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
import { useUpdateTask } from "@/lib/hooks/use-tasks";
import type { Task } from "@/lib/types/domain.types";
import { TASK_STATUS } from "@/lib/utils/constants";
import {
  computeFilteredProjects,
  computeVisibleGoalsForProjects,
  computeVisibleAreasForProjects,
} from "@/lib/utils/task-dialog-filters";

const TASK_ICON = "☑️";
const UNSET = "__none__";

interface TaskProcessFormProps {
  task: Task;
  areaOptions: { id: string; name: string; icon?: string | null }[];
  goalOptions: {
    id: string;
    name: string;
    area_id: string | null;
    linkedAreaIds?: string[];
  }[];
  projectOptions: {
    id: string;
    name: string;
    area_id?: string | null;
    linkedAreaIds?: string[];
    linkedGoalIds?: string[];
  }[];
  onClose: () => void;
}

export function TaskProcessForm({
  task,
  areaOptions,
  goalOptions,
  projectOptions,
  onClose,
}: TaskProcessFormProps) {
  const updateTask = useUpdateTask();
  const [areaIds, setAreaIds] = useState<string[]>(
    task.linkedAreaIds ?? (task.area_id ? [task.area_id] : []),
  );
  const [goalIds, setGoalIds] = useState<string[]>(task.linkedGoalIds ?? []);
  const [projectIds, setProjectIds] = useState<string[]>(
    task.linkedProjectIds ?? (task.project_id ? [task.project_id] : []),
  );
  const [dueDate, setDueDate] = useState<string>(task.due_date ?? "");
  const [status, setStatus] = useState<string>(TASK_STATUS.TODO);
  const [priority, setPriority] = useState<string>(task.priority ?? UNSET);

  const toggleArea = (id: string) =>
    setAreaIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const toggleGoal = (id: string) =>
    setGoalIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const toggleProject = (id: string) =>
    setProjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const projectById = useMemo(
    () => new Map(projectOptions.map((p) => [p.id, p])),
    [projectOptions],
  );

  const visibleGoals = useMemo(
    () => computeVisibleGoalsForProjects(
      goalOptions, projectIds, areaIds, projectById,
    ),
    [goalOptions, projectIds, areaIds, projectById],
  );

  const visibleAreas = useMemo(
    () => computeVisibleAreasForProjects(
      areaOptions, goalIds, projectIds, projectById, goalOptions,
    ),
    [areaOptions, goalOptions, goalIds, projectIds, projectById],
  );

  const filteredProjects = useMemo(
    () => computeFilteredProjects(projectOptions, goalIds, areaIds),
    [projectOptions, goalIds, areaIds],
  );

  useEffect(() => {
    const allowedGoalIds = new Set(visibleGoals.map((goal) => goal.id));
    const nextGoalIds = goalIds.filter((goalId) => allowedGoalIds.has(goalId));
    if (nextGoalIds.length !== goalIds.length) {
      setGoalIds(nextGoalIds);
    }
  }, [visibleGoals, goalIds]);

  useEffect(() => {
    const allowedAreaIds = new Set(visibleAreas.map((area) => area.id));
    const nextAreaIds = areaIds.filter((areaId) => allowedAreaIds.has(areaId));
    if (nextAreaIds.length !== areaIds.length) {
      setAreaIds(nextAreaIds);
    }
  }, [visibleAreas, areaIds]);

  useEffect(() => {
    const allowedProjectIds = new Set(filteredProjects.map((p) => p.id));
    const nextProjectIds = projectIds.filter((id) => allowedProjectIds.has(id));
    if (nextProjectIds.length !== projectIds.length) {
      setProjectIds(nextProjectIds);
    }
  }, [filteredProjects, projectIds]);

  const handleSave = () => {
    updateTask.mutate(
      {
        id: task.id,
        input: {
          area_id: areaIds[0] ?? null,
          area_ids: areaIds,
          goal_ids: goalIds,
          project_id: projectIds[0] ?? null,
          project_ids: projectIds,
          due_date: dueDate || null,
          priority: priority === UNSET ? undefined : (priority as Task["priority"]),
          status: status as Task["status"],
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="mt-2 grid gap-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <DropdownMultiSelect
          label="Area"
          placeholder="Select area…"
          selectedCount={areaIds.length}
          candidates={visibleAreas}
          isSelected={(id) => areaIds.includes(id)}
          onToggle={toggleArea}
          onClear={() => setAreaIds([])}
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
                      className="flex items-center gap-1 text-[10px]"
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

        <DropdownMultiSelect
          label="Goal"
          placeholder="Select goal…"
          selectedCount={goalIds.length}
          candidates={visibleGoals}
          isSelected={(id) => goalIds.includes(id)}
          onToggle={toggleGoal}
          onClear={() => setGoalIds([])}
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
                      className="flex items-center gap-1 text-[10px]"
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

      <DropdownMultiSelect
        label="Project"
        placeholder="Select project…"
        selectedCount={projectIds.length}
        candidates={filteredProjects}
        isSelected={(id) => projectIds.includes(id)}
        onToggle={toggleProject}
        onClear={() => setProjectIds([])}
        emptyMessage={
          projectOptions.length === 0
            ? "No projects available."
            : goalIds.length > 0 || areaIds.length > 0
              ? "No projects match selected context."
              : "No projects available."
        }
        renderSelected={() =>
          projectIds.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {projectIds
                .map((id) => projectOptions.find((p) => p.id === id))
                .filter((p): p is { id: string; name: string } => Boolean(p))
                .map((project) => (
                  <Badge
                    key={project.id}
                    variant="secondary"
                    className="flex items-center gap-1 text-[10px]"
                  >
                    {project.name}
                    <button
                      type="button"
                      onClick={() => toggleProject(project.id)}
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

      <div className="grid gap-1.5 sm:max-w-xs">
        <span className="text-xs font-medium text-muted-foreground">Due Date</span>
        <DatePicker
          value={dueDate || null}
          onChange={(v) => setDueDate(v ?? "")}
          placeholder="Pick due date"
        />
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        <Badge
          variant="secondary"
          className="gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
        >
          {TASK_ICON} task
        </Badge>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={handleSave}
            disabled={updateTask.isPending}
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

interface DropdownMultiSelectProps {
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

function DropdownMultiSelect({
  label,
  placeholder,
  selectedCount,
  candidates,
  isSelected,
  onToggle,
  onClear,
  emptyMessage,
  renderSelected,
}: DropdownMultiSelectProps) {
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

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUpdateNote } from "@/lib/hooks/use-notes";
import type { Note } from "@/lib/types/domain.types";
import { NOTE_STATUS } from "@/lib/utils/constants";
import {
  computeVisibleAreas,
  computeFilteredProjects,
  computeFilteredGoals,
  computeFilteredTasks,
} from "@/lib/utils/resource-dialog-filters";

const NOTE_ICON = "📝";

interface NoteInboxProcessFormProps {
  note: Note;
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
  taskOptions: {
    id: string;
    name: string;
    area_id?: string | null;
    linkedAreaIds?: string[];
    linkedGoalIds?: string[];
    project_id?: string | null;
  }[];
  projectGoalIdsMap: Map<string, string[]>;
  taskGoalIdsMap: Map<string, string[]>;
  onClose: () => void;
}

export function NoteInboxProcessForm({
  note,
  areaOptions,
  goalOptions,
  projectOptions,
  taskOptions,
  projectGoalIdsMap,
  taskGoalIdsMap,
  onClose,
}: NoteInboxProcessFormProps) {
  const updateNote = useUpdateNote();
  const [areaIds, setAreaIds] = useState<string[]>(
    note.linkedAreaIds ?? (note.area_id ? [note.area_id] : []),
  );
  const [goalIds, setGoalIds] = useState<string[]>(note.linkedGoalIds ?? []);
  const [projectIds, setProjectIds] = useState<string[]>(
    note.linkedProjectIds ?? (note.project_id ? [note.project_id] : []),
  );
  const [taskIds, setTaskIds] = useState<string[]>(note.linkedTaskIds ?? []);
  const [status, setStatus] = useState<string>(NOTE_STATUS.TO_REVIEW);

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
  const toggleTask = (id: string) =>
    setTaskIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const selectedProject = useMemo(
    () => (projectIds.length > 0 ? { id: projectIds[0], linkedAreaIds: [] as string[], area_id: null } : null),
    [projectIds],
  );

  const visibleGoals = useMemo(
    () => computeFilteredGoals(
      goalOptions, areaIds, projectIds[0] ?? null, projectGoalIdsMap, taskGoalIdsMap, taskIds,
    ),
    [goalOptions, areaIds, projectIds, projectGoalIdsMap, taskGoalIdsMap, taskIds],
  );

  const visibleProjects = useMemo(
    () => computeFilteredProjects(
      projectOptions, areaIds, goalIds, projectGoalIdsMap, taskIds,
    ),
    [projectOptions, areaIds, goalIds, projectGoalIdsMap, taskIds],
  );

  const visibleAreas = useMemo(
    () => computeVisibleAreas(areaOptions, selectedProject, goalIds, taskIds),
    [areaOptions, selectedProject, goalIds, taskIds],
  );

  const visibleTasks = useMemo(
    () => computeFilteredTasks(
      taskOptions, areaIds, projectIds[0] ?? null, goalIds, taskGoalIdsMap,
    ),
    [taskOptions, areaIds, projectIds, goalIds, taskGoalIdsMap],
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
    const allowedProjectIds = new Set(visibleProjects.map((p) => p.id));
    const nextProjectIds = projectIds.filter((id) => allowedProjectIds.has(id));
    if (nextProjectIds.length !== projectIds.length) {
      setProjectIds(nextProjectIds);
    }
  }, [visibleProjects, projectIds]);

  useEffect(() => {
    const allowedTaskIds = new Set(visibleTasks.map((t) => t.id));
    const nextTaskIds = taskIds.filter((id) => allowedTaskIds.has(id));
    if (nextTaskIds.length !== taskIds.length) {
      setTaskIds(nextTaskIds);
    }
  }, [visibleTasks, taskIds]);

  const handleSave = () => {
    updateNote.mutate(
      {
        id: note.id,
        input: {
          area_id: areaIds[0] ?? null,
          area_ids: areaIds,
          goal_ids: goalIds,
          project_id: projectIds[0] ?? null,
          project_ids: projectIds,
          task_ids: taskIds,
          status: status as Note["status"],
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

      <div className="grid gap-3 sm:grid-cols-2">
        <DropdownMultiSelect
          label="Project"
          placeholder="Select project…"
          selectedCount={projectIds.length}
          candidates={visibleProjects}
          isSelected={(id) => projectIds.includes(id)}
          onToggle={toggleProject}
          onClear={() => setProjectIds([])}
          emptyMessage={
            projectOptions.length === 0
              ? "No projects available."
              : areaIds.length > 0 || goalIds.length > 0 || taskIds.length > 0
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

        <DropdownMultiSelect
          label="Task"
          placeholder="Select task…"
          selectedCount={taskIds.length}
          candidates={visibleTasks}
          isSelected={(id) => taskIds.includes(id)}
          onToggle={toggleTask}
          onClear={() => setTaskIds([])}
          emptyMessage={
            taskOptions.length === 0
              ? "No tasks available."
              : areaIds.length > 0 || goalIds.length > 0 || projectIds.length > 0
                ? "No tasks match selected context."
                : "No tasks available."
          }
          renderSelected={() =>
            taskIds.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {taskIds
                  .map((id) => taskOptions.find((t) => t.id === id))
                  .filter((t): t is { id: string; name: string } => Boolean(t))
                  .map((task) => (
                    <Badge
                      key={task.id}
                      variant="secondary"
                      className="flex items-center gap-1 text-[10px]"
                    >
                      {task.name}
                      <button
                        type="button"
                        onClick={() => toggleTask(task.id)}
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

      <div className="flex items-center justify-between gap-2 pt-1">
        <Badge
          variant="secondary"
          className="gap-1 bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300"
        >
          {NOTE_ICON} note
        </Badge>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={handleSave}
            disabled={updateNote.isPending}
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

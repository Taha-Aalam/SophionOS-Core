"use client";

import React, { useMemo, useState } from "react";
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
import { useUpdateResource } from "@/lib/hooks/use-resources";
import { useValidIds } from "@/lib/hooks/use-valid-ids";
import type { Resource } from "@/lib/types/domain.types";
import { RESOURCE_STATUS } from "@/lib/utils/constants";
import {
  computeVisibleAreas,
  computeFilteredProjects,
  computeFilteredGoals,
  computeFilteredTasks,
} from "@/lib/utils/resource-dialog-filters";

const RESOURCE_ICON = "🔗";

interface ResourceInboxProcessFormProps {
  resource: Resource;
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
  topicOptions: { id: string; name: string }[];
  projectGoalIdsMap: Map<string, string[]>;
  taskGoalIdsMap: Map<string, string[]>;
  onClose: () => void;
}

export function ResourceInboxProcessForm({
  resource,
  areaOptions,
  goalOptions,
  projectOptions,
  taskOptions,
  topicOptions,
  projectGoalIdsMap,
  taskGoalIdsMap,
  onClose,
}: ResourceInboxProcessFormProps) {
  const updateResource = useUpdateResource();
  const [rawAreaIds, setRawAreaIds] = useState<string[]>(
    resource.linkedAreaIds ?? (resource.area_id ? [resource.area_id] : []),
  );
  const [rawGoalIds, setRawGoalIds] = useState<string[]>(resource.linkedGoalIds ?? []);
  const [rawProjectId, setRawProjectId] = useState<string>(resource.project_id ?? "");
  const [rawTaskIds, setRawTaskIds] = useState<string[]>(resource.linkedTaskIds ?? []);
  const [topicId, setTopicId] = useState<string>(resource.topic_id ?? "");
  const [status, setStatus] = useState<string>(RESOURCE_STATUS.ACTIVE);

  const toggleArea = (id: string) =>
    setRawAreaIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const toggleGoal = (id: string) =>
    setRawGoalIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const toggleTask = (id: string) =>
    setRawTaskIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const toggleProject = (id: string) =>
    setRawProjectId((cur) => (cur === id ? "" : id));
  const toggleTopic = (id: string) =>
    setTopicId((cur) => (cur === id ? "" : id));

  // Derive selected entities (objects) from raw picks - the raw
  // user-pick list is the source of truth for "what the user chose";
  // the filtered `X` derived via useValidIds below is a subset used
  // for save payloads and to strip server-side removals.
  const selectedProject = useMemo(
    () => (rawProjectId ? projectOptions.find((p) => p.id === rawProjectId) ?? null : null),
    [rawProjectId, projectOptions],
  );

  const selectedGoals = useMemo(
    () => goalOptions.filter((g) => rawGoalIds.includes(g.id)),
    [goalOptions, rawGoalIds],
  );

  const selectedTasks = useMemo(
    () => taskOptions.filter((t) => rawTaskIds.includes(t.id)),
    [taskOptions, rawTaskIds],
  );

  // Build reverse lookup maps needed for filtering
  // goalProjectIdsMap: goalId -> projectIds[] (reverse of projectGoalIdsMap)
  const goalProjectIdsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const project of projectOptions) {
      for (const goalId of project.linkedGoalIds ?? []) {
        const current = map.get(goalId) ?? [];
        current.push(project.id);
        map.set(goalId, current);
      }
    }
    return map;
  }, [projectOptions]);

  // goalTaskIdsMap: goalId -> taskIds[] (reverse of taskGoalIdsMap)
  const goalTaskIdsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const task of taskOptions) {
      for (const goalId of task.linkedGoalIds ?? []) {
        const current = map.get(goalId) ?? [];
        current.push(task.id);
        map.set(goalId, current);
      }
    }
    return map;
  }, [taskOptions]);

  const visibleGoals = useMemo(
    () => computeFilteredGoals(
      goalOptions, rawAreaIds, rawProjectId || null, projectGoalIdsMap, taskGoalIdsMap, selectedTasks,
    ),
    [goalOptions, rawAreaIds, rawProjectId, projectGoalIdsMap, taskGoalIdsMap, selectedTasks],
  );

  const visibleProjects = useMemo(
    () => computeFilteredProjects(
      projectOptions, rawAreaIds, rawGoalIds, goalProjectIdsMap, selectedTasks,
    ),
    [projectOptions, rawAreaIds, rawGoalIds, goalProjectIdsMap, selectedTasks],
  );

  const visibleAreas = useMemo(
    () => computeVisibleAreas(areaOptions, selectedProject, selectedGoals, selectedTasks),
    [areaOptions, selectedProject, selectedGoals, selectedTasks],
  );

  const visibleTasks = useMemo(
    () => computeFilteredTasks(
      taskOptions, rawAreaIds, rawProjectId || null, rawGoalIds, goalTaskIdsMap,
    ),
    [taskOptions, rawAreaIds, rawProjectId, rawGoalIds, goalTaskIdsMap],
  );

  // Derive filtered ID subsets from raw user picks, stripping any IDs
  // no longer present in the corresponding visible set. Done at render
  // time instead of via useEffect reconciliation, to avoid the
  // cascading-render anti-pattern flagged by react-hooks/set-state-in-effect.
  const goalIds = useValidIds(rawGoalIds, visibleGoals.map((goal) => goal.id));
  const areaIds = useValidIds(rawAreaIds, visibleAreas.map((area) => area.id));
  const taskIds = useValidIds(rawTaskIds, visibleTasks.map((task) => task.id));
  // projectId is a single ID, not a list. Take the first (and only) valid
  // match, or fall back to empty string if the raw pick is no longer valid.
  const projectId = useValidIds(
    rawProjectId ? [rawProjectId] : [],
    visibleProjects.map((project) => project.id),
  )[0] ?? "";

  const handleSave = () => {
    updateResource.mutate(
      {
        id: resource.id,
        input: {
          area_id: areaIds[0] ?? null,
          area_ids: areaIds,
          goal_ids: goalIds,
          project_id: projectId || null,
          task_ids: taskIds,
          topic_id: topicId || null,
          status: status as Resource["status"],
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
          selectedCount={projectId ? 1 : 0}
          selectedLabel={projectOptions.find((p) => p.id === projectId)?.name}
          candidates={visibleProjects}
          isSelected={(id) => projectId === id}
          onToggle={toggleProject}
          onClear={() => setRawProjectId("")}
          emptyMessage={
            projectOptions.length === 0
              ? "No projects available."
              : areaIds.length > 0 || goalIds.length > 0 || taskIds.length > 0
                ? "No projects match selected context."
                : "No projects available."
          }
          renderSelected={() =>
            projectId ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {(() => {
                  const p = projectOptions.find((x) => x.id === projectId);
                  if (!p) return null;
                  return (
                    <Badge
                      key={p.id}
                      variant="secondary"
                      className="flex items-center gap-1 text-[10px]"
                    >
                      {p.name}
                      <button
                        type="button"
                        onClick={() => setRawProjectId("")}
                        className="ml-1 rounded-full p-0.5 hover:bg-muted"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  );
                })()}
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
          onClear={() => setRawTaskIds([])}
          emptyMessage={
            taskOptions.length === 0
              ? "No tasks available."
              : areaIds.length > 0 || goalIds.length > 0 || projectId
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

      <DropdownMultiSelect
        label="Topic"
        placeholder="Select topic…"
        selectedCount={topicId ? 1 : 0}
        selectedLabel={topicOptions.find((t) => t.id === topicId)?.name}
        candidates={topicOptions}
        isSelected={(id) => topicId === id}
        onToggle={toggleTopic}
        onClear={() => setTopicId("")}
        emptyMessage="No topics available."
        renderSelected={() =>
          topicId ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(() => {
                const t = topicOptions.find((x) => x.id === topicId);
                if (!t) return null;
                return (
                  <Badge
                    key={t.id}
                    variant="secondary"
                    className="flex items-center gap-1 text-[10px]"
                  >
                    {t.name}
                    <button
                      type="button"
                      onClick={() => setTopicId("")}
                      className="ml-1 rounded-full p-0.5 hover:bg-muted"
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                );
              })()}
            </div>
          ) : null
        }
      />

      <div className="flex items-center justify-between gap-2 pt-1">
        <Badge
          variant="secondary"
          className="gap-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
        >
          {RESOURCE_ICON} resource
        </Badge>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            className="h-8 text-xs"
            onClick={handleSave}
            disabled={updateResource.isPending}
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
  selectedLabel?: string;
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
  selectedLabel,
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
            {selectedCount === 0
              ? placeholder
              : selectedLabel ?? `${selectedCount} selected`}
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

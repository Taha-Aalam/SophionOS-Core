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
import { useUpdateResource } from "@/lib/hooks/use-resources";
import type { Resource } from "@/lib/types/domain.types";
import { RESOURCE_STATUS } from "@/lib/utils/constants";
import {
  filterProjectDialogAreas,
  filterProjectDialogGoals,
} from "@/lib/utils/project-dialog-filters";

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
  projectOptions: { id: string; name: string }[];
  taskOptions: { id: string; name: string }[];
  topicOptions: { id: string; name: string }[];
  onClose: () => void;
}

export function ResourceInboxProcessForm({
  resource,
  areaOptions,
  goalOptions,
  projectOptions,
  taskOptions,
  topicOptions,
  onClose,
}: ResourceInboxProcessFormProps) {
  const updateResource = useUpdateResource();
  const [areaIds, setAreaIds] = useState<string[]>(
    resource.linkedAreaIds ?? (resource.area_id ? [resource.area_id] : []),
  );
  const [goalIds, setGoalIds] = useState<string[]>(resource.linkedGoalIds ?? []);
  const [projectId, setProjectId] = useState<string>(resource.project_id ?? "");
  const [taskIds, setTaskIds] = useState<string[]>(resource.linkedTaskIds ?? []);
  const [topicId, setTopicId] = useState<string>(resource.topic_id ?? "");
  const [status, setStatus] = useState<string>(RESOURCE_STATUS.ACTIVE);

  const toggleArea = (id: string) =>
    setAreaIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const toggleGoal = (id: string) =>
    setGoalIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const toggleTask = (id: string) =>
    setTaskIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const toggleProject = (id: string) =>
    setProjectId((cur) => (cur === id ? "" : id));
  const toggleTopic = (id: string) =>
    setTopicId((cur) => (cur === id ? "" : id));

  const visibleGoals = useMemo(
    () => filterProjectDialogGoals(goalOptions, areaIds),
    [goalOptions, areaIds],
  );
  const visibleAreas = useMemo(
    () => filterProjectDialogAreas(areaOptions, goalOptions, areaIds, goalIds),
    [areaOptions, goalOptions, areaIds, goalIds],
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
          selectedCount={projectId ? 1 : 0}
          selectedLabel={projectOptions.find((p) => p.id === projectId)?.name}
          candidates={projectOptions}
          isSelected={(id) => projectId === id}
          onToggle={toggleProject}
          onClear={() => setProjectId("")}
          emptyMessage="No projects available."
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
                        onClick={() => setProjectId("")}
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
          candidates={taskOptions}
          isSelected={(id) => taskIds.includes(id)}
          onToggle={toggleTask}
          onClear={() => setTaskIds([])}
          emptyMessage="No tasks available."
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

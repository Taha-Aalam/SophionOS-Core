"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  CheckSquare,
  Plus,
  Star,
  Sun,
} from "lucide-react";

import { TaskDialog } from "@/components/entities/task-dialog";
import { TaskList } from "@/components/entities/task-list";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/views/empty-state";
import { useAreas } from "@/lib/hooks/use-areas";
import { useGoals } from "@/lib/hooks/use-goals";
import { useMyDayAvailable, useMyDayTasks } from "@/lib/hooks/use-my-day";
import { useProjects } from "@/lib/hooks/use-projects";
import {
  useArchiveTask,
  useCompleteTask,
  useFocusTask,
  usePermanentDeleteTask,
  useRestoreTask,
  useUpdateTask,
} from "@/lib/hooks/use-tasks";
import type { Task } from "@/lib/types/domain.types";
import { cn } from "@/lib/utils";
import {
  getTaskLinkedAreaIds,
  getTaskLinkedAreaNames,
  getTaskLinkedAreaIcons,
  getTaskLinkedGoalNames,
  getTaskLinkedProjectIds,
  getTaskLinkedProjectNames,
} from "@/lib/utils/tasks";

function TaskRowSkeleton() {
  return (
    <div className="flex items-center gap-3 border-b border-border/40 px-4 py-2.5">
      <Skeleton className="size-4 rounded" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

interface AvailableTaskRowProps {
  task: Task;
  areaName?: string | null;
  projectName?: string | null;
  onAddToDay: () => void;
}

function AvailableTaskRow({ task, areaName, projectName, onAddToDay }: AvailableTaskRowProps) {
  return (
    <div className="flex items-center gap-3 border-b border-border/40 px-4 py-2 last:border-0">
      <span className="min-w-0 flex-1 truncate text-sm">{task.name}</span>
      <div className="flex shrink-0 items-center gap-2">
        {areaName && (
          <span className="hidden text-xs text-muted-foreground sm:block">{areaName}</span>
        )}
        {projectName && (
          <span className="hidden text-xs text-muted-foreground sm:block">{projectName}</span>
        )}
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 shrink-0 gap-1 text-xs text-muted-foreground hover:text-yellow-500"
        onClick={onAddToDay}
        title="Add to My Day focus"
      >
        <Plus className="size-3" />
        <Star className="size-3" />
      </Button>
    </div>
  );
}

function SectionHeader({
  accentClass,
  title,
  description,
  totalCount,
}: {
  accentClass: string;
  title: string;
  description: string;
  totalCount?: number;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className={cn("mt-1.5 h-full min-h-[2.5rem] w-1 shrink-0 rounded-full", accentClass)} />
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            {typeof totalCount === "number" ? (
              <span className="text-sm text-muted-foreground">{totalCount} total</span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

export function MyDayContent() {
  const { data: myDay, isLoading: myDayLoading } = useMyDayTasks();
  const { data: available, isLoading: availableLoading } = useMyDayAvailable();

  const { data: allAreas } = useAreas();
  const { data: allGoals } = useGoals({});
  const { data: allProjects } = useProjects({ status: "all" });

  const completeTask = useCompleteTask();
  const focusTask = useFocusTask();
  const updateTask = useUpdateTask();
  const archiveTask = useArchiveTask();
  const restoreTask = useRestoreTask();
  const permanentDelete = usePermanentDeleteTask();

  const [planOpen, setPlanOpen] = useState(false);
  const [availableSearch, setAvailableSearch] = useState("");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const areaMap = useMemo(
    () => new Map(allAreas?.map((area) => [area.id, area]) ?? []),
    [allAreas],
  );
  const areaNamesMap = useMemo(
    () => new Map(allAreas?.map((a) => [a.id, a.name]) ?? []),
    [allAreas],
  );
  const areaIconsMap = useMemo(
    () => new Map(allAreas?.map((a) => [a.id, a.icon ?? null]) ?? []),
    [allAreas],
  );
  const goalNamesMap = useMemo(
    () => new Map(allGoals?.map((g) => [g.id, g.name]) ?? []),
    [allGoals],
  );
  const projectMap = useMemo(
    () => new Map(allProjects?.map((project) => [project.id, project]) ?? []),
    [allProjects],
  );
  const projectNamesMap = useMemo(
    () => new Map(allProjects?.map((p) => [p.id, p.name]) ?? []),
    [allProjects],
  );

  const handleArchiveToggle = useCallback(
    (task: Task) => {
      if (task.is_archived) {
        restoreTask.mutate(task.id);
      } else {
        archiveTask.mutate(task.id);
      }
    },
    [archiveTask, restoreTask],
  );

  const handlePermanentDelete = useCallback(
    (id: string) => {
      permanentDelete.mutate(id);
    },
    [permanentDelete],
  );

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsDialogOpen(true);
  };

  const filteredAvailable = useMemo(() => {
    if (!availableSearch.trim()) return available;
    const q = availableSearch.toLowerCase();
    return available.filter((t) => t.name.toLowerCase().includes(q));
  }, [available, availableSearch]);

  const isLoading = myDayLoading;
  const todayCount = myDay.dueToday.length;
  const focusCount = myDay.focused.length;
  const totalMyDay = todayCount + focusCount;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="reveal-stagger flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="border-b border-border/50 py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sun className="size-6 text-yellow-500" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">My Day</h1>
              <p className="text-sm text-muted-foreground">{today}</p>
            </div>
          </div>
          <Button
            variant={planOpen ? "default" : "outline"}
            size="sm"
            onClick={() => setPlanOpen((v) => !v)}
            className="gap-1.5"
          >
            <Plus className="size-3.5" />
            Plan My Day
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {isLoading ? (
          <div className="flex flex-col gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <TaskRowSkeleton key={i} />
            ))}
          </div>
        ) : totalMyDay === 0 && !planOpen ? (
          <EmptyState
            icon={Sun}
            title="Your day is clear"
            description="No tasks due today and nothing in focus. Use 'Plan My Day' to pick what to work on."
            actionLabel="Plan My Day"
            onAction={() => setPlanOpen(true)}
          />
        ) : (
          <>
            {/* Due Today */}
            {(todayCount > 0 || !planOpen) && (
              <section>
                <SectionHeader
                  accentClass="bg-amber-500"
                  title="Due Today"
                  totalCount={todayCount}
                  description="Tasks due today."
                />
                {todayCount === 0 ? (
                  <p className="mt-4 px-1 text-sm text-muted-foreground">
                    No tasks due today.
                  </p>
                ) : (
                  <div className="mt-4">
                    <TaskList
                      tasks={myDay.dueToday}
                      variant="simple"
                      getAreaName={(task) => {
                        const firstId = getTaskLinkedAreaIds(task)[0];
                        return firstId ? areaMap.get(firstId)?.name ?? null : null;
                      }}
                      getLinkedAreaNames={(task) => getTaskLinkedAreaNames(task, areaNamesMap)}
                      getLinkedAreaIcons={(task) => getTaskLinkedAreaIcons(task, areaIconsMap)}
                      getLinkedGoalNames={(task) => getTaskLinkedGoalNames(task, goalNamesMap)}
                      getProjectName={(task) => {
                        const firstId = getTaskLinkedProjectIds(task)[0];
                        return firstId ? projectMap.get(firstId)?.name ?? null : null;
                      }}
                      getLinkedProjectNames={(task) => getTaskLinkedProjectNames(task, projectNamesMap)}
                      onCompletionToggle={(id, isCompleted) => {
                        if (isCompleted) { completeTask.mutate(id); } else { updateTask.mutate({ id, input: { completed_at: null, is_completed: false } }); }
                      }}
                      onFocusToggle={(id, focused) => focusTask.mutate({ id, is_focused: focused })}
                      onNameSave={(id, name) => updateTask.mutate({ id, input: { name } })}
                      onEdit={handleEdit}
                      onArchiveToggle={handleArchiveToggle}
                      onPermanentDelete={handlePermanentDelete}
                    />
                  </div>
                )}
              </section>
            )}

            {/* Focus */}
            {(focusCount > 0 || !planOpen) && (
              <section>
                <SectionHeader
                  accentClass="bg-yellow-500"
                  title="Focus"
                  totalCount={focusCount}
                  description="Starred tasks for today's focus."
                />
                {focusCount === 0 ? (
                  <p className="mt-4 px-1 text-sm text-muted-foreground">
                    No tasks in focus. Star a task below to add it to your day.
                  </p>
                ) : (
                  <div className="mt-4">
                    <TaskList
                      tasks={myDay.focused}
                      variant="simple"
                      getAreaName={(task) => {
                        const firstId = getTaskLinkedAreaIds(task)[0];
                        return firstId ? areaMap.get(firstId)?.name ?? null : null;
                      }}
                      getLinkedAreaNames={(task) => getTaskLinkedAreaNames(task, areaNamesMap)}
                      getLinkedAreaIcons={(task) => getTaskLinkedAreaIcons(task, areaIconsMap)}
                      getLinkedGoalNames={(task) => getTaskLinkedGoalNames(task, goalNamesMap)}
                      getProjectName={(task) => {
                        const firstId = getTaskLinkedProjectIds(task)[0];
                        return firstId ? projectMap.get(firstId)?.name ?? null : null;
                      }}
                      getLinkedProjectNames={(task) => getTaskLinkedProjectNames(task, projectNamesMap)}
                      onCompletionToggle={(id, isCompleted) => {
                        if (isCompleted) { completeTask.mutate(id); } else { updateTask.mutate({ id, input: { completed_at: null, is_completed: false } }); }
                      }}
                      onFocusToggle={(id, focused) => focusTask.mutate({ id, is_focused: focused })}
                      onNameSave={(id, name) => updateTask.mutate({ id, input: { name } })}
                      onEdit={handleEdit}
                      onArchiveToggle={handleArchiveToggle}
                      onPermanentDelete={handlePermanentDelete}
                    />
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {/* Plan My Day panel */}
        {planOpen && (
          <section className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckSquare className="size-4" />
              <h2 className="text-sm font-semibold">Pick tasks to focus</h2>
              {available.length > 0 && (
                <span className="text-xs text-muted-foreground">{available.length} available</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Star any task to add it to your focus list for today.
            </p>

            {availableLoading ? (
              <div className="flex flex-col gap-1">
                {Array.from({ length: 4 }).map((_, i) => (
                  <TaskRowSkeleton key={i} />
                ))}
              </div>
            ) : available.length === 0 ? (
              <p className="rounded-lg border border-border/60 px-4 py-6 text-center text-sm text-muted-foreground">
                No available tasks to add.
              </p>
            ) : (
              <div className="flex flex-col overflow-hidden rounded-lg border border-border/60">
                {available.length > 6 && (
                  <div className="border-b border-border/40 px-4 py-2">
                    <input
                      type="text"
                      value={availableSearch}
                      onChange={(e) => setAvailableSearch(e.target.value)}
                      placeholder="Search tasks…"
                      className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                )}
                {filteredAvailable.length === 0 ? (
                  <p className="px-4 py-4 text-sm text-muted-foreground">No matches.</p>
                ) : (
                  filteredAvailable.map((task) => (
                    <AvailableTaskRow
                      key={task.id}
                      task={task}
                      areaName={(() => { const firstId = getTaskLinkedAreaIds(task)[0]; return firstId ? areaMap.get(firstId)?.name ?? null : null; })()}
                      projectName={
                        (() => { const firstId = getTaskLinkedProjectIds(task)[0]; return firstId ? projectMap.get(firstId)?.name ?? null : null; })()
                      }
                      onAddToDay={() => focusTask.mutate({ id: task.id, is_focused: true })}
                    />
                  ))
                )}
              </div>
            )}
          </section>
        )}
      </div>

      <TaskDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingTask(null);
          }
        }}
        task={editingTask}
        onArchiveToggle={handleArchiveToggle}
        onPermanentDelete={handlePermanentDelete}
      />
    </div>
  );
}

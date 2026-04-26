"use client";

import React, { useMemo, useState } from "react";
import {
  Calendar,
  CheckSquare,
  Plus,
  Star,
  Sun,
} from "lucide-react";

import { TaskListItem } from "@/components/entities/task-list-item";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/views/empty-state";
import { useAreas } from "@/lib/hooks/use-areas";
import { useMyDayAvailable, useMyDayTasks } from "@/lib/hooks/use-my-day";
import { useProjects } from "@/lib/hooks/use-projects";
import {
  useCompleteTask,
  useFocusTask,
  useUpdateTask,
} from "@/lib/hooks/use-tasks";
import type { Task } from "@/lib/types/domain.types";
import { cn } from "@/lib/utils";

// ─── Skeleton ────────────────────────────────────────────────────────────────

function TaskRowSkeleton() {
  return (
    <div className="flex items-center gap-3 border-b border-border/40 px-4 py-2.5">
      <Skeleton className="size-4 rounded" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

// ─── Available task row (Plan My Day panel) ──────────────────────────────────

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

// ─── Section header ──────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  count,
  className,
}: {
  icon: React.ElementType;
  title: string;
  count: number;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Icon className="size-4 text-muted-foreground" />
      <h2 className="text-sm font-semibold">{title}</h2>
      {count > 0 && (
        <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
          {count}
        </Badge>
      )}
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MyDayPage() {
  const { data: myDay, isLoading: myDayLoading } = useMyDayTasks();
  const { data: available, isLoading: availableLoading } = useMyDayAvailable();

  const { data: allAreas } = useAreas();
  const { data: allProjects } = useProjects({ status: "all" });

  const completeTask = useCompleteTask();
  const focusTask = useFocusTask();
  const updateTask = useUpdateTask();

  const [planOpen, setPlanOpen] = useState(false);
  const [availableSearch, setAvailableSearch] = useState("");

  const areaMap = useMemo(
    () => new Map((allAreas ?? []).map((a) => [a.id, a.name])),
    [allAreas],
  );
  const projectMap = useMemo(
    () => new Map((allProjects ?? []).map((p) => [p.id, p.name])),
    [allProjects],
  );

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

  const taskHandlers = (task: Task) => ({
    onCompletionToggle: (id: string, isCompleted: boolean) => {
      if (isCompleted) {
        completeTask.mutate(id);
      } else {
        updateTask.mutate({ id, input: { completed_at: null, is_completed: false } });
      }
    },
    onFocusToggle: (id: string, focused: boolean) =>
      focusTask.mutate({ id, is_focused: focused }),
    onNameSave: (id: string, name: string) => updateTask.mutate({ id, input: { name } }),
  });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-0">
      {/* Header */}
      <div className="border-b border-border/50 px-6 py-5">
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

      <div className="flex flex-col gap-8 px-6 py-6">
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
              <section className="flex flex-col gap-2">
                <SectionHeader icon={Calendar} title="Due Today" count={todayCount} />
                {todayCount === 0 ? (
                  <p className="px-1 text-sm text-muted-foreground">
                    No tasks due today.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-border/60">
                    {myDay.dueToday.map((task) => (
                      <TaskListItem
                        key={task.id}
                        task={task}
                        areaName={task.area_id ? areaMap.get(task.area_id) ?? null : null}
                        projectName={
                          task.project_id ? projectMap.get(task.project_id) ?? null : null
                        }
                        {...taskHandlers(task)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Focus */}
            {(focusCount > 0 || !planOpen) && (
              <section className="flex flex-col gap-2">
                <SectionHeader icon={Star} title="Focus" count={focusCount} />
                {focusCount === 0 ? (
                  <p className="px-1 text-sm text-muted-foreground">
                    No tasks in focus. Star a task below to add it to your day.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-border/60">
                    {myDay.focused.map((task) => (
                      <TaskListItem
                        key={task.id}
                        task={task}
                        areaName={task.area_id ? areaMap.get(task.area_id) ?? null : null}
                        projectName={
                          task.project_id ? projectMap.get(task.project_id) ?? null : null
                        }
                        {...taskHandlers(task)}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}

        {/* Plan My Day panel */}
        {planOpen && (
          <section className="flex flex-col gap-2">
            <SectionHeader
              icon={CheckSquare}
              title="Pick tasks to focus"
              count={available.length}
              className="text-muted-foreground"
            />
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
                      areaName={task.area_id ? areaMap.get(task.area_id) ?? null : null}
                      projectName={
                        task.project_id ? projectMap.get(task.project_id) ?? null : null
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
    </div>
  );
}

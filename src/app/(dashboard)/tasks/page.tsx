"use client";

import {
  AlertTriangle,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  Clock,
  Filter,
  Inbox as InboxIcon,
  Plus,
  Star,
  Zap,
} from "lucide-react";
import React, { useMemo, useState } from "react";

import { TaskDialog } from "@/components/entities/task-dialog";
import { TaskListItem } from "@/components/entities/task-list-item";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarView } from "@/components/views/calendar-view";
import { EmptyState } from "@/components/views/empty-state";
import { useAreas } from "@/lib/hooks/use-areas";
import { useGoals } from "@/lib/hooks/use-goals";
import { useProjects } from "@/lib/hooks/use-projects";
import {
  useCompleteTask,
  useDeleteTask,
  useFocusTask,
  useTasks,
  useUpdateTask,
} from "@/lib/hooks/use-tasks";
import type { Task } from "@/lib/types/domain.types";
import { cn } from "@/lib/utils";
import {
  getTaskCounts,
  getTaskLinkedAreaIds,
  getTaskLinkedGoalIds,
  getVisibleTasks,
  TASK_VIEW,
  type TaskView,
  taskMatchesAreaId,
  taskMatchesGoalId,
} from "@/lib/utils/tasks";

const ALL_PRIORITY_VALUE = "__all_priority__";

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState<TaskView>(TASK_VIEW.ALL);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterPriority, setFilterPriority] = useState("");
  const [filterAreaIds, setFilterAreaIds] = useState<string[]>([]);
  const [filterGoalIds, setFilterGoalIds] = useState<string[]>([]);
  const [filterProjectIds, setFilterProjectIds] = useState<string[]>([]);
  const [areaPopoverOpen, setAreaPopoverOpen] = useState(false);
  const [goalPopoverOpen, setGoalPopoverOpen] = useState(false);
  const [projectPopoverOpen, setProjectPopoverOpen] = useState(false);

  const { data: allTasks, isLoading } = useTasks();
  const { data: allAreas } = useAreas();
  const { data: allGoals } = useGoals({});
  const { data: allProjects } = useProjects({ status: "all" });

  const completeTask = useCompleteTask();
  const focusTask = useFocusTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const areaMap = useMemo(
    () => new Map(allAreas?.map((area) => [area.id, area]) ?? []),
    [allAreas],
  );
  const goalMap = useMemo(
    () => new Map(allGoals?.map((goal) => [goal.id, goal]) ?? []),
    [allGoals],
  );
  const projectMap = useMemo(
    () => new Map(allProjects?.map((project) => [project.id, project]) ?? []),
    [allProjects],
  );

  const tasks = allTasks ?? [];
  const counts = useMemo(() => getTaskCounts(tasks), [tasks]);

  const visibleTasks = useMemo(() => {
    let result = getVisibleTasks(tasks, activeTab);

    if (filterPriority) {
      result = result.filter((task) => task.priority === filterPriority);
    }

    if (filterAreaIds.length > 0) {
      result = result.filter((task) =>
        filterAreaIds.some((areaId) => taskMatchesAreaId(task, areaId)),
      );
    }

    if (filterGoalIds.length > 0) {
      result = result.filter((task) =>
        filterGoalIds.some((goalId) => taskMatchesGoalId(task, goalId)),
      );
    }

    if (filterProjectIds.length > 0) {
      result = result.filter((task) => filterProjectIds.includes(task.project_id ?? ""));
    }

    return result;
  }, [activeTab, filterAreaIds, filterGoalIds, filterPriority, filterProjectIds, tasks]);

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingTask(null);
  };

  const hasFilters = Boolean(
    filterPriority ||
      filterAreaIds.length > 0 ||
      filterGoalIds.length > 0 ||
      filterProjectIds.length > 0,
  );
  const activeAreas = allAreas?.filter((area) => !area.archive) ?? [];
  const activeGoals = allGoals?.filter((goal) => !goal.is_archived) ?? [];
  const activeProjects = allProjects?.filter((project) => !project.is_archived) ?? [];

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

  const filterPopoverContentClassName = "w-80 max-w-[calc(100vw-2rem)] overflow-x-hidden p-2";
  const filterOptionClassName =
    "flex w-full cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm leading-5 transition-colors hover:bg-muted/40";
  const filterOptionLabelClassName = "min-w-0 flex-1 whitespace-normal break-words text-sm";

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between border-b border-border/50">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">
            {counts.all} task{counts.all !== 1 ? "s" : ""} ·{" "}
            {counts.overdue > 0 ? `${counts.overdue} overdue` : "all on track"}
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="size-4" />
          New Task
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TaskView)}
        className="flex flex-1 flex-col"
      >
        <div className="border-b border-border/50 px-6 pt-4">
          <TabsList className="flex h-auto flex-nowrap gap-0 bg-transparent p-0">
            <TabsTrigger
              value={TASK_VIEW.ALL}
              className="rounded-none border-b-2 border-transparent px-4 py-2 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              All
            </TabsTrigger>
            <TabsTrigger
              value={TASK_VIEW.INBOX}
              className="rounded-none border-b-2 border-transparent px-4 py-2 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <InboxIcon className="mr-1.5 size-3.5" />
              Inbox
            </TabsTrigger>
            <TabsTrigger
              value={TASK_VIEW.UPCOMING}
              className="rounded-none border-b-2 border-transparent px-4 py-2 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <Clock className="mr-1.5 size-3.5" />
              Upcoming
            </TabsTrigger>
            <TabsTrigger
              value={TASK_VIEW.OVERDUE}
              className="rounded-none border-b-2 border-transparent px-4 py-2 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <AlertTriangle className="mr-1.5 size-3.5" />
              Overdue
            </TabsTrigger>
            <TabsTrigger
              value={TASK_VIEW.COMPLETED}
              className="rounded-none border-b-2 border-transparent px-4 py-2 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <CheckSquare className="mr-1.5 size-3.5" />
              Completed
            </TabsTrigger>
            <TabsTrigger
              value={TASK_VIEW.FOCUS}
              className="rounded-none border-b-2 border-transparent px-4 py-2 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <Star className="mr-1.5 size-3.5" />
              Focus
            </TabsTrigger>
            <TabsTrigger
              value={TASK_VIEW.SMART_PRIORITY}
              className="rounded-none border-b-2 border-transparent px-4 py-2 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <Zap className="mr-1.5 size-3.5" />
              Smart Priority
            </TabsTrigger>
            <TabsTrigger
              value={TASK_VIEW.CALENDAR}
              className="rounded-none border-b-2 border-transparent px-4 py-2 text-sm data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <CalendarDays className="mr-1.5 size-3.5" />
              Calendar
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex items-center gap-3 border-b border-border/30 px-6 py-3">
          <Filter className="size-3.5 shrink-0 text-muted-foreground" />
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={filterPriority || ALL_PRIORITY_VALUE}
              onValueChange={(value) =>
                setFilterPriority(value === ALL_PRIORITY_VALUE ? "" : (value ?? ""))
              }
            >
              <SelectTrigger className="h-7 w-[120px] text-xs">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_PRIORITY_VALUE}>All priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <Popover open={areaPopoverOpen} onOpenChange={setAreaPopoverOpen}>
              <PopoverTrigger
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-7 gap-1 px-2 py-0 text-xs font-normal",
                )}
              >
                {filterAreaIds.length === 0 ? (
                  "Area"
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="max-w-[100px] truncate">{selectedAreaLabels[0]}</span>
                    {selectedAreaLabels.length > 1 && (
                      <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                        +{selectedAreaLabels.length - 1}
                      </Badge>
                    )}
                  </span>
                )}
                <ChevronDown className="size-3 text-muted-foreground" />
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
                              setFilterAreaIds((prev) =>
                                next === true
                                  ? Array.from(new Set([...prev, area.id]))
                                  : prev.filter((id) => id !== area.id),
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
                  "h-7 gap-1 px-2 py-0 text-xs font-normal",
                )}
              >
                {filterGoalIds.length === 0 ? (
                  "Goal"
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="max-w-[100px] truncate">{selectedGoalLabels[0]}</span>
                    {selectedGoalLabels.length > 1 && (
                      <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                        +{selectedGoalLabels.length - 1}
                      </Badge>
                    )}
                  </span>
                )}
                <ChevronDown className="size-3 text-muted-foreground" />
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
                              setFilterGoalIds((prev) =>
                                next === true
                                  ? Array.from(new Set([...prev, goal.id]))
                                  : prev.filter((id) => id !== goal.id),
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
                  "h-7 gap-1 px-2 py-0 text-xs font-normal",
                )}
              >
                {filterProjectIds.length === 0 ? (
                  "Project"
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="max-w-[100px] truncate">{selectedProjectLabels[0]}</span>
                    {selectedProjectLabels.length > 1 && (
                      <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                        +{selectedProjectLabels.length - 1}
                      </Badge>
                    )}
                  </span>
                )}
                <ChevronDown className="size-3 text-muted-foreground" />
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
                              setFilterProjectIds((prev) =>
                                next === true
                                  ? Array.from(new Set([...prev, project.id]))
                                  : prev.filter((id) => id !== project.id),
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
                onClick={() => {
                  setFilterPriority("");
                  setFilterAreaIds([]);
                  setFilterGoalIds([]);
                  setFilterProjectIds([]);
                }}
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        <TabsContent value={TASK_VIEW.CALENDAR} className="mt-0 flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              Loading tasks...
            </div>
          ) : (
            <CalendarView tasks={visibleTasks} onTaskClick={handleEdit} />
          )}
        </TabsContent>

        {(
          [
            TASK_VIEW.ALL,
            TASK_VIEW.INBOX,
            TASK_VIEW.UPCOMING,
            TASK_VIEW.OVERDUE,
            TASK_VIEW.COMPLETED,
            TASK_VIEW.FOCUS,
            TASK_VIEW.SMART_PRIORITY,
          ] as TaskView[]
        ).map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-0 flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                Loading tasks...
              </div>
            ) : visibleTasks.length === 0 ? (
              <EmptyState
                icon={
                  tab === TASK_VIEW.FOCUS
                    ? Star
                    : tab === TASK_VIEW.SMART_PRIORITY
                      ? Zap
                      : CheckSquare
                }
                title={
                  tab === TASK_VIEW.FOCUS
                    ? "No focused tasks"
                    : tab === TASK_VIEW.SMART_PRIORITY
                      ? "No prioritized tasks"
                      : tab === TASK_VIEW.OVERDUE
                        ? "Nothing overdue"
                        : tab === TASK_VIEW.COMPLETED
                          ? "No completed tasks yet"
                          : "No tasks here"
                }
                description={
                  tab === TASK_VIEW.ALL
                    ? "Create your first task to get started."
                    : tab === TASK_VIEW.OVERDUE
                      ? "Great job - you're all caught up!"
                      : tab === TASK_VIEW.FOCUS
                        ? "Star a task to add it to your focus list."
                        : tab === TASK_VIEW.SMART_PRIORITY
                          ? "Tasks are ranked here by real smart-priority scores."
                          : "Tasks matching this view will appear here."
                }
                actionLabel={
                  tab === TASK_VIEW.ALL || tab === TASK_VIEW.INBOX ? "New Task" : undefined
                }
                onAction={
                  tab === TASK_VIEW.ALL || tab === TASK_VIEW.INBOX
                    ? () => setIsDialogOpen(true)
                    : undefined
                }
              />
            ) : (
              <div className="divide-y-0">
                {visibleTasks.map((task) => (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    areaName={task.area_id ? areaMap.get(task.area_id)?.name : null}
                    linkedAreaNames={getTaskLinkedAreaIds(task)
                      .map((id) => areaMap.get(id)?.name)
                      .filter((n): n is string => Boolean(n))}
                    linkedGoalNames={getTaskLinkedGoalIds(task)
                      .map((id) => goalMap.get(id)?.name)
                      .filter((n): n is string => Boolean(n))}
                    projectName={task.project_id ? projectMap.get(task.project_id)?.name : null}
                    showSmartPriority={tab === TASK_VIEW.SMART_PRIORITY}
                    onCompletionToggle={(id, isCompleted) => {
                      if (isCompleted) {
                        completeTask.mutate(id);
                        return;
                      }

                      updateTask.mutate({
                        id,
                        input: {
                          completed_at: null,
                          is_completed: false,
                        },
                      });
                    }}
                    onFocusToggle={(id, focused) => focusTask.mutate({ id, is_focused: focused })}
                    onNameSave={(id, name) => updateTask.mutate({ id, input: { name } })}
                    onEdit={handleEdit}
                    onDelete={(id) => deleteTask.mutate(id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      <TaskDialog
        open={isDialogOpen}
        onOpenChange={handleCloseDialog}
        task={editingTask}
        onDelete={(id) => deleteTask.mutate(id)}
      />
    </div>
  );
}

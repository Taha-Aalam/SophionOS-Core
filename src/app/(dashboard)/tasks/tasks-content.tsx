"use client";

import {
  AlertTriangle,
  Archive,
  CalendarDays,
  CheckSquare,
  Clock,
  FolderKanban,
  Inbox as InboxIcon,
  Layers,
  LayoutGrid,
  Plus,
  Star,
  Target,
  Zap,
} from "lucide-react";
import React, { useCallback, useMemo, useState } from "react";

import { TaskDialog } from "@/components/entities/task-dialog";
import { TaskList } from "@/components/entities/task-list";
import { TasksFilterBar } from "@/components/filters/tasks-filter-bar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarView } from "@/components/views/calendar-view";
import { EmptyState } from "@/components/views/empty-state";
import { ErrorState } from "@/components/views/error-state";
import { TasksByGroupView, type TaskGroup } from "@/components/views/tasks-by-group-view";
import { useAreas } from "@/lib/hooks/use-areas";
import { useGoals } from "@/lib/hooks/use-goals";
import { useProjects } from "@/lib/hooks/use-projects";
import {
  useArchiveTask,
  useArchivedTasks,
  useCompleteTask,
  useFocusTask,
  usePermanentDeleteTask,
  useRestoreTask,
  useTasks,
  useUpdateTask,
} from "@/lib/hooks/use-tasks";
import type { Task } from "@/lib/types/domain.types";
import {
  getTaskCounts,
  getTaskLinkedAreaIds,
  getTaskLinkedAreaNames,
  getTaskLinkedAreaIcons,
  getTaskLinkedGoalIds,
  getTaskLinkedGoalNames,
  getTaskLinkedProjectIds,
  getTaskLinkedProjectNames,
  getVisibleTasks,
  TASK_VIEW,
  type TaskView,
  taskMatchesAreaId,
  taskMatchesGoalId,
  taskMatchesProjectId,
} from "@/lib/utils/tasks";

export function TasksContent() {
  const [activeTab, setActiveTab] = useState<TaskView>(TASK_VIEW.ALL);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterPriority, setFilterPriority] = useState("");
  const [filterAreaIds, setFilterAreaIds] = useState<string[]>([]);
  const [filterGoalIds, setFilterGoalIds] = useState<string[]>([]);
  const [filterProjectIds, setFilterProjectIds] = useState<string[]>([]);
  const [newTaskAreaId, setNewTaskAreaId] = useState<string | undefined>(undefined);
  const [newTaskGoalId, setNewTaskGoalId] = useState<string | undefined>(undefined);
  const [newTaskProjectId, setNewTaskProjectId] = useState<string | undefined>(undefined);

  const {
    data: allTasks,
    isLoading,
    isError: tasksError,
    refetch: refetchTasks,
  } = useTasks();
  const {
    data: allArchivedTasks,
    isLoading: isArchivedLoading,
    isError: archivedError,
    refetch: refetchArchived,
  } = useArchivedTasks({
    enabled: activeTab === TASK_VIEW.ARCHIVE,
  });
  const { data: allAreas } = useAreas();
  const { data: allGoals } = useGoals({});
  const { data: allProjects } = useProjects({ status: "all" });

  const completeTask = useCompleteTask();
  const focusTask = useFocusTask();
  const updateTask = useUpdateTask();
  const archiveTask = useArchiveTask();
  const restoreTask = useRestoreTask();
  const permanentDelete = usePermanentDeleteTask();

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

  const handleCompletionToggle = useCallback(
    (id: string, isCompleted: boolean) => {
      if (isCompleted) {
        completeTask.mutate(id);
        return;
      }
      updateTask.mutate({
        id,
        input: { completed_at: null, is_completed: false },
      });
    },
    [completeTask, updateTask],
  );

  const handleFocusToggle = useCallback(
    (id: string, focused: boolean) => focusTask.mutate({ id, is_focused: focused }),
    [focusTask],
  );

  const handleNameSave = useCallback(
    (id: string, name: string) => updateTask.mutate({ id, input: { name } }),
    [updateTask],
  );

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
  const goalMap = useMemo(
    () => new Map(allGoals?.map((goal) => [goal.id, goal]) ?? []),
    [allGoals],
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

  const tasks = useMemo(() => allTasks ?? [], [allTasks]);
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
      result = result.filter((task) =>
        filterProjectIds.some((projectId) => taskMatchesProjectId(task, projectId)),
      );
    }

    return result;
  }, [activeTab, filterAreaIds, filterGoalIds, filterPriority, filterProjectIds, tasks]);

  const activeTasks = useMemo(
    () => tasks.filter((t) => !t.is_archived && !t.is_completed),
    [tasks],
  );

  const archivedTasks = useMemo(
    () => allArchivedTasks ?? [],
    [allArchivedTasks],
  );

  const taskGroupsByArea = useMemo((): TaskGroup[] => {
    const grouped = new Map<string, Task[]>();
    for (const task of activeTasks) {
      const ids = getTaskLinkedAreaIds(task);
      if (ids.length === 0) {
        const current = grouped.get("unassigned") ?? [];
        current.push(task);
        grouped.set("unassigned", current);
      } else {
        for (const areaId of ids) {
          const current = grouped.get(areaId) ?? [];
          current.push(task);
          grouped.set(areaId, current);
        }
      }
    }
    return Array.from(grouped.entries())
      .map(([areaId, groupTasks]) => ({
        groupId: areaId,
        groupName: areaId === "unassigned" ? "No Area" : (areaMap.get(areaId)?.name ?? areaId),
        tasks: groupTasks,
      }))
      // Keep the "No Area" group last.
      .sort((a, b) => {
        if (a.groupId === "unassigned") return 1;
        if (b.groupId === "unassigned") return -1;
        return 0;
      });
  }, [activeTasks, areaMap]);

  const taskGroupsByGoal = useMemo((): TaskGroup[] => {
    const grouped = new Map<string, Task[]>();
    for (const task of activeTasks) {
      const ids = getTaskLinkedGoalIds(task);
      if (ids.length === 0) {
        const current = grouped.get("unassigned") ?? [];
        current.push(task);
        grouped.set("unassigned", current);
      } else {
        for (const goalId of ids) {
          const current = grouped.get(goalId) ?? [];
          current.push(task);
          grouped.set(goalId, current);
        }
      }
    }
    return Array.from(grouped.entries())
      .map(([goalId, groupTasks]) => ({
        groupId: goalId,
        groupName: goalId === "unassigned" ? "No Goal" : (goalMap.get(goalId)?.name ?? goalId),
        tasks: groupTasks,
      }))
      // Keep the "No Goal" group last.
      .sort((a, b) => {
        if (a.groupId === "unassigned") return 1;
        if (b.groupId === "unassigned") return -1;
        return 0;
      });
  }, [activeTasks, goalMap]);

  const taskGroupsByProject = useMemo((): TaskGroup[] => {
    const grouped = new Map<string, Task[]>();
    for (const task of activeTasks) {
      const ids = getTaskLinkedProjectIds(task);
      if (ids.length === 0) {
        const current = grouped.get("unassigned") ?? [];
        current.push(task);
        grouped.set("unassigned", current);
      } else {
        for (const projectId of ids) {
          const current = grouped.get(projectId) ?? [];
          current.push(task);
          grouped.set(projectId, current);
        }
      }
    }
    return Array.from(grouped.entries())
      .map(([projectId, groupTasks]) => ({
        groupId: projectId,
        groupName: projectId === "unassigned" ? "No Project" : (projectMap.get(projectId)?.name ?? projectId),
        tasks: groupTasks,
      }))
      // Keep the "No Project" group last.
      .sort((a, b) => {
        if (a.groupId === "unassigned") return 1;
        if (b.groupId === "unassigned") return -1;
        return 0;
      });
  }, [activeTasks, projectMap]);

  const getLinkedAreaNames = useCallback(
    (task: Task) =>
      getTaskLinkedAreaIds(task)
        .map((id) => areaMap.get(id)?.name)
        .filter((n): n is string => Boolean(n)),
    [areaMap],
  );

  const getLinkedGoalNames = useCallback(
    (task: Task) =>
      getTaskLinkedGoalIds(task)
        .map((id) => goalMap.get(id)?.name)
        .filter((n): n is string => Boolean(n)),
    [goalMap],
  );

  const getLinkedProjectNames = useCallback(
    (task: Task) =>
      getTaskLinkedProjectIds(task)
        .map((id) => projectMap.get(id)?.name)
        .filter((n): n is string => Boolean(n)),
    [projectMap],
  );

  const getLinkedAreaIcons = useCallback(
    (task: Task) =>
      getTaskLinkedAreaIds(task).map((id) => areaMap.get(id)?.icon ?? null),
    [areaMap],
  );

  const getAreaName = useCallback(
    (task: Task) => {
      const id = getTaskLinkedAreaIds(task)[0];
      return id ? areaMap.get(id)?.name ?? null : null;
    },
    [areaMap],
  );

  const getProjectName = useCallback(
    (task: Task) => {
      const id = getTaskLinkedProjectIds(task)[0];
      return id ? projectMap.get(id)?.name ?? null : null;
    },
    [projectMap],
  );

  const getLinkedAreaNamesForList = useCallback(
    (task: Task) => getTaskLinkedAreaNames(task, areaNamesMap),
    [areaNamesMap],
  );

  const getLinkedAreaIconsForList = useCallback(
    (task: Task) => getTaskLinkedAreaIcons(task, areaIconsMap),
    [areaIconsMap],
  );

  const getLinkedGoalNamesForList = useCallback(
    (task: Task) => getTaskLinkedGoalNames(task, goalNamesMap),
    [goalNamesMap],
  );

  const getLinkedProjectNamesForList = useCallback(
    (task: Task) => getTaskLinkedProjectNames(task, projectNamesMap),
    [projectNamesMap],
  );

  const handleNewTaskByArea = useCallback((areaId: string) => {
    setEditingTask(null);
    setNewTaskAreaId(areaId);
    setIsDialogOpen(true);
  }, []);

  const handleNewTaskByGoal = useCallback((goalId: string) => {
    setEditingTask(null);
    setNewTaskGoalId(goalId);
    setIsDialogOpen(true);
  }, []);

  const handleNewTaskByProject = useCallback((projectId: string) => {
    setEditingTask(null);
    setNewTaskProjectId(projectId);
    setIsDialogOpen(true);
  }, []);

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsDialogOpen(true);
  };

  const activeAreas = allAreas?.filter((area) => !area.archive) ?? [];
  const activeGoals = allGoals?.filter((goal) => !goal.is_archived) ?? [];
  const activeProjects = allProjects?.filter((project) => !project.is_archived) ?? [];

  if (tasksError || archivedError) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16">
        <ErrorState
          message="Failed to load tasks."
          onRetry={() => {
            if (tasksError) refetchTasks();
            if (archivedError) refetchArchived();
          }}
        />
      </div>
    );
  }

  return (
    <div className="content-fade-in reveal-stagger mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none" aria-hidden="true">☑️</span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
            <p className="text-sm text-muted-foreground" suppressHydrationWarning>
              {counts.all} task{counts.all !== 1 ? "s" : ""} ·{" "}
              {counts.overdue > 0 ? `${counts.overdue} overdue` : "all on track"}
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setEditingTask(null);
            setIsDialogOpen(true);
          }}
        >
          <Plus className="size-4" />
          New Task
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as TaskView)}
        className="flex flex-1 flex-col"
      >
        <TabsList className="mb-6 w-full justify-start overflow-x-auto bg-muted/50 p-1 max-[1023px]:snap-x max-[1023px]:snap-mandatory max-[1023px]:touch-pan-x max-[1023px]:overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsTrigger value={TASK_VIEW.ALL}>
            <LayoutGrid className="mr-1.5 size-3.5" />
            All
          </TabsTrigger>
          <TabsTrigger value={TASK_VIEW.INBOX}>
            <InboxIcon className="mr-1.5 size-3.5" />
            Inbox
          </TabsTrigger>
          <TabsTrigger value={TASK_VIEW.UPCOMING}>
            <Clock className="mr-1.5 size-3.5" />
            Upcoming
          </TabsTrigger>
          <TabsTrigger value={TASK_VIEW.OVERDUE}>
            <AlertTriangle className="mr-1.5 size-3.5" />
            Overdue
          </TabsTrigger>
          <TabsTrigger value={TASK_VIEW.FOCUS}>
            <Star className="mr-1.5 size-3.5" />
            Focus
          </TabsTrigger>
          <TabsTrigger value={TASK_VIEW.SMART_PRIORITY}>
            <Zap className="mr-1.5 size-3.5" />
            Smart Priority
          </TabsTrigger>
          <TabsTrigger value={TASK_VIEW.CALENDAR}>
            <CalendarDays className="mr-1.5 size-3.5" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value={TASK_VIEW.BY_AREA}>
            <Layers className="mr-1.5 size-3.5" />
            By Area
          </TabsTrigger>
          <TabsTrigger value={TASK_VIEW.BY_GOAL}>
            <Target className="mr-1.5 size-3.5" />
            By Goal
          </TabsTrigger>
          <TabsTrigger value={TASK_VIEW.BY_PROJECT}>
            <FolderKanban className="mr-1.5 size-3.5" />
            By Project
          </TabsTrigger>
          <TabsTrigger value={TASK_VIEW.COMPLETED}>
            <CheckSquare className="mr-1.5 size-3.5" />
            Completed
          </TabsTrigger>
          <TabsTrigger value={TASK_VIEW.ARCHIVE}>
            <Archive className="mr-1.5 size-3.5" />
            Archive
          </TabsTrigger>
          </TabsList>

        <TasksFilterBar
          priority={filterPriority}
          areaIds={filterAreaIds}
          goalIds={filterGoalIds}
          projectIds={filterProjectIds}
          areas={activeAreas}
          goals={activeGoals}
          projects={activeProjects}
          onPriorityChange={setFilterPriority}
          onAreaIdsChange={setFilterAreaIds}
          onGoalIdsChange={setFilterGoalIds}
          onProjectIdsChange={setFilterProjectIds}
        />

        <TabsContent value={TASK_VIEW.CALENDAR} className="mt-0 flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              Loading tasks...
            </div>
          ) : (
            <CalendarView
              tasks={visibleTasks}
              onTaskClick={handleEdit}
              onTaskReschedule={(taskId, newDate) => {
                // Preserve the original time-of-day (and timezone suffix) so a
                // drag only changes the calendar day, not the scheduled time.
                const current = tasks.find((t) => t.id === taskId)?.due_date;
                const timeIndex = current?.indexOf("T") ?? -1;
                const timePart = timeIndex >= 0 ? current!.slice(timeIndex) : "";
                updateTask.mutate({
                  id: taskId,
                  input: { due_date: `${newDate}${timePart}` },
                });
              }}
            />
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
                    ? () => {
                        setEditingTask(null);
                        setIsDialogOpen(true);
                      }
                    : undefined
                }
              />
            ) : (
              <TaskList
                tasks={visibleTasks}
                variant="simple"
                getAreaName={getAreaName}
                getLinkedAreaNames={getLinkedAreaNamesForList}
                getLinkedAreaIcons={getLinkedAreaIconsForList}
                getLinkedGoalNames={getLinkedGoalNamesForList}
                getProjectName={getProjectName}
                getLinkedProjectNames={getLinkedProjectNamesForList}
                showSmartPriority={tab === TASK_VIEW.SMART_PRIORITY}
                onCompletionToggle={handleCompletionToggle}
                onFocusToggle={handleFocusToggle}
                onNameSave={handleNameSave}
                onEdit={handleEdit}
                onArchiveToggle={handleArchiveToggle}
                onPermanentDelete={handlePermanentDelete}
              />
            )}
          </TabsContent>
        ))}

        <TabsContent value={TASK_VIEW.BY_AREA} className="mt-0 flex-1">
          <TasksByGroupView
            groups={taskGroupsByArea}
            areaMap={areaMap}
            goalMap={goalMap}
            projectMap={projectMap}
            onCompletionToggle={handleCompletionToggle}
            onFocusToggle={handleFocusToggle}
            onNameSave={handleNameSave}
            onEdit={handleEdit}
            onArchiveToggle={handleArchiveToggle}
            onPermanentDelete={handlePermanentDelete}
            onNewTask={handleNewTaskByArea}
            getLinkedAreaNames={getLinkedAreaNames}
            getLinkedAreaIcons={getLinkedAreaIcons}
            getLinkedGoalNames={getLinkedGoalNames}
            getLinkedProjectNames={getLinkedProjectNames}
            emptyMessage="Tasks will be grouped by area here."
          />
        </TabsContent>

        <TabsContent value={TASK_VIEW.BY_GOAL} className="mt-0 flex-1">
          <TasksByGroupView
            groups={taskGroupsByGoal}
            areaMap={areaMap}
            goalMap={goalMap}
            projectMap={projectMap}
            onCompletionToggle={handleCompletionToggle}
            onFocusToggle={handleFocusToggle}
            onNameSave={handleNameSave}
            onEdit={handleEdit}
            onArchiveToggle={handleArchiveToggle}
            onPermanentDelete={handlePermanentDelete}
            onNewTask={handleNewTaskByGoal}
            getLinkedAreaNames={getLinkedAreaNames}
            getLinkedAreaIcons={getLinkedAreaIcons}
            getLinkedGoalNames={getLinkedGoalNames}
            getLinkedProjectNames={getLinkedProjectNames}
            emptyMessage="Tasks will be grouped by goal here."
          />
        </TabsContent>

        <TabsContent value={TASK_VIEW.BY_PROJECT} className="mt-0 flex-1">
          <TasksByGroupView
            groups={taskGroupsByProject}
            areaMap={areaMap}
            goalMap={goalMap}
            projectMap={projectMap}
            onCompletionToggle={handleCompletionToggle}
            onFocusToggle={handleFocusToggle}
            onNameSave={handleNameSave}
            onEdit={handleEdit}
            onArchiveToggle={handleArchiveToggle}
            onPermanentDelete={handlePermanentDelete}
            onNewTask={handleNewTaskByProject}
            getLinkedAreaNames={getLinkedAreaNames}
            getLinkedAreaIcons={getLinkedAreaIcons}
            getLinkedGoalNames={getLinkedGoalNames}
            getLinkedProjectNames={getLinkedProjectNames}
            emptyMessage="Tasks will be grouped by project here."
          />
        </TabsContent>

        <TabsContent value={TASK_VIEW.ARCHIVE} className="mt-0 flex-1">
          {isArchivedLoading ? (
            <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
              Loading tasks...
            </div>
          ) : archivedTasks.length === 0 ? (
            <EmptyState
              icon={Archive}
              title="No archived tasks"
              description="Archived tasks will appear here. Use the archive icon on a task row to archive it."
            />
          ) : (
            <TaskList
              tasks={archivedTasks}
              variant="simple"
              getAreaName={getAreaName}
              getLinkedAreaNames={getLinkedAreaNamesForList}
              getLinkedAreaIcons={getLinkedAreaIconsForList}
              getLinkedGoalNames={getLinkedGoalNamesForList}
              getProjectName={getProjectName}
              getLinkedProjectNames={getLinkedProjectNamesForList}
              onCompletionToggle={handleCompletionToggle}
              onFocusToggle={handleFocusToggle}
              onNameSave={handleNameSave}
              onEdit={handleEdit}
              onArchiveToggle={handleArchiveToggle}
              onPermanentDelete={handlePermanentDelete}
            />
          )}
        </TabsContent>
      </Tabs>

      <TaskDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            // Clear the editing task and any pre-selected scope so the next
            // "New Task" click opens a clean create form, not the prior
            // edit dialog. Without this, closing an edit dialog (e.g. by
            // clicking outside) leaves `editingTask` set, and the next
            // create-flow trigger reopens the same task in edit mode.
            setEditingTask(null);
            setNewTaskAreaId(undefined);
            setNewTaskGoalId(undefined);
            setNewTaskProjectId(undefined);
          }
        }}
        task={editingTask}
        defaultAreaId={newTaskAreaId}
        defaultGoalId={newTaskGoalId}
        defaultProjectId={newTaskProjectId}
        onArchiveToggle={handleArchiveToggle}
        onPermanentDelete={handlePermanentDelete}
      />
    </div>
  );
}

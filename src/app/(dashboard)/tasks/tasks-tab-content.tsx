"use client";

import React from "react";

import { TaskList } from "@/components/entities/task-list";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsContent } from "@/components/ui/tabs";
import { CalendarView } from "@/components/views/calendar-view";
import { EmptyState } from "@/components/views/empty-state";
import { TasksByGroupView, type TaskGroup } from "@/components/views/tasks-by-group-view";
import type { Task } from "@/lib/types/domain.types";
import {
  TASK_VIEW,
  type TaskView,
} from "@/lib/utils/tasks";
import { Archive, CheckSquare, Star, Zap } from "lucide-react";

interface TasksTabContentProps {
  isLoading: boolean;
  mounted: boolean;
  visibleTasks: Task[];
  archivedTasks: Task[];
  isArchivedLoading: boolean;
  taskGroupsByArea: TaskGroup[];
  taskGroupsByGoal: TaskGroup[];
  taskGroupsByProject: TaskGroup[];
  areaMap: Map<string, { name: string; icon?: string | null }>;
  goalMap: Map<string, { name: string }>;
  projectMap: Map<string, { name: string }>;
  onCompletionToggle: (id: string, isCompleted: boolean) => void;
  onFocusToggle: (id: string, focused: boolean) => void;
  onNameSave: (id: string, name: string) => void;
  onEdit: (task: Task) => void;
  onArchiveToggle: (task: Task) => void;
  onPermanentDelete: (id: string) => void;
  onNewTaskByArea: (areaId: string) => void;
  onNewTaskByGoal: (goalId: string) => void;
  onNewTaskByProject: (projectId: string) => void;
  onTaskReschedule: (taskId: string, newDate: string) => void;
  onOpenNewTask: () => void;
  getAreaName: (task: Task) => string | null;
  getLinkedAreaNames: (task: Task) => string[];
  getLinkedAreaIcons: (task: Task) => (string | null)[];
  getLinkedGoalNames: (task: Task) => string[];
  getProjectName: (task: Task) => string | null;
  getLinkedProjectNames: (task: Task) => string[];
  getLinkedAreaNamesForList: (task: Task) => string[];
  getLinkedAreaIconsForList: (task: Task) => (string | null)[];
  getLinkedGoalNamesForList: (task: Task) => string[];
  getLinkedProjectNamesForList: (task: Task) => string[];
}

export function TasksTabContent({
  isLoading,
  mounted,
  visibleTasks,
  archivedTasks,
  isArchivedLoading,
  taskGroupsByArea,
  taskGroupsByGoal,
  taskGroupsByProject,
  areaMap,
  goalMap,
  projectMap,
  onCompletionToggle,
  onFocusToggle,
  onNameSave,
  onEdit,
  onArchiveToggle,
  onPermanentDelete,
  onNewTaskByArea,
  onNewTaskByGoal,
  onNewTaskByProject,
  onTaskReschedule,
  onOpenNewTask,
  getAreaName,
  getLinkedAreaNames,
  getLinkedAreaIcons,
  getLinkedGoalNames,
  getProjectName,
  getLinkedProjectNames,
  getLinkedAreaNamesForList,
  getLinkedAreaIconsForList,
  getLinkedGoalNamesForList,
  getLinkedProjectNamesForList,
}: TasksTabContentProps) {
  return (
    <>
      <TabsContent value={TASK_VIEW.CALENDAR} className="mt-0 flex-1">
        {isLoading || !mounted ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <CalendarView
            tasks={visibleTasks}
            onTaskClick={onEdit}
            onTaskReschedule={onTaskReschedule}
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
          {isLoading || !mounted ? (
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
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
                  ? onOpenNewTask
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
              onCompletionToggle={onCompletionToggle}
              onFocusToggle={onFocusToggle}
              onNameSave={onNameSave}
              onEdit={onEdit}
              onArchiveToggle={onArchiveToggle}
              onPermanentDelete={onPermanentDelete}
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
          onCompletionToggle={onCompletionToggle}
          onFocusToggle={onFocusToggle}
          onNameSave={onNameSave}
          onEdit={onEdit}
          onArchiveToggle={onArchiveToggle}
          onPermanentDelete={onPermanentDelete}
          onNewTask={onNewTaskByArea}
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
          onCompletionToggle={onCompletionToggle}
          onFocusToggle={onFocusToggle}
          onNameSave={onNameSave}
          onEdit={onEdit}
          onArchiveToggle={onArchiveToggle}
          onPermanentDelete={onPermanentDelete}
          onNewTask={onNewTaskByGoal}
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
          onCompletionToggle={onCompletionToggle}
          onFocusToggle={onFocusToggle}
          onNameSave={onNameSave}
          onEdit={onEdit}
          onArchiveToggle={onArchiveToggle}
          onPermanentDelete={onPermanentDelete}
          onNewTask={onNewTaskByProject}
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
            onCompletionToggle={onCompletionToggle}
            onFocusToggle={onFocusToggle}
            onNameSave={onNameSave}
            onEdit={onEdit}
            onArchiveToggle={onArchiveToggle}
            onPermanentDelete={onPermanentDelete}
          />
        )}
      </TabsContent>
    </>
  );
}

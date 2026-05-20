"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Unlink } from "lucide-react";

import { AreaCard } from "@/components/entities/area-card";
import { GoalCard } from "@/components/entities/goal-card";
import { GoalDetailSection } from "@/components/entities/goal-detail-section";
import { ProjectCard } from "@/components/entities/project-card";
import { TaskListItem } from "@/components/entities/task-list-item";
import { Button } from "@/components/ui/button";
import type { Area, Goal, Note, Project, Resource, Task } from "@/lib/types/domain.types";
import { noteMatchesAreaId } from "@/lib/utils/notes";
import { buildGoalDetailHref } from "@/lib/utils/goal-urls";
import {
  buildAreaTabs,
  buildGoalTabs,
  buildProjectTabs,
  buildTaskTabs,
  filterAreasByTab,
  filterGoalsByTab,
  filterProjectsByTab,
  filterTasksByTab,
  getAreaIconsForEntity,
  getAreaNamesForEntity,
  buildAreaLookup,
} from "@/lib/utils/contact-detail-relations";
import { getGoalLinkedAreaIds } from "@/lib/utils/goals";
import { buildProjectCompletionStats, getProjectLinkedAreaIds } from "@/lib/utils/projects";
import { getTaskLinkedAreaIds } from "@/lib/utils/tasks";
import { encodeReturnTo } from "@/lib/utils/return-to";

// Re-export helpers for test access
export {
  buildAreaTabs,
  buildGoalTabs,
  buildProjectTabs,
  buildTaskTabs,
  filterAreasByTab,
  filterGoalsByTab,
  filterProjectsByTab,
  filterTasksByTab,
};

interface ContactDetailRelationshipSectionsProps {
  linkedAreas: Area[];
  linkedGoals: Goal[];
  linkedProjects: Project[];
  linkedTasks: Task[];
  linkedNotes: Note[];
  allResources: Resource[];
  allAreas: Area[];
  allProjects: Project[];
  onUnlinkArea: (areaId: string) => void;
  onUnlinkGoal: (goalId: string) => void;
  onUnlinkProject: (projectId: string) => void;
  onUnlinkTask: (taskId: string) => void;
  onTaskCompletionToggle: (taskId: string, isCompleted: boolean) => void;
  onTaskFocusToggle: (taskId: string, focused: boolean) => void;
  onTaskNameSave: (taskId: string, name: string) => void;
  onTaskEdit: (task: Task) => void;
  returnTo: string;
  areaTab: string;
  onAreaTabChange: (tab: string) => void;
  goalTab: string;
  onGoalTabChange: (tab: string) => void;
  projectTab: string;
  onProjectTabChange: (tab: string) => void;
  taskTab: string;
  onTaskTabChange: (tab: string) => void;
}

export function ContactDetailRelationshipSections({
  linkedAreas,
  linkedGoals,
  linkedProjects,
  linkedTasks,
  linkedNotes,
  allResources,
  allAreas,
  allProjects,
  onUnlinkArea,
  onUnlinkGoal,
  onUnlinkProject,
  onUnlinkTask,
  onTaskCompletionToggle,
  onTaskFocusToggle,
  onTaskNameSave,
  onTaskEdit,
  returnTo,
  areaTab,
  onAreaTabChange,
  goalTab,
  onGoalTabChange,
  projectTab,
  onProjectTabChange,
  taskTab,
  onTaskTabChange,
}: ContactDetailRelationshipSectionsProps) {
  const router = useRouter();
  const areaLookup = React.useMemo(() => buildAreaLookup(allAreas), [allAreas]);

  const taskStatsByProject = React.useMemo(
    () => buildProjectCompletionStats(linkedTasks, linkedNotes, allResources),
    [linkedTasks, linkedNotes, allResources],
  );

  const areaCountsMap = React.useMemo(() => {
    const map = new Map<string, { goals: number; projects: number; tasks: number; notes: number; resources: number }>();
    for (const area of linkedAreas) {
      map.set(area.id, {
        goals: linkedGoals.filter((g) => getGoalLinkedAreaIds(g).includes(area.id)).length,
        projects: linkedProjects.filter((p) => getProjectLinkedAreaIds(p).includes(area.id)).length,
        tasks: linkedTasks.filter((t) => getTaskLinkedAreaIds(t).includes(area.id)).length,
        notes: linkedNotes.filter((n) => noteMatchesAreaId(n, area.id)).length,
        resources: allResources.filter((r) => r.area_id === area.id && !r.is_archived).length,
      });
    }
    return map;
  }, [linkedAreas, linkedGoals, linkedProjects, linkedTasks, linkedNotes, allResources]);

  const goalAreaIconsMap = React.useMemo(() => {
    const map = new Map<string, (string | null)[]>();
    for (const goal of linkedGoals) {
      const areaIds = getGoalLinkedAreaIds(goal);
      map.set(goal.id, getAreaIconsForEntity(areaIds, areaLookup));
    }
    return map;
  }, [linkedGoals, areaLookup]);

  const rollupsByProject = React.useMemo(() => {
    const result = new Map<string, { goalCount: number; taskCount: number; noteCount: number; resourceCount: number }>();
    const activeGoalIdSet = new Set(linkedGoals.filter((g) => !g.is_archived && !g.is_completed).map((g) => g.id));
    for (const project of linkedProjects) {
      const linkedGoalIds = (project as unknown as { linkedGoalIds?: string[] }).linkedGoalIds ?? [];
      const goalCount = linkedGoalIds.filter((id) => activeGoalIdSet.has(id)).length;
      const taskCount = linkedTasks.filter(
        (t) => t.project_id === project.id && !t.is_archived && !t.is_completed,
      ).length;
      const noteCount = linkedNotes.filter(
        (n) => (n.project_id === project.id || n.linkedProjectIds?.includes(project.id)) && !n.is_archived,
      ).length;
      const resourceCount = allResources.filter(
        (r) => r.project_id === project.id && !r.is_archived,
      ).length;
      result.set(project.id, { goalCount, taskCount, noteCount, resourceCount });
    }
    return result;
  }, [linkedProjects, linkedGoals, linkedTasks, linkedNotes, allResources]);

  const areaTabs = React.useMemo(() => buildAreaTabs(linkedAreas), [linkedAreas]);
  const goalTabs = React.useMemo(() => buildGoalTabs(linkedGoals), [linkedGoals]);
  const projectTabs = React.useMemo(
    () => buildProjectTabs(linkedProjects),
    [linkedProjects],
  );
  const taskTabs = React.useMemo(() => buildTaskTabs(linkedTasks), [linkedTasks]);

  const filteredAreas = React.useMemo(
    () => filterAreasByTab(linkedAreas, areaTab),
    [linkedAreas, areaTab],
  );
  const filteredGoals = React.useMemo(
    () => filterGoalsByTab(linkedGoals, goalTab),
    [linkedGoals, goalTab],
  );
  const filteredProjects = React.useMemo(
    () => filterProjectsByTab(linkedProjects, projectTab),
    [linkedProjects, projectTab],
  );
  const filteredTasks = React.useMemo(
    () => filterTasksByTab(linkedTasks, taskTab),
    [linkedTasks, taskTab],
  );

  return (
    <>
      {/* Areas */}
      <GoalDetailSection
        id="contact-areas"
        entityType="projects"
        heading="Areas"
        tabs={areaTabs}
        activeTab={areaTab}
        onTabChange={onAreaTabChange}
        isLoading={false}
        emptyTitle="No areas linked"
        emptyDescription="Link areas to organize this contact within your life areas."
      >
        {filteredAreas.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredAreas.map((area) => (
              <div key={area.id} className="relative">
                <AreaCard
                  area={area}
                  goalsCount={areaCountsMap.get(area.id)?.goals ?? 0}
                  projectsCount={areaCountsMap.get(area.id)?.projects ?? 0}
                  tasksCount={areaCountsMap.get(area.id)?.tasks ?? 0}
                  notesCount={areaCountsMap.get(area.id)?.notes ?? 0}
                  resourcesCount={areaCountsMap.get(area.id)?.resources ?? 0}
                  returnTo={returnTo}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-2"
                  onClick={(event) => {
                    event.stopPropagation();
                    onUnlinkArea(area.id);
                  }}
                >
                  <Unlink className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </GoalDetailSection>

      {/* Goals */}
      <GoalDetailSection
        id="contact-goals"
        entityType="goals"
        tabs={goalTabs}
        activeTab={goalTab}
        onTabChange={onGoalTabChange}
        isLoading={false}
        emptyTitle="No goals linked"
        emptyDescription="Link goals to track which outcomes this contact contributes to."
      >
        {filteredGoals.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredGoals.map((goal) => {
              const areaIds = getGoalLinkedAreaIds(goal);
              const areaNames = getAreaNamesForEntity(areaIds, areaLookup);
              return (
                <div key={goal.id} className="relative">
                  <GoalCard
                    goal={goal}
                    areaNames={areaNames}
                    areaIcons={goalAreaIconsMap.get(goal.id)}
                    rollups={
                      goal.projectCount !== undefined
                        ? {
                            projectCount: goal.projectCount,
                            taskCount: goal.taskCount ?? 0,
                            noteCount: goal.noteCount ?? 0,
                            resourceCount: goal.resourceCount ?? 0,
                          }
                        : undefined
                    }
                    onEdit={() =>
                      router.push(
                        `${buildGoalDetailHref(goal)}?returnTo=${encodeReturnTo(returnTo)}`,
                      )
                    }
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-2"
                    onClick={(event) => {
                      event.stopPropagation();
                      onUnlinkGoal(goal.id);
                    }}
                  >
                    <Unlink className="size-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        ) : null}
      </GoalDetailSection>

      {/* Projects */}
      <GoalDetailSection
        id="contact-projects"
        entityType="projects"
        tabs={projectTabs}
        activeTab={projectTab}
        onTabChange={onProjectTabChange}
        isLoading={false}
        emptyTitle="No projects linked"
        emptyDescription="Link projects to track which initiatives this contact is involved in."
      >
        {filteredProjects.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredProjects.map((project) => {
              const areaIds = getProjectLinkedAreaIds(project);
              const areaNames = getAreaNamesForEntity(areaIds, areaLookup);
              const areaIcons = getAreaIconsForEntity(areaIds, areaLookup);
              return (
                <div key={project.id} className="relative">
                  <ProjectCard
                    project={project}
                    areaNames={areaNames}
                    areaIcons={areaIcons}
                    returnTo={returnTo}
                    taskStats={taskStatsByProject.get(project.id)}
                    rollups={rollupsByProject.get(project.id)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-2"
                    onClick={(event) => {
                      event.stopPropagation();
                      onUnlinkProject(project.id);
                    }}
                  >
                    <Unlink className="size-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        ) : null}
      </GoalDetailSection>

      {/* Tasks */}
      <GoalDetailSection
        id="contact-tasks"
        entityType="tasks"
        tabs={taskTabs}
        activeTab={taskTab}
        onTabChange={onTaskTabChange}
        isLoading={false}
        emptyTitle="No tasks linked"
        emptyDescription="Link tasks to track work related to this contact."
      >
        {filteredTasks.length > 0 ? (
          <div className="rounded-lg border bg-card">
            {filteredTasks.map((task) => {
              const areaIds = getTaskLinkedAreaIds(task);
              const linkedAreaNames = getAreaNamesForEntity(
                areaIds,
                areaLookup,
              );
              const linkedAreaIcons = getAreaIconsForEntity(
                areaIds,
                areaLookup,
              );
              const projectName = task.project_id
                ? allProjects.find((p) => p.id === task.project_id)?.name ?? null
                : null;
              return (
                <TaskListItem
                  key={task.id}
                  task={task}
                  linkedAreaNames={linkedAreaNames}
                  linkedAreaIcons={linkedAreaIcons}
                  projectName={projectName}
                  onCompletionToggle={onTaskCompletionToggle}
                  onFocusToggle={onTaskFocusToggle}
                  onNameSave={onTaskNameSave}
                  onEdit={onTaskEdit}
                  onDelete={onUnlinkTask}
                />
              );
            })}
          </div>
        ) : null}
      </GoalDetailSection>
    </>
  );
}

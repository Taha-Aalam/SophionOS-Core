"use client";

import { cardGrid } from "@/components/ui/layout";

import { Folder, Globe, Map as MapIcon, NotebookPen, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { GreetingBar } from "@/components/dashboard/greeting-bar";
import { AreaCard } from "@/components/entities/area-card";
import { AreaDialog } from "@/components/entities/area-dialog";
import { GoalCard } from "@/components/entities/goal-card";
import { NoteRow } from "@/components/entities/note-row";
import { ProjectCard } from "@/components/entities/project-card";
import { ResourceDialog } from "@/components/entities/resource-dialog";
import { ResourceRow } from "@/components/entities/resource-row";
import { TaskDialog } from "@/components/entities/task-dialog";
import { TaskList } from "@/components/entities/task-list";
import { useAuth } from "@/components/providers/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/views/empty-state";
import { ErrorState } from "@/components/views/error-state";
import { GalleryGrid } from "@/components/views/gallery-grid";
import { useArchiveArea, useAreas, useUpdateArea } from "@/lib/hooks/use-areas";
import { useArchiveGoal, useGoals } from "@/lib/hooks/use-goals";
import {
  useArchiveNote,
  useDeleteNote,
  useNotes,
  useRestoreNote,
  useToggleFavoriteNote,
  useTogglePinNote,
  useUpdateNote,
} from "@/lib/hooks/use-notes";
import { useArchiveProject, useProjects } from "@/lib/hooks/use-projects";
import {
  useArchiveResource,
  useDeleteResource,
  useResources,
  useToggleFavoriteResource,
  useUnarchiveResource,
  useUpdateResource,
} from "@/lib/hooks/use-resources";
import {
  useArchiveTask,
  useCompleteTask,
  useFocusTask,
  usePermanentDeleteTask,
  useRestoreTask,
  useTasks,
  useUpdateTask,
} from "@/lib/hooks/use-tasks";
import { useTopics } from "@/lib/hooks/use-topics";

import { SectionHeader } from "@/components/dashboard/section-header";
import { classifyAreaStatus, getAreaRollups, sortAreasForDisplay } from "@/lib/utils/areas";
import { NOTE_STATUS, PROJECT_STATUS, RESOURCE_STATUS, TASK_STATUS } from "@/lib/utils/constants";
import { buildGoalDetailHref } from "@/lib/utils/goal-urls";
import { getGoalLinkedAreaIds } from "@/lib/utils/goals";
import {
  getNoteLinkedAreaIds,
  getNoteLinkedGoalIds,
  getNoteLinkedProjectIds,
} from "@/lib/utils/notes";
import {
  getResourceLinkedAreaIds,
  getResourceLinkedGoalIds,
  getResourceLinkedProjectIds,
  getResourceLinkedTaskIds,
} from "@/lib/utils/resources";
import {
  getTaskLinkedAreaNames,
  getTaskLinkedAreaIcons,
  getTaskLinkedAreaIds,
  getTaskLinkedGoalNames,
  getTaskLinkedProjectNames,
  getTaskLinkedProjectIds,
} from "@/lib/utils/tasks";

export function DashboardContent() {
  const router = useRouter();
  const { user } = useAuth();

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<import("@/lib/types/domain.types").Task | null>(
    null,
  );
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<
    import("@/lib/types/domain.types").Resource | null
  >(null);
  const [areaDialogOpen, setAreaDialogOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<
    import("@/lib/types/domain.types").Area | undefined
  >(undefined);

  const { data: areas = [], isLoading: areasLoading, isError: areasError, refetch: refetchAreas } = useAreas();
  const { data: goalsAll = [], isLoading: goalsLoading, isError: goalsError, refetch: refetchGoals } = useGoals({ status: "all" });
  // Derived from the single status:"all" fetch above — the service's active
  // filter is exactly the DB predicate `!is_completed && !is_archived`, so
  // deriving here avoids a second goals query plus its area-link/progress/rollup
  // hydration fan-out.
  const goalsActive = useMemo(
    () => goalsAll.filter((g) => !g.is_completed && !g.is_archived),
    [goalsAll],
  );
  const { data: projectsAll = [], isLoading: projectsLoading, isError: projectsError, refetch: refetchProjects } = useProjects({ status: "all" });
  const { data: allTasks = [], isLoading: tasksLoading, isError: tasksError, refetch: refetchTasks } = useTasks();
  const { data: allNotes = [], isLoading: notesLoading, isError: notesError, refetch: refetchNotes } = useNotes({ includeArchived: true });
  const { data: allResources = [], isLoading: resourcesLoading, isError: resourcesError, refetch: refetchResources } = useResources({ status: "all" });
  const { data: allTopics = [] } = useTopics();

  const userId = user?.id;
  const archiveArea = useArchiveArea(userId);
  const updateArea = useUpdateArea(userId);
  const archiveGoal = useArchiveGoal();
  const archiveProject = useArchiveProject();

  const completeTask = useCompleteTask();
  const focusTask = useFocusTask();
  const updateTask = useUpdateTask();
  const archiveTask = useArchiveTask();
  const _restoreTaskHook = useRestoreTask();
  const permanentDelete = usePermanentDeleteTask();
  const togglePinNote = useTogglePinNote();
  const updateNote = useUpdateNote();
  const archiveNote = useArchiveNote();
  const restoreNote = useRestoreNote();
  const deleteNote = useDeleteNote();
  const toggleFavoriteNote = useToggleFavoriteNote();
  const toggleFavoriteResource = useToggleFavoriteResource();
  const archiveResource = useArchiveResource();
  const unarchiveResource = useUnarchiveResource();
  const deleteResource = useDeleteResource();
  const updateResource = useUpdateResource();

  const areaMap = useMemo(
    () => new Map(areas.map((a) => [a.id, { name: a.name, icon: a.icon ?? null }])),
    [areas],
  );
  const areaNamesMap = useMemo(() => new Map(areas.map((a) => [a.id, a.name])), [areas]);
  const areaIconsMap = useMemo(() => new Map(areas.map((a) => [a.id, a.icon ?? null])), [areas]);
  const goalNamesMap = useMemo(() => new Map(goalsAll.map((g) => [g.id, g.name])), [goalsAll]);
  const projectNamesMap = useMemo(
    () => new Map(projectsAll.map((p) => [p.id, p.name])),
    [projectsAll],
  );
  const taskNamesMap = useMemo(() => new Map(allTasks.map((t) => [t.id, t.name])), [allTasks]);
  const topicNamesMap = useMemo(() => new Map(allTopics.map((t) => [t.id, t.name])), [allTopics]);

  const sortedAreas = useMemo(() => sortAreasForDisplay(areas), [areas]);

  const activeProjects = useMemo(
    () =>
      projectsAll.filter(
        (p) => !p.is_archived && p.status !== PROJECT_STATUS.COMPLETED,
      ),
    [projectsAll],
  );

  const todoInProgressTasks = useMemo(
    () =>
      allTasks.filter(
        (t) =>
          !t.is_archived &&
          !t.is_completed &&
          (t.status === TASK_STATUS.TODO || t.status === TASK_STATUS.IN_PROGRESS),
      ),
    [allTasks],
  );

  const toReviewActiveNotes = useMemo(
    () =>
      allNotes.filter(
        (n) =>
          !n.is_archived && (n.status === NOTE_STATUS.TO_REVIEW || n.status === NOTE_STATUS.ACTIVE),
      ),
    [allNotes],
  );

  const toReviewActiveResources = useMemo(
    () =>
      allResources.filter(
        (r) =>
          !r.is_archived &&
          (r.status === RESOURCE_STATUS.TO_REVIEW || r.status === RESOURCE_STATUS.ACTIVE),
      ),
    [allResources],
  );

  const rollupsByAreaId = useMemo(() => {
    return new Map(
      sortedAreas.map((area) => [
        area.id,
        getAreaRollups({
          areaId: area.id,
          goals: goalsAll,
          projects: projectsAll,
          tasks: allTasks,
          notes: allNotes,
          resources: allResources,
        }),
      ]),
    );
  }, [sortedAreas, goalsAll, projectsAll, allTasks, allNotes, allResources]);

  const activeAreas = useMemo(
    () =>
      sortAreasForDisplay(
        sortedAreas.filter(
          (area) =>
            classifyAreaStatus(area) === "active" &&
            !isAreaEffectivelyInactiveImpl(area, rollupsByAreaId.get(area.id)),
        ),
      ),
    [sortedAreas, rollupsByAreaId],
  );

  const isLoading =
    areasLoading ||
    goalsLoading ||
    projectsLoading ||
    tasksLoading ||
    notesLoading ||
    resourcesLoading;

  const isQueryError = areasError || goalsError || projectsError || tasksError || notesError || resourcesError;

  if (isQueryError) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16">
        <ErrorState
          message="Failed to load dashboard data."
          onRetry={() => {
            if (areasError) refetchAreas();
            if (goalsError) refetchGoals();
            if (projectsError) refetchProjects();
            if (tasksError) refetchTasks();
            if (notesError) refetchNotes();
            if (resourcesError) refetchResources();
          }}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="reveal-stagger flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
        {/* GreetingBar skeleton */}
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        {/* Stat chips */}
        <div className="flex flex-wrap gap-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-7 w-28 rounded-full" />
          ))}
        </div>
        {/* 6 sections matching actual render */}
        {["Active Areas", "Active Goals", "Active Projects", "Active Tasks", "Active Notes", "Active Resources"].map((title, i) => (
          <section key={i}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-1.5 h-full min-h-[2.5rem] w-px shrink-0 rounded-full bg-muted-foreground/20" />
                <div>
                  <Skeleton className="h-6 w-36" />
                  <Skeleton className="mt-1 h-4 w-56" />
                </div>
              </div>
            </div>
            <div className="mt-4">
              {title === "Active Goals" ? (
                <div className={cardGrid}>
                  {[0, 1].map((j) => (
                    <Skeleton key={j} className="h-40 rounded-xl" />
                  ))}
                </div>
              ) : title === "Active Areas" || title === "Active Projects" ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {[0, 1, 2].map((j) => (
                    <Skeleton key={j} className="h-48 rounded-xl" />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-border">
                  {[0, 1, 2].map((j) => (
                    <Skeleton key={j} className="h-14 rounded-lg" />
                  ))}
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="content-fade-in reveal-stagger flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <GreetingBar userName={user?.name ?? undefined} />

      {/* Active Areas */}
      <section>
        <SectionHeader
          accentClass="bg-orange-500"
          title="Active Areas"
          totalCount={activeAreas.length}
          description="Your active focus areas."
        />
        <div className="mt-4">
          {activeAreas.length === 0 ? (
            <EmptyState
              icon={MapIcon}
              title="No active areas"
              description="Create your first area to get started."
            />
          ) : (
            <GalleryGrid>
              {activeAreas.map((area) => (
                <AreaCard
                  key={area.id}
                  area={area}
                  goalsCount={rollupsByAreaId.get(area.id)?.goalsCount}
                  projectsCount={rollupsByAreaId.get(area.id)?.projectsCount}
                  tasksCount={rollupsByAreaId.get(area.id)?.tasksCount}
                  notesCount={rollupsByAreaId.get(area.id)?.notesCount}
                  resourcesCount={rollupsByAreaId.get(area.id)?.resourcesCount}
                  returnTo="/dashboard"
                  onEdit={(a) => {
                    setEditingArea(a);
                    setAreaDialogOpen(true);
                  }}
                  onArchive={(a) => archiveArea.mutate(a.id)}
                  isArchiving={archiveArea.isPending}
                />
              ))}
            </GalleryGrid>
          )}
        </div>
      </section>

      {/* Active Goals */}
      <section>
        <SectionHeader
          accentClass="bg-rose-500"
          title="Active Goals"
          totalCount={goalsActive.length}
          description="Goals you're currently working on."
        />
        <div className="mt-4">
          {goalsActive.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No active goals"
              description="Create your first goal to start tracking progress."
            />
          ) : (
            <div className={cardGrid}>
              {goalsActive.map((goal) => {
                const linkedAreaIds = getGoalLinkedAreaIds(goal);
                const linkedAreaNames = linkedAreaIds
                  .map((id) => areaNamesMap.get(id))
                  .filter((name): name is string => Boolean(name));
                const linkedAreaIcons = linkedAreaIds.map((id) => areaIconsMap.get(id) ?? null);
                return (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    areaName={(() => { const id = getGoalLinkedAreaIds(goal)[0]; return id ? areaNamesMap.get(id) : "Unassigned"; })()}
                    areaNames={linkedAreaNames}
                    areaIcons={linkedAreaIcons}
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
                        `${buildGoalDetailHref(goal)}?returnTo=${encodeURIComponent("/dashboard")}`,
                      )
                    }
                    onArchive={(g) => archiveGoal.mutate(g.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Active Projects */}
      <section>
        <SectionHeader
          accentClass="bg-amber-500"
          title="Active Projects"
          totalCount={activeProjects.length}
          description="Projects in progress."
        />
        <div className="mt-4">
          {activeProjects.length === 0 ? (
            <EmptyState
              icon={Folder}
              title="No active projects"
              description="Create your first project to get started."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {activeProjects.map((project) => {
                const areaIds = project.linkedAreaIds ?? (project.area_id ? [project.area_id] : []);
                const projectAreaNames = areaIds
                  .map((id: string) => areaNamesMap.get(id))
                  .filter((n: string | undefined): n is string => Boolean(n));
                const projectAreaIcons = areaIds.map((id: string) => areaIconsMap.get(id) ?? null);
                return (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    areaName={project.area_id ? areaNamesMap.get(project.area_id) : undefined}
                    areaNames={projectAreaNames}
                    areaIcons={projectAreaIcons}
                    returnTo="/dashboard"
                    onArchive={(p) => archiveProject.mutate(p.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Active Tasks */}
      <section>
        <SectionHeader
          accentClass="bg-blue-500"
          title="Active Tasks"
          totalCount={todoInProgressTasks.length}
          description="Tasks in To do and In progress status."
        />
        <div className="mt-4">
          <TaskList
            tasks={todoInProgressTasks}
            variant="card"
            emptyTitle="No active tasks"
            emptyDescription="Tasks in To do and In progress will appear here."
            emptyIcon={NotebookPen}
            getAreaName={(task) => {
              const firstId = getTaskLinkedAreaIds(task)[0];
              return firstId ? areaNamesMap.get(firstId) ?? null : null;
            }}
            getLinkedAreaNames={(task) => getTaskLinkedAreaNames(task, areaNamesMap)}
            getLinkedAreaIcons={(task) => getTaskLinkedAreaIcons(task, areaIconsMap)}
            getLinkedGoalNames={(task) => getTaskLinkedGoalNames(task, goalNamesMap)}
            getProjectName={(task) => {
              const firstId = getTaskLinkedProjectIds(task)[0];
              return firstId ? projectNamesMap.get(firstId) ?? null : null;
            }}
            getLinkedProjectNames={(task) => getTaskLinkedProjectNames(task, projectNamesMap)}
            onCompletionToggle={(id, isCompleted) => {
              if (isCompleted) { completeTask.mutate(id); return; }
              updateTask.mutate({ id, input: { completed_at: null, is_completed: false } });
            }}
            onFocusToggle={(id, focused) => focusTask.mutate({ id, is_focused: focused })}
            onNameSave={(id, name) => updateTask.mutate({ id, input: { name } })}
            onEdit={(t) => { setEditingTask(t); setTaskDialogOpen(true); }}
            onArchiveToggle={(task) => archiveTask.mutate(task.id)}
            onPermanentDelete={(id) => permanentDelete.mutate(id)}
          />
        </div>
      </section>

      {/* Active Notes */}
      <section>
        <SectionHeader
          accentClass="bg-purple-500"
          title="Active Notes"
          totalCount={toReviewActiveNotes.length}
          description="Notes in To Review and Active status."
        />
        <div className="mt-4">
          {toReviewActiveNotes.length === 0 ? (
            <EmptyState
              icon={NotebookPen}
              title="No active notes"
              description="Notes in To Review and Active status will appear here."
            />
          ) : (
            <div className="rounded-lg border border-border">
              {toReviewActiveNotes.map((note) => (
                <NoteRow
                  key={note.id}
                  note={note}
                  returnTo="/dashboard"
                  areas={getNoteLinkedAreaIds(note)
                    .map((id) => areaMap.get(id))
                    .filter((a): a is { name: string; icon: string | null } => Boolean(a))}
                  goalNames={getNoteLinkedGoalIds(note)
                    .map((id) => goalNamesMap.get(id))
                    .filter((n): n is string => Boolean(n))}
                  projectNames={getNoteLinkedProjectIds(note)
                    .map((id) => projectNamesMap.get(id))
                    .filter((n): n is string => Boolean(n))}
                  taskNames={(note.linkedTaskIds ?? [])
                    .map((id) => taskNamesMap.get(id))
                    .filter((n): n is string => Boolean(n))}
                  onPinToggle={(id, pin) => togglePinNote.mutate({ id, pin })}
                  onFavoriteToggle={(id, favorite) => toggleFavoriteNote.mutate({ id, favorite })}
                  onSaveStatusChange={(id, saved) => updateNote.mutate({ id, input: { status: saved ? "completed" : "inbox" } })}
                  onArchive={(id) => archiveNote.mutate(id)}
                  onRestore={(id) => restoreNote.mutate(id)}
                  onDelete={(id) => deleteNote.mutate(id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Active Resources */}
      <section>
        <SectionHeader
          accentClass="bg-emerald-500"
          title="Active Resources"
          totalCount={toReviewActiveResources.length}
          description="Resources in To Review and Active status."
        />
        <div className="mt-4">
          {toReviewActiveResources.length === 0 ? (
            <EmptyState
              icon={Globe}
              title="No active resources"
              description="Resources in To Review and Active status will appear here."
            />
          ) : (
            <div className="rounded-lg border border-border">
              {toReviewActiveResources.map((resource) => (
                <ResourceRow
                  key={resource.id}
                  resource={resource}
                  areas={getResourceLinkedAreaIds(resource)
                    .map((id) => areaMap.get(id))
                    .filter((a): a is { name: string; icon: string | null } => Boolean(a))}
                  goalNames={getResourceLinkedGoalIds(resource)
                    .map((id) => goalNamesMap.get(id))
                    .filter((n): n is string => Boolean(n))}
                  projectNames={getResourceLinkedProjectIds(resource)
                    .map((id) => projectNamesMap.get(id))
                    .filter((n): n is string => Boolean(n))}
                  taskNames={getResourceLinkedTaskIds(resource)
                    .map((id) => taskNamesMap.get(id))
                    .filter((n): n is string => Boolean(n))}
                  topicName={resource.topic_id ? topicNamesMap.get(resource.topic_id) : undefined}
                  onSaveStatusChange={(id, saved) => updateResource.mutate({ id, input: { status: saved ? "completed" : "inbox" } })}
                  onToggleFavorite={(id, favorite) =>
                    toggleFavoriteResource.mutate({ id, favorite })
                  }
                  onArchive={(id) => archiveResource.mutate(id)}
                  onUnarchive={(id) => unarchiveResource.mutate(id)}
                  onDelete={(id) => deleteResource.mutate(id)}
                  onEdit={(r) => {
                    setEditingResource(r);
                    setResourceDialogOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {editingTask && (
        <TaskDialog
          open={taskDialogOpen}
          onOpenChange={(open) => {
            setTaskDialogOpen(open);
            if (!open) setEditingTask(null);
          }}
          task={editingTask}
          onArchiveToggle={(task) => archiveTask.mutate(task.id)}
          onPermanentDelete={(id) => permanentDelete.mutate(id)}
        />
      )}

      {editingResource && (
        <ResourceDialog
          open={resourceDialogOpen}
          onOpenChange={(open) => {
            setResourceDialogOpen(open);
            if (!open) setEditingResource(null);
          }}
          resource={editingResource}
          onSubmit={(input) => {
            updateResource.mutate({ id: editingResource.id, input });
            setResourceDialogOpen(false);
            setEditingResource(null);
          }}
          isPending={updateResource.isPending}
        />
      )}

      {editingArea && (
        <AreaDialog
          open={areaDialogOpen}
          onOpenChange={(open) => {
            setAreaDialogOpen(open);
            if (!open) setEditingArea(undefined);
          }}
          area={editingArea}
          onSubmit={async (data) => {
            await updateArea.mutateAsync({ id: editingArea.id, ...data });
            setAreaDialogOpen(false);
            setEditingArea(undefined);
          }}
          isLoading={updateArea.isPending}
        />
      )}
    </div>
  );
}

function isAreaEffectivelyInactiveImpl(
  area: { archive: boolean; inactive: boolean },
  rollups?: {
    goalsCount: number;
    projectsCount: number;
    tasksCount: number;
    notesCount: number;
    resourcesCount: number;
  },
): boolean {
  if (area.archive) return false;
  if (area.inactive) return true;
  if (!rollups) return false;
  return (
    rollups.goalsCount === 0 &&
    rollups.projectsCount === 0 &&
    rollups.tasksCount === 0 &&
    rollups.notesCount === 0 &&
    rollups.resourcesCount === 0
  );
}

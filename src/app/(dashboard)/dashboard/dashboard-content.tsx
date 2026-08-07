"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { GreetingBar } from "@/components/dashboard/greeting-bar";
import { useAuth } from "@/components/providers/auth-provider";
import { DashboardAnalyticsSection } from "./dashboard-analytics-section";

import dynamic from "next/dynamic";

const TaskDialog = dynamic(
  () => import("@/components/entities/task-dialog").then((m) => m.TaskDialog),
  { ssr: false },
);
const ResourceDialog = dynamic(
  () => import("@/components/entities/resource-dialog").then((m) => m.ResourceDialog),
  { ssr: false },
);
const AreaDialog = dynamic(
  () => import("@/components/entities/area-dialog").then((m) => m.AreaDialog),
  { ssr: false },
);

import { useArchiveArea, useAreas, useUpdateArea } from "@/lib/hooks/use-areas";
import { useArchiveGoal, useGoals } from "@/lib/hooks/use-goals";
import { useArchiveProject, useProjects } from "@/lib/hooks/use-projects";
import {
  useArchiveTask,
  usePermanentDeleteTask,
  useTasks,
} from "@/lib/hooks/use-tasks";
import { useNotes } from "@/lib/hooks/use-notes";
import {
  useArchiveResource,
  useResources,
  useUpdateResource,
} from "@/lib/hooks/use-resources";
import { useTopics } from "@/lib/hooks/use-topics";
import { useContacts } from "@/lib/hooks/use-contacts";

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
  const { data: projectsAll = [], isLoading: projectsLoading, isError: projectsError, refetch: refetchProjects } = useProjects({ status: "all" });
  const { data: allTasks = [], isLoading: tasksLoading, isError: tasksError, refetch: refetchTasks } = useTasks();
  const { data: allNotes = [], isLoading: notesLoading, isError: notesError, refetch: refetchNotes } = useNotes({ includeArchived: true });
  const { data: allResources = [], isLoading: resourcesLoading, isError: resourcesError, refetch: refetchResources } = useResources({ status: "all" });
  const { data: allTopics = [] } = useTopics();
  const {
    data: allContacts = [],
    isLoading: contactsLoading,
    isError: contactsError,
    refetch: refetchContacts,
  } = useContacts({ archive: false });

  const userId = user?.id;
  const archiveArea = useArchiveArea(userId);
  const updateArea = useUpdateArea(userId);
  const archiveGoal = useArchiveGoal();
  const archiveProject = useArchiveProject();

  const archiveTask = useArchiveTask();
  const permanentDelete = usePermanentDeleteTask();
  const archiveResource = useArchiveResource();
  const updateResource = useUpdateResource();

  const areaMap = useMemo(
    () => new Map(areas.map((a) => [a.id, { name: a.name, icon: a.icon ?? null }])),
    [areas],
  );
  const areaNamesMap = useMemo(() => new Map(areas.map((a) => [a.id, a.name])), [areas]);
  const goalNamesMap = useMemo(() => new Map(goalsAll.map((g) => [g.id, g.name])), [goalsAll]);
  const projectNamesMap = useMemo(
    () => new Map(projectsAll.map((p) => [p.id, p.name])),
    [projectsAll],
  );
  const taskNamesMap = useMemo(() => new Map(allTasks.map((t) => [t.id, t.name])), [allTasks]);
  const topicNamesMap = useMemo(() => new Map(allTopics.map((t) => [t.id, t.name])), [allTopics]);

  const isLoading =
    areasLoading ||
    goalsLoading ||
    projectsLoading ||
    tasksLoading ||
    notesLoading ||
    resourcesLoading ||
    contactsLoading;

  const isQueryError =
    areasError ||
    goalsError ||
    projectsError ||
    tasksError ||
    notesError ||
    resourcesError ||
    contactsError;

  if (isQueryError) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16">
        <p className="text-muted-foreground">Failed to load dashboard data.</p>
      </div>
    );
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-16" />;
  }

  return (
    <div className="content-fade-in mx-auto flex w-full max-w-7xl flex-col gap-8 p-6">
      <GreetingBar userName={user?.name ?? undefined} />

      <DashboardAnalyticsSection
        areas={areas}
        goals={goalsAll}
        projects={projectsAll}
        tasks={allTasks}
        notes={allNotes}
        resources={allResources}
        topics={allTopics}
        contacts={allContacts}
      />

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
          onSubmit={async (input) => {
            await updateResource.mutateAsync({ id: editingResource.id, input });
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

"use client";

import { type ReactNode, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Activity, Archive, CheckSquare, Folder, Inbox, Layers, LayoutGrid, Map as MapIcon, Pencil, Plus, Target } from "lucide-react";

import { ProjectCard } from "@/components/entities/project-card";
import { ProjectDialog } from "@/components/entities/project-dialog";
import { EmptyState } from "@/components/views/empty-state";
import { ProjectsByAreaView, type ProjectsByAreaGroup } from "@/components/views/projects-by-area-view";
import { ProjectsByGoalView, type ProjectsByGoalGroup } from "@/components/views/projects-by-goal-view";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useGoals } from "@/lib/hooks/use-goals";
import { groupProjectsByGoal } from "@/lib/utils/projects";

// KanbanBoard pulls @hello-pangea/dnd (~50KB gz). Only needed in the "By Status" tab.
const KanbanBoard = dynamic(
  () => import("@/components/views/kanban-board").then((m) => m.KanbanBoard),
  {
    ssr: false,
    loading: () => (
      <div className="flex gap-4">
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[300px] w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    ),
  },
);
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAreas } from "@/lib/hooks/use-areas";
import { useNotes } from "@/lib/hooks/use-notes";
import { useProjects } from "@/lib/hooks/use-projects";
import { useResources } from "@/lib/hooks/use-resources";
import { useTasks } from "@/lib/hooks/use-tasks";
import { type Project } from "@/lib/types/domain.types";
import {
  buildProjectTaskStats,
  getProjectLinkedAreaIds,
  groupProjectsByArea,
  groupProjectsByStatus,
  mergeProjectQueryResults,
  PROJECT_VIEW,
} from "@/lib/utils/projects";
import { buildProjectDetailHref } from "@/lib/utils/project-urls";

function getAreaName(areaId: string | null, areaNames: Map<string, string>): string | undefined {
  if (!areaId) {
    return undefined;
  }

  return areaNames.get(areaId);
}

function getProjectAreaNames(project: Project, areaNames: Map<string, string>): string[] {
  return getProjectLinkedAreaIds(project)
    .map((id) => areaNames.get(id))
    .filter((name): name is string => Boolean(name));
}

export default function ProjectsPage() {
  const router = useRouter();
  const [activeView, setActiveView] = useState(PROJECT_VIEW.ALL);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [defaultAreaIds, setDefaultAreaIds] = useState<string[]>([]);
  const [defaultGoalId, setDefaultGoalId] = useState<string | undefined>(undefined);

  const { data: activeProjectResults = [], isLoading: isLoadingActiveProjects } = useProjects({
    status: "all",
  });
  const { data: archivedProjectResults = [], isLoading: isLoadingArchivedProjects } = useProjects({
    status: "archived",
  });
  const { data: areas = [] } = useAreas();
  const { data: tasks = [] } = useTasks();
  const { data: notes = [] } = useNotes({ status: "all" });
  const { data: resources = [] } = useResources({ status: "all" });
  const { data: allGoals = [] } = useGoals({ status: "all" });

  const allProjects = useMemo(
    () => mergeProjectQueryResults(activeProjectResults, archivedProjectResults),
    [activeProjectResults, archivedProjectResults],
  );
  const isLoadingProjects = isLoadingActiveProjects || isLoadingArchivedProjects;
  const activeProjects = useMemo(
    () => activeProjectResults.filter((project) => !project.is_archived),
    [activeProjectResults],
  );
  const archivedProjects = useMemo(
    () => archivedProjectResults.filter((project) => project.is_archived),
    [archivedProjectResults],
  );
  const areaNames = useMemo(
    () => new Map(areas.map((area) => [area.id, area.name])),
    [areas],
  );
  const taskStatsByProject = useMemo(() => buildProjectTaskStats(tasks), [tasks]);
  const projectsByStatus = useMemo(() => groupProjectsByStatus(activeProjects), [activeProjects]);
  const projectsByArea = useMemo(() => groupProjectsByArea(activeProjects), [activeProjects]);
  const groupedByAreaGroups = useMemo((): ProjectsByAreaGroup[] => {
    const byAreaId: Record<string, Project[]> = {};
    for (const project of activeProjects) {
      const ids = getProjectLinkedAreaIds(project);
      if (ids.length === 0) {
        const current = byAreaId["unassigned"] ?? [];
        current.push(project);
        byAreaId["unassigned"] = current;
      } else {
        for (const areaId of ids) {
          const current = byAreaId[areaId] ?? [];
          current.push(project);
          byAreaId[areaId] = current;
        }
      }
    }
    return Object.entries(byAreaId).map(([areaId, projects]) => ({
      areaId,
      areaName: areaId === "unassigned" ? "Unassigned" : (areaNames.get(areaId) ?? areaId),
      projects,
    }));
  }, [activeProjects, areaNames]);

  const goalMap = useMemo(
    () => new Map(allGoals.map((g) => [g.id, g])),
    [allGoals],
  );

  const groupedByGoalGroups = useMemo((): ProjectsByGoalGroup[] => {
    const byGoalId = groupProjectsByGoal(activeProjects);
    return Object.entries(byGoalId).map(([goalId, projects]) => ({
      goalId,
      goalName: goalId === "unassigned" ? "No Goal" : (goalMap.get(goalId)?.name ?? goalId),
      projects,
    }));
  }, [activeProjects, goalMap]);

  const rollupsByProject = useMemo(() => {
    const result = new Map<string, { goalCount: number; taskCount: number; noteCount: number; resourceCount: number }>();
    for (const project of allProjects) {
      const linkedGoalIds = (project as unknown as { linkedGoalIds?: string[] }).linkedGoalIds ?? [];
      const goalCount = linkedGoalIds.length;
      const noteCount = notes.filter((n) => n.project_id === project.id).length;
      const resourceCount = resources.filter((r) => r.project_id === project.id).length;
      const taskCount = tasks.filter((t) => t.project_id === project.id && !t.is_archived).length;
      result.set(project.id, { goalCount, taskCount, noteCount, resourceCount });
    }
    return result;
  }, [allProjects, notes, resources, tasks]);

  const duplicateIndices = useMemo(() => {
    const result = new Map<string, number>();
    const grouped = new Map<string, Project[]>();

    for (const project of allProjects) {
      if (!grouped.has(project.name)) {
        grouped.set(project.name, []);
      }
      grouped.get(project.name)!.push(project);
    }

    for (const group of grouped.values()) {
      if (group.length < 2) continue;

      const byCreationOrder = [...group].sort((a, b) =>
        a.created_at.localeCompare(b.created_at),
      );

      byCreationOrder.forEach((project, index) => {
        result.set(project.id, index + 1);
      });
    }

    return result;
  }, [allProjects]);

  const handleCreate = () => {
    setEditingProject(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setIsDialogOpen(true);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);

    if (!open) {
      setEditingProject(null);
    }
  };

  const renderProjectGrid = (projects: Project[], emptyState: ReactNode) => {
    if (isLoadingProjects) {
      return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-48 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      );
    }

    if (projects.length === 0) {
      return emptyState;
    }

    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            areaName={getAreaName(project.area_id, areaNames)}
            areaNames={getProjectAreaNames(project, areaNames)}
            taskStats={taskStatsByProject.get(project.id)}
            duplicateIndex={duplicateIndices.get(project.id)}
            onEdit={handleEdit}
            rollups={rollupsByProject.get(project.id)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Organize projects by area, status, and linked goals.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 size-4" />
          New Project
        </Button>
      </div>

      <Tabs
        value={activeView}
        onValueChange={(value) => setActiveView(value as typeof activeView)}
        className="w-full"
      >
        <TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden bg-muted/50 p-1">
          <TabsTrigger value={PROJECT_VIEW.ALL}>
            <LayoutGrid className="mr-1.5 size-3.5" />
            All
          </TabsTrigger>
          <TabsTrigger value={PROJECT_VIEW.INBOX}>
            <Inbox className="mr-1.5 size-3.5" />
            Inbox
          </TabsTrigger>
          <TabsTrigger value={PROJECT_VIEW.PLANNING}>
            <Pencil className="mr-1.5 size-3.5" />
            Planning
          </TabsTrigger>
          <TabsTrigger value={PROJECT_VIEW.IN_PROGRESS}>
            <Activity className="mr-1.5 size-3.5" />
            In Progress
          </TabsTrigger>
          <TabsTrigger value={PROJECT_VIEW.COMPLETED}>
            <CheckSquare className="mr-1.5 size-3.5" />
            Completed
          </TabsTrigger>
          <TabsTrigger value={PROJECT_VIEW.BY_STATUS}>
            <Layers className="mr-1.5 size-3.5" />
            By Status
          </TabsTrigger>
          <TabsTrigger value={PROJECT_VIEW.BY_AREA}>
            <MapIcon className="mr-1.5 size-3.5" />
            By Area
          </TabsTrigger>
          <TabsTrigger value={PROJECT_VIEW.BY_GOAL}>
            <Target className="mr-1.5 size-3.5" />
            By Goal
          </TabsTrigger>
          <TabsTrigger value={PROJECT_VIEW.ARCHIVE}>
            <Archive className="mr-1.5 size-3.5" />
            Archive
          </TabsTrigger>
        </TabsList>

        <TabsContent value={PROJECT_VIEW.ALL} className="mt-6">
          {renderProjectGrid(
            activeProjects,
            <EmptyState
              icon={Folder}
              title="No projects yet"
              description="Create your first project to start tracking work across areas and goals."
              actionLabel="Create Project"
              onAction={handleCreate}
            />,
          )}
        </TabsContent>

        <TabsContent value={PROJECT_VIEW.INBOX} className="mt-6">
          {renderProjectGrid(
            projectsByStatus.planning,
            <EmptyState
              icon={Folder}
              title="No inbox projects"
              description="Projects in the planning state will appear here."
              actionLabel="Create Project"
              onAction={handleCreate}
            />,
          )}
        </TabsContent>

        <TabsContent value={PROJECT_VIEW.PLANNING} className="mt-6">
          {renderProjectGrid(
            projectsByStatus.planning,
            <EmptyState
              icon={Folder}
              title="No planning projects"
              description="Projects in the planning state will appear here."
              actionLabel="Create Project"
              onAction={handleCreate}
            />,
          )}
        </TabsContent>

        <TabsContent value={PROJECT_VIEW.IN_PROGRESS} className="mt-6">
          {renderProjectGrid(
            projectsByStatus.active,
            <EmptyState
              icon={Folder}
              title="No projects in progress"
              description="Move planning work into progress or create a new project."
              actionLabel="Create Project"
              onAction={handleCreate}
            />,
          )}
        </TabsContent>

        <TabsContent value={PROJECT_VIEW.COMPLETED} className="mt-6">
          {renderProjectGrid(
            projectsByStatus.completed,
            <EmptyState
              icon={Folder}
              title="No completed projects"
              description="Projects marked completed will appear here."
            />,
          )}
        </TabsContent>

        <TabsContent value={PROJECT_VIEW.BY_AREA} className="mt-6">
          <ProjectsByAreaView
            groups={groupedByAreaGroups}
            areaNames={areaNames}
            taskStatsByProject={taskStatsByProject}
            duplicateIndices={duplicateIndices}
            rollupsByProject={rollupsByProject}
            isLoading={isLoadingProjects}
            onEdit={handleEdit}
            onCreateProject={(areaId) => {
              setDefaultAreaIds([areaId]);
              setIsDialogOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value={PROJECT_VIEW.BY_STATUS} className="mt-6">
          <KanbanBoard
            projects={activeProjects}
            areas={areas}
            duplicateIndices={duplicateIndices}
            onProjectClick={(project) => router.push(buildProjectDetailHref(project))}
          />
        </TabsContent>

        <TabsContent value={PROJECT_VIEW.BY_GOAL} className="mt-6">
          <ProjectsByGoalView
            groups={groupedByGoalGroups}
            areaNames={areaNames}
            taskStatsByProject={taskStatsByProject}
            duplicateIndices={duplicateIndices}
            rollupsByProject={rollupsByProject}
            isLoading={isLoadingProjects}
            onEdit={handleEdit}
            onCreateProject={(goalId) => {
              setDefaultGoalId(goalId);
              setIsDialogOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value={PROJECT_VIEW.ARCHIVE} className="mt-6">
          {renderProjectGrid(
            archivedProjects,
            <EmptyState
              icon={Archive}
              title="No archived projects"
              description="Archived projects will appear here when you archive them."
            />,
          )}
        </TabsContent>
      </Tabs>

      <ProjectDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          handleDialogOpenChange(open);
          if (!open) {
            setDefaultAreaIds([]);
            setDefaultGoalId(undefined);
          }
        }}
        project={editingProject}
        defaultAreaIds={editingProject ? undefined : defaultAreaIds}
        goalId={editingProject ? undefined : defaultGoalId}
      />
    </div>
  );
}

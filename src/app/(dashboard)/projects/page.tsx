"use client";

import { type ReactNode, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Folder, Plus } from "lucide-react";

import { ProjectCard } from "@/components/entities/project-card";
import { ProjectDialog } from "@/components/entities/project-dialog";
import { EmptyState } from "@/components/views/empty-state";
import { KanbanBoard } from "@/components/views/kanban-board";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAreas } from "@/lib/hooks/use-areas";
import { useProjects } from "@/lib/hooks/use-projects";
import { useTasks } from "@/lib/hooks/use-tasks";
import { type Project } from "@/lib/types/domain.types";
import {
  buildProjectTaskStats,
  groupProjectsByArea,
  groupProjectsByStatus,
  PROJECT_VIEW,
} from "@/lib/utils/projects";

function getAreaName(areaId: string | null, areaNames: Map<string, string>): string | undefined {
  if (!areaId) {
    return undefined;
  }

  return areaNames.get(areaId);
}

export default function ProjectsPage() {
  const router = useRouter();
  const [activeView, setActiveView] = useState(PROJECT_VIEW.ALL);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const { data: allProjects = [], isLoading: isLoadingProjects } = useProjects({ status: "all" });
  const { data: areas = [] } = useAreas();
  const { data: tasks = [] } = useTasks();

  const activeProjects = useMemo(
    () => allProjects.filter((project) => !project.is_archived),
    [allProjects],
  );
  const archivedProjects = useMemo(
    () => allProjects.filter((project) => project.is_archived),
    [allProjects],
  );
  const areaNames = useMemo(
    () => new Map(areas.map((area) => [area.id, area.name])),
    [areas],
  );
  const taskStatsByProject = useMemo(() => buildProjectTaskStats(tasks), [tasks]);
  const projectsByStatus = useMemo(() => groupProjectsByStatus(activeProjects), [activeProjects]);
  const projectsByArea = useMemo(() => groupProjectsByArea(activeProjects), [activeProjects]);

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
            taskStats={taskStatsByProject.get(project.id)}
            duplicateIndex={duplicateIndices.get(project.id)}
            onEdit={handleEdit}
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
        <TabsList className="w-full justify-start overflow-auto">
          <TabsTrigger value={PROJECT_VIEW.ALL}>All</TabsTrigger>
          <TabsTrigger value={PROJECT_VIEW.INBOX}>Inbox</TabsTrigger>
          <TabsTrigger value={PROJECT_VIEW.IN_PROGRESS}>In Progress</TabsTrigger>
          <TabsTrigger value={PROJECT_VIEW.BY_AREA}>By Area</TabsTrigger>
          <TabsTrigger value={PROJECT_VIEW.BY_STATUS}>By Status</TabsTrigger>
          <TabsTrigger value={PROJECT_VIEW.ARCHIVE}>
            <Archive className="mr-1 size-4" />
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

        <TabsContent value={PROJECT_VIEW.BY_AREA} className="mt-6 space-y-8">
          {Object.keys(projectsByArea).length === 0 ? (
            <EmptyState
              icon={Folder}
              title="No projects by area"
              description="Projects grouped by area will appear here once you create them."
              actionLabel="Create Project"
              onAction={handleCreate}
            />
          ) : (
            Object.entries(projectsByArea).map(([areaId, projects]) => (
              <div key={areaId}>
                <h2 className="mb-3 text-lg font-semibold">
                  {areaId === "unassigned" ? "Unassigned" : areaNames.get(areaId)}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {projects.length} {projects.length === 1 ? "project" : "projects"}
                  </span>
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {projects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      areaName={getAreaName(project.area_id, areaNames)}
                      taskStats={taskStatsByProject.get(project.id)}
                      duplicateIndex={duplicateIndices.get(project.id)}
                      onEdit={handleEdit}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value={PROJECT_VIEW.BY_STATUS} className="mt-6">
          <KanbanBoard
            projects={activeProjects}
            areas={areas}
            duplicateIndices={duplicateIndices}
            onProjectClick={(project) => router.push(`/projects/${project.id}`)}
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
        onOpenChange={handleDialogOpenChange}
        project={editingProject}
      />
    </div>
  );
}

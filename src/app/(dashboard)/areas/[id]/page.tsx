"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Archive,
  ArrowLeft,
  CheckSquare,
  Edit2,
  FolderKanban,
  NotebookPen,
  RotateCcw,
  Target,
} from "lucide-react";

import { useGoals } from "@/lib/hooks/use-goals";
import { useArea, useArchiveArea, useRestoreArea } from "@/lib/hooks/use-areas";
import { useNotesByArea } from "@/lib/hooks/use-notes";
import { useProjects } from "@/lib/hooks/use-projects";
import { useTasks } from "@/lib/hooks/use-tasks";
import { useAuth } from "@/components/providers/auth-provider";
import { useUIStore } from "@/lib/stores/ui.store";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/views/empty-state";
import { GoalCard } from "@/components/entities/goal-card";
import { ProjectCard } from "@/components/entities/project-card";
import { cn } from "@/lib/utils";
import { getAreaRollups, normalizeAreaType } from "@/lib/utils/areas";

const AREA_TYPE_COLORS: Record<string, string> = {
  Business: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  Personal: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  Studies: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
};

export default function AreaDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id;
  const areaIdentifier = params.id as string;
  const { setPageTitle } = useUIStore();

  const { data: area, isLoading: areaLoading } = useArea(areaIdentifier);
  const archiveArea = useArchiveArea(userId);
  const restoreArea = useRestoreArea(userId);
  const { data: goals = [], isLoading: goalsLoading } = useGoals({
    areaId: area?.id,
    status: "all",
  });
  const { data: projects = [], isLoading: projectsLoading } = useProjects({ status: "all" });
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: notes = [], isLoading: notesLoading } = useNotesByArea(area?.id ?? "");

  useEffect(() => {
    if (area) {
      setPageTitle(area.name);
    }
    return () => setPageTitle("");
  }, [area, setPageTitle]);

  if (areaLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!area) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <EmptyState
          icon={Target}
          title="Area not found"
          description="This area doesn't exist or you don't have access to it"
          actionLabel="Go Back"
          onAction={() => router.push("/areas")}
        />
      </div>
    );
  }

  const linkedGoals = goals.filter((goal) => !goal.is_archived);
  const linkedProjects = projects.filter(
    (project) => project.area_id === area.id && !project.is_archived,
  );
  const openTasks = tasks.filter(
    (task) => task.area_id === area.id && !task.is_archived && !task.is_completed,
  );
  const linkedNotes = notes.filter((note) => !note.is_archived);
  const rollups = getAreaRollups({
    areaId: area.id,
    goals: linkedGoals,
    projects: linkedProjects,
    tasks: openTasks,
    notes: linkedNotes,
  });
  const areaType = normalizeAreaType(area.type);

  const handleArchive = async () => {
    await archiveArea.mutateAsync(area.id);
    router.push("/areas");
  };

  const handleRestore = async () => {
    await restoreArea.mutateAsync(area.id);
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon-sm" onClick={() => router.push("/areas")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {area.icon ? (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ backgroundColor: area.color ? `${area.color}20` : "var(--muted)" }}
            >
              {area.icon}
            </div>
          ) : (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 font-bold"
              style={{
                backgroundColor: area.color ? `${area.color}20` : "var(--muted)",
                color: area.color || "var(--foreground)",
              }}
            >
              {area.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight truncate">{area.name}</h1>
              <Badge variant="secondary" className={cn("text-xs", AREA_TYPE_COLORS[areaType])}>
                {areaType}
              </Badge>
              {area.inactive && !area.archive && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  Inactive
                </Badge>
              )}
              {area.archive && <Badge variant="outline">Archived</Badge>}
            </div>
            {area.description && (
              <p className="text-muted-foreground text-sm mt-1">{area.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/areas/${area.slug || area.id}/edit`)}
          >
            <Edit2 className="size-4 mr-2" />
            Edit
          </Button>
          {area.archive ? (
            <Button variant="outline" size="sm" onClick={handleRestore}>
              <RotateCcw className="size-4 mr-2" />
              Restore
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleArchive}>
              <Archive className="size-4 mr-2" />
              Archive
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="size-4 text-muted-foreground" />
              Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{rollups.goalsCount}</p>
            <p className="text-xs text-muted-foreground">Linked goals</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FolderKanban className="size-4 text-muted-foreground" />
              Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{rollups.projectsCount}</p>
            <p className="text-xs text-muted-foreground">Linked projects</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckSquare className="size-4 text-muted-foreground" />
              Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{rollups.tasksCount}</p>
            <p className="text-xs text-muted-foreground">Open tasks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <NotebookPen className="size-4 text-muted-foreground" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{rollups.notesCount}</p>
            <p className="text-xs text-muted-foreground">Linked notes</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Linked Goals</h2>
        <Card>
          <CardContent className="p-4 grid gap-4">
            {goalsLoading ? (
              <div className="h-32 rounded-xl bg-muted animate-pulse" />
            ) : linkedGoals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No goals linked to this area yet
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {linkedGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    areaName={area?.name}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <h2 className="text-lg font-semibold">Linked Projects</h2>
        <Card>
          <CardContent className="py-8">
            {projectsLoading ? (
              <div className="h-32 rounded-xl bg-muted animate-pulse" />
            ) : linkedProjects.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center">
                No projects linked to this area yet
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {linkedProjects.map((project) => {
                  const projectTasks = tasks.filter(
                    (task) => task.project_id === project.id && !task.is_archived,
                  );
                  const completedProjectTasks = projectTasks.filter((task) => task.is_completed);

                  return (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      areaName={area.name}
                      taskStats={{
                        completed: completedProjectTasks.length,
                        total: projectTasks.length,
                      }}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <h2 className="text-lg font-semibold">Open Tasks</h2>
        <Card>
          <CardContent className="py-4">
            {tasksLoading ? (
              <div className="h-32 rounded-xl bg-muted animate-pulse" />
            ) : openTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No open tasks in this area yet
              </p>
            ) : (
              <div className="space-y-3">
                {openTasks.map((task) => {
                  const linkedProject = linkedProjects.find((project) => project.id === task.project_id);

                  return (
                    <div
                      key={task.id}
                      className="rounded-lg border border-border/60 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="font-medium truncate">{task.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                            <span className="uppercase">{task.priority}</span>
                            {linkedProject && <span>{linkedProject.name}</span>}
                            {task.due_date && (
                              <span>
                                Due {new Date(task.due_date).toLocaleDateString("en-US")}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline">{task.status}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <h2 className="text-lg font-semibold">Linked Notes</h2>
        <Card>
          <CardContent className="py-4">
            {notesLoading ? (
              <div className="h-24 rounded-xl bg-muted animate-pulse" />
            ) : linkedNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No notes linked to this area yet
              </p>
            ) : (
              <div className="space-y-2">
                {linkedNotes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => router.push(`/notes/${note.id}`)}
                    className="flex w-full items-start gap-3 rounded-lg border border-border/60 px-4 py-3 text-left transition-colors hover:bg-accent/30"
                  >
                    <NotebookPen className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{note.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span>{note.status.replace("_", " ")}</span>
                        {note.notebook && <span>{note.notebook}</span>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

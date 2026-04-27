"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookText,
  Calendar,
  CheckSquare,
  Edit,
  Link as LinkIcon,
  NotebookPen,
  Plus,
  Target,
  Trash2,
  Unlink,
  Users,
} from "lucide-react";

import { ProjectDialog } from "@/components/entities/project-dialog";
import { EmptyState } from "@/components/views/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAreas } from "@/lib/hooks/use-areas";
import { useGoals } from "@/lib/hooks/use-goals";
import { useNotesByProject } from "@/lib/hooks/use-notes";
import {
  useDeleteProject,
  useLinkProjectToGoal,
  useProject,
  useProjectWithRelations,
  useUnlinkProjectFromGoal,
  useUpdateProject,
} from "@/lib/hooks/use-projects";
import { useContacts, useContactByProject, useLinkContactToProject, useUnlinkContactFromProject } from "@/lib/hooks/use-contacts";
import { useTasks } from "@/lib/hooks/use-tasks";
import { cn } from "@/lib/utils";
import {
  buildProjectTaskStats,
  getProjectDueState,
  getProjectStatusLabel,
} from "@/lib/utils/projects";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isLinkGoalOpen, setIsLinkGoalOpen] = useState(false);
  const [isLinkContactOpen, setIsLinkContactOpen] = useState(false);

  const { data: project, isLoading: isLoadingProject } = useProject(projectId);
  const { data: relations } = useProjectWithRelations(projectId);
  const { data: areas = [] } = useAreas();
  const { data: goals = [] } = useGoals({ status: "all" });
  const { data: tasks = [], isLoading: isLoadingTasks } = useTasks();
  const { data: linkedNotes = [], isLoading: isLoadingNotes } = useNotesByProject(projectId);

  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const linkProjectToGoal = useLinkProjectToGoal();
  const unlinkProjectFromGoal = useUnlinkProjectFromGoal();

  const { data: allContacts = [] } = useContacts();
  const { data: projectContactLinks = [] } = useContactByProject(projectId);
  const linkContactToProject = useLinkContactToProject();
  const unlinkContactFromProject = useUnlinkContactFromProject();

  const linkedContactIds = useMemo(
    () => new Set(projectContactLinks.map((l) => l.contact_id)),
    [projectContactLinks],
  );
  const linkedContacts = useMemo(
    () => allContacts.filter((c) => linkedContactIds.has(c.id)),
    [allContacts, linkedContactIds],
  );
  const unlinkedContacts = useMemo(
    () => allContacts.filter((c) => !linkedContactIds.has(c.id)),
    [allContacts, linkedContactIds],
  );

  const area = useMemo(
    () => (project?.area_id ? areas.find((candidate) => candidate.id === project.area_id) : null),
    [areas, project?.area_id],
  );
  const linkedGoalIds = useMemo(() => new Set(relations?.goal_ids ?? []), [relations?.goal_ids]);
  const linkedGoals = useMemo(
    () => goals.filter((goal) => linkedGoalIds.has(goal.id)),
    [goals, linkedGoalIds],
  );
  const unlinkedGoals = useMemo(
    () =>
      goals.filter((goal) => !goal.is_archived && !linkedGoalIds.has(goal.id)),
    [goals, linkedGoalIds],
  );
  const linkedTasks = useMemo(
    () => tasks.filter((task) => task.project_id === projectId && !task.is_archived),
    [projectId, tasks],
  );
  const taskStats = useMemo(() => buildProjectTaskStats(tasks).get(projectId), [projectId, tasks]);
  const dueState = getProjectDueState(project?.due_date ?? null);

  const handleArchiveToggle = async () => {
    if (!project) {
      return;
    }

    await updateProject.mutateAsync({
      id: project.id,
      input: {
        is_archived: !project.is_archived,
      },
    });
  };

  const handleDelete = async () => {
    if (!project) {
      return;
    }

    await deleteProject.mutateAsync(project.id);
    router.push("/projects");
  };

  const handleLinkGoal = async (goalId: string) => {
    await linkProjectToGoal.mutateAsync({ goalId, projectId });
    setIsLinkGoalOpen(false);
  };

  const handleUnlinkGoal = async (goalId: string) => {
    await unlinkProjectFromGoal.mutateAsync({ goalId, projectId });
  };

  const handleLinkContact = async (contactId: string) => {
    await linkContactToProject.mutateAsync({ contactId, projectId });
    setIsLinkContactOpen(false);
  };

  const handleUnlinkContact = async (contactId: string) => {
    await unlinkContactFromProject.mutateAsync({ contactId, projectId });
  };

  if (isLoadingProject) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
        <Button variant="ghost" onClick={() => router.push("/projects")}>
          <ArrowLeft className="mr-2 size-4" />
          Back to Projects
        </Button>
        <EmptyState
          icon={Target}
          title="Project not found"
          description="This project may have been deleted or you do not have access to it."
          actionLabel="Return to Projects"
          onAction={() => router.push("/projects")}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/projects")}>
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
              <Badge
                variant="secondary"
                className={cn("text-xs", PRIORITY_COLORS[project.priority])}
              >
                {project.priority}
              </Badge>
              <Badge variant="outline">{getProjectStatusLabel(project.status)}</Badge>
              {project.is_archived && <Badge variant="outline">Archived</Badge>}
            </div>
            <p className="mt-1 text-muted-foreground">
              {area?.name ?? "Unassigned"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setIsEditOpen(true)}>
            <Edit className="mr-2 size-4" />
            Edit
          </Button>
          <Button variant="outline" onClick={handleArchiveToggle}>
            {project.is_archived ? "Unarchive" : "Archive"}
          </Button>
          <Button variant="destructive" onClick={() => setIsDeleteOpen(true)}>
            <Trash2 className="mr-2 size-4" />
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {project.description ? (
            <div>
              <h2 className="mb-1 text-sm font-medium text-muted-foreground">Description</h2>
              <p className="text-sm">{project.description}</p>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div>
              <h2 className="mb-1 text-sm font-medium text-muted-foreground">Area</h2>
              <p className="text-sm">{area?.name ?? "Unassigned"}</p>
            </div>
            <div>
              <h2 className="mb-1 text-sm font-medium text-muted-foreground">Start Date</h2>
              <p className="text-sm">{project.start_date ?? "Not set"}</p>
            </div>
            <div>
              <h2 className="mb-1 text-sm font-medium text-muted-foreground">Due Date</h2>
              <p
                className={cn(
                  "text-sm",
                  dueState.tone === "warning" && "text-red-600 dark:text-red-400",
                )}
              >
                {project.due_date ?? dueState.label}
              </p>
            </div>
            <div>
              <h2 className="mb-1 text-sm font-medium text-muted-foreground">Progress</h2>
              <p className="text-sm font-medium">
                {taskStats && taskStats.total > 0
                  ? Math.round((taskStats.completed / taskStats.total) * 100)
                  : project.progress || 0}
                %
              </p>
            </div>
            <div>
              <h2 className="mb-1 text-sm font-medium text-muted-foreground">Tasks</h2>
              <p className="text-sm">
                {taskStats ? `${taskStats.completed}/${taskStats.total}` : linkedTasks.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Target className="size-4" />
              Linked Goals
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setIsLinkGoalOpen(true)}>
              <Plus className="mr-1 size-3" />
              Link Goal
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {linkedGoals.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No goals are linked to this project yet.
            </p>
          ) : (
            <div className="space-y-2">
              {linkedGoals.map((goal) => (
                <div
                  key={goal.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{goal.name}</p>
                    <p className="text-sm text-muted-foreground">{goal.term} term</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUnlinkGoal(goal.id)}
                  >
                    <Unlink className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="size-4" />
            Linked Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingTasks ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          ) : linkedTasks.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No tasks are currently linked to this project. This Batch F restoration only shows
              existing linked tasks and does not extend the Task module beyond that.
            </p>
          ) : (
            <div className="space-y-3">
              {linkedTasks.map((task) => {
                const taskDueState = getProjectDueState(task.due_date);

                return (
                  <div key={task.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{task.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="uppercase">{task.priority}</span>
                          <span>{task.status}</span>
                          <span
                            className={cn(
                              taskDueState.tone === "warning" &&
                                "text-red-600 dark:text-red-400",
                            )}
                          >
                            {taskDueState.label}
                          </span>
                        </div>
                      </div>
                      {task.is_completed && <Badge variant="outline">Completed</Badge>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <BookText className="size-4" />
              Linked Notes
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/notes?project=${projectId}`)}
            >
              <NotebookPen className="mr-1 size-3" />
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingNotes ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : linkedNotes.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No notes linked to this project yet. Open a note and set this project in its metadata sidebar.
            </p>
          ) : (
            <div className="space-y-2">
              {linkedNotes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => router.push(`/notes/${note.id}`)}
                  className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/40"
                >
                  <NotebookPen className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{note.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {note.status.replace("_", " ")}
                      {note.notebook ? ` · ${note.notebook}` : ""}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4" />
              People
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setIsLinkContactOpen(true)}>
              <Plus className="mr-1 size-3" />
              Link Contact
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {linkedContacts.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              No contacts are linked to this project yet.
            </p>
          ) : (
            <div className="space-y-2">
              {linkedContacts.map((contact) => {
                const link = projectContactLinks.find((l) => l.contact_id === contact.id);
                return (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{contact.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {[contact.role, contact.organization].filter(Boolean).join(" · ")}
                        {link?.role_in_project && ` · ${link.role_in_project}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnlinkContact(contact.id)}
                    >
                      <Unlink className="size-3" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isLinkGoalOpen} onOpenChange={setIsLinkGoalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link Goal</DialogTitle>
            <DialogDescription>
              Attach an existing goal to this project.
            </DialogDescription>
          </DialogHeader>
          {unlinkedGoals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              All active goals are already linked to this project.
            </p>
          ) : (
            <div className="space-y-2">
              {unlinkedGoals.map((goal) => (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => handleLinkGoal(goal.id)}
                  className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/40"
                >
                  <LinkIcon className="mt-0.5 size-4 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{goal.name}</p>
                    <p className="text-sm text-muted-foreground">{goal.term} term</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project Permanently?</DialogTitle>
            <DialogDescription>
              This removes the project and clears its goal links. Tasks already linked to the
              project keep their own records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteProject.isPending}>
              Delete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isLinkContactOpen} onOpenChange={setIsLinkContactOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link Contact</DialogTitle>
            <DialogDescription>
              Add a contact to this project.
            </DialogDescription>
          </DialogHeader>
          {unlinkedContacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              All contacts are already linked to this project.
            </p>
          ) : (
            <div className="space-y-2">
              {unlinkedContacts.map((contact) => (
                <button
                  key={contact.id}
                  type="button"
                  onClick={() => handleLinkContact(contact.id)}
                  className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/40"
                >
                  <Users className="mt-0.5 size-4 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{contact.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {[contact.role, contact.organization].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ProjectDialog open={isEditOpen} onOpenChange={setIsEditOpen} project={project} />
    </div>
  );
}

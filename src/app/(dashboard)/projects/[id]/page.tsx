"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronRight,
  Edit,
  Link as LinkIcon,
  NotebookPen,
  Plus,
  Target,
  Trash2,
  Unlink,
  Users,
} from "lucide-react";

import { ContactDialog } from "@/components/entities/contact-dialog";
import { GoalDetailSection } from "@/components/entities/goal-detail-section";
import { NoteEditorDialog } from "@/components/entities/note-editor-dialog";
import { ProjectDialog } from "@/components/entities/project-dialog";
import { TaskDialog } from "@/components/entities/task-dialog";
import { EmptyState } from "@/components/views/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAreas } from "@/lib/hooks/use-areas";
import {
  useContactByProject,
  useContacts,
  useCreateContact,
  useLinkContactToProject,
  useUnlinkContactFromProject,
} from "@/lib/hooks/use-contacts";
import { useGoals } from "@/lib/hooks/use-goals";
import { useNotesByProject } from "@/lib/hooks/use-notes";
import {
  useDeleteProject,
  useLinkProjectToArea,
  useLinkProjectToGoal,
  useProject,
  useProjectWithRelations,
  useUnlinkProjectFromArea,
  useUnlinkProjectFromGoal,
  useUpdateProject,
} from "@/lib/hooks/use-projects";
import {
  useCreateResource,
  useResourcesByProject,
  useToggleFavoriteResource,
} from "@/lib/hooks/use-resources";
import { useTasks } from "@/lib/hooks/use-tasks";
import { useUIStore } from "@/lib/stores/ui.store";
import { cn } from "@/lib/utils";
import { buildGoalDetailHref } from "@/lib/utils/goal-urls";
import { getGoalLinkedAreaIds } from "@/lib/utils/goals";
import { getProjectDueState, getProjectLinkedAreaIds, getProjectStatusLabel } from "@/lib/utils/projects";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

function getProjectProgressPercent(
  completedTaskCount: number,
  totalTaskCount: number,
  fallbackProgress: number,
  status: string,
): number {
  if (status === "completed") {
    return 100;
  }

  if (totalTaskCount > 0) {
    return Math.round((completedTaskCount / totalTaskCount) * 100);
  }

  return fallbackProgress;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectIdentifier = params.id as string;
  const { setPageTitle } = useUIStore();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isLinkGoalOpen, setIsLinkGoalOpen] = useState(false);
  const [isLinkContactOpen, setIsLinkContactOpen] = useState(false);
  const [isNewContactOpen, setIsNewContactOpen] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isNewNoteOpen, setIsNewNoteOpen] = useState(false);
  const [isNewResourceOpen, setIsNewResourceOpen] = useState(false);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [isLinkAreaOpen, setIsLinkAreaOpen] = useState(false);
  const [goalTab, setGoalTab] = useState("all");
  const [taskTab, setTaskTab] = useState("all");
  const [noteTab, setNoteTab] = useState("all");
  const [contactTab, setContactTab] = useState("all");
  const [resourceTab, setResourceTab] = useState("all");

  const goalsRef = useRef<HTMLDivElement>(null);
  const tasksRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);
  const peopleRef = useRef<HTMLDivElement>(null);
  const resourcesRef = useRef<HTMLDivElement>(null);

  const { data: project, isLoading: isLoadingProject } = useProject(projectIdentifier);
  const resolvedProjectId = project?.id ?? "";
  const { data: relations } = useProjectWithRelations(resolvedProjectId);
  const { data: areas = [] } = useAreas();
  const { data: goals = [] } = useGoals({ status: "all" });
  const { data: tasks = [], isLoading: isLoadingTasks } = useTasks();
  const { data: linkedNotes = [], isLoading: isLoadingNotes } = useNotesByProject(resolvedProjectId);
  const { data: allContacts = [] } = useContacts();
  const { data: projectContactLinks = [] } = useContactByProject(resolvedProjectId);
  const { data: linkedResources = [], isLoading: isLoadingResources } =
    useResourcesByProject(resolvedProjectId);

  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const linkProjectToGoal = useLinkProjectToGoal();
  const unlinkProjectFromGoal = useUnlinkProjectFromGoal();
  const linkProjectToArea = useLinkProjectToArea();
  const unlinkProjectFromArea = useUnlinkProjectFromArea();
  const linkContactToProject = useLinkContactToProject();
  const unlinkContactFromProject = useUnlinkContactFromProject();
  const createContact = useCreateContact();
  const createResource = useCreateResource();
  const toggleFavoriteResource = useToggleFavoriteResource();

  useEffect(() => {
    if (project) {
      setPageTitle(project.name);
    }

    return () => setPageTitle("");
  }, [project, setPageTitle]);

  const projectLinkedAreaIds = useMemo(
    () => getProjectLinkedAreaIds(project ?? { area_id: null }),
    [project],
  );
  const linkedAreas = useMemo(
    () =>
      projectLinkedAreaIds
        .map((id) => areas.find((area) => area.id === id))
        .filter((area): area is NonNullable<typeof area> => Boolean(area)),
    [projectLinkedAreaIds, areas],
  );
  const linkedGoalIds = useMemo(() => new Set(relations?.goal_ids ?? []), [relations?.goal_ids]);
  const linkedGoalIdsArray = useMemo(() => Array.from(linkedGoalIds), [linkedGoalIds]);
  const linkedGoals = useMemo(
    () => goals.filter((goal) => linkedGoalIds.has(goal.id)),
    [goals, linkedGoalIds],
  );
  const eligibleAreaIds = useMemo(() => {
    const goalAreaIds = new Set<string>();
    for (const goal of linkedGoals) {
      for (const id of getGoalLinkedAreaIds(goal)) {
        goalAreaIds.add(id);
      }
    }
    return Array.from(goalAreaIds).filter((id) => !projectLinkedAreaIds.includes(id));
  }, [linkedGoals, projectLinkedAreaIds]);
  const eligibleAreas = useMemo(
    () =>
      eligibleAreaIds
        .map((id) => areas.find((area) => area.id === id))
        .filter((area): area is NonNullable<typeof area> => Boolean(area)),
    [eligibleAreaIds, areas],
  );
  const unlinkedGoals = useMemo(
    () => goals.filter((goal) => !goal.is_archived && !linkedGoalIds.has(goal.id)),
    [goals, linkedGoalIds],
  );
  const linkedTasks = useMemo(
    () => tasks.filter((task) => task.project_id === resolvedProjectId && !task.is_archived),
    [resolvedProjectId, tasks],
  );
  const linkedContactIds = useMemo(
    () => new Set(projectContactLinks.map((link) => link.contact_id)),
    [projectContactLinks],
  );
  const linkedContacts = useMemo(
    () => allContacts.filter((contact) => linkedContactIds.has(contact.id)),
    [allContacts, linkedContactIds],
  );
  const unlinkedContacts = useMemo(
    () => allContacts.filter((contact) => !linkedContactIds.has(contact.id)),
    [allContacts, linkedContactIds],
  );

  const completedTaskCount = useMemo(
    () => linkedTasks.filter((task) => task.is_completed).length,
    [linkedTasks],
  );
  const progressPercent = useMemo(
    () =>
      getProjectProgressPercent(
        completedTaskCount,
        linkedTasks.length,
        project?.progress ?? 0,
        project?.status ?? "planning",
      ),
    [completedTaskCount, linkedTasks.length, project?.progress, project?.status],
  );
  const dueState = useMemo(
    () => getProjectDueState(project?.due_date ?? null),
    [project?.due_date],
  );

  const goalTabs = useMemo(
    () => [
      { value: "all", label: "All", count: linkedGoals.length },
      {
        value: "active",
        label: "Active",
        count: linkedGoals.filter((goal) => !goal.is_completed && !goal.is_archived).length,
      },
      {
        value: "completed",
        label: "Completed",
        count: linkedGoals.filter((goal) => goal.is_completed && !goal.is_archived).length,
      },
      {
        value: "archived",
        label: "Archive",
        count: linkedGoals.filter((goal) => goal.is_archived).length,
      },
    ],
    [linkedGoals],
  );
  const filteredGoals = useMemo(() => {
    switch (goalTab) {
      case "active":
        return linkedGoals.filter((goal) => !goal.is_completed && !goal.is_archived);
      case "completed":
        return linkedGoals.filter((goal) => goal.is_completed && !goal.is_archived);
      case "archived":
        return linkedGoals.filter((goal) => goal.is_archived);
      default:
        return linkedGoals;
    }
  }, [goalTab, linkedGoals]);

  const taskTabs = useMemo(
    () => [
      { value: "all", label: "All", count: linkedTasks.length },
      {
        value: "upcoming",
        label: "Upcoming",
        count: linkedTasks.filter((task) => !task.is_completed).length,
      },
      {
        value: "completed",
        label: "Completed",
        count: linkedTasks.filter((task) => task.is_completed).length,
      },
    ],
    [linkedTasks],
  );
  const filteredTasks = useMemo(() => {
    switch (taskTab) {
      case "upcoming":
        return linkedTasks.filter((task) => !task.is_completed);
      case "completed":
        return linkedTasks.filter((task) => task.is_completed);
      default:
        return linkedTasks;
    }
  }, [linkedTasks, taskTab]);

  const noteTabs = useMemo(
    () => [
      { value: "all", label: "All", count: linkedNotes.length },
      {
        value: "favorite",
        label: "Favorite",
        count: linkedNotes.filter((note) => note.favorite).length,
      },
      {
        value: "archived",
        label: "Archived",
        count: linkedNotes.filter((note) => note.is_archived).length,
      },
    ],
    [linkedNotes],
  );
  const filteredNotes = useMemo(() => {
    switch (noteTab) {
      case "favorite":
        return linkedNotes.filter((note) => note.favorite);
      case "archived":
        return linkedNotes.filter((note) => note.is_archived);
      default:
        return linkedNotes;
    }
  }, [linkedNotes, noteTab]);

  const contactTabs = useMemo(
    () => [
      { value: "all", label: "All", count: linkedContacts.length },
      {
        value: "favorite",
        label: "Favorite",
        count: linkedContacts.filter((contact) => contact.favorite).length,
      },
      {
        value: "archived",
        label: "Archived",
        count: linkedContacts.filter((contact) => contact.archive).length,
      },
    ],
    [linkedContacts],
  );
  const filteredContacts = useMemo(() => {
    switch (contactTab) {
      case "favorite":
        return linkedContacts.filter((contact) => contact.favorite);
      case "archived":
        return linkedContacts.filter((contact) => contact.archive);
      default:
        return linkedContacts;
    }
  }, [contactTab, linkedContacts]);

  const resourceTypesInProject = useMemo(() => {
    const types = new Set<string>();
    for (const resource of linkedResources) {
      types.add(resource.type);
    }
    return Array.from(types);
  }, [linkedResources]);

  const resourceTabs = useMemo(
    () => [
      { value: "all", label: "All", count: linkedResources.length },
      {
        value: "inbox",
        label: "Inbox",
        count: linkedResources.filter((r) => r.status === "inbox").length,
      },
      {
        value: "to_review",
        label: "To Review",
        count: linkedResources.filter((r) => r.status === "to_review").length,
      },
      {
        value: "active",
        label: "Active",
        count: linkedResources.filter((r) => r.status === "active").length,
      },
      {
        value: "favorites",
        label: "Favorites",
        count: linkedResources.filter((r) => r.favorite).length,
      },
      {
        value: "archived",
        label: "Archived",
        count: linkedResources.filter((r) => r.is_archived).length,
      },
    ],
    [linkedResources],
  );

  const filteredResources = useMemo(() => {
    if (resourceTab.startsWith("type:")) {
      const type = resourceTab.slice(5);
      return linkedResources.filter((r) => r.type === type);
    }
    switch (resourceTab) {
      case "inbox":
        return linkedResources.filter((r) => r.status === "inbox");
      case "to_review":
        return linkedResources.filter((r) => r.status === "to_review");
      case "active":
        return linkedResources.filter((r) => r.status === "active");
      case "favorites":
        return linkedResources.filter((r) => r.favorite);
      case "archived":
        return linkedResources.filter((r) => r.is_archived);
      default:
        return linkedResources;
    }
  }, [linkedResources, resourceTab]);

  const scrollToSection = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const handleProjectArchiveToggle = useCallback(
    async (checked: boolean) => {
      if (!project || checked === project.is_archived) {
        return;
      }

      await updateProject.mutateAsync({
        id: project.id,
        input: { is_archived: checked },
      });
    },
    [project, updateProject],
  );

  const handleProjectCompleteToggle = useCallback(
    async (checked: boolean) => {
      if (!project) {
        return;
      }

      const nextStatus = checked ? "completed" : "active";
      const nextProgress = checked
        ? 100
        : linkedTasks.length > 0
          ? Math.round((completedTaskCount / linkedTasks.length) * 100)
          : 0;

      if (project.status === nextStatus && project.progress === nextProgress) {
        return;
      }

      await updateProject.mutateAsync({
        id: project.id,
        input: {
          status: nextStatus,
          progress: nextProgress,
        },
      });
    },
    [completedTaskCount, linkedTasks.length, project, updateProject],
  );

  const handleDelete = async () => {
    if (!project) {
      return;
    }

    await deleteProject.mutateAsync(project.id);
    router.push("/projects");
  };

  const handleLinkArea = async (areaId: string) => {
    if (!resolvedProjectId) {
      return;
    }

    await linkProjectToArea.mutateAsync({ areaId, projectId: resolvedProjectId });
    setIsLinkAreaOpen(false);
  };

  const handleLinkGoal = async (goalId: string) => {
    if (!resolvedProjectId) {
      return;
    }

    await linkProjectToGoal.mutateAsync({ goalId, projectId: resolvedProjectId });
    setIsLinkGoalOpen(false);
  };

  const handleUnlinkGoal = async (goalId: string) => {
    if (!resolvedProjectId) {
      return;
    }

    await unlinkProjectFromGoal.mutateAsync({ goalId, projectId: resolvedProjectId });
  };

  const handleLinkContact = async (contactId: string) => {
    if (!resolvedProjectId) {
      return;
    }

    await linkContactToProject.mutateAsync({ contactId, projectId: resolvedProjectId });
    setIsLinkContactOpen(false);
  };

  const handleCreateContactSubmit = useCallback(
    (values: {
      name: string;
      role: string;
      organization: string;
      group: string;
      phone: string;
      email: string;
      linkedin: string;
      website: string;
      follow_up_interval_days: string;
      notes: string;
    }) => {
      if (!resolvedProjectId) {
        return;
      }

      createContact.mutate(
        {
          name: values.name,
          role: values.role || null,
          organization: values.organization || null,
          group: values.group || null,
          phone: values.phone || null,
          email: values.email || null,
          linkedin: values.linkedin || null,
          website: values.website || null,
          follow_up_interval_days:
            values.follow_up_interval_days && values.follow_up_interval_days !== "none"
              ? parseInt(values.follow_up_interval_days, 10)
              : null,
          notes: values.notes || null,
        },
        {
          onSuccess: (createdContact) => {
            linkContactToProject.mutate({
              contactId: createdContact.id,
              projectId: resolvedProjectId,
            });
          },
        },
      );
    },
    [createContact, linkContactToProject, resolvedProjectId],
  );

  const handleUnlinkContact = async (contactId: string) => {
    if (!resolvedProjectId) {
      return;
    }

    await unlinkContactFromProject.mutateAsync({ contactId, projectId: resolvedProjectId });
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
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={() => router.push("/projects")}
        >
          <ArrowLeft className="size-3.5" />
        </Button>
        <span>/</span>
        <button className="hover:text-foreground" onClick={() => router.push("/projects")}>
          Projects
        </button>
        <span>/</span>
        <span className="text-foreground">{project.name}</span>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="flex items-start justify-between gap-4 p-6">
          <div className="flex items-start gap-4">
            <div className="relative flex items-center justify-center">
              <svg width="80" height="80" className="transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  className="text-muted-foreground/20"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="32"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="transparent"
                  strokeDasharray={64 * 2 * Math.PI}
                  strokeDashoffset={64 * 2 * Math.PI * (1 - progressPercent / 100)}
                  strokeLinecap="round"
                  className="text-primary transition-all duration-500"
                />
              </svg>
              <span className="absolute text-sm font-bold">{progressPercent}%</span>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>

              <div className="flex flex-wrap items-center gap-2">
                {linkedAreas.length > 0
                  ? linkedAreas.map((linkedArea) => (
                      <Badge key={linkedArea.id} variant="secondary" className="text-xs">
                        {linkedArea.icon ? `${linkedArea.icon} ` : ""}
                        {linkedArea.name}
                      </Badge>
                    ))
                  : null}
                <Badge variant="outline" className={cn("text-xs", PRIORITY_COLORS[project.priority])}>
                  {project.priority}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {getProjectStatusLabel(project.status)}
                </Badge>
                {project.is_archived && (
                  <Badge variant="outline" className="text-xs">
                    Archived
                  </Badge>
                )}
              </div>

              {project.description ? (
                <p className="text-sm text-muted-foreground">{project.description}</p>
              ) : null}

              <div
                className={cn(
                  "flex items-center gap-1.5 text-sm",
                  dueState.isOverdue && "text-destructive font-medium",
                )}
              >
                <Calendar className="size-3.5" />
                {dueState.label}
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPropertiesOpen((current) => !current)}
            className="gap-1"
          >
            Properties
            {isPropertiesOpen ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4 px-6 pb-4">
          <button
            onClick={() => scrollToSection("goals")}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-blue-600 dark:text-blue-400">{linkedGoals.length}</span>
            <span className="text-muted-foreground">Goals</span>
          </button>
          <button
            onClick={() => scrollToSection("tasks")}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-green-600 dark:text-green-400">{linkedTasks.length}</span>
            <span className="text-muted-foreground">Tasks</span>
          </button>
          <button
            onClick={() => scrollToSection("notes")}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-purple-600 dark:text-purple-400">{linkedNotes.length}</span>
            <span className="text-muted-foreground">Notes</span>
          </button>
          <button
            onClick={() => scrollToSection("resources")}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-orange-600 dark:text-orange-400">
              {linkedResources.length}
            </span>
            <span className="text-muted-foreground">Resources</span>
          </button>
          <button
            onClick={() => scrollToSection("people")}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-sky-600 dark:text-sky-400">{linkedContacts.length}</span>
            <span className="text-muted-foreground">People</span>
          </button>
        </div>

        {isPropertiesOpen ? (
          <>
            <Separator />
            <div className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Areas</Label>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {linkedAreas.length > 0 ? (
                      linkedAreas.map((linkedArea) => (
                        <Badge key={linkedArea.id} variant="secondary" className="flex items-center gap-1">
                          {linkedArea.icon ? `${linkedArea.icon} ` : ""}
                          {linkedArea.name}
                          <button
                            type="button"
                            onClick={() => unlinkProjectFromArea.mutate({ projectId: resolvedProjectId, areaId: linkedArea.id })}
                            className="ml-1 rounded-full p-0.5 hover:bg-muted"
                          >
                            <Unlink className="size-3" />
                          </button>
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground">Unassigned</span>
                    )}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <p className="mt-1 font-medium">{getProjectStatusLabel(project.status)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Start Date</Label>
                  <p className="mt-1 font-medium">{project.start_date ?? "Not set"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Due Date</Label>
                  <Input
                    type="date"
                    className={cn("mt-1 font-medium", dueState.isOverdue && "text-destructive")}
                    defaultValue={project.due_date ?? ""}
                    onBlur={(event) => {
                      const nextDueDate = event.target.value || null;
                      if (nextDueDate !== project.due_date) {
                        updateProject.mutateAsync({
                          id: project.id,
                          input: { due_date: nextDueDate },
                        });
                      }
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <Button size="sm" onClick={() => setIsEditOpen(true)} className="gap-1.5">
                  <Edit className="size-3.5" />
                  Edit Project
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsLinkAreaOpen(true)}
                  className="gap-1.5"
                >
                  <Plus className="size-3.5" />
                  Link Area
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsLinkGoalOpen(true)}
                  className="gap-1.5"
                >
                  <Plus className="size-3.5" />
                  Link Goal
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setIsDeleteOpen(true)}
                  className="gap-1.5"
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="project-archived"
                    checked={project.is_archived}
                    disabled={updateProject.isPending}
                    onCheckedChange={(checked) => handleProjectArchiveToggle(checked === true)}
                  />
                  <Label htmlFor="project-archived" className="cursor-pointer text-sm">
                    Archived
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="project-completed"
                    checked={project.status === "completed"}
                    disabled={updateProject.isPending}
                    onCheckedChange={(checked) => handleProjectCompleteToggle(checked === true)}
                  />
                  <Label htmlFor="project-completed" className="cursor-pointer text-sm">
                    Completed
                  </Label>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>

      <div ref={goalsRef}>
        <GoalDetailSection
          id="goals"
          entityType="goals"
          tabs={goalTabs}
          activeTab={goalTab}
          onTabChange={setGoalTab}
          isLoading={false}
          emptyTitle="No linked goals"
          emptyDescription="Link a goal to show how this project contributes to your larger outcomes."
          onCreateNew={() => setIsLinkGoalOpen(true)}
          createLabel="Link Goal"
        >
          {filteredGoals.length > 0 ? (
            <div className="space-y-3">
              {filteredGoals.map((goal) => (
                <div
                  key={goal.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(buildGoalDetailHref(goal))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(buildGoalDetailHref(goal));
                    }
                  }}
                  className="flex w-full cursor-pointer items-center justify-between rounded-lg border p-4 text-left transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Target className="size-4 text-muted-foreground" />
                      <p className="truncate font-medium">{goal.name}</p>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {goal.term} term
                      {goal.description ? ` - ${goal.description}` : ""}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleUnlinkGoal(goal.id);
                    }}
                  >
                    <Unlink className="size-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </GoalDetailSection>
      </div>

      <div ref={tasksRef}>
        <GoalDetailSection
          id="tasks"
          entityType="tasks"
          tabs={taskTabs}
          activeTab={taskTab}
          onTabChange={setTaskTab}
          isLoading={isLoadingTasks}
          emptyTitle="No linked tasks"
          emptyDescription="Tasks connected to this project will appear here."
          onCreateNew={() => setIsNewTaskOpen(true)}
          createLabel="New Task"
        >
          {filteredTasks.length > 0 ? (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
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
                              taskDueState.isOverdue && "text-red-600 dark:text-red-400",
                            )}
                          >
                            {taskDueState.label}
                          </span>
                        </div>
                      </div>
                      {task.is_completed ? <Badge variant="outline">Completed</Badge> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </GoalDetailSection>
      </div>

      <div ref={notesRef}>
        <GoalDetailSection
          id="notes"
          entityType="notes"
          tabs={noteTabs}
          activeTab={noteTab}
          onTabChange={setNoteTab}
          isLoading={isLoadingNotes}
          emptyTitle="No linked notes"
          emptyDescription="Notes linked to this project will show up here."
          onCreateNew={() => setIsNewNoteOpen(true)}
          createLabel="New Note"
        >
          {filteredNotes.length > 0 ? (
            <div className="space-y-2">
              {filteredNotes.map((note) => (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => router.push(`/notes/${note.slug ?? note.id}`)}
                  className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/40"
                >
                  <NotebookPen className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{note.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {note.status.replace("_", " ")}
                      {note.notebook ? ` - ${note.notebook}` : ""}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </GoalDetailSection>
      </div>

      <div ref={resourcesRef}>
        <GoalDetailSection
          id="resources"
          entityType="resources"
          tabs={[
            ...resourceTabs,
            ...resourceTypesInProject.map((type) => ({ value: `type:${type}`, label: type })),
          ]}
          activeTab={resourceTab}
          onTabChange={setResourceTab}
          isLoading={isLoadingResources}
          emptyTitle="No resources linked to this project"
          emptyDescription="Add resources to track external references that contribute to this project."
          onCreateNew={() => setIsNewResourceOpen(true)}
          createLabel="New Resource"
        >
          {filteredResources.length > 0 ? (
            <div className="rounded-lg border bg-card">
              <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-3 py-2">
                <span className="w-20 text-xs font-medium text-muted-foreground">Status</span>
                <span className="flex-1 text-xs font-medium text-muted-foreground">Name</span>
                <span className="hidden w-20 text-xs font-medium text-muted-foreground sm:inline">
                  Type
                </span>
              </div>
              {filteredResources.map((resource) => (
                <div
                  key={resource.id}
                  className="flex items-center gap-3 border-b border-border/40 px-3 py-2.5 hover:bg-muted/30"
                >
                  <Badge
                    variant="secondary"
                    className={cn(
                      "w-20 text-xs",
                      resource.status === "inbox" &&
                        "bg-slate-100 text-slate-700 dark:bg-slate-800",
                      resource.status === "to_review" &&
                        "bg-amber-100 text-amber-700 dark:bg-amber-900",
                      resource.status === "active" &&
                        "bg-green-100 text-green-700 dark:bg-green-900",
                    )}
                  >
                    {resource.status.replace("_", " ")}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{resource.name}</p>
                    {resource.url && (
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-xs text-muted-foreground hover:text-primary"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {resource.url}
                      </a>
                    )}
                  </div>
                  <Badge variant="outline" className="hidden w-20 text-xs sm:inline">
                    {resource.type}
                  </Badge>
                  <button
                    type="button"
                    onClick={() =>
                      toggleFavoriteResource.mutate({
                        id: resource.id,
                        favorite: !resource.favorite,
                      })
                    }
                    className={cn(
                      "shrink-0 text-sm",
                      resource.favorite ? "text-rose-500" : "text-muted-foreground/40",
                    )}
                  >
                    {resource.favorite ? "★" : "☆"}
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </GoalDetailSection>
      </div>

      <div ref={peopleRef}>
        <GoalDetailSection
          id="people"
          entityType="people"
          tabs={contactTabs}
          activeTab={contactTab}
          onTabChange={setContactTab}
          isLoading={false}
          emptyTitle="No linked people"
          emptyDescription="Create a new contact to attach to this project, or link an existing one."
          onCreateNew={() => setIsNewContactOpen(true)}
          createLabel="New Contact"
        >
          {filteredContacts.length > 0 ? (
            <div className="space-y-3">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLinkContactOpen(true)}
                  className="gap-1.5"
                >
                  <LinkIcon className="size-3.5" />
                  Link Existing Contact
                </Button>
              </div>
              {filteredContacts.map((contact) => {
                const link = projectContactLinks.find((item) => item.contact_id === contact.id);

                return (
                  <div
                    key={contact.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{contact.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {[contact.role, contact.organization].filter(Boolean).join(" - ")}
                        {link?.role_in_project ? ` - ${link.role_in_project}` : ""}
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
          ) : null}
        </GoalDetailSection>
      </div>

      <Dialog open={isLinkAreaOpen} onOpenChange={setIsLinkAreaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link Area</DialogTitle>
            <DialogDescription>Attach an additional area to this project from its linked goals.</DialogDescription>
          </DialogHeader>
          {linkedGoals.length === 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This project has no linked goals.
              </p>
              <p className="text-sm text-muted-foreground">
                Link a goal first to make its areas eligible for linking.
              </p>
            </div>
          ) : eligibleAreas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              All areas from linked goals are already attached to this project.
            </p>
          ) : (
            <div className="space-y-2">
              {eligibleAreas.map((eligibleArea) => (
                <button
                  key={eligibleArea.id}
                  type="button"
                  onClick={() => handleLinkArea(eligibleArea.id)}
                  className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/40"
                >
                  <LinkIcon className="mt-0.5 size-4 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {eligibleArea.icon ? `${eligibleArea.icon} ` : ""}
                      {eligibleArea.name}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isLinkGoalOpen} onOpenChange={setIsLinkGoalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link Goal</DialogTitle>
            <DialogDescription>Attach an existing goal to this project.</DialogDescription>
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
            <DialogDescription>Add a contact to this project.</DialogDescription>
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
                      {[contact.role, contact.organization].filter(Boolean).join(" - ")}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <TaskDialog
        open={isNewTaskOpen}
        onOpenChange={setIsNewTaskOpen}
        projectScoped={{
          projectId: project.id,
          projectName: project.name,
          areaId: project.area_id ?? null,
          linkedAreaIds: projectLinkedAreaIds,
          linkedGoalIds: linkedGoalIdsArray,
        }}
        onSuccess={() => setIsNewTaskOpen(false)}
      />

      <NoteEditorDialog
        open={isNewNoteOpen}
        onOpenChange={setIsNewNoteOpen}
        note={null}
        projectId={project.id}
        areaId={projectLinkedAreaIds[0] ?? null}
        onSuccess={() => setIsNewNoteOpen(false)}
      />

      <ProjectDialog open={isEditOpen} onOpenChange={setIsEditOpen} project={project} />

      <ContactDialog
        open={isNewContactOpen}
        onOpenChange={setIsNewContactOpen}
        contact={null}
        requireContactDetails
        onSubmit={handleCreateContactSubmit}
      />

      <Dialog open={isNewResourceOpen} onOpenChange={setIsNewResourceOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Resource</DialogTitle>
            <DialogDescription>Attach a new resource to this project.</DialogDescription>
          </DialogHeader>
          <ProjectResourceForm
            projectId={project.id}
            isPending={createResource.isPending}
            onSubmit={async (input) => {
              await createResource.mutateAsync(input);
              setIsNewResourceOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectResourceForm({
  onSubmit,
  isPending,
  projectId,
}: {
  onSubmit: (input: {
    name: string;
    url?: string;
    type:
      | "website"
      | "article"
      | "video"
      | "document"
      | "podcast"
      | "social_media"
      | "tool";
    status: "inbox" | "to_review" | "active";
    project_id?: string;
  }) => Promise<void>;
  isPending: boolean;
  projectId: string;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<
    "website" | "article" | "video" | "document" | "podcast" | "social_media" | "tool"
  >("website");
  const [status, setStatus] = useState<"inbox" | "to_review" | "active">("inbox");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !url.trim()) return;
    onSubmit({
      name: name.trim(),
      url: url.trim(),
      type,
      status,
      project_id: projectId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="proj-res-name">Name</Label>
        <Input
          id="proj-res-name"
          placeholder="My favorite article"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="proj-res-url">URL *</Label>
        <Input
          id="proj-res-url"
          type="url"
          placeholder="https://..."
          value={url}
          onChange={(event) => setUrl(event.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="proj-res-type">Type</Label>
          <select
            id="proj-res-type"
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={type}
            onChange={(event) => setType(event.target.value as typeof type)}
          >
            <option value="website">Website</option>
            <option value="article">Article</option>
            <option value="video">Video</option>
            <option value="document">Document</option>
            <option value="podcast">Podcast</option>
            <option value="social_media">Social Media</option>
            <option value="tool">Tool</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="proj-res-status">Status</Label>
          <select
            id="proj-res-status"
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={status}
            onChange={(event) => setStatus(event.target.value as typeof status)}
          >
            <option value="inbox">Inbox</option>
            <option value="to_review">To Review</option>
            <option value="active">Active</option>
          </select>
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={!name.trim() || !url.trim() || isPending}>
          {isPending ? "Creating..." : "Create Resource"}
        </Button>
      </div>
    </form>
  );
}

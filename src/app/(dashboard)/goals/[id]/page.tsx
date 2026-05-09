"use client";

import { useEffect } from "react";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  ChevronDownIcon,
  ChevronRightIcon,
  Edit,
  Link as LinkIcon,
  Plus,
  Target,
  Trash2,
  Unlink,
  X,
} from "lucide-react";

import { GoalDialog } from "@/components/entities/goal-dialog";
import { GoalDetailSection } from "@/components/entities/goal-detail-section";
import { NoteEditorDialog } from "@/components/entities/note-editor-dialog";
import { PriorityBadge } from "@/components/entities/priority-badge";
import { ProjectCard } from "@/components/entities/project-card";
import { ProjectDialog } from "@/components/entities/project-dialog";
import { TaskDialog } from "@/components/entities/task-dialog";
import { TaskListItem } from "@/components/entities/task-list-item";
import { EmptyState } from "@/components/views/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAreas } from "@/lib/hooks/use-areas";
import { useGoalDetail } from "@/lib/hooks/use-goal-detail";
import {
  useDeleteGoal,
  useLinkGoalToArea,
  useUnlinkGoalFromArea,
  useUpdateGoal,
} from "@/lib/hooks/use-goals";
import {
  useCompleteTaskWithGoalRefresh,
  useDeleteTask,
  useFocusTask,
  useUpdateTask,
} from "@/lib/hooks/use-tasks";
import { useProjects } from "@/lib/hooks/use-projects";
import { useToggleFavoriteNote } from "@/lib/hooks/use-notes";
import { useToggleFavoriteResource, useCreateResource } from "@/lib/hooks/use-resources";
import { cn } from "@/lib/utils";
import type { Project, Task } from "@/lib/types/domain.types";
import { NOTE_STATUS, RESOURCE_STATUS } from "@/lib/utils/constants";
import { useUIStore } from "@/lib/stores/ui.store";
import { calculateGoalProgress, getGoalLinkedAreaIds } from "@/lib/utils/goals";
import { getProjectLinkedAreaIds } from "@/lib/utils/projects";
import { encodeReturnTo, resolveGoalDetailNavigation } from "@/lib/utils/return-to";

const TERM_LABELS: Record<string, string> = {
  short: "Short Term",
  mid: "Mid Term",
  long: "Long Term",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

function parseGoalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function calculateDueState(targetDate: string | null): { text: string; isOverdue: boolean } {
  if (!targetDate) {
    return { text: "No due date", isOverdue: false };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = parseGoalDate(targetDate);
  const dayDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const formattedDate = dueDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (dayDiff < 0) {
    return { text: `Overdue • ${formattedDate}`, isOverdue: true };
  }

  if (dayDiff === 0) {
    return { text: `Due today • ${formattedDate}`, isOverdue: false };
  }

  const remainingLabel = dayDiff === 1 ? "1 day left" : `${dayDiff} days left`;
  return {
    text: `Due ${formattedDate} • ${remainingLabel}`,
    isOverdue: false,
  };
}

function InlineGoalTitleEditor({
  name,
  onSave,
}: {
  name: string;
  onSave: (name: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  const startEdit = () => {
    setValue(name);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 10);
  };

  const save = () => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== name) {
      onSave(trimmed);
    }
    setEditing(false);
  };

  const cancel = () => {
    setValue(name);
    setEditing(false);
  };

  if (!editing) {
    return (
      <h1
        className="cursor-pointer text-3xl font-bold tracking-tight hover:text-primary/70"
        onClick={startEdit}
        title="Click to edit"
      >
        {name}
      </h1>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") save();
        if (e.key === "Escape") cancel();
      }}
      className="bg-transparent text-3xl font-bold tracking-tight outline-none ring-2 ring-primary/40 rounded px-1"
      autoFocus
    />
  );
}

export default function GoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const goalId = params.id as string;
  const { setPageTitle } = useUIStore();
  const currentPagePath = `/goals/${goalId}`;

  // UI state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isLinkAreaOpen, setIsLinkAreaOpen] = useState(false);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [projectTab, setProjectTab] = useState("all");
  const [taskTab, setTaskTab] = useState("all");
  const [noteTab, setNoteTab] = useState("all");
  const [resourceTab, setResourceTab] = useState("all");
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isNewNoteOpen, setIsNewNoteOpen] = useState(false);
  const [isNewResourceOpen, setIsNewResourceOpen] = useState(false);

  // Refs for scroll-to-section
  const projectsRef = useRef<HTMLDivElement>(null);
  const tasksRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);
  const resourcesRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: goalData, isLoading } = useGoalDetail(goalId);
  const { data: areas = [] } = useAreas();
  const { data: allProjects = [] } = useProjects({ status: "all" });

  // Mutations
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const linkGoalToArea = useLinkGoalToArea();
  const unlinkGoalFromArea = useUnlinkGoalFromArea();
  const completeTask = useCompleteTaskWithGoalRefresh();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const focusTask = useFocusTask();
  const toggleFavoriteNote = useToggleFavoriteNote();
  const toggleFavoriteResource = useToggleFavoriteResource();
  const createResource = useCreateResource();

  // Derived
  const goal = goalData?.goal;
  const areaNames = useMemo(() => new Map(areas.map((a) => [a.id, a.name])), [areas]);
  const getProjectAreaNames = useCallback(
    (project: Project) =>
      getProjectLinkedAreaIds(project)
        .map((id) => areaNames.get(id))
        .filter((name): name is string => Boolean(name)),
    [areaNames],
  );
  const linkedAreaIds = useMemo(() => (goal ? getGoalLinkedAreaIds(goal) : []), [goal]);
  const currentPagePathWithSlug = goal ? `/goals/${goal.slug ?? goal.id}` : currentPagePath;
  const goalNavigation = useMemo(
    () => resolveGoalDetailNavigation(searchParams, currentPagePathWithSlug),
    [currentPagePathWithSlug, searchParams],
  );
  const goalBreadcrumbTarget = goalNavigation.breadcrumbTarget;
  const goalNestedReturnTo = goalNavigation.nestedReturnTo;
  const allowedProjectIds = useMemo(
    () => (goalData?.projects ?? []).map((p) => p.id),
    [goalData?.projects],
  );
  const linkedAreas = useMemo(
    () => areas.filter((areaOption) => linkedAreaIds.includes(areaOption.id)),
    [areas, linkedAreaIds],
  );
  const unlinkedAreas = useMemo(
    () =>
      areas.filter(
        (areaOption) => !areaOption.archive && !linkedAreaIds.includes(areaOption.id),
      ),
    [areas, linkedAreaIds],
  );
  const dueState = goal ? calculateDueState(goal.target_date) : null;

  // Sync page title with goal name
  useEffect(() => {
    if (goal) {
      setPageTitle(goal.name);
    }
    return () => setPageTitle("");
  }, [goal, setPageTitle]);

  const goalProgressPercent = useMemo(() => {
    if (!goal || !goalData) return 0;
    return calculateGoalProgress(goal, goalData.projects, goalData.tasks);
  }, [goal, goalData]);

  // Dynamic note type tabs
  const noteTypesInGoal = useMemo(() => {
    const types = new Set<string>();
    for (const note of goalData?.notes ?? []) {
      types.add(note.type);
    }
    return Array.from(types);
  }, [goalData?.notes]);

  const noteTabs = useMemo(() => {
    return [
      { value: "all", label: "All" },
      { value: "inbox", label: "Inbox" },
      { value: "to_review", label: "To Review" },
      { value: "active", label: "Active" },
      { value: "favorite", label: "Favorite" },
      { value: "archived", label: "Archived" },
    ];
  }, []);

  // Filter notes by tab
  const filteredNotes = useMemo(() => {
    const notes = goalData?.notes ?? [];
    if (noteTab.startsWith("type:")) {
      const type = noteTab.slice(5);
      return notes.filter((n) => n.type === type);
    }
    switch (noteTab) {
      case "inbox":
        return notes.filter((n) => n.status === NOTE_STATUS.INBOX);
      case "to_review":
        return notes.filter((n) => n.status === NOTE_STATUS.TO_REVIEW);
      case "active":
        return notes.filter((n) => n.status === NOTE_STATUS.ACTIVE);
      case "favorite":
        return notes.filter((n) => n.favorite);
      case "archived":
        return notes.filter((n) => n.is_archived);
      default:
        return notes;
    }
  }, [goalData?.notes, noteTab]);

  // Dynamic resource type tabs
  const resourceTypesInGoal = useMemo(() => {
    const types = new Set<string>();
    for (const resource of goalData?.resources ?? []) {
      types.add(resource.type);
    }
    return Array.from(types);
  }, [goalData?.resources]);

  const resourceTabs = useMemo(() => {
    return [
      { value: "all", label: "All" },
      { value: "inbox", label: "Inbox" },
      { value: "to_review", label: "To Review" },
      { value: "active", label: "Active" },
      { value: "favorites", label: "Favorites" },
      { value: "archived", label: "Archived" },
    ];
  }, []);

  // Filter resources by tab
  const filteredResources = useMemo(() => {
    const resources = goalData?.resources ?? [];
    if (resourceTab.startsWith("type:")) {
      const type = resourceTab.slice(5);
      return resources.filter((r) => r.type === type);
    }
    switch (resourceTab) {
      case "inbox":
        return resources.filter((r) => r.status === RESOURCE_STATUS.INBOX);
      case "to_review":
        return resources.filter((r) => r.status === RESOURCE_STATUS.TO_REVIEW);
      case "active":
        return resources.filter((r) => r.status === RESOURCE_STATUS.ACTIVE);
      case "favorites":
        return resources.filter((r) => r.favorite);
      case "archived":
        return resources.filter((r) => r.is_archived);
      default:
        return resources;
    }
  }, [goalData?.resources, resourceTab]);

  // Project section tabs
  const projectTabs = [
    { value: "all", label: "All", count: goalData?.rollups.projectCount },
    {
      value: "inbox",
      label: "Inbox",
      count: goalData?.projects.filter((p) => p.status === "planning").length,
    },
    {
      value: "in_progress",
      label: "In Progress",
      count: goalData?.projects.filter((p) => p.status === "active").length,
    },
    {
      value: "completed",
      label: "Completed",
      count: goalData?.projects.filter((p) => p.status === "completed" && !p.is_archived).length,
    },
    {
      value: "by_status",
      label: "By Status",
      count: goalData?.rollups.projectCount,
    },
    {
      value: "timeline",
      label: "Timeline",
      count: goalData?.rollups.projectCount,
    },
    { value: "archived", label: "Archive", count: goalData?.projects.filter((p) => p.is_archived).length },
  ];

  const filteredProjects = useMemo(() => {
    const projects = goalData?.projects ?? [];
    switch (projectTab) {
      case "inbox":
        return projects.filter((p) => p.status === "planning" && !p.is_archived);
      case "in_progress":
        return projects.filter((p) => p.status === "active" && !p.is_archived);
      case "completed":
        return projects.filter((p) => p.status === "completed" && !p.is_archived);
      case "by_status":
        return projects.filter((p) => !p.is_archived);
      case "timeline":
        return projects.filter((p) => !p.is_archived && (p.start_date || p.due_date));
      case "archived":
        return projects.filter((p) => p.is_archived);
      default:
        return projects;
    }
  }, [goalData?.projects, projectTab]);

  // Task section tabs
  const taskTabs = [
    { value: "all", label: "All", count: goalData?.rollups.taskCount },
    {
      value: "inbox",
      label: "Inbox",
      count: goalData?.tasks.filter((t) => t.status === "inbox" && !t.is_completed).length,
    },
    {
      value: "upcoming",
      label: "Upcoming",
      count: goalData?.tasks.filter(
        (t) => t.status !== "inbox" && t.status !== "completed" && !t.is_completed,
      ).length,
    },
    {
      value: "overdue",
      label: "Overdue",
      count: goalData?.tasks.filter((t) => {
        if (!t.due_date || t.is_completed) return false;
        return new Date(t.due_date) < new Date();
      }).length,
    },
    {
      value: "by_projects",
      label: "By Projects",
      count: goalData?.rollups.taskCount,
    },
    {
      value: "completed",
      label: "Completed",
      count: goalData?.rollups.completedTaskCount,
    },
  ];

  const filteredTasks = useMemo(() => {
    const tasks = goalData?.tasks ?? [];
    switch (taskTab) {
      case "inbox":
        return tasks.filter((t) => t.status === "inbox" && !t.is_completed);
      case "upcoming":
        return tasks.filter(
          (t) => t.status !== "inbox" && t.status !== "completed" && !t.is_completed,
        );
      case "overdue":
        return tasks.filter((t) => {
          if (!t.due_date || t.is_completed) return false;
          return new Date(t.due_date) < new Date();
        });
      case "by_projects":
        return tasks.filter((t) => !t.is_completed);
      case "completed":
        return tasks.filter((t) => t.is_completed);
      default:
        return tasks;
    }
  }, [goalData?.tasks, taskTab]);

  // Scroll helpers
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  // Handlers
  const handleTitleSave = useCallback(
    async (name: string) => {
      if (!goal) return;
      await updateGoal.mutateAsync({ id: goal.id, input: { name } });
    },
    [goal, updateGoal],
  );

  const handleTaskCompletion = useCallback(
    async (taskId: string, completed: boolean) => {
      if (completed) {
        await completeTask.mutateAsync(taskId);
      } else {
        await updateTask.mutateAsync({
          id: taskId,
          input: { is_completed: false, completed_at: null },
        });
      }
    },
    [completeTask, updateTask],
  );

  const handleTaskFocus = useCallback(
    async (taskId: string, focused: boolean) => {
      await focusTask.mutateAsync({ id: taskId, is_focused: focused });
    },
    [focusTask],
  );

  const handleTaskNameSave = useCallback(
    async (taskId: string, name: string) => {
      await updateTask.mutateAsync({ id: taskId, input: { name } });
    },
    [updateTask],
  );

  const handleTaskDelete = useCallback(
    async (taskId: string) => {
      await deleteTask.mutateAsync(taskId);
    },
    [deleteTask],
  );

  const handleGoalArchiveToggle = useCallback(async (checked: boolean) => {
    if (!goal || checked === goal.is_archived) return;
    await updateGoal.mutateAsync({
      id: goal.id,
      input: { is_archived: checked },
    });
  }, [goal, updateGoal]);

  const handleGoalCompleteToggle = useCallback(async (checked: boolean) => {
    if (!goal || checked === goal.is_completed) return;
    await updateGoal.mutateAsync({
      id: goal.id,
      input: checked ? { is_completed: true, progress: 100 } : { is_completed: false },
    });
  }, [goal, updateGoal]);

  const handleNoteToggleFavorite = useCallback(
    (noteId: string, favorite: boolean) => {
      toggleFavoriteNote.mutate({ id: noteId, favorite });
    },
    [toggleFavoriteNote],
  );

  const handleResourceToggleFavorite = useCallback(
    (resourceId: string, favorite: boolean) => {
      toggleFavoriteResource.mutate({ id: resourceId, favorite });
    },
    [toggleFavoriteResource],
  );

  const handleDeleteGoal = useCallback(async () => {
    if (!goal) {
      return;
    }

    await deleteGoal.mutateAsync(goal.id);
    router.push("/goals");
  }, [deleteGoal, goal, router]);

  const handleLinkArea = useCallback(async (areaId: string) => {
    if (!goal) {
      return;
    }

    await linkGoalToArea.mutateAsync({ goalId: goal.id, areaId });
    setIsLinkAreaOpen(false);
  }, [goal, linkGoalToArea]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
        <Button variant="ghost" onClick={() => router.push("/goals")}>
          <ArrowLeft className="mr-2 size-4" />
          Back to Goals
        </Button>
        <EmptyState
          icon={Target}
          title="Goal not found"
          description="This goal may have been deleted or you do not have access to it."
          actionLabel="Return to Goals"
          onAction={() => router.push("/goals")}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={() => router.push(goalBreadcrumbTarget)}
        >
          <ArrowLeft className="size-3.5" />
        </Button>
        <span>/</span>
        <button className="hover:text-foreground" onClick={() => router.push(goalBreadcrumbTarget)}>
          Goals
        </button>
        <span>/</span>
        <span className="text-foreground">{goal.name}</span>
      </div>

      {/* Properties Header */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-start justify-between gap-4 p-6">
          <div className="flex items-start gap-4">
            {/* Progress Ring */}
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
                  strokeDashoffset={64 * 2 * Math.PI * (1 - goalProgressPercent / 100)}
                  strokeLinecap="round"
                  className="text-primary transition-all duration-500"
                />
              </svg>
              <span className="absolute text-sm font-bold">{goalProgressPercent}%</span>
            </div>

            <div className="space-y-2">
              {/* Inline editable title */}
              <InlineGoalTitleEditor name={goal.name} onSave={handleTitleSave} />

              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2">
                {linkedAreas.map((area) => (
                  <Badge key={area.id} variant="secondary" className="text-xs">
                    {area.name}
                  </Badge>
                ))}
                <Badge variant="outline" className={cn("text-xs", PRIORITY_COLORS[goal.priority])}>
                  {goal.priority}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {TERM_LABELS[goal.term] ?? goal.term}
                </Badge>
                {goal.is_completed && (
                  <Badge className="bg-green-500/10 text-green-600 border-none text-xs">
                    Completed
                  </Badge>
                )}
                {goal.is_archived && (
                  <Badge variant="outline" className="text-xs">
                    Archived
                  </Badge>
                )}
              </div>

              {/* Due date */}
              {dueState && (
                <div
                  className={cn(
                    "flex items-center gap-1.5 text-sm",
                    dueState.isOverdue && "text-destructive font-medium",
                  )}
                >
                  <Calendar className="size-3.5" />
                  {dueState.text}
                </div>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPropertiesOpen(!isPropertiesOpen)}
            className="gap-1"
          >
            Properties
            {isPropertiesOpen ? (
              <ChevronDownIcon className="size-3.5" />
            ) : (
              <ChevronRightIcon className="size-3.5" />
            )}
          </Button>
        </div>

        {/* Goal Activity Rollups */}
        <div className="flex flex-wrap items-center gap-4 px-6 pb-4">
          <button
            onClick={() => scrollToSection("projects")}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-blue-600 dark:text-blue-400">
              {goalData?.rollups.projectCount ?? 0}
            </span>
            <span className="text-muted-foreground">Projects</span>
          </button>
          <button
            onClick={() => scrollToSection("tasks")}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-green-600 dark:text-green-400">
              {goalData?.rollups.taskCount ?? 0}
            </span>
            <span className="text-muted-foreground">Tasks</span>
          </button>
          <button
            onClick={() => scrollToSection("notes")}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-purple-600 dark:text-purple-400">
              {goalData?.rollups.noteCount ?? 0}
            </span>
            <span className="text-muted-foreground">Notes</span>
          </button>
          <button
            onClick={() => scrollToSection("resources")}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-orange-600 dark:text-orange-400">
              {goalData?.rollups.resourceCount ?? 0}
            </span>
            <span className="text-muted-foreground">Resources</span>
          </button>
        </div>

        {/* Collapsible Properties Panel */}
        {isPropertiesOpen && (
          <>
            <Separator />
            <div className="space-y-4 p-6">
              <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
                {/* Areas */}
                <div>
                  <Label className="text-xs text-muted-foreground">Areas</Label>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {linkedAreas.length > 0 ? (
                      linkedAreas.map((area) => (
                        <Badge
                          key={area.id}
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {area.icon ? `${area.icon} ` : ""}
                          {area.name}
                          <button
                            type="button"
                            onClick={() =>
                              unlinkGoalFromArea.mutate({ goalId: goal.id, areaId: area.id })
                            }
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
                {/* Term */}
                <div>
                  <Label className="text-xs text-muted-foreground">Term</Label>
                  <p className="mt-1 font-medium">{TERM_LABELS[goal.term] ?? goal.term}</p>
                </div>
                {/* Priority */}
                <div>
                  <Label className="text-xs text-muted-foreground">Priority</Label>
                  <div className="mt-1">
                    <PriorityBadge priority={goal.priority} />
                  </div>
                </div>
                {/* Due Date */}
                <div>
                  <Label className="text-xs text-muted-foreground">Target Date</Label>
                  <Input
                    type="date"
                    className={cn("mt-1 font-medium", dueState?.isOverdue && "text-destructive")}
                    defaultValue={goal.target_date ?? ""}
                    onBlur={(e) => {
                      const newDate = e.target.value;
                      if (newDate !== goal.target_date) {
                        updateGoal.mutateAsync({ id: goal.id, input: { target_date: newDate || null } });
                      }
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <Button size="sm" onClick={() => setIsNewTaskOpen(true)} className="gap-1.5">
                  <Plus className="size-3.5" />
                  Add Task
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsNewProjectOpen(true)}
                  className="gap-1.5"
                >
                  <Plus className="size-3.5" />
                  Add Project
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
                    id="goal-archived"
                    checked={goal.is_archived}
                    disabled={updateGoal.isPending}
                    onCheckedChange={(checked) => handleGoalArchiveToggle(checked === true)}
                  />
                  <Label htmlFor="goal-archived" className="cursor-pointer text-sm">
                    Archived
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="goal-completed"
                    checked={goal.is_completed}
                    disabled={updateGoal.isPending}
                    onCheckedChange={(checked) => handleGoalCompleteToggle(checked === true)}
                  />
                  <Label htmlFor="goal-completed" className="cursor-pointer text-sm">
                    Completed
                  </Label>
                </div>
              </div>

              {goal.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="mt-1 text-sm">{goal.description}</p>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditOpen(true)}
                  className="gap-1.5"
                >
                  <Edit className="size-3.5" />
                  Edit Goal
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filter chip */}
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="gap-1.5 text-xs">
          <Target className="size-3" />
          Goals: {goal.name}
          <button
            onClick={() => router.push("/goals")}
            className="ml-1 rounded-full hover:bg-muted"
          >
            <X className="size-3" />
          </button>
        </Badge>
      </div>

      {/* Projects Section */}
      <div ref={projectsRef}>
        <GoalDetailSection
          id="projects"
          entityType="projects"
          tabs={projectTabs}
          activeTab={projectTab}
          onTabChange={setProjectTab}
          isLoading={isLoading}
          emptyTitle="No projects linked to this goal"
          emptyDescription="Create a project to track work that contributes to this goal."
          onCreateNew={() => setIsNewProjectOpen(true)}
          createLabel="New Project"
        >
          {filteredProjects.length > 0 ? (
            <>
              {projectTab === "by_status" ? (
                // Grouped-by-status view
                (() => {
                  const groups: Record<string, Project[]> = {};
                  for (const p of filteredProjects) {
                    const s = p.status || "unknown";
                    if (!groups[s]) groups[s] = [];
                    groups[s].push(p);
                  }
                  const STATUS_ORDER = ["planning", "active", "completed", "on_hold", "unknown"];
                  const sortedKeys = Object.keys(groups).sort(
                    (a, b) => STATUS_ORDER.indexOf(a) - STATUS_ORDER.indexOf(b),
                  );
                  return sortedKeys.map((status) => (
                    <div key={status} className="mb-6">
                      <h3 className="mb-3 text-sm font-semibold capitalize text-muted-foreground">
                        {status.replace("_", " ")} ({groups[status].length})
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {groups[status].map((project) => (
                          <ProjectCard
                            key={project.id}
                            project={project}
                            areaName={project.area_id ? areaNames.get(project.area_id) : undefined}
                            areaNames={getProjectAreaNames(project)}
                          />
                        ))}
                      </div>
                    </div>
                  ));
                })()
              ) : projectTab === "timeline" ? (
                // Date-sorted timeline view
                (() => {
                  const withDates = filteredProjects.map((p) => {
                    const date = p.start_date ? new Date(p.start_date) : new Date(p.due_date!);
                    return { project: p, sortDate: date };
                  }).sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());
                  return (
                    <div className="relative border-l-2 border-muted-foreground/20 pl-6">
                      {withDates.map(({ project }) => (
                        <div
                          key={project.id}
                          className={cn(
                            "mb-6 relative",
                            // Timeline dot
                            "before:absolute before:-left-[25px] before:top-1.5 before:h-2.5 before:w-2.5 before:rounded-full before:bg-primary",
                          )}
                        >
                          <p className="text-xs text-muted-foreground mb-1">
                            {project.start_date
                              ? new Date(project.start_date).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
                              : ""}
                            {project.start_date && project.due_date ? " – " : ""}
                            {project.due_date
                              ? new Date(project.due_date).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : ""}
                          </p>
                          <ProjectCard
                            project={project}
                            areaName={project.area_id ? areaNames.get(project.area_id) : undefined}
                            areaNames={getProjectAreaNames(project)}
                          />
                        </div>
                      ))}
                    </div>
                  );
                })()
              ) : (
                // Default flat grid
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      areaName={project.area_id ? areaNames.get(project.area_id) : undefined}
                      areaNames={getProjectAreaNames(project)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : null}
        </GoalDetailSection>
      </div>

      {/* Tasks Section */}
      <div ref={tasksRef}>
        <GoalDetailSection
          id="tasks"
          entityType="tasks"
          tabs={taskTabs}
          activeTab={taskTab}
          onTabChange={setTaskTab}
          isLoading={isLoading}
          emptyTitle="No tasks linked to this goal"
          emptyDescription="Add tasks to track work that contributes to this goal."
          onCreateNew={() => setIsNewTaskOpen(true)}
          createLabel="New Task"
        >
          {filteredTasks.length > 0 ? (
            <>
              {taskTab === "by_projects" ? (
                // Grouped-by-project view
                (() => {
                  const groups: Record<string, Task[]> = {};
                  for (const t of filteredTasks) {
                    const key = t.project_id ? (allProjects.find((p) => p.id === t.project_id)?.name ?? "ungrouped") : "ungrouped";
                    if (!groups[key]) groups[key] = [];
                    groups[key].push(t);
                  }
                  const sortedKeys = Object.keys(groups).sort((a, b) =>
                    a === "ungrouped" ? 1 : b === "ungrouped" ? -1 : a.localeCompare(b),
                  );
                  return (
                    <div className="space-y-6">
                      {sortedKeys.map((projectName) => (
                        <div key={projectName}>
                          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                            {projectName} ({groups[projectName].length})
                          </h3>
                          <div className="rounded-lg border bg-card">
                            {groups[projectName].map((task) => (
                              <TaskListItem
                                key={task.id}
                                task={task}
                                areaName={task.area_id ? areaNames.get(task.area_id) ?? null : null}
                                projectName={null}
                                onCompletionToggle={handleTaskCompletion}
                                onFocusToggle={handleTaskFocus}
                                onNameSave={handleTaskNameSave}
                                onDelete={handleTaskDelete}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()
              ) : (
                // Default flat list
                <div className="rounded-lg border bg-card">
                  {filteredTasks.map((task) => (
                    <TaskListItem
                      key={task.id}
                      task={task}
                      areaName={task.area_id ? areaNames.get(task.area_id) ?? null : null}
                      projectName={
                        task.project_id
                          ? allProjects.find((p) => p.id === task.project_id)?.name ?? null
                          : null
                      }
                      onCompletionToggle={handleTaskCompletion}
                      onFocusToggle={handleTaskFocus}
                      onNameSave={handleTaskNameSave}
                      onDelete={handleTaskDelete}
                    />
                  ))}
                </div>
              )}
            </>
          ) : null}
        </GoalDetailSection>
      </div>

      {/* Notes Section */}
      <div ref={notesRef}>
        <GoalDetailSection
          id="notes"
          entityType="notes"
          tabs={[
            ...noteTabs,
            ...noteTypesInGoal.map((type) => ({ value: `type:${type}`, label: type })),
          ]}
          activeTab={noteTab}
          onTabChange={setNoteTab}
          isLoading={isLoading}
          emptyTitle="No notes linked to this goal"
          emptyDescription="Create a note to capture thoughts that contribute to this goal."
          onCreateNew={() => setIsNewNoteOpen(true)}
          createLabel="New Note"
        >
          {filteredNotes.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredNotes.map((note) => {
                const noteReturnTo = goalNestedReturnTo;
                return (
                  <div
                    key={note.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/notes/${note.slug ?? note.id}?returnTo=${encodeReturnTo(noteReturnTo)}`)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(`/notes/${note.slug ?? note.id}?returnTo=${encodeReturnTo(noteReturnTo)}`);
                      }
                    }}
                    className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/30 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate font-semibold">{note.name}</h3>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNoteToggleFavorite(note.id, !note.favorite);
                        }}
                        className={cn(
                          "shrink-0 text-sm",
                          note.favorite ? "text-rose-500" : "text-muted-foreground",
                        )}
                      >
                        {note.favorite ? "★" : "☆"}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary" className="text-xs">
                        {note.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {note.type}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </GoalDetailSection>
      </div>

      {/* Resources Section */}
      <div ref={resourcesRef}>
        <GoalDetailSection
          id="resources"
          entityType="resources"
          tabs={[
            ...resourceTabs,
            ...resourceTypesInGoal.map((type) => ({ value: `type:${type}`, label: type })),
          ]}
          activeTab={resourceTab}
          onTabChange={setResourceTab}
          isLoading={isLoading}
          emptyTitle="No resources linked to this goal"
          emptyDescription="Add resources to track external references that contribute to this goal."
          onCreateNew={() => setIsNewResourceOpen(true)}
          createLabel="New Resource"
        >
          {filteredResources.length > 0 ? (
            <div className="rounded-lg border bg-card">
              <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-3 py-2">
                <span className="w-20 text-xs font-medium text-muted-foreground">Status</span>
                <span className="flex-1 text-xs font-medium text-muted-foreground">Name</span>
                <span className="w-20 text-xs font-medium text-muted-foreground hidden sm:inline">
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
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{resource.name}</p>
                    {resource.url && (
                      <a
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-xs text-muted-foreground hover:text-primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {resource.url}
                      </a>
                    )}
                  </div>
                  <Badge variant="outline" className="w-20 text-xs hidden sm:inline">
                    {resource.type}
                  </Badge>
                  <button
                    type="button"
                    onClick={() =>
                      handleResourceToggleFavorite(resource.id, !resource.favorite)
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

      {/* Edit Goal Dialog */}
      <GoalDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        goal={goal}
        onSuccess={() => setIsEditOpen(false)}
      />

      <Dialog open={isLinkAreaOpen} onOpenChange={setIsLinkAreaOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Link Area</DialogTitle>
          </DialogHeader>
          {unlinkedAreas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              All active areas are already linked to this goal.
            </p>
          ) : (
            <div className="space-y-2">
              {unlinkedAreas.map((area) => (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => handleLinkArea(area.id)}
                  className="flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/40"
                >
                  <LinkIcon className="mt-0.5 size-4 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {area.icon ? `${area.icon} ` : ""}
                      {area.name}
                    </p>
                    {area.description ? (
                      <p className="text-sm text-muted-foreground">{area.description}</p>
                    ) : null}
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
            <DialogTitle>Delete Goal Permanently?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This removes the goal and clears its linked areas, projects, tasks, notes, and
            resources relationships.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteGoal}
              disabled={deleteGoal.isPending}
            >
              Delete Goal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inline Project Creation (goal-scoped) */}
      <ProjectDialog
        open={isNewProjectOpen}
        onOpenChange={setIsNewProjectOpen}
        goalScoped={{ goalId: goal.id, areaId: goal.area_id ?? null }}
        onSuccess={() => setIsNewProjectOpen(false)}
      />

      {/* Inline Task Creation (goal-scoped) */}
      <TaskDialog
        open={isNewTaskOpen}
        onOpenChange={setIsNewTaskOpen}
        goalScoped={{
          goalId: goal.id,
          areaId: goal.area_id ?? null,
          linkedAreaIds: linkedAreaIds,
          allowedProjectIds: allowedProjectIds,
        }}
        onSuccess={() => setIsNewTaskOpen(false)}
      />

      {/* Inline Note Creation */}
      <NoteEditorDialog
        open={isNewNoteOpen}
        onOpenChange={setIsNewNoteOpen}
        note={null}
        goalId={goal.id}
        areaId={linkedAreaIds[0] ?? null}
        returnTo={goalNestedReturnTo}
        onSuccess={() => setIsNewNoteOpen(false)}
      />

      {/* Inline Resource Creation */}
      <Dialog open={isNewResourceOpen} onOpenChange={setIsNewResourceOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Resource</DialogTitle>
          </DialogHeader>
          <ResourceForm
            goalId={goal.id}
            onSubmit={async (input) => {
              await createResource.mutateAsync(input);
              setIsNewResourceOpen(false);
            }}
            isPending={createResource.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Inline resource creation form
function ResourceForm({
  onSubmit,
  isPending,
  goalId,
}: {
  onSubmit: (input: {
    name: string;
    url?: string;
    type: "website" | "article" | "video" | "document" | "podcast" | "social_media" | "tool";
    status: "inbox" | "to_review" | "active";
    area_id?: string;
    project_id?: string;
    topic_id?: string;
    goal_ids?: string[];
  }) => Promise<void>;
  isPending: boolean;
  goalId?: string;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<"website" | "article" | "video" | "document" | "podcast" | "social_media" | "tool">("website");
  const [status, setStatus] = useState<"inbox" | "to_review" | "active">("inbox");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    const input: Parameters<typeof onSubmit>[0] = {
      name: name.trim(),
      url: url.trim(),
      type,
      status,
    };
    if (goalId) {
      input.goal_ids = [goalId];
    }
    onSubmit(input);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="res-name">Name</Label>
        <Input
          id="res-name"
          placeholder="My favorite article"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="res-url">URL *</Label>
        <Input
          id="res-url"
          type="url"
          placeholder="https://..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="res-type">Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger id="res-type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="website">Website</SelectItem>
              <SelectItem value="article">Article</SelectItem>
              <SelectItem value="video">Video</SelectItem>
              <SelectItem value="document">Document</SelectItem>
              <SelectItem value="podcast">Podcast</SelectItem>
              <SelectItem value="social_media">Social Media</SelectItem>
              <SelectItem value="tool">Tool</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="res-status">Status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger id="res-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="inbox">Inbox</SelectItem>
              <SelectItem value="to_review">To Review</SelectItem>
              <SelectItem value="active">Active</SelectItem>
            </SelectContent>
          </Select>
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

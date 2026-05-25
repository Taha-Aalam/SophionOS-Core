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
  Target,
  Trash2,
  Unlink,
} from "lucide-react";

import { ContactCard } from "@/components/entities/contact-card";
import { ContactDialog } from "@/components/entities/contact-dialog";
import { GoalDialog } from "@/components/entities/goal-dialog";
import { GoalDetailSection } from "@/components/entities/goal-detail-section";
import { PriorityBadge } from "@/components/entities/priority-badge";
import { ProjectCard } from "@/components/entities/project-card";
import { ProjectDialog } from "@/components/entities/project-dialog";
import { ResourceDialog } from "@/components/entities/resource-dialog";
import { NoteRow } from "@/components/entities/note-row";
import { ResourceRow } from "@/components/entities/resource-row";
import { TaskDialog } from "@/components/entities/task-dialog";
import { TaskListItem } from "@/components/entities/task-list-item";
import { EmptyState } from "@/components/views/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAreas } from "@/lib/hooks/use-areas";
import {
  useContacts,
  useContactByGoal,
  useCreateContact,
  useDeleteContact,
  useLinkContactToGoal,
  useToggleContactFavorite,
  useArchiveContact,
  useUnlinkContactFromGoal,
  useUpdateContact,
} from "@/lib/hooks/use-contacts";
import { useGoalDetail } from "@/lib/hooks/use-goal-detail";
import {
  useDeleteGoal,
  useGoals,
  useLinkGoalToArea,
  useUnlinkGoalFromArea,
  useUpdateGoal,
} from "@/lib/hooks/use-goals";
import {
  useCompleteTaskWithGoalRefresh,
  useDeleteTask,
  useFocusTask,
  useTasks,
  useUpdateTask,
} from "@/lib/hooks/use-tasks";
import { useProjects } from "@/lib/hooks/use-projects";
import { useNotes, useToggleFavoriteNote, useTogglePinNote, useArchiveNote, useRestoreNote, useDeleteNote } from "@/lib/hooks/use-notes";
import { useResources, useToggleFavoriteResource, useCreateResource, useUpdateResource, useArchiveResource, useUnarchiveResource } from "@/lib/hooks/use-resources";
import { cn } from "@/lib/utils";
import type { Contact, CreateResourceInput, Project, Resource, Task } from "@/lib/types/domain.types";
import { NOTE_STATUS, RESOURCE_STATUS } from "@/lib/utils/constants";
import { useUIStore } from "@/lib/stores/ui.store";
import { getGoalLinkedAreaIds } from "@/lib/utils/goals";
import { getProjectLinkedAreaIds } from "@/lib/utils/projects";
import { buildReturnTo, encodeReturnTo, resolveGoalDetailNavigation } from "@/lib/utils/return-to";

const NOTE_STATUS_COLORS: Record<string, string> = {
  [NOTE_STATUS.INBOX]: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  [NOTE_STATUS.TO_REVIEW]: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  [NOTE_STATUS.ACTIVE]: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  [NOTE_STATUS.SAVED]: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  [NOTE_STATUS.ARCHIVE]: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

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

export function GoalDetailContent() {
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
  const [contactTab, setContactTab] = useState("all");
  const [isNewContactOpen, setIsNewContactOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isNewResourceOpen, setIsNewResourceOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Refs for scroll-to-section
  const projectsRef = useRef<HTMLDivElement>(null);
  const tasksRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);
  const resourcesRef = useRef<HTMLDivElement>(null);
  const peopleRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: goalData, isLoading } = useGoalDetail(goalId);
  const resolvedGoalId = goalData?.goal.id ?? "";
  const { data: areas = [] } = useAreas();
  const { data: allProjects = [] } = useProjects({ status: "all" });
  const { data: allTasks = [] } = useTasks();
  const { data: allNotes = [] } = useNotes({ status: "all" });
  const { data: allResources = [] } = useResources({ status: "all" });
  const { data: allGoals = [] } = useGoals({ status: "all" });
  const { data: allContacts = [] } = useContacts();
  const { data: goalContactLinks = [] } = useContactByGoal(resolvedGoalId);

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
  const togglePinNote = useTogglePinNote();
  const archiveNote = useArchiveNote();
  const restoreNote = useRestoreNote();
  const deleteNote = useDeleteNote();
  const toggleFavoriteResource = useToggleFavoriteResource();
  const createResource = useCreateResource();
  const updateResource = useUpdateResource();
  const archiveResource = useArchiveResource();
  const unarchiveResource = useUnarchiveResource();
  const linkContactToGoal = useLinkContactToGoal();
  const unlinkContactFromGoal = useUnlinkContactFromGoal();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const toggleContactFavorite = useToggleContactFavorite();
  const archiveContact = useArchiveContact();

  // Derived
  const goal = goalData?.goal;
  const areaNames = useMemo(() => new Map(areas.map((a) => [a.id, a.name])), [areas]);
  const areaIcons = useMemo(() => new Map(areas.map((a) => [a.id, a.icon ?? null])), [areas]);
  const goalNamesMap = useMemo(() => new Map(allGoals.map((g) => [g.id, g.name])), [allGoals]);
  const projectNamesMap = useMemo(() => new Map(allProjects.map((p) => [p.id, p.name])), [allProjects]);
  const taskNamesMap = useMemo(() => new Map(allTasks.map((t) => [t.id, t.name])), [allTasks]);
  const getProjectAreaNames = useCallback(
    (project: Project) =>
      getProjectLinkedAreaIds(project)
        .map((id) => areaNames.get(id))
        .filter((name): name is string => Boolean(name)),
    [areaNames],
  );
  const getProjectAreaIcons = useCallback(
    (project: Project) =>
      getProjectLinkedAreaIds(project).map((id) => areaIcons.get(id) ?? null),
    [areaIcons],
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

  // Project rollup counts and progress are hydrated server-side by
  // projectService (hydrateProjectRollupCounts + hydrateProjectProgress) so
  // each ProjectCard renders the same numbers across every surface.

  const linkedContactIds = useMemo(
    () => new Set(goalContactLinks.map((link) => link.contact_id)),
    [goalContactLinks],
  );
  const linkedContacts = useMemo(
    () => allContacts.filter((c) => linkedContactIds.has(c.id)),
    [allContacts, linkedContactIds],
  );
  const contactTabs = useMemo(
    () => [
      { value: "all", label: "All", count: linkedContacts.length },
      { value: "favorite", label: "Favorite", count: linkedContacts.filter((c) => c.favorite).length },
      { value: "follow_up", label: "Follow-up", count: linkedContacts.filter((c) => !!c.follow_up_interval_days).length },
      { value: "by_group", label: "By Group", count: linkedContacts.filter((c) => !!c.group).length },
      { value: "by_project", label: "By Project", count: linkedContacts.filter((c) => (c.linkedProjectIds?.length ?? 0) > 0).length },
      { value: "by_area", label: "By Area", count: linkedContacts.filter((c) => (c.linkedAreaIds?.length ?? 0) > 0).length },
      { value: "archived", label: "Archive", count: linkedContacts.filter((c) => c.archive).length },
    ],
    [linkedContacts],
  );
  const filteredContacts = useMemo(() => {
    switch (contactTab) {
      case "favorite":
        return linkedContacts.filter((c) => c.favorite);
      case "follow_up":
        return linkedContacts.filter((c) => !!c.follow_up_interval_days);
      case "by_group":
        return linkedContacts.filter((c) => !!c.group);
      case "by_project":
        return linkedContacts.filter((c) => (c.linkedProjectIds?.length ?? 0) > 0);
      case "by_area":
        return linkedContacts.filter((c) => (c.linkedAreaIds?.length ?? 0) > 0);
      case "archived":
        return linkedContacts.filter((c) => c.archive);
      default:
        return linkedContacts;
    }
  }, [contactTab, linkedContacts]);

  // Sync page title with goal name
  useEffect(() => {
    if (goal) {
      setPageTitle(goal.name);
    }
    return () => setPageTitle("");
  }, [goal, setPageTitle]);

  // Compute goal progress client-side so it stays in sync with the project cards
  // on this page. Both use the same goalData.tasks/notes/resources as their source,
  // which eliminates the mismatch caused by the DB trigger that only counts tasks
  // when updating project.progress.
  // Goal cards everywhere render `goal.progress` (the value computed by
  // goalService.list/getByIdentifier via hydrateGoalProgress + calculateGoalProgress).
  // Use the same server-hydrated value here so the title progress, the goals
  // list cards, the area-detail goal cards, the project-detail goal cards, and
  // the contact-detail goal cards never disagree on the same goal.
  const goalProgressPercent = goal?.progress ?? 0;

  // Static note tabs — no dynamic type tabs on goal detail
  const noteTabs = [
    { value: "all", label: "All" },
    { value: "inbox", label: "Inbox" },
    { value: "to_review", label: "To Review" },
    { value: "active", label: "Active" },
    { value: "saved", label: "Saved" },
    { value: "archived", label: "Archive" },
  ];

  // Filter notes by tab
  const filteredNotes = useMemo(() => {
    const notes = goalData?.notes ?? [];
    if (noteTab === "archived") return notes.filter((n) => n.is_archived);
    const activeNotes = notes.filter((n) => !n.is_archived);
    switch (noteTab) {
      case "inbox":
        return activeNotes.filter((n) => n.status === NOTE_STATUS.INBOX);
      case "to_review":
        return activeNotes.filter((n) => n.status === NOTE_STATUS.TO_REVIEW);
      case "active":
        return activeNotes.filter((n) => n.status === NOTE_STATUS.ACTIVE);
      case "saved":
        return activeNotes.filter((n) => n.status === NOTE_STATUS.SAVED);
      default:
        return activeNotes;
    }
  }, [goalData?.notes, noteTab]);

  // Static resource tabs — no dynamic type tabs on goal detail
  const resourceTabs = [
    { value: "all", label: "All" },
    { value: "inbox", label: "Inbox" },
    { value: "to_review", label: "To Review" },
    { value: "active", label: "Active" },
    { value: "saved", label: "Saved" },
    { value: "archived", label: "Archive" },
  ];

  // Filter resources by tab
  const filteredResources = useMemo(() => {
    const resources = goalData?.resources ?? [];
    switch (resourceTab) {
      case "inbox":
        return resources.filter((r) => r.status === RESOURCE_STATUS.INBOX);
      case "to_review":
        return resources.filter((r) => r.status === RESOURCE_STATUS.TO_REVIEW);
      case "active":
        return resources.filter((r) => r.status === RESOURCE_STATUS.ACTIVE);
      case "saved":
        return resources.filter((r) => r.status === RESOURCE_STATUS.SAVED);
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
      value: "planning",
      label: "Planning",
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
    { value: "archived", label: "Archive", count: goalData?.projects.filter((p) => p.is_archived).length },
  ];

  const filteredProjects = useMemo(() => {
    const projects = goalData?.projects ?? [];
    switch (projectTab) {
      case "planning":
        return projects.filter((p) => p.status === "planning" && !p.is_archived);
      case "in_progress":
        return projects.filter((p) => p.status === "active" && !p.is_archived);
      case "completed":
        return projects.filter((p) => p.status === "completed" && !p.is_archived);
      case "archived":
        return projects.filter((p) => p.is_archived);
      default:
        return projects.filter((p) => !p.is_archived);
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

  const handleTaskEdit = useCallback((task: Task) => {
    setEditingTask(task);
  }, []);

  const handleResourceEdit = useCallback((resource: Resource) => {
    setEditingResource(resource);
  }, []);

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

  const handleUnlinkContact = useCallback(async (contactId: string) => {
    if (!goal) {
      return;
    }

    await unlinkContactFromGoal.mutateAsync({ contactId, goalId: goal.id });
  }, [goal, unlinkContactFromGoal]);

  const handleContactEdit = useCallback((contact: Contact) => {
    setEditingContact(contact);
  }, []);

  const handleContactDelete = useCallback(async (id: string) => {
    await deleteContact.mutateAsync(id);
  }, [deleteContact]);

  const handleContactToggleFavorite = useCallback(async (id: string) => {
    await toggleContactFavorite.mutateAsync(id);
  }, [toggleContactFavorite]);

  const handleContactArchive = useCallback(async (id: string, archive: boolean) => {
    await archiveContact.mutateAsync({ id, archive });
  }, [archiveContact]);

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
      if (!goal) {
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
          onSuccess: (createdContact: Contact) => {
            linkContactToGoal.mutate({ contactId: createdContact.id, goalId: goal.id });
          },
        },
      );
    },
    [createContact, goal, linkContactToGoal],
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
        <span className="text-foreground">Goals</span>
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
                  strokeDasharray={32 * 2 * Math.PI}
                  strokeDashoffset={32 * 2 * Math.PI * (1 - goalProgressPercent / 100)}
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
                {getGoalLinkedAreaIds(goal).map((areaId) => {
                  const area = areas.find((a) => a.id === areaId);
                  if (!area) return null;
                  return (
                    <Badge key={areaId} variant="outline" className="text-xs">
                      {area.icon ? `${area.icon} ` : ""}{area.name}
                    </Badge>
                  );
                })}
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
              {goal?.projectCount ?? 0}
            </span>
            <span className="text-muted-foreground">Projects</span>
          </button>
          <button
            onClick={() => scrollToSection("tasks")}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-green-600 dark:text-green-400">
              {goal?.taskCount ?? 0}
            </span>
            <span className="text-muted-foreground">Tasks</span>
          </button>
          <button
            onClick={() => scrollToSection("notes")}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-purple-600 dark:text-purple-400">
              {goal?.noteCount ?? 0}
            </span>
            <span className="text-muted-foreground">Notes</span>
          </button>
          <button
            onClick={() => scrollToSection("resources")}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-orange-600 dark:text-orange-400">
              {goal?.resourceCount ?? 0}
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
                <Button size="sm" onClick={() => setIsEditOpen(true)} className="gap-1.5">
                  <Edit className="size-3.5" />
                  Edit Goal
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsLinkAreaOpen(true)}
                  className="gap-1.5"
                >
                  <LinkIcon className="size-3.5" />
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


            </div>
          </>
        )}
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
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  areaName={project.area_id ? areaNames.get(project.area_id) : undefined}
                  areaNames={getProjectAreaNames(project)}
                  areaIcons={getProjectAreaIcons(project)}
                  returnTo={currentPagePathWithSlug}
                />
              ))}
            </div>
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
                                linkedAreaNames={task.area_id && areaNames.get(task.area_id) ? [areaNames.get(task.area_id)!] : []}
                                linkedAreaIcons={task.area_id ? [areaIcons.get(task.area_id) ?? null] : []}
                                projectName={null}
                                onCompletionToggle={handleTaskCompletion}
                                onFocusToggle={handleTaskFocus}
                                onNameSave={handleTaskNameSave}
                                onDelete={handleTaskDelete}
                                onEdit={handleTaskEdit}
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
                      linkedAreaNames={task.area_id && areaNames.get(task.area_id) ? [areaNames.get(task.area_id)!] : []}
                      linkedAreaIcons={task.area_id ? [areaIcons.get(task.area_id) ?? null] : []}
                      projectName={
                        task.project_id
                          ? allProjects.find((p) => p.id === task.project_id)?.name ?? null
                          : null
                      }
                      onCompletionToggle={handleTaskCompletion}
                      onFocusToggle={handleTaskFocus}
                      onNameSave={handleTaskNameSave}
                      onDelete={handleTaskDelete}
                      onEdit={handleTaskEdit}
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
          tabs={noteTabs}
          activeTab={noteTab}
          onTabChange={setNoteTab}
          isLoading={isLoading}
          emptyTitle="No notes linked to this goal"
          emptyDescription="Create a note to capture thoughts that contribute to this goal."
          onCreateNew={() => {
            const params = new URLSearchParams();
            params.set("returnTo", encodeReturnTo(goalNestedReturnTo));
            if (linkedAreaIds[0]) {
              params.set("areaId", linkedAreaIds[0]);
            }
            params.set("goalId", goal.id);
            router.push(`/notes/new?${params.toString()}`);
          }}
          createLabel="New Note"
        >
          {filteredNotes.length > 0 ? (
            <div className="rounded-lg border bg-card">
              {filteredNotes.map((note) => {
                const noteAreas = (note.linkedAreaIds ?? (note.area_id ? [note.area_id] : []))
                  .map((id) => { const name = areaNames.get(id); return name ? { name, icon: areaIcons.get(id) ?? null } : null; })
                  .filter((a): a is { name: string; icon: string | null } => Boolean(a));
                const noteGoalNames = (note.linkedGoalIds ?? []).map((id) => goalNamesMap.get(id)).filter((n): n is string => Boolean(n));
                const noteProjectNames = (note.linkedProjectIds ?? []).map((id) => projectNamesMap.get(id)).filter((n): n is string => Boolean(n));
                const noteTaskNames = (note.linkedTaskIds ?? []).map((id) => taskNamesMap.get(id)).filter((n): n is string => Boolean(n));
                return (
                  <NoteRow
                    key={note.id}
                    note={note}
                    returnTo={goalNestedReturnTo}
                    areas={noteAreas}
                    goalNames={noteGoalNames}
                    projectNames={noteProjectNames}
                    taskNames={noteTaskNames}
                    onPinToggle={(id, pin) => togglePinNote.mutate({ id, pin })}
                    onFavoriteToggle={(id, favorite) => toggleFavoriteNote.mutate({ id, favorite })}
                    onArchive={(id) => archiveNote.mutate(id)}
                    onRestore={(id) => restoreNote.mutate(id)}
                    onDelete={(id) => deleteNote.mutate(id)}
                  />
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
          tabs={resourceTabs}
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
              {filteredResources.map((resource) => {
                const resourceAreaIds = (resource.linkedAreaIds && resource.linkedAreaIds.length > 0)
                  ? resource.linkedAreaIds
                  : (resource.area_id ? [resource.area_id] : []);
                const resourceAreas = resourceAreaIds
                  .map((id) => ({ name: areaNames.get(id), icon: areaIcons.get(id) ?? null }))
                  .filter((e): e is { name: string; icon: string | null } => Boolean(e.name));
                const resourceGoalNames = (resource.linkedGoalIds ?? [])
                  .map((id) => goalNamesMap.get(id))
                  .filter((name): name is string => Boolean(name));
                const resourceProjectNames = resource.project_id
                  ? [projectNamesMap.get(resource.project_id)].filter((n): n is string => Boolean(n))
                  : [];
                const resourceTaskNames = (resource.linkedTaskIds ?? [])
                  .map((id) => taskNamesMap.get(id))
                  .filter((name): name is string => Boolean(name));
                return (
                  <ResourceRow
                    key={resource.id}
                    resource={resource}
                    areas={resourceAreas}
                    goalNames={resourceGoalNames}
                    projectNames={resourceProjectNames}
                    taskNames={resourceTaskNames}
                    onToggleFavorite={handleResourceToggleFavorite}
                    onArchive={(id) => archiveResource.mutate(id)}
                    onUnarchive={(id) => unarchiveResource.mutate(id)}
                    onDelete={() => {}}
                    onEdit={handleResourceEdit}
                  />
                );
              })}
            </div>
          ) : null}
        </GoalDetailSection>
      </div>

      {/* People Section */}
      <div ref={peopleRef}>
        <GoalDetailSection
          id="people"
          entityType="people"
          tabs={contactTabs}
          activeTab={contactTab}
          onTabChange={setContactTab}
          isLoading={isLoading}
          emptyTitle="No people linked to this goal"
          emptyDescription="Add people to track relationships that contribute to this goal."
          onCreateNew={() => setIsNewContactOpen(true)}
          createLabel="New Contact"
        >
          {filteredContacts.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredContacts.map((contact) => (
                <div key={contact.id} className="relative">
                  <ContactCard
                    contact={contact}
                    onEdit={handleContactEdit}
                    onDelete={handleContactDelete}
                    onToggleFavorite={handleContactToggleFavorite}
                    onArchive={handleContactArchive}
                    returnTo={buildReturnTo(`/goals/${goalId}`)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-2 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUnlinkContact(contact.id);
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

      {/* Inline Project Creation */}
      <ProjectDialog
        open={isNewProjectOpen}
        onOpenChange={setIsNewProjectOpen}
        goalId={goal.id}
        defaultAreaIds={goal.area_id ? [goal.area_id] : []}
        onSuccess={() => setIsNewProjectOpen(false)}
      />

      {/* Inline Task Creation */}
      <TaskDialog
        open={isNewTaskOpen}
        onOpenChange={setIsNewTaskOpen}
        defaultGoalId={goal.id}
        defaultAreaId={goal.area_id ?? undefined}
        allowedProjectIds={allowedProjectIds}
        onSuccess={() => setIsNewTaskOpen(false)}
      />

      {/* Task Edit Dialog */}
      <TaskDialog
        open={!!editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
        task={editingTask}
        defaultGoalId={goal.id}
        defaultAreaId={goal.area_id ?? undefined}
        allowedProjectIds={allowedProjectIds}
        onSuccess={() => setEditingTask(null)}
        onDelete={handleTaskDelete}
      />

      {/* Inline Resource Creation */}
      <ResourceDialog
        open={isNewResourceOpen}
        onOpenChange={setIsNewResourceOpen}
        initialGoalIds={[goal.id]}
        initialAreaIds={goal.area_id ? [goal.area_id] : []}
        onSubmit={async (input) => {
          await createResource.mutateAsync(input as CreateResourceInput);
          setIsNewResourceOpen(false);
        }}
        isPending={createResource.isPending}
      />

      {/* Resource Edit Dialog */}
      <ResourceDialog
        open={!!editingResource}
        onOpenChange={(open) => !open && setEditingResource(null)}
        resource={editingResource}
        onSubmit={async (input) => {
          if (editingResource) {
            await updateResource.mutateAsync({ id: editingResource.id, input });
          }
          setEditingResource(null);
        }}
        isPending={updateResource.isPending}
      />

      {/* Inline Contact Creation */}
      <ContactDialog
        open={isNewContactOpen}
        onOpenChange={setIsNewContactOpen}
        contact={null}
        defaults={{ goal_ids: goal?.id ? [goal.id] : [] }}
        onSubmit={handleCreateContactSubmit}
      />

      {/* Contact Edit Dialog */}
      <ContactDialog
        open={!!editingContact}
        onOpenChange={(open) => { if (!open) setEditingContact(null); }}
        contact={editingContact}
        onSubmit={(values) => {
          if (!editingContact) return;
          updateContact.mutate({
            id: editingContact.id,
            input: {
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
          });
        }}
      />
    </div>
  );
}

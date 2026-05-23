"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronDownIcon,
  ChevronRightIcon,
  Edit,
  Target,
  Trash2,
  Unlink,
} from "lucide-react";

import { ContactCard } from "@/components/entities/contact-card";
import { ContactDialog } from "@/components/entities/contact-dialog";
import { GoalDetailSection } from "@/components/entities/goal-detail-section";
import { GoalCard } from "@/components/entities/goal-card";
import { GoalDialog } from "@/components/entities/goal-dialog";
import { ProjectCard } from "@/components/entities/project-card";
import { ProjectDialog } from "@/components/entities/project-dialog";
import { ResourceDialog } from "@/components/entities/resource-dialog";
import { ResourceRow } from "@/components/entities/resource-row";
import { TaskDialog } from "@/components/entities/task-dialog";
import { TaskListItem } from "@/components/entities/task-list-item";
import { EmptyState } from "@/components/views/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import {
  useContacts,
  useContactByArea,
  useCreateContact,
  useLinkContactToArea,
  useUnlinkContactFromArea,
  useToggleContactFavorite,
  useArchiveContact,
  useDeleteContact,
  useUpdateContact,
} from "@/lib/hooks/use-contacts";
import { useAreaDetail, AREA_DETAIL_QUERY_KEY } from "@/lib/hooks/use-area-detail";
import { useAreas, useArchiveArea, useRestoreArea, useUpdateArea } from "@/lib/hooks/use-areas";
import {
  useCompleteTaskWithGoalRefresh,
  useDeleteTask,
  useFocusTask,
  useUpdateTask,
} from "@/lib/hooks/use-tasks";
import {
  useArchiveResource,
  useCreateResource,
  useToggleFavoriteResource,
  useUnarchiveResource,
  useUpdateResource,
} from "@/lib/hooks/use-resources";
import { useQueryClient } from "@tanstack/react-query";
import { type Contact, type CreateResourceInput, type Resource, type Task } from "@/lib/types/domain.types";
import { NOTE_STATUS, RESOURCE_STATUS } from "@/lib/utils/constants";
import { useUIStore } from "@/lib/stores/ui.store";
import { cn } from "@/lib/utils";
import { normalizeAreaType, classifyAreaStatus, type AreaStatus } from "@/lib/utils/areas";
import { buildGoalDetailHref } from "@/lib/utils/goal-urls";
import { buildReturnTo, encodeReturnTo, getReturnToFromSearchParams, resolveBackNavigation } from "@/lib/utils/return-to";
import { getTaskLinkedAreaIds, getTaskLinkedGoalIds } from "@/lib/utils/tasks";

const NOTE_STATUS_COLORS: Record<string, string> = {
  [NOTE_STATUS.INBOX]: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  [NOTE_STATUS.TO_REVIEW]: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  [NOTE_STATUS.ACTIVE]: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  [NOTE_STATUS.SAVED]: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  [NOTE_STATUS.ARCHIVE]: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const AREA_TYPE_COLORS: Record<string, string> = {
  Business: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  Personal: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  Studies: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
};

const STATUS_LABELS: Record<AreaStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  archived: "Archived",
};

export function AreaDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const userId = user?.id;
  const areaIdentifier = params.id as string;
  const { setPageTitle } = useUIStore();
  const areaReturnTo = getReturnToFromSearchParams(searchParams);
  const backTarget = resolveBackNavigation(areaReturnTo, "/areas");

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [goalTab, setGoalTab] = useState("active");
  const [projectTab, setProjectTab] = useState("all");
  const [taskTab, setTaskTab] = useState("all");
  const [noteTab, setNoteTab] = useState("all");
  const [resourceTab, setResourceTab] = useState("all");
  const [contactTab, setContactTab] = useState("all");
  const [isNewContactOpen, setIsNewContactOpen] = useState(false);
  const [isEditContactOpen, setIsEditContactOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isNewResourceOpen, setIsNewResourceOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [isNewGoalOpen, setIsNewGoalOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isTaskEditOpen, setIsTaskEditOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const projectsRef = useRef<HTMLDivElement>(null);
  const tasksRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);
  const resourcesRef = useRef<HTMLDivElement>(null);
  const peopleRef = useRef<HTMLDivElement>(null);

  const { data: areaData, isLoading, refetch: refetchAreaDetail } = useAreaDetail(areaIdentifier);
  const { data: allAreasList = [] } = useAreas();
  const { data: allContacts = [] } = useContacts();
  const { data: archivedContactsAll = [] } = useContacts({ archive: true });
  const queryClient = useQueryClient();

  const archiveArea = useArchiveArea(userId);
  const restoreArea = useRestoreArea(userId);
  const updateArea = useUpdateArea(userId);
  const completeTask = useCompleteTaskWithGoalRefresh();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const focusTask = useFocusTask();
  const linkContactToArea = useLinkContactToArea();
  const unlinkContactFromArea = useUnlinkContactFromArea();
  const createContact = useCreateContact();
  const createResource = useCreateResource();
  const updateResource = useUpdateResource();
  const archiveResource = useArchiveResource();
  const unarchiveResource = useUnarchiveResource();
  const toggleFavoriteResource = useToggleFavoriteResource();
  const toggleContactFavorite = useToggleContactFavorite();
  const archiveContact = useArchiveContact();
  const deleteContact = useDeleteContact();
  const updateContact = useUpdateContact();

  const area = areaData?.area;

  const areaNamesById = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of allAreasList) {
      if (a.name) map.set(a.id, a.name);
    }
    if (area?.name) map.set(area.id, area.name);
    return map;
  }, [allAreasList, area]);

  const areaIconsById = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const a of allAreasList) {
      map.set(a.id, a.icon ?? null);
    }
    if (area) map.set(area.id, area.icon ?? null);
    return map;
  }, [allAreasList, area]);

  const allGoalsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of areaData?.allGoals ?? []) {
      if (g?.name) map.set(g.id, g.name);
    }
    return map;
  }, [areaData?.allGoals]);

  const projectsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of areaData?.projects ?? []) {
      if (p?.name) map.set(p.id, p.name);
    }
    return map;
  }, [areaData?.projects]);

  const { data: areaContactLinks = [] } = useContactByArea(area?.id ?? "");
  const rollups = areaData?.rollups ?? { goalCount: 0, projectCount: 0, taskCount: 0, noteCount: 0, resourceCount: 0 };
  const linkedResources = useMemo(() => areaData?.resources ?? [], [areaData?.resources]);

  // Use the FULL set of tasks/notes/resources (not just area-scoped) so that a
  // project's completion progress reflects every item belonging to the project,
  // Project rollup counts and progress are now hydrated server-side by
  // projectService (hydrateProjectRollupCounts + hydrateProjectProgress) so
  // the project card on every surface reads the same numbers off project.*
  // directly. The only goal rollups still needed are for goal cards rendered
  // here.

  const goalRollups = useMemo(() => {
    const result = new Map<string, { projectCount: number; taskCount: number; noteCount: number; resourceCount: number }>();
    for (const goal of areaData?.goals ?? []) {
      result.set(goal.id, {
        projectCount: goal.projectCount ?? 0,
        taskCount: goal.taskCount ?? 0,
        noteCount: goal.noteCount ?? 0,
        resourceCount: goal.resourceCount ?? 0,
      });
    }
    return result;
  }, [areaData?.goals]);

  const areaStatus = area ? classifyAreaStatus(area) : "active";
  const areaType = area ? normalizeAreaType(area.type) : "Personal";

  useEffect(() => {
    if (area) {
      setPageTitle(area.name);
    }
    return () => setPageTitle("");
  }, [area, setPageTitle]);

  const filteredGoals = useMemo(() => {
    const goals = areaData?.goals;
    if (!goals) return [];
    const termMap: Record<string, string | undefined> = { short: "short", mid: "mid", long: "long" };
    const term = termMap[goalTab];
    // A goal is "Inactive" when it's still active (not archived/completed) but
    // has no linked items at all. We surface those only under the explicit
    // Inactive tab — they should NOT be hidden from Active/term tabs, otherwise
    // a freshly linked goal disappears from the area detail page until items
    // are linked to it.
    const isAutoInactive = (g: typeof goals[number]) =>
      !g.is_archived && !g.is_completed &&
      (g.projectCount ?? 0) === 0 && (g.taskCount ?? 0) === 0 &&
      (g.noteCount ?? 0) === 0 && (g.resourceCount ?? 0) === 0;
    return goals.filter((g) => {
      if (goalTab === "archived") return g.is_archived;
      if (g.is_archived) return false;
      if (goalTab === "inactive") return isAutoInactive(g);
      if (g.is_completed) return goalTab === "completed";
      if (goalTab === "completed") return false;
      if (term && g.term !== term) return false;
      return true;
    });
  }, [areaData?.goals, goalTab]);

  const filteredProjects = useMemo(() => {
    const projects = areaData?.projects;
    if (!projects) return [];
    if (projectTab === "all") return projects.filter((p) => !p.is_archived);
    if (projectTab === "inbox") return projects.filter((p) => p.status === "planning" && !p.is_archived);
    if (projectTab === "planning") return projects.filter((p) => p.status === "planning" && !p.is_archived);
    if (projectTab === "active") return projects.filter((p) => p.status === "active" && !p.is_archived);
    if (projectTab === "completed") return projects.filter((p) => p.status === "completed" && !p.is_archived);
    if (projectTab === "archived") return projects.filter((p) => p.is_archived);
    return projects;
  }, [areaData?.projects, projectTab]);

  const filteredTasks = useMemo(() => {
    const tasks = areaData?.tasks;
    if (!tasks) return [];
    if (taskTab === "archived") return areaData?.archivedTasks ?? [];
    // All non-archived tabs explicitly exclude archived tasks for safety,
    // even though `tasks` already excludes them.
    const nonArchived = tasks.filter((t) => !t.is_archived);
    if (taskTab === "all") return nonArchived;
    if (taskTab === "inbox") return nonArchived.filter((t) => t.status === "inbox" && !t.is_completed);
    if (taskTab === "upcoming")
      return nonArchived.filter((t) => t.status !== "inbox" && t.status !== "completed" && !t.is_completed);
    if (taskTab === "overdue")
      return nonArchived.filter((t) => {
        if (!t.due_date || t.is_completed) return false;
        return new Date(t.due_date) < new Date();
      });
    if (taskTab === "by_goal") return nonArchived.filter((t) => t.linkedGoalIds && t.linkedGoalIds.length > 0);
    if (taskTab === "by_project") return nonArchived.filter((t) => !!t.project_id);
    if (taskTab === "completed") return nonArchived.filter((t) => t.is_completed);
    return nonArchived;
  }, [areaData?.tasks, areaData?.archivedTasks, taskTab]);

  const filteredNotes = useMemo(() => {
    const notes = areaData?.notes;
    if (!notes) return [];
    if (noteTab === "archived") return notes.filter((n) => n.is_archived);
    const nonArchived = notes.filter((n) => !n.is_archived);
    if (noteTab === "all") return nonArchived;
    if (noteTab === "inbox") return nonArchived.filter((n) => n.status === "inbox");
    if (noteTab === "to_review") return nonArchived.filter((n) => n.status === "to_review");
    if (noteTab === "active") return nonArchived.filter((n) => n.status === "active");
    if (noteTab === "saved") return nonArchived.filter((n) => n.status === "saved");
    return nonArchived;
  }, [areaData?.notes, noteTab]);

  const filteredResources = useMemo(() => {
    if (resourceTab === "archived") return linkedResources.filter((r) => r.is_archived);
    const nonArchived = linkedResources.filter((r) => !r.is_archived);
    if (resourceTab === "all") return nonArchived;
    if (resourceTab === "inbox") return nonArchived.filter((r) => r.status === RESOURCE_STATUS.INBOX);
    if (resourceTab === "to_review") return nonArchived.filter((r) => r.status === RESOURCE_STATUS.TO_REVIEW);
    if (resourceTab === "active") return nonArchived.filter((r) => r.status === RESOURCE_STATUS.ACTIVE);
    if (resourceTab === "saved") return nonArchived.filter((r) => r.status === RESOURCE_STATUS.SAVED);
    return nonArchived;
  }, [linkedResources, resourceTab]);

  const linkedContactIds = useMemo(
    () => new Set(areaContactLinks.map((link) => link.contact_id)),
    [areaContactLinks],
  );
  const linkedContacts = useMemo(
    () => allContacts.filter((c) => linkedContactIds.has(c.id)),
    [allContacts, linkedContactIds],
  );
  const linkedArchivedContacts = useMemo(
    () => archivedContactsAll.filter((c) => linkedContactIds.has(c.id)),
    [archivedContactsAll, linkedContactIds],
  );
  const allLinkedContacts = useMemo(
    () => [...linkedContacts, ...linkedArchivedContacts],
    [linkedContacts, linkedArchivedContacts],
  );
  const activeLinkedContacts = useMemo(
    () => allLinkedContacts.filter((c) => !c.archive),
    [allLinkedContacts],
  );
  const contactTabs = useMemo(
    () => [
      { value: "all", label: "All", count: activeLinkedContacts.length },
      { value: "favorite", label: "Favorite", count: activeLinkedContacts.filter((c) => c.favorite).length },
      { value: "follow_up", label: "Follow-up", count: activeLinkedContacts.filter((c) => !!c.follow_up_interval_days).length },
      { value: "by_group", label: "By Group", count: activeLinkedContacts.filter((c) => !!c.group).length },
      { value: "by_project", label: "By Project", count: activeLinkedContacts.filter((c) => (c.linkedProjectIds?.length ?? 0) > 0).length },
      { value: "by_area", label: "By Area", count: activeLinkedContacts.filter((c) => (c.linkedAreaIds?.length ?? 0) > 0).length },
      { value: "archived", label: "Archive", count: linkedArchivedContacts.length },
    ],
    [activeLinkedContacts, linkedArchivedContacts],
  );
  const filteredContacts = useMemo(() => {
    switch (contactTab) {
      case "favorite":
        return activeLinkedContacts.filter((c) => c.favorite);
      case "follow_up":
        return activeLinkedContacts.filter((c) => !!c.follow_up_interval_days);
      case "by_group":
        return activeLinkedContacts.filter((c) => !!c.group);
      case "by_project":
        return activeLinkedContacts.filter((c) => (c.linkedProjectIds?.length ?? 0) > 0);
      case "by_area":
        return activeLinkedContacts.filter((c) => (c.linkedAreaIds?.length ?? 0) > 0);
      case "archived":
        return linkedArchivedContacts;
      default:
        return activeLinkedContacts;
    }
  }, [contactTab, activeLinkedContacts, linkedArchivedContacts]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handleArchiveToggle = async (checked: boolean) => {
    if (!area || checked === area.archive) return;
    if (checked) {
      await archiveArea.mutateAsync(area.id);
      router.push(backTarget);
    } else {
      await restoreArea.mutateAsync(area.id);
    }
  };

  const handleInactiveToggle = async (checked: boolean) => {
    if (!area || checked === area.inactive) return;
    await updateArea.mutateAsync({ id: area.id, inactive: checked });
  };

  const handleDeleteArea = async () => {
    if (!area) return;
    await archiveArea.mutateAsync(area.id);
    router.push(backTarget);
  };

  const handleTaskCompletion = async (taskId: string, completed: boolean) => {
    if (completed) {
      await completeTask.mutateAsync(taskId);
    } else {
      await updateTask.mutateAsync({
        id: taskId,
        input: { is_completed: false, completed_at: null },
      });
    }
  };

  const handleTaskNameSave = async (taskId: string, name: string) => {
    await updateTask.mutateAsync({ id: taskId, input: { name } });
  };

  const handleTaskDelete = async (taskId: string) => {
    await deleteTask.mutateAsync(taskId);
  };

  const handleTaskFocus = async (taskId: string, focused: boolean) => {
    // Optimistically patch this area-detail query cache for instant UI update.
    // The useFocusTask hook also patches AREA_DETAIL_QUERY_KEY caches globally,
    // but we patch the keyed entry too as a guard against stale cache.
    queryClient.setQueryData([AREA_DETAIL_QUERY_KEY, areaIdentifier], (old: unknown) => {
      if (!old || typeof old !== "object") return old;
      const data = old as { tasks?: Task[]; archivedTasks?: Task[] };
      const patchTask = (t: Task) => (t.id === taskId ? { ...t, is_focused: focused } : t);
      return {
        ...data,
        tasks: data.tasks ? data.tasks.map(patchTask) : data.tasks,
        archivedTasks: data.archivedTasks ? data.archivedTasks.map(patchTask) : data.archivedTasks,
      };
    });
    await focusTask.mutateAsync({ id: taskId, is_focused: focused });
  };

  const handleUnlinkContact = async (contactId: string) => {
    await unlinkContactFromArea.mutateAsync({ contactId, areaId: area!.id });
  };

  const handleCreateContactSubmit = (values: {
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
          linkContactToArea.mutate({ contactId: createdContact.id, areaId: area!.id });
        },
      },
    );
  };

  const handleContactEdit = (contact: Contact) => {
    setEditingContact(contact);
    setIsEditContactOpen(true);
  };

  const handleContactDelete = (contactId: string) => {
    deleteContact.mutate(contactId);
  };

  const handleContactToggleFavorite = (contactId: string) => {
    toggleContactFavorite.mutate(contactId);
  };

  const handleContactArchive = (contactId: string, archive: boolean) => {
    archiveContact.mutate({ id: contactId, archive });
  };

  const handleEditContactSubmit = (values: {
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
    if (!editingContact) return;
    updateContact.mutate(
      {
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
      },
      {
        onSuccess: () => {
          setIsEditContactOpen(false);
          setEditingContact(null);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
    );
  }

  if (!area) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
        <Button variant="ghost" onClick={() => router.push(backTarget)}>
          <ArrowLeft className="mr-2 size-4" />
          Back to Areas
        </Button>
        <EmptyState
          icon={Target}
          title="Area not found"
          description="This area may have been deleted or you do not have access to it."
          actionLabel="Return to Areas"
          onAction={() => router.push(backTarget)}
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
          onClick={() => router.push(backTarget)}
        >
          <ArrowLeft className="size-3.5" />
        </Button>
        <span>/</span>
        <span className="text-foreground">Areas</span>
        <span>/</span>
        <span className="text-foreground">{area.name}</span>
      </div>

      {/* Properties Header */}
      <div className="rounded-xl border bg-card">
        <div className="flex items-start justify-between gap-4 p-6">
          <div className="flex items-start gap-4">
            {/* Area Icon */}
            {area.icon ? (
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl shrink-0"
                style={{ backgroundColor: area.color ? `${area.color}20` : "var(--muted)" }}
              >
                {area.icon}
              </div>
            ) : (
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl shrink-0 font-bold"
                style={{
                  backgroundColor: area.color ? `${area.color}20` : "var(--muted)",
                  color: area.color || "var(--foreground)",
                }}
              >
                {area.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="space-y-2">
              {/* Title */}
              <h1 className="text-3xl font-bold tracking-tight">{area.name}</h1>

              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className={cn("text-xs", AREA_TYPE_COLORS[areaType])}>
                  {areaType}
                </Badge>
                {area.inactive && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    Inactive
                  </Badge>
                )}
                {area.archive && (
                  <Badge variant="outline" className="text-xs">
                    Archived
                  </Badge>
                )}
              </div>

              {/* Description */}
              {area.description && (
                <p className="text-sm text-muted-foreground">{area.description}</p>
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

        {/* Activity Rollups */}
        <div className="flex flex-wrap items-center gap-4 px-6 pb-4">
          <button
            onClick={() => scrollToSection("goals")}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-blue-600 dark:text-blue-400">
              {rollups.goalCount}
            </span>
            <span className="text-muted-foreground">Goals</span>
          </button>
          <button
            onClick={() => scrollToSection("projects")}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-green-600 dark:text-green-400">
              {rollups.projectCount}
            </span>
            <span className="text-muted-foreground">Projects</span>
          </button>
          <button
            onClick={() => scrollToSection("tasks")}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-purple-600 dark:text-purple-400">
              {rollups.taskCount}
            </span>
            <span className="text-muted-foreground">Tasks</span>
          </button>
          <button
            onClick={() => scrollToSection("notes")}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-orange-600 dark:text-orange-400">
              {rollups.noteCount}
            </span>
            <span className="text-muted-foreground">Notes</span>
          </button>
          <button
            onClick={() => scrollToSection("resources")}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-orange-600 dark:text-orange-400">
              {rollups.resourceCount}
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
                {/* Type */}
                <div>
                  <Label className="text-xs text-muted-foreground">Type</Label>
                  <p className="mt-1 font-medium">{areaType}</p>
                </div>
                {/* Status */}
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <p className="mt-1 font-medium">{STATUS_LABELS[areaStatus]}</p>
                </div>
                {/* Icon */}
                <div>
                  <Label className="text-xs text-muted-foreground">Icon</Label>
                  <p className="mt-1 font-medium">{area.icon || "None"}</p>
                </div>
                {/* Color */}
                <div>
                  <Label className="text-xs text-muted-foreground">Color</Label>
                  <div className="mt-1 flex items-center gap-2">
                    {area.color && (
                      <div
                        className="size-4 rounded-full border"
                        style={{ backgroundColor: area.color }}
                      />
                    )}
                    <span className="font-medium">{area.color || "None"}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/areas/${area.slug || area.id}/edit`)}
                  className="gap-1.5"
                >
                  <Edit className="size-3.5" />
                  Edit Area
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
                    id="area-inactive"
                    checked={area.inactive}
                    disabled={updateArea.isPending}
                    onCheckedChange={(checked) => handleInactiveToggle(checked === true)}
                  />
                  <Label htmlFor="area-inactive" className="cursor-pointer text-sm">
                    Inactive
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="area-archived"
                    checked={area.archive}
                    disabled={archiveArea.isPending}
                    onCheckedChange={(checked) => handleArchiveToggle(checked === true)}
                  />
                  <Label htmlFor="area-archived" className="cursor-pointer text-sm">
                    Archived
                  </Label>
                </div>
              </div>

              {area.description && (
                <div>
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <p className="mt-1 text-sm">{area.description}</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Linked Goals Section */}
      <div ref={projectsRef}>
        <GoalDetailSection
          id="goals"
          entityType="goals"
          tabs={[
            { value: "active", label: "Active" },
            { value: "short", label: "Short Term" },
            { value: "mid", label: "Mid Term" },
            { value: "long", label: "Long Term" },
            { value: "inactive", label: "Inactive" },
            { value: "completed", label: "Completed" },
            { value: "archived", label: "Archive" },
          ]}
          activeTab={goalTab}
          onTabChange={setGoalTab}
          isLoading={isLoading}
          emptyTitle="No goals linked to this area"
          emptyDescription="Create a goal to track objectives for this area."
          onCreateNew={() => setIsNewGoalOpen(true)}
          createLabel="New Goal"
        >
          {filteredGoals.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredGoals.map((goal) => {
                const goalReturnTo = buildReturnTo(`/areas/${area.slug ?? area.id}`);
                return (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    areaName={area.name}
                    areaNames={[area.name]}
                    areaIcons={[area.icon ?? null]}
                    onEdit={() => router.push(`${buildGoalDetailHref(goal)}?returnTo=${encodeReturnTo(goalReturnTo)}`)}
                    rollups={goalRollups.get(goal.id)}
                  />
                );
              })}
            </div>
          ) : null}
        </GoalDetailSection>
      </div>

      {/* Linked Projects Section */}
      <div ref={projectsRef}>
        <GoalDetailSection
          id="projects"
          entityType="projects"
          tabs={[
            { value: "all", label: "All", count: rollups.projectCount },
            { value: "inbox", label: "Inbox" },
            { value: "planning", label: "Planning" },
            { value: "active", label: "In Progress" },
            { value: "completed", label: "Completed" },
            { value: "archived", label: "Archive" },
          ]}
          activeTab={projectTab}
          onTabChange={setProjectTab}
          isLoading={isLoading}
          emptyTitle="No projects linked to this area"
          emptyDescription="Create a project to track work in this area."
          onCreateNew={() => setIsNewProjectOpen(true)}
          createLabel="New Project"
        >
          {filteredProjects.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredProjects.map((project) => {
                const projectReturnTo = buildReturnTo(`/areas/${area.slug ?? area.id}`);
                return (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    areaName={area.name}
                    areaNames={[area.name]}
                    areaIcons={[area.icon ?? null]}
                    returnTo={projectReturnTo}
                  />
                );
              })}
            </div>
          ) : null}
        </GoalDetailSection>
      </div>

      {/* Linked Tasks Section */}
      <div ref={tasksRef}>
        <GoalDetailSection
          id="tasks"
          entityType="tasks"
          tabs={[
            { value: "all", label: "All", count: rollups.taskCount },
            { value: "inbox", label: "Inbox" },
            { value: "upcoming", label: "Upcoming" },
            { value: "overdue", label: "Overdue" },
            { value: "by_goal", label: "By Goal" },
            { value: "by_project", label: "By Project" },
            { value: "completed", label: "Completed" },
            { value: "archived", label: "Archived" },
          ]}
          activeTab={taskTab}
          onTabChange={setTaskTab}
          isLoading={isLoading}
          emptyTitle="No tasks linked to this area"
          emptyDescription="Create a task to track work in this area."
          onCreateNew={() => setIsNewTaskOpen(true)}
          createLabel="New Task"
        >
          {filteredTasks.length > 0 ? (
            <div className="rounded-lg border bg-card">
              {filteredTasks.map((task) => {
                const taskAreaIds = getTaskLinkedAreaIds(task);
                // Build name + icon pairs together so indices stay aligned.
                // Filtering on name (only known areas) was previously done in
                // isolation, leaving icons misaligned with names.
                const taskAreaEntries = taskAreaIds
                  .map((id) => ({
                    name: areaNamesById.get(id),
                    icon: areaIconsById.get(id) ?? null,
                  }))
                  .filter(
                    (e): e is { name: string; icon: string | null } => Boolean(e.name),
                  );
                const taskLinkedAreaNames = taskAreaEntries.map((e) => e.name);
                const taskLinkedAreaIcons = taskAreaEntries.map((e) => e.icon);
                const taskGoalNames = getTaskLinkedGoalIds(task)
                  .map((id) => allGoalsById.get(id))
                  .filter((name): name is string => Boolean(name));
                const taskProjectName = task.project_id
                  ? projectsById.get(task.project_id) ?? null
                  : null;
                return (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    linkedAreaNames={taskLinkedAreaNames}
                    linkedAreaIcons={taskLinkedAreaIcons}
                    linkedGoalNames={taskGoalNames}
                    projectName={taskProjectName}
                    onCompletionToggle={handleTaskCompletion}
                    onFocusToggle={handleTaskFocus}
                    onNameSave={handleTaskNameSave}
                    onDelete={handleTaskDelete}
                    onEdit={(task) => {
                      setEditingTask(task);
                      setIsTaskEditOpen(true);
                    }}
                  />
                );
              })}
            </div>
          ) : null}
        </GoalDetailSection>
      </div>

      {/* Linked Notes Section */}
      <div ref={notesRef}>
        <GoalDetailSection
          id="notes"
          entityType="notes"
          tabs={[
            { value: "all", label: "All", count: rollups.noteCount },
            { value: "inbox", label: "Inbox" },
            { value: "to_review", label: "To Review" },
            { value: "active", label: "Active" },
            { value: "saved", label: "Saved" },
            { value: "archived", label: "Archive" },
          ]}
          activeTab={noteTab}
          onTabChange={setNoteTab}
          isLoading={isLoading}
          emptyTitle="No notes linked to this area"
          emptyDescription="Create a note to capture thoughts for this area."
          onCreateNew={() => area && router.push(`/notes/new?areaId=${area.id}&returnTo=${encodeReturnTo(buildReturnTo(`/areas/${area.slug ?? area.id}`))}`)}
          createLabel="New Note"
        >
          {filteredNotes.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredNotes.map((note) => {
                const noteReturnTo = buildReturnTo(`/areas/${area.slug ?? area.id}`);
                return (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => router.push(`/notes/${note.slug ?? note.id}?returnTo=${encodeReturnTo(noteReturnTo)}`)}
                    className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/30"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="truncate font-semibold">{note.name}</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge variant="secondary" className={cn("text-xs", NOTE_STATUS_COLORS[note.status])}>
                        {note.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {note.type}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </GoalDetailSection>
      </div>

      {/* Linked Resources Section */}
      <div ref={resourcesRef}>
        <GoalDetailSection
          id="resources"
          entityType="resources"
          tabs={[
            { value: "all", label: "All", count: rollups.resourceCount },
            { value: "inbox", label: "Inbox" },
            { value: "to_review", label: "To Review" },
            { value: "active", label: "Active" },
            { value: "saved", label: "Saved" },
            { value: "archived", label: "Archive" },
          ]}
          activeTab={resourceTab}
          onTabChange={setResourceTab}
          isLoading={isLoading}
          emptyTitle="No resources linked to this area"
          emptyDescription="Add resources to track external references for this area."
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
                  .map((id) => ({
                    name: areaNamesById.get(id),
                    icon: areaIconsById.get(id) ?? null,
                  }))
                  .filter(
                    (e): e is { name: string; icon: string | null } => Boolean(e.name),
                  );
                const resourceGoalNames = (resource.linkedGoalIds ?? [])
                  .map((id) => allGoalsById.get(id))
                  .filter((name): name is string => Boolean(name));
                const resourceProjectName = resource.project_id
                  ? projectsById.get(resource.project_id)
                  : undefined;
                return (
                  <ResourceRow
                    key={resource.id}
                    resource={resource}
                    areas={resourceAreas}
                    goalNames={resourceGoalNames}
                    projectName={resourceProjectName}
                    onToggleFavorite={(id, favorite) =>
                      toggleFavoriteResource.mutate({ id, favorite })
                    }
                    onArchive={(id) => archiveResource.mutate(id)}
                    onUnarchive={(id) => unarchiveResource.mutate(id)}
                    onEdit={(r) => setEditingResource(r)}
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
          emptyTitle="No people linked to this area"
          emptyDescription="Add people to track relationships that contribute to this area."
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
                    returnTo={buildReturnTo(`/areas/${area.slug ?? area.id}`)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 bottom-2"
                    title="Unlink from area"
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

      {/* Delete Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Area?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This archives the area. The linked goals, projects, tasks, and notes will become unlinked. You can restore it later from the archive.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteArea}
              disabled={archiveArea.isPending}
            >
              Archive Area
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inline Goal Creation */}
      <GoalDialog
        open={isNewGoalOpen}
        onOpenChange={setIsNewGoalOpen}
        defaultAreaIds={area?.id ? [area.id] : []}
        onSuccess={() => setIsNewGoalOpen(false)}
      />

      {/* Inline Project Creation */}
      <ProjectDialog
        open={isNewProjectOpen}
        onOpenChange={setIsNewProjectOpen}
        defaultAreaIds={area?.id ? [area.id] : []}
        onSuccess={() => setIsNewProjectOpen(false)}
      />

      {/* Inline Task Creation */}
      <TaskDialog
        open={isNewTaskOpen}
        onOpenChange={setIsNewTaskOpen}
        defaultAreaId={area?.id}
        onSuccess={() => setIsNewTaskOpen(false)}
      />

      {/* Task Edit Dialog */}
      <TaskDialog
        open={isTaskEditOpen}
        onOpenChange={(open) => {
          setIsTaskEditOpen(open);
          if (!open) setEditingTask(null);
        }}
        task={editingTask}
        onSuccess={() => refetchAreaDetail()}
        onDelete={(id) => {
          handleTaskDelete(id);
          setEditingTask(null);
        }}
      />

      {/* Note creation navigates directly to /notes/new */}

      {/* Inline Contact Creation */}
      <ContactDialog
        open={isNewContactOpen}
        onOpenChange={setIsNewContactOpen}
        contact={null}
        defaults={{ area_ids: area?.id ? [area.id] : [] }}
        onSubmit={handleCreateContactSubmit}
      />

      {/* Contact Edit Dialog */}
      <ContactDialog
        open={isEditContactOpen}
        onOpenChange={(open) => {
          setIsEditContactOpen(open);
          if (!open) setEditingContact(null);
        }}
        contact={editingContact}
        onSubmit={handleEditContactSubmit}
      />

      {/* Inline Resource Creation */}
      <ResourceDialog
        open={isNewResourceOpen}
        onOpenChange={setIsNewResourceOpen}
        initialAreaIds={area?.id ? [area.id] : []}
        onSubmit={async (input) => {
          await createResource.mutateAsync(input as CreateResourceInput);
          setIsNewResourceOpen(false);
        }}
        isPending={createResource.isPending}
      />

      {/* Resource Edit Dialog */}
      <ResourceDialog
        open={!!editingResource}
        onOpenChange={(open) => { if (!open) setEditingResource(null); }}
        resource={editingResource}
        onSubmit={async (input) => {
          if (editingResource) {
            await updateResource.mutateAsync({ id: editingResource.id, input });
          }
          setEditingResource(null);
        }}
        isPending={updateResource.isPending}
      />
    </div>
  );
}

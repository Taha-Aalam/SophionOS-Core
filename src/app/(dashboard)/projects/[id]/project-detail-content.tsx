"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
} from "lucide-react";

import { ContactCard } from "@/components/entities/contact-card";
import { ContactDialog } from "@/components/entities/contact-dialog";
import { GoalCard } from "@/components/entities/goal-card";
import { GoalDetailSection } from "@/components/entities/goal-detail-section";
import { TaskListItem } from "@/components/entities/task-list-item";
import { TasksByGroupView, type TaskGroup } from "@/components/views/tasks-by-group-view";
import { ProjectDialog } from "@/components/entities/project-dialog";
import { ResourceDialog } from "@/components/entities/resource-dialog";
import { NoteRow } from "@/components/entities/note-row";
import { ResourceRow } from "@/components/entities/resource-row";
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
  useDeleteContact,
  useLinkContactToProject,
  useToggleContactFavorite,
  useArchiveContact,
  useUnlinkContactFromProject,
  useUpdateContact,
} from "@/lib/hooks/use-contacts";
import { useGoals } from "@/lib/hooks/use-goals";
import { useNotesByProject, useToggleFavoriteNote, useTogglePinNote, useArchiveNote, useRestoreNote, useDeleteNote } from "@/lib/hooks/use-notes";
import {
  useDeleteProject,
  useLinkProjectToArea,
  useLinkProjectToGoal,
  useProject,
  useProjects,
  useProjectWithRelations,
  useUnlinkProjectFromArea,
  useUnlinkProjectFromGoal,
  useUpdateProject,
} from "@/lib/hooks/use-projects";
import {
  useArchiveResource,
  useCreateResource,
  useResourcesByProject,
  useToggleFavoriteResource,
  useUnarchiveResource,
  useUpdateResource,
} from "@/lib/hooks/use-resources";
import { useTopics } from "@/lib/hooks/use-topics";
import { useTasks } from "@/lib/hooks/use-tasks";
import type { Task } from "@/lib/types/domain.types";
import { useQueryClient } from "@tanstack/react-query";

import {
  useArchiveTask,
  useArchivedTasks,
  useCompleteTask,
  useFocusTask,
  usePermanentDeleteTask,
  useRestoreTask,
  useUpdateTask,
  useUncompleteTask,
} from "@/lib/hooks/use-tasks";
import { GOALS_QUERY_KEY } from "@/lib/hooks/use-goals";
import { useUIStore } from "@/lib/stores/ui.store";
import { cn } from "@/lib/utils";
import { buildGoalDetailHref } from "@/lib/utils/goal-urls";
import { getGoalLinkedAreaIds } from "@/lib/utils/goals";
import { filterProjectDialogGoals } from "@/lib/utils/project-dialog-filters";
import { getProjectDueState, getProjectLinkedAreaIds, getProjectStatusLabel } from "@/lib/utils/projects";
import { getTaskLinkedAreaIds, getTaskLinkedGoalIds, taskMatchesProjectId } from "@/lib/utils/tasks";
import { NOTE_STATUS, RESOURCE_STATUS } from "@/lib/utils/constants";
import { buildReturnTo, resolveBackNavigation, getReturnToFromSearchParams, encodeReturnTo } from "@/lib/utils/return-to";

const NOTE_STATUS_COLORS: Record<string, string> = {
  inbox: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  to_review: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  saved: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  archive: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  high: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

export function ProjectDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdentifier = params.id as string;
  const { setPageTitle } = useUIStore();
  const projectReturnTo = getReturnToFromSearchParams(searchParams);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isLinkGoalOpen, setIsLinkGoalOpen] = useState(false);
  const [isNewContactOpen, setIsNewContactOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<typeof allContacts[number] | null>(null);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<typeof tasks[number] | null>(null);
  const [isNewResourceOpen, setIsNewResourceOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<typeof linkedResources[number] | null>(null);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [isLinkAreaOpen, setIsLinkAreaOpen] = useState(false);
  const [goalTab, setGoalTab] = useState("active");
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
  const { data: allProjects = [] } = useProjects({ status: "all" });
  const { data: tasks = [], isLoading: isLoadingTasks } = useTasks();
  const { data: archivedTasksAll = [] } = useArchivedTasks();
  const { data: linkedNotes = [], isLoading: isLoadingNotes } = useNotesByProject(resolvedProjectId);
  const { data: allContacts = [] } = useContacts();
  const { data: projectContactLinks = [] } = useContactByProject(resolvedProjectId);
  const { data: linkedResources = [], isLoading: isLoadingResources } =
    useResourcesByProject(resolvedProjectId);
  const { data: topics = [] } = useTopics();

  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const linkProjectToGoal = useLinkProjectToGoal();
  const unlinkProjectFromGoal = useUnlinkProjectFromGoal();
  const linkProjectToArea = useLinkProjectToArea();
  const unlinkProjectFromArea = useUnlinkProjectFromArea();
  const linkContactToProject = useLinkContactToProject();
  const unlinkContactFromProject = useUnlinkContactFromProject();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const toggleContactFavorite = useToggleContactFavorite();
  const archiveContact = useArchiveContact();
  const createResource = useCreateResource();
  const updateResource = useUpdateResource();
  const toggleFavoriteResource = useToggleFavoriteResource();
  const archiveResource = useArchiveResource();
  const unarchiveResource = useUnarchiveResource();
  const toggleFavoriteNote = useToggleFavoriteNote();
  const togglePinNote = useTogglePinNote();
  const archiveNote = useArchiveNote();
  const restoreNote = useRestoreNote();
  const deleteNote = useDeleteNote();
  const completeTask = useCompleteTask();
  const uncompleteTask = useUncompleteTask();
  const queryClient = useQueryClient();
  const focusTask = useFocusTask();
  const updateTask = useUpdateTask();
  const archiveTask = useArchiveTask();
  const restoreTask = useRestoreTask();
  const permanentDeleteTask = usePermanentDeleteTask();

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
  const unlinkedGoals = useMemo(() => {
    const activeUnlinkedGoals = goals.filter((goal) => !goal.is_archived && !linkedGoalIds.has(goal.id));
    return filterProjectDialogGoals(activeUnlinkedGoals, projectLinkedAreaIds);
  }, [goals, linkedGoalIds, projectLinkedAreaIds]);
  const totalActiveUnlinkedGoals = useMemo(
    () => goals.filter((goal) => !goal.is_archived && !linkedGoalIds.has(goal.id)),
    [goals, linkedGoalIds],
  );
  const linkedTasks = useMemo(
    () => [
      ...tasks.filter((task) => taskMatchesProjectId(task, resolvedProjectId)),
      ...archivedTasksAll.filter((task) => taskMatchesProjectId(task, resolvedProjectId)),
    ],
    [resolvedProjectId, tasks, archivedTasksAll],
  );
  const activeLinkedTasks = useMemo(
    () => linkedTasks.filter((task) => !task.is_archived),
    [linkedTasks],
  );
  const linkedContactIds = useMemo(
    () => new Set(projectContactLinks.map((link) => link.contact_id)),
    [projectContactLinks],
  );
  const linkedContacts = useMemo(
    () => allContacts.filter((contact) => linkedContactIds.has(contact.id)),
    [allContacts, linkedContactIds],
  );
  const activeNotes = useMemo(
    () => linkedNotes.filter((n) => !n.is_archived),
    [linkedNotes],
  );
  const activeResources = useMemo(
    () => linkedResources.filter((r) => !r.is_archived),
    [linkedResources],
  );

  // Project progress and active rollup counts are hydrated server-side by
  // projectService (hydrateProjectProgress + hydrateProjectRollupCounts) so
  // the title-area progress ring and the four count buttons render the same
  // numbers as every project card on every other surface.
  const progressPercent = project?.progress ?? 0;
  const activeGoalCount = project?.goalCount ?? 0;
  const activeTaskCount = project?.taskCount ?? 0;
  const activeNoteCount = project?.noteCount ?? 0;
  const activeResourceCount = project?.resourceCount ?? 0;

  // Local item counts are kept for handleProjectCompleteToggle because that
  // handler needs the "true" pre-completion progress when reopening a
  // completed project, not the server-hydrated value (which is forced to 100
  // for completed projects).
  const completedTaskCount = useMemo(
    () => activeLinkedTasks.filter((t) => t.is_completed).length,
    [activeLinkedTasks],
  );
  const completedNoteCount = useMemo(
    () => activeNotes.filter((n) => n.status === NOTE_STATUS.SAVED).length,
    [activeNotes],
  );
  const completedResourceCount = useMemo(
    () => activeResources.filter((r) => r.status === RESOURCE_STATUS.SAVED).length,
    [activeResources],
  );
  const totalItemCount = activeLinkedTasks.length + activeNotes.length + activeResources.length;
  const totalCompleted = completedTaskCount + completedNoteCount + completedResourceCount;

  const goalRollups = useMemo(() => {
    const result = new Map<string, { projectCount: number; taskCount: number; noteCount: number; resourceCount: number }>();
    // Goals coming from useGoals({status:"all"}) are hydrated by goalService.list
    // with accurate global rollup counts. Use those directly so the goal cards
    // show the same correlation values everywhere they appear.
    for (const goal of linkedGoals) {
      const goalId = goal.id;
      result.set(goalId, {
        projectCount: goal.projectCount ?? 0,
        taskCount: goal.taskCount ?? 0,
        noteCount: goal.noteCount ?? 0,
        resourceCount: goal.resourceCount ?? 0,
      });
    }
    return result;
  }, [linkedGoals]);
  const dueState = useMemo(
    () => getProjectDueState(project?.due_date ?? null),
    [project?.due_date],
  );

  const areaNamesMap = useMemo(() => new Map(areas.map((a) => [a.id, a.name])), [areas]);
  const areaIconsMap = useMemo(() => new Map(areas.map((a) => [a.id, a.icon ?? null])), [areas]);
  const goalNamesMap = useMemo(() => {
    const map = new Map(goals.map((g) => [g.id, g.name]));
    for (const g of relations?.goals ?? []) map.set(g.id, g.name);
    return map;
  }, [goals, relations?.goals]);
  const taskNamesMap = useMemo(() => new Map(tasks.map((t) => [t.id, t.name])), [tasks]);
  const topicNamesMap = useMemo(() => new Map(topics.map((t) => [t.id, t.name])), [topics]);

  const goalTabs = useMemo(
    () => [
      {
        value: "active",
        label: "Active",
        count: linkedGoals.filter((goal) => !goal.is_completed && !goal.is_archived).length,
      },
      {
        value: "short",
        label: "Short Term",
        count: linkedGoals.filter((goal) => goal.term === "short" && !goal.is_completed && !goal.is_archived).length,
      },
      {
        value: "mid",
        label: "Mid Term",
        count: linkedGoals.filter((goal) => goal.term === "mid" && !goal.is_completed && !goal.is_archived).length,
      },
      {
        value: "long",
        label: "Long Term",
        count: linkedGoals.filter((goal) => goal.term === "long" && !goal.is_completed && !goal.is_archived).length,
      },
      {
        value: "inactive",
        label: "Inactive",
        count: linkedGoals.filter((goal) => goal.is_archived).length,
      },
      {
        value: "completed",
        label: "Completed",
        count: linkedGoals.filter((goal) => goal.is_completed && !goal.is_archived).length,
      },
    ],
    [linkedGoals],
  );
  const filteredGoals = useMemo(() => {
    switch (goalTab) {
      case "active":
        return linkedGoals.filter((goal) => !goal.is_completed && !goal.is_archived);
      case "short":
        return linkedGoals.filter((goal) => goal.term === "short" && !goal.is_completed && !goal.is_archived);
      case "mid":
        return linkedGoals.filter((goal) => goal.term === "mid" && !goal.is_completed && !goal.is_archived);
      case "long":
        return linkedGoals.filter((goal) => goal.term === "long" && !goal.is_completed && !goal.is_archived);
      case "inactive":
        return linkedGoals.filter((goal) => goal.is_archived);
      case "completed":
        return linkedGoals.filter((goal) => goal.is_completed && !goal.is_archived);
      default:
        return linkedGoals.filter((goal) => !goal.is_completed && !goal.is_archived);
    }
  }, [goalTab, linkedGoals]);

  const taskTabs = useMemo(() => {
    const active = activeLinkedTasks;
    const archived = linkedTasks.filter((t) => t.is_archived);
    return [
      { value: "all", label: "All", count: active.length },
      {
        value: "inbox",
        label: "Inbox",
        count: active.filter((t) => t.status === "inbox" && !t.is_completed).length,
      },
      {
        value: "upcoming",
        label: "Upcoming",
        count: active.filter(
          (t) => t.status !== "inbox" && t.status !== "completed" && !t.is_completed,
        ).length,
      },
      {
        value: "overdue",
        label: "Overdue",
        count: active.filter((t) => {
          if (!t.due_date || t.is_completed) return false;
          return new Date(t.due_date) < new Date();
        }).length,
      },
      { value: "by_area", label: "By Area" },
      { value: "by_goal", label: "By Goal" },
      {
        value: "completed",
        label: "Completed",
        count: active.filter((t) => t.is_completed).length,
      },
      { value: "archived", label: "Archived", count: archived.length },
    ];
  }, [activeLinkedTasks, linkedTasks]);
  const filteredTasks = useMemo(() => {
    if (taskTab === "archived") return linkedTasks.filter((t) => t.is_archived);
    const active = activeLinkedTasks;
    switch (taskTab) {
      case "inbox":
        return active.filter((task) => task.status === "inbox" && !task.is_completed);
      case "upcoming":
        return active.filter((task) => task.status !== "inbox" && task.status !== "completed" && !task.is_completed);
      case "overdue":
        return active.filter((task) => {
          if (!task.due_date || task.is_completed) return false;
          return new Date(task.due_date) < new Date();
        });
      case "by_area":
      case "by_goal":
        return active;
      case "completed":
        return active.filter((task) => task.is_completed);
      default:
        return active;
    }
  }, [activeLinkedTasks, linkedTasks, taskTab]);

  const taskGroupAreaMap = useMemo(() => {
    const map = new Map<string, { name: string; icon?: string | null }>();
    for (const a of areas) map.set(a.id, { name: a.name, icon: a.icon ?? null });
    return map;
  }, [areas]);
  const taskGroupGoalMap = useMemo(() => {
    const map = new Map<string, { name: string }>();
    for (const g of goals) map.set(g.id, { name: g.name });
    for (const g of relations?.goals ?? []) map.set(g.id, { name: g.name });
    return map;
  }, [goals, relations?.goals]);
  const taskGroupProjectMap = useMemo(() => {
    const map = new Map<string, { name: string }>();
    for (const p of allProjects) map.set(p.id, { name: p.name });
    if (project) map.set(project.id, { name: project.name });
    return map;
  }, [allProjects, project]);

  const taskGroupsByArea = useMemo<TaskGroup[]>(() => {
    const grouped = new Map<string, Task[]>();
    for (const task of filteredTasks) {
      const ids = getTaskLinkedAreaIds(task);
      if (ids.length === 0) {
        const current = grouped.get("unassigned") ?? [];
        current.push(task);
        grouped.set("unassigned", current);
      } else {
        for (const areaId of ids) {
          const current = grouped.get(areaId) ?? [];
          current.push(task);
          grouped.set(areaId, current);
        }
      }
    }
    return Array.from(grouped.entries()).map(([areaId, groupTasks]) => ({
      groupId: areaId,
      groupName:
        areaId === "unassigned" ? "No Area" : (taskGroupAreaMap.get(areaId)?.name ?? areaId),
      tasks: groupTasks,
    }));
  }, [filteredTasks, taskGroupAreaMap]);

  const taskGroupsByGoal = useMemo<TaskGroup[]>(() => {
    const grouped = new Map<string, Task[]>();
    for (const task of filteredTasks) {
      const ids = getTaskLinkedGoalIds(task);
      if (ids.length === 0) {
        const current = grouped.get("unassigned") ?? [];
        current.push(task);
        grouped.set("unassigned", current);
      } else {
        for (const goalId of ids) {
          const current = grouped.get(goalId) ?? [];
          current.push(task);
          grouped.set(goalId, current);
        }
      }
    }
    return Array.from(grouped.entries()).map(([goalId, groupTasks]) => ({
      groupId: goalId,
      groupName:
        goalId === "unassigned" ? "No Goal" : (taskGroupGoalMap.get(goalId)?.name ?? goalId),
      tasks: groupTasks,
    }));
  }, [filteredTasks, taskGroupGoalMap]);

  const getTaskLinkedAreaNames = useCallback(
    (task: Task) =>
      getTaskLinkedAreaIds(task)
        .map((id) => areaNamesMap.get(id))
        .filter((n): n is string => Boolean(n)),
    [areaNamesMap],
  );
  const getTaskLinkedAreaIcons = useCallback(
    (task: Task) =>
      getTaskLinkedAreaIds(task).map((id) => areaIconsMap.get(id) ?? null),
    [areaIconsMap],
  );
  const getTaskLinkedGoalNames = useCallback(
    (task: Task) =>
      getTaskLinkedGoalIds(task)
        .map((id) => goalNamesMap.get(id))
        .filter((n): n is string => Boolean(n)),
    [goalNamesMap],
  );
  const getTaskLinkedProjectNames = useCallback(
    (task: Task) =>
      task.linkedProjectIds
        ?.map((id) => allProjects.find((p) => p.id === id)?.name)
        .filter((n): n is string => Boolean(n)) ?? [],
    [allProjects],
  );

  const noteTabs = useMemo(
    () => [
      { value: "all", label: "All" },
      { value: "inbox", label: "Inbox" },
      { value: "to_review", label: "To Review" },
      { value: "active", label: "Active" },
      { value: "saved", label: "Saved" },
      { value: "archived", label: "Archive" },
    ],
    [],
  );
  const filteredNotes = useMemo(() => {
    if (noteTab === "archived") return linkedNotes.filter((note) => note.is_archived);
    const activeNotes = linkedNotes.filter((note) => !note.is_archived);
    switch (noteTab) {
      case "inbox":
        return activeNotes.filter((note) => note.status === "inbox");
      case "to_review":
        return activeNotes.filter((note) => note.status === "to_review");
      case "active":
        return activeNotes.filter((note) => note.status === "active");
      case "saved":
        return activeNotes.filter((note) => note.status === "saved");
      default:
        return activeNotes;
    }
  }, [linkedNotes, noteTab]);

  const contactTabs = useMemo(
    () => [
      { value: "all", label: "All", count: linkedContacts.length },
      { value: "favorite", label: "Favorite", count: linkedContacts.filter((c) => c.favorite).length },
      { value: "follow_up", label: "Follow-up", count: linkedContacts.filter((c) => !!c.follow_up_interval_days).length },
      { value: "by_group", label: "By Group", count: linkedContacts.filter((c) => !!c.group).length },
      { value: "by_area", label: "By Area", count: linkedContacts.filter((c) => (c.linkedAreaIds?.length ?? 0) > 0).length },
      { value: "by_goal", label: "By Goal", count: linkedContacts.filter((c) => (c.linkedGoalIds?.length ?? 0) > 0).length },
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
      case "by_area":
        return linkedContacts.filter((c) => (c.linkedAreaIds?.length ?? 0) > 0);
      case "by_goal":
        return linkedContacts.filter((c) => (c.linkedGoalIds?.length ?? 0) > 0);
      case "archived":
        return linkedContacts.filter((c) => c.archive);
      default:
        return linkedContacts;
    }
  }, [contactTab, linkedContacts]);

  const resourceTabs = [
    { value: "all", label: "All" },
    { value: "inbox", label: "Inbox" },
    { value: "to_review", label: "To Review" },
    { value: "active", label: "Active" },
    { value: "saved", label: "Saved" },
    { value: "archived", label: "Archive" },
  ];

  const filteredResources = useMemo(() => {
    switch (resourceTab) {
      case "inbox":
        return linkedResources.filter((r) => r.status === "inbox" && !r.is_archived);
      case "to_review":
        return linkedResources.filter((r) => r.status === "to_review" && !r.is_archived);
      case "active":
        return linkedResources.filter((r) => r.status === "active" && !r.is_archived);
      case "saved":
        return linkedResources.filter((r) => r.status === "saved" && !r.is_archived);
      case "archived":
        return linkedResources.filter((r) => r.is_archived);
      default:
        return linkedResources.filter((r) => !r.is_archived);
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
        : totalItemCount > 0
          ? Math.round((totalCompleted / totalItemCount) * 100)
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
    [totalCompleted, totalItemCount, project, updateProject],
  );

  const handleDelete = async () => {
    if (!project) {
      return;
    }

    await deleteProject.mutateAsync(project.id);
    router.push("/projects");
  };

  const handleNoteToggleFavorite = useCallback(
    (noteId: string, favorite: boolean) => {
      toggleFavoriteNote.mutate({ id: noteId, favorite });
    },
    [toggleFavoriteNote],
  );

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

  const handleTaskCompletion = useCallback(
    async (taskId: string, isCompleted: boolean) => {
      if (isCompleted) {
        await completeTask.mutateAsync(taskId);
        queryClient.invalidateQueries({ queryKey: [GOALS_QUERY_KEY] });
      } else {
        await uncompleteTask.mutateAsync(taskId);
      }
    },
    [completeTask, uncompleteTask, queryClient],
  );

  const handleTaskFocus = useCallback(
    async (taskId: string, isFocused: boolean) => {
      await focusTask.mutateAsync({ id: taskId, is_focused: isFocused });
    },
    [focusTask],
  );

  const handleTaskNameSave = useCallback(
    async (taskId: string, name: string) => {
      await updateTask.mutateAsync({ id: taskId, input: { name } });
    },
    [updateTask],
  );

  const handleTaskArchiveToggle = useCallback(
    async (task: Task) => {
      if (task.is_archived) {
        await restoreTask.mutateAsync(task.id);
      } else {
        await archiveTask.mutateAsync(task.id);
      }
    },
    [archiveTask, restoreTask],
  );

  const handlePermanentDelete = useCallback(
    (id: string) => {
      permanentDeleteTask.mutate(id);
    },
    [permanentDeleteTask],
  );

  const handleTaskEdit = useCallback(
    (task: typeof tasks[number]) => {
      setEditingTask(task);
    },
    [],
  );

  const handleResourceEdit = useCallback(
    (resource: typeof linkedResources[number]) => {
      setEditingResource(resource);
    },
    [],
  );

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

  const handleContactEdit = useCallback((contact: typeof allContacts[number]) => {
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
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={() => router.push(resolveBackNavigation(projectReturnTo, "/projects"))}
        >
          <ArrowLeft className="size-3.5" />
        </Button>
        <span>/</span>
        <span>Projects</span>
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
                  strokeDasharray={32 * 2 * Math.PI}
                  strokeDashoffset={32 * 2 * Math.PI * (1 - progressPercent / 100)}
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
              <ChevronDownIcon className="size-3.5" />
            ) : (
              <ChevronRightIcon className="size-3.5" />
            )}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4 px-6 pb-4">
          <button
            onClick={() => scrollToSection("goals")}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-blue-600 dark:text-blue-400">{activeGoalCount}</span>
            <span className="text-muted-foreground">Goals</span>
          </button>
          <button
            onClick={() => scrollToSection("tasks")}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-green-600 dark:text-green-400">{activeTaskCount}</span>
            <span className="text-muted-foreground">Tasks</span>
          </button>
          <button
            onClick={() => scrollToSection("notes")}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-purple-600 dark:text-purple-400">{activeNoteCount}</span>
            <span className="text-muted-foreground">Notes</span>
          </button>
          <button
            onClick={() => scrollToSection("resources")}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-orange-600 dark:text-orange-400">
              {activeResourceCount}
            </span>
            <span className="text-muted-foreground">Resources</span>
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
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredGoals.map((goal) => {
                const goalAreaIds = getGoalLinkedAreaIds(goal);
                const goalAreaNames = goalAreaIds
                  .map((id) => areas.find((a) => a.id === id)?.name)
                  .filter((name): name is string => Boolean(name));
                const goalAreaIcons = goalAreaIds.map(
                  (id) => areas.find((a) => a.id === id)?.icon ?? null,
                );
                return (
                  <div key={goal.id} className="relative">
                    <GoalCard
                      goal={goal}
                      areaNames={goalAreaNames.length > 0 ? goalAreaNames : undefined}
                      areaIcons={goalAreaIcons}
                      onEdit={() =>
                        router.push(
                          `${buildGoalDetailHref(goal)}?returnTo=${encodeReturnTo(`/projects/${project.slug ?? project.id}`)}`,
                        )
                      }
                      rollups={goalRollups.get(goal.id)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-2"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleUnlinkGoal(goal.id);
                      }}
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
          {taskTab === "by_area" ? (
            <TasksByGroupView
              groups={taskGroupsByArea}
              areaMap={taskGroupAreaMap}
              goalMap={taskGroupGoalMap}
              projectMap={taskGroupProjectMap}
              onCompletionToggle={handleTaskCompletion}
              onFocusToggle={handleTaskFocus}
              onNameSave={handleTaskNameSave}
              onEdit={handleTaskEdit}
              onArchiveToggle={handleTaskArchiveToggle}
              onPermanentDelete={handlePermanentDelete}
              onNewTask={() => setIsNewTaskOpen(true)}
              getLinkedAreaNames={getTaskLinkedAreaNames}
              getLinkedAreaIcons={getTaskLinkedAreaIcons}
              getLinkedGoalNames={getTaskLinkedGoalNames}
              getLinkedProjectNames={getTaskLinkedProjectNames}
              emptyMessage="Tasks will be grouped by area here."
            />
          ) : taskTab === "by_goal" ? (
            <TasksByGroupView
              groups={taskGroupsByGoal}
              areaMap={taskGroupAreaMap}
              goalMap={taskGroupGoalMap}
              projectMap={taskGroupProjectMap}
              onCompletionToggle={handleTaskCompletion}
              onFocusToggle={handleTaskFocus}
              onNameSave={handleTaskNameSave}
              onEdit={handleTaskEdit}
              onArchiveToggle={handleTaskArchiveToggle}
              onPermanentDelete={handlePermanentDelete}
              onNewTask={() => setIsNewTaskOpen(true)}
              getLinkedAreaNames={getTaskLinkedAreaNames}
              getLinkedAreaIcons={getTaskLinkedAreaIcons}
              getLinkedGoalNames={getTaskLinkedGoalNames}
              getLinkedProjectNames={getTaskLinkedProjectNames}
              emptyMessage="Tasks will be grouped by goal here."
            />
          ) : filteredTasks.length > 0 ? (
            <div className="rounded-lg border bg-card">
              {filteredTasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  linkedAreaNames={task.linkedAreaIds?.map((id) => areas.find((a) => a.id === id)?.name).filter((n): n is string => Boolean(n)) ?? []}
                  linkedAreaIcons={task.linkedAreaIds?.map((id) => areas.find((a) => a.id === id)?.icon ?? null) ?? []}
                  linkedGoalNames={task.linkedGoalIds?.map((id) => goals.find((g) => g.id === id)?.name).filter((n): n is string => Boolean(n)) ?? []}
                  projectName={project?.name}
                  linkedProjectNames={task.linkedProjectIds?.map((id) => allProjects.find((p) => p.id === id)?.name).filter((n): n is string => Boolean(n)) ?? []}
                  onCompletionToggle={handleTaskCompletion}
                  onFocusToggle={handleTaskFocus}
                  onNameSave={handleTaskNameSave}
                  onArchiveToggle={handleTaskArchiveToggle}
                  onPermanentDelete={handlePermanentDelete}
                  onEdit={handleTaskEdit}
                />
              ))}
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
          onCreateNew={() => {
              const noteReturnTo = `/projects/${project?.slug ?? project?.id}`;
              const params = new URLSearchParams();
              params.set("returnTo", encodeReturnTo(noteReturnTo));
              if (project?.id) {
                params.set("projectId", project.id);
              }
              if (projectLinkedAreaIds.length > 0) {
                params.set("areaIds", projectLinkedAreaIds.join(","));
              }
              if (linkedGoalIdsArray.length > 0) {
                params.set("goalIds", linkedGoalIdsArray.join(","));
              }
              router.push(`/notes/new?${params.toString()}`);
            }}
          createLabel="New Note"
        >
          {filteredNotes.length > 0 ? (
            <div className="rounded-lg border bg-card">
              {filteredNotes.map((note) => {
                const noteReturnTo = `/projects/${project?.slug ?? project?.id}`;
                const noteAreas = (note.linkedAreaIds ?? (note.area_id ? [note.area_id] : []))
                  .map((id) => { const name = areaNamesMap.get(id); return name ? { name, icon: areaIconsMap.get(id) ?? null } : null; })
                  .filter((a): a is { name: string; icon: string | null } => Boolean(a));
                const noteGoalNames = (note.linkedGoalIds ?? []).map((id) => goalNamesMap.get(id)).filter((n): n is string => Boolean(n));
                const noteProjectNames = project?.name ? [project.name] : [];
                const noteTaskNames = (note.linkedTaskIds ?? []).map((id) => taskNamesMap.get(id)).filter((n): n is string => Boolean(n));
                return (
                  <NoteRow
                    key={note.id}
                    note={note}
                    returnTo={noteReturnTo}
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

      <div ref={resourcesRef}>
        <GoalDetailSection
          id="resources"
          entityType="resources"
          tabs={resourceTabs}
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
              {filteredResources.map((resource) => {
                const resourceAreaIds = (resource.linkedAreaIds && resource.linkedAreaIds.length > 0)
                  ? resource.linkedAreaIds
                  : (resource.area_id ? [resource.area_id] : []);
                const resourceAreas = resourceAreaIds
                  .map((id) => ({ name: areaNamesMap.get(id), icon: areaIconsMap.get(id) ?? null }))
                  .filter((e): e is { name: string; icon: string | null } => Boolean(e.name));
                const resourceGoalNames = (resource.linkedGoalIds ?? [])
                  .map((id) => goalNamesMap.get(id))
                  .filter((name): name is string => Boolean(name));
                const resourceProjectNames = resource.project_id
                  ? [project?.name].filter((n): n is string => Boolean(n))
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
                    topicName={resource.topic_id ? topicNamesMap.get(resource.topic_id) : undefined}
                    onToggleFavorite={(id, favorite) =>
                      toggleFavoriteResource.mutate({ id, favorite })
                    }
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
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredContacts.map((contact) => (
                <div key={contact.id} className="relative">
                  <ContactCard
                    contact={contact}
                    onEdit={handleContactEdit}
                    onDelete={handleContactDelete}
                    onToggleFavorite={handleContactToggleFavorite}
                    onArchive={handleContactArchive}
                    returnTo={buildReturnTo(`/projects/${project.slug ?? project.id}`)}
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
            totalActiveUnlinkedGoals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                All active goals are already linked to this project.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                No goals found in the areas linked to this project. Link an area to the project first, or create a goal in a linked area.
              </p>
            )
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

      <TaskDialog
        open={!!editingTask}
        onOpenChange={(open) => { if (!open) setEditingTask(null); }}
        task={editingTask}
        projectScoped={{
          projectId: project.id,
          projectName: project.name,
          areaId: project.area_id ?? null,
          linkedAreaIds: projectLinkedAreaIds,
          linkedGoalIds: linkedGoalIdsArray,
        }}
        onSuccess={() => setEditingTask(null)}
        onArchiveToggle={(task) => {
          handleTaskArchiveToggle(task);
          setEditingTask(null);
        }}
        onPermanentDelete={(id) => {
          handlePermanentDelete(id);
          setEditingTask(null);
        }}
      />

      <ProjectDialog open={isEditOpen} onOpenChange={setIsEditOpen} project={project} />

      <ContactDialog
        open={isNewContactOpen}
        onOpenChange={setIsNewContactOpen}
        contact={null}
        defaults={{ project_ids: project?.id ? [project.id] : [] }}
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

      <ResourceDialog
        open={isNewResourceOpen}
        onOpenChange={setIsNewResourceOpen}
        initialProjectId={project.id}
        initialAreaIds={projectLinkedAreaIds}
        initialGoalIds={linkedGoalIdsArray}
        onSubmit={async (input) => {
          await createResource.mutateAsync(input as Parameters<typeof createResource.mutateAsync>[0]);
          setIsNewResourceOpen(false);
        }}
        isPending={createResource.isPending}
      />

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

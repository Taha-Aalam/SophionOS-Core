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
  Unlink,
} from "lucide-react";

import { ContactCard } from "@/components/entities/contact-card";
import { DeleteEntityPopover } from "@/components/entities/delete-entity-popover";
import { ContactDialog, type ContactDialogDefaults } from "@/components/entities/contact-dialog";
import { ContactsByCategoryView } from "@/components/views/contacts-by-category-view";
import { ContactsFollowUpView } from "@/components/views/contacts-follow-up-view";
import { GoalCard } from "@/components/entities/goal-card";
import { GoalDetailSection } from "@/components/entities/goal-detail-section";
import { ProjectDetailSkeleton } from "@/components/entities/detail-skeletons";
import { GoalDialog } from "@/components/entities/goal-dialog";
import { LinkEntityDialog } from "@/components/entities/link-entity-dialog";
import { TaskListItem } from "@/components/entities/task-list-item";
import { TasksByGroupView, type TaskGroup } from "@/components/views/tasks-by-group-view";
import { NotesByGroupView, type NoteGroup } from "@/components/views/notes-by-group-view";
import { ResourcesByGroupView, type ResourceGroup } from "@/components/views/resources-by-group-view";
import { ProjectDialog } from "@/components/entities/project-dialog";
import { ResourceDialog } from "@/components/entities/resource-dialog";
import { NoteRow } from "@/components/entities/note-row";
import { ResourceRow } from "@/components/entities/resource-row";
import { TaskDialog } from "@/components/entities/task-dialog";
import { EmptyState } from "@/components/views/empty-state";
import { ErrorState } from "@/components/views/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAreas } from "@/lib/hooks/use-areas";
import {
  useContactByProject,
  useContacts,
  useCreateContact,
  useDeleteContact,
  useLinkContactToArea,
  useLinkContactToGoal,
  useLinkContactToProject,
  useToggleContactFavorite,
  useArchiveContact,
  useUpdateContact,
} from "@/lib/hooks/use-contacts";
import { useGoals, useRestoreGoal, useArchiveGoal } from "@/lib/hooks/use-goals";
import { useNotesByProject, useToggleFavoriteNote, useTogglePinNote, useArchiveNote, useRestoreNote, useDeleteNote, useUpdateNote, useNotes } from "@/lib/hooks/use-notes";
import {
  useDeleteProject,
  useLinkProjectToArea,
  useLinkProjectToGoal,
  useProject,
  useProjects,
  useProjectWithRelations,
  useUnlinkProjectFromArea,
  useUpdateProject,
} from "@/lib/hooks/use-projects";
import {
  useArchiveResource,
  useCreateResource,
  useDeleteResource,
  useResourcesByProject,
  useToggleFavoriteResource,
  useUnarchiveResource,
  useUpdateResource,
  useResources,
} from "@/lib/hooks/use-resources";
import { useTopics } from "@/lib/hooks/use-topics";
import { useTasks } from "@/lib/hooks/use-tasks";
import { useEscapeBack } from "@/lib/hooks/use-escape-back";
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
import { filterCandidatesByAreaScope, getContactLinkedAreaIds } from "@/lib/utils/area-scoped-candidates";
import { getProjectDueState, getProjectLinkedAreaIds, getProjectStatusLabel } from "@/lib/utils/projects";
import { getTaskLinkedAreaIds, getTaskLinkedGoalIds, getTaskLinkedProjectIds, taskMatchesProjectId } from "@/lib/utils/tasks";
import { getNoteLinkedAreaIds, getNoteLinkedGoalIds, getNoteLinkedProjectIds, getNoteLinkedTaskIds } from "@/lib/utils/notes";
import { getResourceLinkedAreaIds, getResourceLinkedProjectIds } from "@/lib/utils/resources";
import { NOTE_STATUS, RESOURCE_STATUS } from "@/lib/utils/constants";
import { buildAreaContactGoalSections, buildAreaContactGroupSections, buildAreaContactFollowUpSections, buildContactByAreaSections } from "@/lib/utils/area-detail";
import { buildReturnTo, buildReturnToChain, popReturnToHref, encodeReturnTo, getRawReturnToChain } from "@/lib/utils/return-to";
import { PRIORITY_COLORS, STATUS_COLORS, BADGE_COLOR } from "@/lib/constants/entity-colors";

export function ProjectDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectIdentifier = params.id as string;
  const { setPageTitle } = useUIStore();
  const backHref = popReturnToHref(searchParams, "/projects");
  useEscapeBack(backHref);
  const returnToChain = buildReturnToChain(searchParams);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLinkGoalOpen, setIsLinkGoalOpen] = useState(false);
  const [isNewContactOpen, setIsNewContactOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<typeof allContacts[number] | null>(null);
  const [createContactDefaults, setCreateContactDefaults] = useState<ContactDialogDefaults | undefined>(undefined);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskAreaId, setNewTaskAreaId] = useState<string | null>(null);
  const [newTaskGoalId, setNewTaskGoalId] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<typeof tasks[number] | null>(null);
  const [isNewResourceOpen, setIsNewResourceOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<typeof linkedResources[number] | null>(null);
  const [newResourceGroupId, setNewResourceGroupId] = useState<string | null>(null);
  const [newResourceGroupType, setNewResourceGroupType] = useState<"area" | "goal" | null>(null);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [dueDateInput, setDueDateInput] = useState("");
  const [isLinkAreaOpen, setIsLinkAreaOpen] = useState(false);
  const [isNewGoalOpen, setIsNewGoalOpen] = useState(false);
  const [isLinkTaskOpen, setIsLinkTaskOpen] = useState(false);
  const [isLinkNoteOpen, setIsLinkNoteOpen] = useState(false);
  const [isLinkResourceOpen, setIsLinkResourceOpen] = useState(false);
  const [isLinkContactOpen, setIsLinkContactOpen] = useState(false);
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

  const { data: project, isLoading: isLoadingProject, isError: projectError, refetch: refetchProject } = useProject(projectIdentifier);
  const resolvedProjectId = project?.id ?? "";
  const { data: relations } = useProjectWithRelations(resolvedProjectId);
  const { data: areas = [] } = useAreas();
  const { data: goals = [] } = useGoals({ status: "all" });
  const { data: allProjects = [] } = useProjects({ status: "all" });
  const { data: tasks = [], isLoading: isLoadingTasks } = useTasks();
  const { data: archivedTasksAll = [] } = useArchivedTasks();
  const { data: linkedNotes = [], isLoading: isLoadingNotes } = useNotesByProject(resolvedProjectId);
  const { data: allContacts = [] } = useContacts();
  const { data: archivedContactsAll = [] } = useContacts({ archive: true });
  const { data: projectContactLinks = [] } = useContactByProject(resolvedProjectId);
  const { data: linkedResources = [], isLoading: isLoadingResources } =
    useResourcesByProject(resolvedProjectId);
  const { data: topics = [] } = useTopics();

  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const restoreGoal = useRestoreGoal();
  const archiveGoal = useArchiveGoal();
  const linkProjectToGoal = useLinkProjectToGoal();
  const linkProjectToArea = useLinkProjectToArea();
  const unlinkProjectFromArea = useUnlinkProjectFromArea();
  const linkContactToProject = useLinkContactToProject();
  const linkContactToArea = useLinkContactToArea();
  const linkContactToGoal = useLinkContactToGoal();
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
  const deleteResource = useDeleteResource();
  const toggleFavoriteNote = useToggleFavoriteNote();
  const togglePinNote = useTogglePinNote();
  const archiveNote = useArchiveNote();
  const restoreNote = useRestoreNote();
  const deleteNote = useDeleteNote();
  const updateNote = useUpdateNote();
  const { data: allNotesGlobal = [] } = useNotes({ status: "all" });
  const { data: allResourcesGlobal = [] } = useResources({ status: "all" });
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDueDateInput(project?.due_date ?? "");
  }, [project?.due_date]);

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
  const eligibleAreas = useMemo(
    () =>
      areas.filter(
        (areaOption) => !areaOption.archive && !projectLinkedAreaIds.includes(areaOption.id),
      ),
    [areas, projectLinkedAreaIds],
  );
  const unlinkedGoals = useMemo(() => {
    const activeUnlinkedGoals = goals.filter((goal) => !goal.is_archived && !linkedGoalIds.has(goal.id));
    return filterCandidatesByAreaScope(
      activeUnlinkedGoals,
      projectLinkedAreaIds,
      getGoalLinkedAreaIds,
    );
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
  const allLinkedContacts = useMemo(
    () => [
      ...allContacts.filter((contact) => linkedContactIds.has(contact.id)),
      ...archivedContactsAll.filter((contact) => linkedContactIds.has(contact.id)),
    ],
    [allContacts, archivedContactsAll, linkedContactIds],
  );
  const activeLinkedContacts = useMemo(
    () => allLinkedContacts.filter((c) => !c.archive),
    [allLinkedContacts],
  );
  const archivedLinkedContacts = useMemo(
    () => allLinkedContacts.filter((c) => c.archive),
    [allLinkedContacts],
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
    () => activeNotes.filter((n) => n.status === NOTE_STATUS.COMPLETED).length,
    [activeNotes],
  );
  const completedResourceCount = useMemo(
    () => activeResources.filter((r) => r.status === RESOURCE_STATUS.COMPLETED).length,
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
  const allProjectNamesMap = useMemo(
    () => new Map(allProjects.map((p) => [p.id, p.name])),
    [allProjects],
  );

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
        // "Inactive" surfaces auto-inactive goals (linked but with no live work)
        // separately from archived ones so the Archived tab can own that bucket.
        count: linkedGoals.filter((goal) =>
          !goal.is_archived && !goal.is_completed &&
          (goal.projectCount ?? 0) === 0 && (goal.taskCount ?? 0) === 0 &&
          (goal.noteCount ?? 0) === 0 && (goal.resourceCount ?? 0) === 0,
        ).length,
      },
      {
        value: "completed",
        label: "Completed",
        count: linkedGoals.filter((goal) => goal.is_completed && !goal.is_archived).length,
      },
      {
        value: "archived",
        label: "Archived",
        count: linkedGoals.filter((goal) => goal.is_archived).length,
      },
    ],
    [linkedGoals],
  );
  const filteredGoals = useMemo(() => {
    const isAutoInactive = (goal: typeof linkedGoals[number]) =>
      !goal.is_archived && !goal.is_completed &&
      (goal.projectCount ?? 0) === 0 && (goal.taskCount ?? 0) === 0 &&
      (goal.noteCount ?? 0) === 0 && (goal.resourceCount ?? 0) === 0;
    switch (goalTab) {
      case "active":
        return linkedGoals.filter((goal) => !goal.is_completed && !goal.is_archived && !isAutoInactive(goal));
      case "short":
        return linkedGoals.filter((goal) => goal.term === "short" && !goal.is_completed && !goal.is_archived);
      case "mid":
        return linkedGoals.filter((goal) => goal.term === "mid" && !goal.is_completed && !goal.is_archived);
      case "long":
        return linkedGoals.filter((goal) => goal.term === "long" && !goal.is_completed && !goal.is_archived);
      case "inactive":
        return linkedGoals.filter((goal) => isAutoInactive(goal));
      case "completed":
        return linkedGoals.filter((goal) => goal.is_completed && !goal.is_archived);
      case "archived":
        return linkedGoals.filter((goal) => goal.is_archived);
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
    () => {
      const active = linkedNotes.filter((note) => !note.is_archived);
      const archived = linkedNotes.filter((note) => note.is_archived);
      return [
        { value: "all", label: "All", count: active.length },
        { value: "inbox", label: "Inbox", count: active.filter((note) => note.status === "inbox").length },
        { value: "to_review", label: "To Review", count: active.filter((note) => note.status === "to_review").length },
        { value: "active", label: "Active", count: active.filter((note) => note.status === "active").length },
        { value: "by_area", label: "By Area" },
        { value: "by_goal", label: "By Goal" },
        { value: "completed", label: "Completed", count: active.filter((note) => note.status === "completed").length },
        { value: "archived", label: "Archive", count: archived.length },
      ];
    },
    [linkedNotes],
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
      case "completed":
        return activeNotes.filter((note) => note.status === "completed");
      case "by_area":
      case "by_goal":
        return activeNotes;
      default:
        return activeNotes;
    }
  }, [linkedNotes, noteTab]);

  const noteGroupsByArea = useMemo<NoteGroup[]>(() => {
    const grouped = new Map<string, typeof filteredNotes>();
    for (const note of filteredNotes) {
      const ids = getNoteLinkedAreaIds(note);
      const keys = ids.length > 0 ? ids : ["unassigned"];
      for (const areaId of keys) {
        const current = grouped.get(areaId) ?? [];
        current.push(note);
        grouped.set(areaId, current);
      }
    }
    return Array.from(grouped.entries()).map(([areaId, notes]) => ({
      groupId: areaId,
      groupName: areaId === "unassigned" ? "No Area" : (areaNamesMap.get(areaId) ?? areaId),
      notes,
    }));
  }, [filteredNotes, areaNamesMap]);

  const noteGroupsByGoal = useMemo<NoteGroup[]>(() => {
    const grouped = new Map<string, typeof filteredNotes>();
    for (const note of filteredNotes) {
      const ids = getNoteLinkedGoalIds(note);
      const keys = ids.length > 0 ? ids : ["unassigned"];
      for (const goalId of keys) {
        const current = grouped.get(goalId) ?? [];
        current.push(note);
        grouped.set(goalId, current);
      }
    }
    return Array.from(grouped.entries()).map(([goalId, notes]) => ({
      groupId: goalId,
      groupName: goalId === "unassigned" ? "No Goal" : (goalNamesMap.get(goalId) ?? goalId),
      notes,
    }));
  }, [filteredNotes, goalNamesMap]);

  const contactTabs = useMemo(
    () => [
      { value: "all", label: "All", count: activeLinkedContacts.length },
      { value: "favorite", label: "Favorite", count: activeLinkedContacts.filter((c) => c.favorite).length },
      { value: "follow_up", label: "Follow-up", count: activeLinkedContacts.filter((c) => !!c.follow_up_interval_days).length },
      { value: "by_group", label: "By Group", count: activeLinkedContacts.filter((c) => !!c.group).length },
      { value: "by_area", label: "By Area", count: activeLinkedContacts.filter((c) => (c.linkedAreaIds?.length ?? 0) > 0).length },
      { value: "by_goal", label: "By Goal", count: activeLinkedContacts.filter((c) => (c.linkedGoalIds?.length ?? 0) > 0).length },
      { value: "archived", label: "Archive", count: archivedLinkedContacts.length },
    ],
    [activeLinkedContacts, archivedLinkedContacts],
  );
  const filteredContacts = useMemo(() => {
    switch (contactTab) {
      case "favorite":
        return activeLinkedContacts.filter((c) => c.favorite);
      case "follow_up":
      case "by_group":
      case "by_area":
      case "by_goal":
        return activeLinkedContacts;
      case "archived":
        return archivedLinkedContacts;
      default:
        return activeLinkedContacts;
    }
  }, [contactTab, activeLinkedContacts, archivedLinkedContacts]);

  const projectContactFollowUpSections = useMemo(
    () => buildAreaContactFollowUpSections(activeLinkedContacts),
    [activeLinkedContacts],
  );
  const projectContactGroupSections = useMemo(
    () => buildAreaContactGroupSections(activeLinkedContacts),
    [activeLinkedContacts],
  );
  const projectContactAreaSections = useMemo(
    () => buildContactByAreaSections(activeLinkedContacts, areas),
    [activeLinkedContacts, areas],
  );
  const projectContactGoalSections = useMemo(
    () => buildAreaContactGoalSections(activeLinkedContacts, goals),
    [activeLinkedContacts, goals],
  );
  const handleCreateContactInSection = useCallback(
    (section: { id: string }) => {
      const defaults: ContactDialogDefaults = resolvedProjectId
        ? { project_ids: [resolvedProjectId] }
        : {};
      const [category, entityId] = section.id.split(":");
      if (category === "group") {
        defaults.group = entityId;
      } else if (category === "project" && entityId !== "unassigned") {
        defaults.project_ids = Array.from(new Set([...(defaults.project_ids ?? []), entityId]));
      } else if (category === "area" && entityId !== "unassigned") {
        defaults.area_ids = [entityId];
      } else if (category === "goal" && entityId !== "unassigned") {
        defaults.goal_ids = [entityId];
      }
      setCreateContactDefaults(defaults);
      setIsNewContactOpen(true);
    },
    [resolvedProjectId],
  );

  const resourceTabs = useMemo(() => {
    const active = linkedResources.filter((r) => !r.is_archived);
    const archived = linkedResources.filter((r) => r.is_archived);
    return [
      { value: "all", label: "All", count: active.length },
      { value: "inbox", label: "Inbox", count: active.filter((r) => r.status === "inbox").length },
      { value: "to_review", label: "To Review", count: active.filter((r) => r.status === "to_review").length },
      { value: "active", label: "Active", count: active.filter((r) => r.status === "active").length },
      { value: "by_area", label: "By Area" },
      { value: "by_goal", label: "By Goal" },
      { value: "completed", label: "Completed", count: active.filter((r) => r.status === "completed").length },
      { value: "archived", label: "Archive", count: archived.length },
    ];
  }, [linkedResources]);

  const filteredResources = useMemo(() => {
    switch (resourceTab) {
      case "inbox":
        return linkedResources.filter((r) => r.status === "inbox" && !r.is_archived);
      case "to_review":
        return linkedResources.filter((r) => r.status === "to_review" && !r.is_archived);
      case "active":
        return linkedResources.filter((r) => r.status === "active" && !r.is_archived);
      case "completed":
        return linkedResources.filter((r) => r.status === "completed" && !r.is_archived);
      case "archived":
        return linkedResources.filter((r) => r.is_archived);
      case "by_area":
      case "by_goal":
        return linkedResources.filter((r) => !r.is_archived);
      default:
        return linkedResources.filter((r) => !r.is_archived);
    }
  }, [linkedResources, resourceTab]);

  const resourceGroupsByArea = useMemo<ResourceGroup[]>(() => {
    const grouped = new Map<string, typeof filteredResources>();
    for (const resource of filteredResources) {
      const ids = (resource.linkedAreaIds && resource.linkedAreaIds.length > 0)
        ? resource.linkedAreaIds
        : (resource.area_id ? [resource.area_id] : []);
      const keys = ids.length > 0 ? ids : ["unassigned"];
      for (const areaId of keys) {
        const current = grouped.get(areaId) ?? [];
        current.push(resource);
        grouped.set(areaId, current);
      }
    }
    return Array.from(grouped.entries()).map(([areaId, resources]) => ({
      groupId: areaId,
      groupName: areaId === "unassigned" ? "No Area" : (areaNamesMap.get(areaId) ?? areaId),
      resources,
    }));
  }, [filteredResources, areaNamesMap]);

  const resourceGroupsByGoal = useMemo<ResourceGroup[]>(() => {
    const grouped = new Map<string, typeof filteredResources>();
    for (const resource of filteredResources) {
      const ids = resource.linkedGoalIds ?? [];
      const keys = ids.length > 0 ? ids : ["unassigned"];
      for (const goalId of keys) {
        const current = grouped.get(goalId) ?? [];
        current.push(resource);
        grouped.set(goalId, current);
      }
    }
    return Array.from(grouped.entries()).map(([goalId, resources]) => ({
      groupId: goalId,
      groupName: goalId === "unassigned" ? "No Goal" : (goalNamesMap.get(goalId) ?? goalId),
      resources,
    }));
  }, [filteredResources, goalNamesMap]);

  const scrollToSection = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const handleProjectInactiveToggle = useCallback(
    async (checked: boolean) => {
      if (!project) return;
      const nextStatus = checked ? "on_hold" : "active";
      if (project.status === nextStatus) return;
      await updateProject.mutateAsync({
        id: project.id,
        input: { status: nextStatus },
      });
    },
    [project, updateProject],
  );

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

  // Link-existing candidates for project sections.
  // Each list is scoped to the project's areas: only entities tied to one of
  // those areas, plus entities with no area assigned, are eligible.
  const linkedTaskIdSet = useMemo(
    () => new Set(linkedTasks.map((t) => t.id)),
    [linkedTasks],
  );
  const linkTaskCandidates = useMemo(
    () =>
      filterCandidatesByAreaScope(
        tasks.filter((t) => !t.is_archived && !linkedTaskIdSet.has(t.id)),
        projectLinkedAreaIds,
        getTaskLinkedAreaIds,
      ),
    [tasks, linkedTaskIdSet, projectLinkedAreaIds],
  );
  const linkedNoteIdSet = useMemo(
    () => new Set(linkedNotes.map((n) => n.id)),
    [linkedNotes],
  );
  const linkNoteCandidates = useMemo(
    () =>
      filterCandidatesByAreaScope(
        allNotesGlobal.filter((n) => !n.is_archived && !linkedNoteIdSet.has(n.id)),
        projectLinkedAreaIds,
        getNoteLinkedAreaIds,
      ),
    [allNotesGlobal, linkedNoteIdSet, projectLinkedAreaIds],
  );
  const linkedResourceIdSet = useMemo(
    () => new Set(linkedResources.map((r) => r.id)),
    [linkedResources],
  );
  const linkResourceCandidates = useMemo(
    () =>
      filterCandidatesByAreaScope(
        allResourcesGlobal.filter((r) => !r.is_archived && !linkedResourceIdSet.has(r.id)),
        projectLinkedAreaIds,
        getResourceLinkedAreaIds,
      ),
    [allResourcesGlobal, linkedResourceIdSet, projectLinkedAreaIds],
  );
  const linkContactCandidates = useMemo(
    () =>
      filterCandidatesByAreaScope(
        allContacts.filter((c) => !c.archive && !linkedContactIds.has(c.id)),
        projectLinkedAreaIds,
        getContactLinkedAreaIds,
      ),
    [allContacts, linkedContactIds, projectLinkedAreaIds],
  );

  const handleLinkTask = (task: typeof tasks[number]) => {
    if (!resolvedProjectId) return;
    const existing = getTaskLinkedProjectIds(task);
    const nextProjectIds = Array.from(new Set([...existing, resolvedProjectId]));
    updateTask.mutate({ id: task.id, input: { project_ids: nextProjectIds } });
    setIsLinkTaskOpen(false);
  };
  const handleLinkNote = (note: typeof allNotesGlobal[number]) => {
    if (!resolvedProjectId) return;
    const existing = getNoteLinkedProjectIds(note);
    const nextProjectIds = Array.from(new Set([...existing, resolvedProjectId]));
    updateNote.mutate({ id: note.id, input: { project_ids: nextProjectIds } });
    setIsLinkNoteOpen(false);
  };
  const handleLinkResourceExisting = (resource: typeof allResourcesGlobal[number]) => {
    if (!resolvedProjectId) return;
    const existingIds = resource.linkedProjectIds ?? [];
    const nextProjectIds = existingIds.includes(resolvedProjectId)
      ? existingIds
      : [...existingIds, resolvedProjectId];
    updateResource.mutate({ id: resource.id, input: { project_ids: nextProjectIds } });
    setIsLinkResourceOpen(false);
  };
  const handleLinkContactExisting = (contactId: string) => {
    if (!resolvedProjectId) return;
    linkContactToProject.mutate({ contactId, projectId: resolvedProjectId });
    setIsLinkContactOpen(false);
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
            const extraAreaIds = createContactDefaults?.area_ids ?? [];
            for (const areaId of extraAreaIds) {
              linkContactToArea.mutate({ contactId: createdContact.id, areaId });
            }
            const extraGoalIds = createContactDefaults?.goal_ids ?? [];
            for (const goalId of extraGoalIds) {
              linkContactToGoal.mutate({ contactId: createdContact.id, goalId });
            }
            setCreateContactDefaults(undefined);
          },
        },
      );
    },
    [createContact, createContactDefaults, linkContactToProject, linkContactToArea, linkContactToGoal, resolvedProjectId],
  );

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

  if (projectError) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16">
        <ErrorState message="Failed to load this project." onRetry={() => refetchProject()} />
      </div>
    );
  }

  if (isLoadingProject) {
    return <ProjectDetailSkeleton />;
  }

  if (!project) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
        <Button variant="ghost" onClick={() => router.push("/projects")} className="gap-2">
          <ArrowLeft className="size-4" />
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
    <div className="content-fade-in reveal-stagger flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={() => router.push(backHref)}
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
              <h1 className="text-3xl font-bold tracking-tight font-heading">{project.name}</h1>

              <div className="flex flex-wrap items-center gap-2">
                {linkedAreas.length > 0
                  ? linkedAreas.map((linkedArea) => (
                      <Badge
                        key={linkedArea.id}
                        variant="outline"
                        className={cn("h-5 text-xs px-1.5 py-0 items-center", BADGE_COLOR.slate)}
                      >
                        {linkedArea.icon ? `${linkedArea.icon} ` : ""}
                        {linkedArea.name}
                      </Badge>
                    ))
                  : null}
                <Badge
                  variant="outline"
                  className={cn("h-5 text-xs px-1.5 py-0 items-center", STATUS_COLORS[project.status])}
                >
                  {getProjectStatusLabel(project.status)}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn("h-5 text-xs px-1.5 py-0 uppercase items-center", PRIORITY_COLORS[project.priority])}
                >
                  {project.priority}
                </Badge>
                {project.status === "completed" && (
                  <Badge className="bg-green-500/10 text-green-600 border-none text-xs">
                    Completed
                  </Badge>
                )}
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 md:grid-cols-4">
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
                  <DatePicker
                    value={dueDateInput || null}
                    onChange={(value) => {
                      const nextValue = value ?? "";
                      setDueDateInput(nextValue);
                      const nextDueDate = nextValue || null;
                      if (nextDueDate !== (project.due_date ?? null)) {
                        updateProject.mutate({
                          id: project.id,
                          input: { due_date: nextDueDate },
                        });
                      }
                    }}
                    min={new Date().toISOString().slice(0, 10)}
                    className={cn("mt-1 font-medium", dueState.isOverdue && "text-destructive")}
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
                <DeleteEntityPopover
                  variant="detail"
                  entityLabel="project"
                  entityName={project.name}
                  requireTypedConfirmation
                  disabled={deleteProject.isPending}
                  onConfirm={() => {
                    void handleDelete();
                  }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="project-inactive"
                    checked={project.status === "on_hold"}
                    disabled={updateProject.isPending}
                    onCheckedChange={(checked) => handleProjectInactiveToggle(checked === true)}
                  />
                  <Label htmlFor="project-inactive" className="cursor-pointer text-sm">
                    Inactive
                  </Label>
                </div>
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
          onCreateNew={() => setIsNewGoalOpen(true)}
          createLabel="New Goal"
          onLinkExisting={() => setIsLinkGoalOpen(true)}
          linkLabel="Link Goal"
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
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    areaNames={goalAreaNames.length > 0 ? goalAreaNames : undefined}
                    areaIcons={goalAreaIcons}
                    onEdit={() =>
                      router.push(
                        `${buildGoalDetailHref(goal)}?returnTo=${encodeReturnTo(`/projects/${project.slug ?? project.id}`)}&chain=${returnToChain}`,
                      )
                    }
                    onRestore={(g) => restoreGoal.mutate(g.id)}
                    onArchive={(g) => archiveGoal.mutate(g.id)}
                    rollups={goalRollups.get(goal.id)}
                  />
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
          onLinkExisting={() => setIsLinkTaskOpen(true)}
          linkLabel="Link Task"
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
              onNewTask={(groupId) => {
                setNewTaskAreaId(groupId === "unassigned" ? null : groupId);
                setNewTaskGoalId(null);
                setIsNewTaskOpen(true);
              }}
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
              onNewTask={(groupId) => {
                setNewTaskAreaId(null);
                setNewTaskGoalId(groupId === "unassigned" ? null : groupId);
                setIsNewTaskOpen(true);
              }}
              getLinkedAreaNames={getTaskLinkedAreaNames}
              getLinkedAreaIcons={getTaskLinkedAreaIcons}
              getLinkedGoalNames={getTaskLinkedGoalNames}
              getLinkedProjectNames={getTaskLinkedProjectNames}
              emptyMessage="Tasks will be grouped by goal here."
            />
          ) : filteredTasks.length > 0 ? (
            <div className="rounded-xl border bg-card">
              {filteredTasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  linkedAreaNames={getTaskLinkedAreaIds(task).map((id) => areas.find((a) => a.id === id)?.name).filter((n): n is string => Boolean(n))}
                  linkedAreaIcons={getTaskLinkedAreaIds(task).map((id) => areas.find((a) => a.id === id)?.icon ?? null)}
                  linkedGoalNames={getTaskLinkedGoalIds(task).map((id) => goals.find((g) => g.id === id)?.name).filter((n): n is string => Boolean(n))}
                  projectName={project?.name}
                  linkedProjectNames={getTaskLinkedProjectIds(task).map((id) => allProjects.find((p) => p.id === id)?.name).filter((n): n is string => Boolean(n))}
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
              params.set("returnTo", noteReturnTo);
              params.set("chain", JSON.stringify(getRawReturnToChain(searchParams)));
              if (project?.id) {
                params.set("projectId", project.id);
              }
              router.push(`/notes/new?${params.toString()}`);
            }}
          createLabel="New Note"
          onLinkExisting={() => setIsLinkNoteOpen(true)}
          linkLabel="Link Note"
        >
          {(noteTab === "by_area" || noteTab === "by_goal") ? (
            <NotesByGroupView
              groups={noteTab === "by_area" ? noteGroupsByArea : noteGroupsByGoal}
              renderNote={(note) => {
                const noteReturnTo = `/projects/${project?.slug ?? project?.id}`;
                const noteAreas = getNoteLinkedAreaIds(note)
                  .map((id) => { const name = areaNamesMap.get(id); return name ? { name, icon: areaIconsMap.get(id) ?? null } : null; })
                  .filter((a): a is { name: string; icon: string | null } => Boolean(a));
                const noteGoalNames = getNoteLinkedGoalIds(note).map((id) => goalNamesMap.get(id)).filter((n): n is string => Boolean(n));
                const noteProjectNames = project?.name ? [project.name] : [];
                const noteTaskNames = getNoteLinkedTaskIds(note).map((id) => taskNamesMap.get(id)).filter((n): n is string => Boolean(n));
                return (
                  <NoteRow
                    note={note}
                    returnTo={noteReturnTo}
                    returnToChain={returnToChain}
                    areas={noteAreas}
                    goalNames={noteGoalNames}
                    projectNames={noteProjectNames}
                    taskNames={noteTaskNames}
                    onPinToggle={(id, pin) => togglePinNote.mutate({ id, pin })}
                    onFavoriteToggle={(id, favorite) => toggleFavoriteNote.mutate({ id, favorite })}
                    onSaveStatusChange={(id, saved) => updateNote.mutate({ id, input: { status: saved ? "completed" : "inbox" } })}
                    onArchive={(id) => archiveNote.mutate(id)}
                    onRestore={(id) => restoreNote.mutate(id)}
                    onDelete={(id) => deleteNote.mutate(id)}
                  />
                );
              }}
              onNewNote={(groupId) => {
                const noteReturnTo = `/projects/${project?.slug ?? project?.id}`;
                const params = new URLSearchParams();
                params.set("returnTo", noteReturnTo);
                params.set("chain", JSON.stringify(getRawReturnToChain(searchParams)));
                if (project?.id) params.set("projectId", project.id);
                if (noteTab === "by_area") {
                  params.set("areaId", groupId);
                } else {
                  params.set("goalId", groupId);
                }
                router.push(`/notes/new?${params.toString()}`);
              }}
              emptyMessage={noteTab === "by_area" ? "Notes will be grouped by area here." : "Notes will be grouped by goal here."}
            />
          ) : filteredNotes.length > 0 ? (
            <div className="rounded-xl border bg-card">
              {filteredNotes.map((note) => {
                const noteReturnTo = `/projects/${project?.slug ?? project?.id}`;
                const noteAreas = getNoteLinkedAreaIds(note)
                  .map((id) => { const name = areaNamesMap.get(id); return name ? { name, icon: areaIconsMap.get(id) ?? null } : null; })
                  .filter((a): a is { name: string; icon: string | null } => Boolean(a));
                const noteGoalNames = getNoteLinkedGoalIds(note).map((id) => goalNamesMap.get(id)).filter((n): n is string => Boolean(n));
                const noteProjectNames = project?.name ? [project.name] : [];
                const noteTaskNames = getNoteLinkedTaskIds(note).map((id) => taskNamesMap.get(id)).filter((n): n is string => Boolean(n));
                return (
                  <NoteRow
                    key={note.id}
                    note={note}
                    returnTo={noteReturnTo}
                    returnToChain={returnToChain}
                    areas={noteAreas}
                    goalNames={noteGoalNames}
                    projectNames={noteProjectNames}
                    taskNames={noteTaskNames}
                    onPinToggle={(id, pin) => togglePinNote.mutate({ id, pin })}
                    onFavoriteToggle={(id, favorite) => toggleFavoriteNote.mutate({ id, favorite })}
                    onSaveStatusChange={(id, saved) => updateNote.mutate({ id, input: { status: saved ? "completed" : "inbox" } })}
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
          onLinkExisting={() => setIsLinkResourceOpen(true)}
          linkLabel="Link Resource"
        >
          {(resourceTab === "by_area" || resourceTab === "by_goal") ? (
            <ResourcesByGroupView
              groups={resourceTab === "by_area" ? resourceGroupsByArea : resourceGroupsByGoal}
              getAreas={(resource) => {
                const ids = (resource.linkedAreaIds && resource.linkedAreaIds.length > 0)
                  ? resource.linkedAreaIds
                  : (resource.area_id ? [resource.area_id] : []);
                return ids
                  .map((id) => ({ name: areaNamesMap.get(id), icon: areaIconsMap.get(id) ?? null }))
                  .filter((e): e is { name: string; icon: string | null } => Boolean(e.name));
              }}
              getGoalNames={(resource) => (resource.linkedGoalIds ?? []).map((id) => goalNamesMap.get(id)).filter((n): n is string => Boolean(n))}
              getProjectNames={() => project?.name ? [project.name] : []}
              getTaskNames={(resource) => (resource.linkedTaskIds ?? []).map((id) => taskNamesMap.get(id)).filter((n): n is string => Boolean(n))}
              getTopicName={(resource) => resource.topic_id ? topicNamesMap.get(resource.topic_id) : undefined}
              onToggleFavorite={(id, favorite) => toggleFavoriteResource.mutate({ id, favorite })}
              onArchive={(id) => archiveResource.mutate(id)}
              onUnarchive={(id) => unarchiveResource.mutate(id)}
              onDelete={(id) => deleteResource.mutate(id)}
              onEdit={handleResourceEdit}
              onSaveStatusChange={(id, saved) => updateResource.mutate({ id, input: { status: saved ? "completed" : "inbox" } })}
              onNewResource={(groupId) => {
                setNewResourceGroupId(groupId === "unassigned" ? null : groupId);
                setNewResourceGroupType(resourceTab === "by_area" ? "area" : "goal");
                setIsNewResourceOpen(true);
              }}
              emptyMessage={resourceTab === "by_area" ? "Resources will be grouped by area here." : "Resources will be grouped by goal here."}
            />
          ) : filteredResources.length > 0 ? (
            <div className="rounded-xl border border-border">
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
                const resourceProjectNames = getResourceLinkedProjectIds(resource)
                  .map((id) => allProjectNamesMap.get(id))
                  .filter((n): n is string => Boolean(n));
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
                    onSaveStatusChange={(id, saved) => updateResource.mutate({ id, input: { status: saved ? "completed" : "inbox" } })}
                    onArchive={(id) => archiveResource.mutate(id)}
                    onUnarchive={(id) => unarchiveResource.mutate(id)}
                    onDelete={(id) => deleteResource.mutate(id)}
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
          heading="Contacts"
          tabs={contactTabs}
          activeTab={contactTab}
          onTabChange={setContactTab}
          isLoading={false}
          emptyTitle="No linked people"
          emptyDescription="Create a new contact to attach to this project, or link an existing one."
          onCreateNew={() => setIsNewContactOpen(true)}
          createLabel="New Contact"
          onLinkExisting={() => setIsLinkContactOpen(true)}
          linkLabel="Link Contact"
        >
          {contactTab === "follow_up" ? (
            <ContactsFollowUpView
              sections={projectContactFollowUpSections}
              onEdit={handleContactEdit}
              onDelete={handleContactDelete}
              onToggleFavorite={handleContactToggleFavorite}
              onArchive={handleContactArchive}
            />
          ) : contactTab === "by_group" ? (
            <ContactsByCategoryView
              sections={projectContactGroupSections}
              onCreateInSection={handleCreateContactInSection}
              onEdit={handleContactEdit}
              onDelete={handleContactDelete}
              onToggleFavorite={handleContactToggleFavorite}
              onArchive={handleContactArchive}
            />
          ) : contactTab === "by_area" ? (
            <ContactsByCategoryView
              sections={projectContactAreaSections}
              onCreateInSection={handleCreateContactInSection}
              onEdit={handleContactEdit}
              onDelete={handleContactDelete}
              onToggleFavorite={handleContactToggleFavorite}
              onArchive={handleContactArchive}
            />
          ) : contactTab === "by_goal" ? (
            <ContactsByCategoryView
              sections={projectContactGoalSections}
              onCreateInSection={handleCreateContactInSection}
              onEdit={handleContactEdit}
              onDelete={handleContactDelete}
              onToggleFavorite={handleContactToggleFavorite}
              onArchive={handleContactArchive}
            />
          ) : filteredContacts.length > 0 ? (
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
                    returnToChain={returnToChain}
                  />
                </div>
              ))}
            </div>
          ) : null}
        </GoalDetailSection>
      </div>

      <LinkEntityDialog
        open={isLinkAreaOpen}
        onOpenChange={setIsLinkAreaOpen}
        title="Link Area"
        emptyMessage="All active areas are already linked to this project."
        candidates={eligibleAreas}
        getKey={(a) => a.id}
        getSearchText={(a) => `${a.name} ${a.description ?? ""}`}
        renderItem={(a) => (
          <div>
            <p className="truncate font-medium">
              {a.icon ? `${a.icon} ` : ""}
              {a.name}
            </p>
            {a.description ? (
              <p className="text-sm text-muted-foreground">{a.description}</p>
            ) : null}
          </div>
        )}
        onLink={(a) => handleLinkArea(a.id)}
      />

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

      <TaskDialog
        open={isNewTaskOpen}
        onOpenChange={(open) => {
          setIsNewTaskOpen(open);
          if (!open) {
            setNewTaskAreaId(null);
            setNewTaskGoalId(null);
          }
        }}
        defaultProjectId={project.id}
        defaultAreaId={newTaskAreaId ?? undefined}
        defaultGoalId={newTaskGoalId ?? undefined}
        onSuccess={() => {
          setIsNewTaskOpen(false);
          setNewTaskAreaId(null);
          setNewTaskGoalId(null);
        }}
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
        onOpenChange={(open) => {
          setIsNewContactOpen(open);
          if (!open) setCreateContactDefaults(undefined);
        }}
        contact={null}
        defaults={createContactDefaults ?? { project_ids: project?.id ? [project.id] : [] }}
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
        onOpenChange={(open) => {
          setIsNewResourceOpen(open);
          if (!open) {
            setNewResourceGroupId(null);
            setNewResourceGroupType(null);
          }
        }}
        initialProjectId={project.id}
        initialAreaIds={newResourceGroupType === "area" && newResourceGroupId ? [newResourceGroupId] : []}
        initialGoalIds={newResourceGroupType === "goal" && newResourceGroupId ? [newResourceGroupId] : []}
        onSubmit={async (input) => {
          await createResource.mutateAsync(input as Parameters<typeof createResource.mutateAsync>[0]);
          setIsNewResourceOpen(false);
          setNewResourceGroupId(null);
          setNewResourceGroupType(null);
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

      {/* New Goal Dialog (auto-links to this project) */}
      <GoalDialog
        open={isNewGoalOpen}
        onOpenChange={setIsNewGoalOpen}
        availableAreaIds={projectLinkedAreaIds}
        onSuccess={(createdGoal) => {
          if (createdGoal && resolvedProjectId) {
            linkProjectToGoal.mutate({ projectId: resolvedProjectId, goalId: createdGoal.id });
          }
          setIsNewGoalOpen(false);
        }}
      />

      {/* Link existing dialogs */}
      <LinkEntityDialog
        open={isLinkTaskOpen}
        onOpenChange={setIsLinkTaskOpen}
        title="Link Task"
        emptyMessage="No more active tasks available to link."
        candidates={linkTaskCandidates}
        getKey={(t) => t.id}
        getSearchText={(t) => t.name}
        renderItem={(t) => <p className="truncate font-medium">{t.name}</p>}
        onLink={(t) => handleLinkTask(t)}
      />
      <LinkEntityDialog
        open={isLinkNoteOpen}
        onOpenChange={setIsLinkNoteOpen}
        title="Link Note"
        emptyMessage="No more active notes available to link."
        candidates={linkNoteCandidates}
        getKey={(n) => n.id}
        getSearchText={(n) => n.name}
        renderItem={(n) => <p className="truncate font-medium">{n.name}</p>}
        onLink={(n) => handleLinkNote(n)}
      />
      <LinkEntityDialog
        open={isLinkResourceOpen}
        onOpenChange={setIsLinkResourceOpen}
        title="Link Resource"
        emptyMessage="No more active resources available to link."
        candidates={linkResourceCandidates}
        getKey={(r) => r.id}
        getSearchText={(r) => r.name}
        renderItem={(r) => <p className="truncate font-medium">{r.name}</p>}
        onLink={(r) => handleLinkResourceExisting(r)}
      />
      <LinkEntityDialog
        open={isLinkContactOpen}
        onOpenChange={setIsLinkContactOpen}
        title="Link Contact"
        emptyMessage="No more active contacts available to link."
        candidates={linkContactCandidates}
        getKey={(c) => c.id}
        getSearchText={(c) => `${c.name} ${c.organization ?? ""}`}
        renderItem={(c) => (
          <div>
            <p className="truncate font-medium">{c.name}</p>
            {c.organization ? (
              <p className="text-sm text-muted-foreground">{c.organization}</p>
            ) : null}
          </div>
        )}
        onLink={(c) => handleLinkContactExisting(c.id)}
      />
    </div>
  );
}

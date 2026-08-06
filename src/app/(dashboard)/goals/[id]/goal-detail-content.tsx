"use client";

import { useEffect } from "react";
import React, { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  ChevronDownIcon,
  ChevronRightIcon,
  Edit,
  Link as LinkIcon,
  Target,
  Unlink,
} from "lucide-react";

import { ContactCard } from "@/components/entities/contact-card";
import { ContactDialog, type ContactDialogDefaults } from "@/components/entities/contact-dialog";
import { ContactsByCategoryView } from "@/components/views/contacts-by-category-view";
import { ContactsFollowUpView } from "@/components/views/contacts-follow-up-view";
import { GoalDialog } from "@/components/entities/goal-dialog";
import { DeleteEntityPopover } from "@/components/entities/delete-entity-popover";
import { GoalDetailSection } from "@/components/entities/goal-detail-section";
import { GoalDetailSkeleton } from "@/components/entities/detail-skeletons";
import { LinkEntityDialog } from "@/components/entities/link-entity-dialog";
import { PriorityBadge } from "@/components/entities/priority-badge";
import { ProjectCard } from "@/components/entities/project-card";
import { ProjectDialog } from "@/components/entities/project-dialog";
import { ResourceDialog } from "@/components/entities/resource-dialog";
import { NoteRow } from "@/components/entities/note-row";
import { ResourceRow } from "@/components/entities/resource-row";
import { TaskDialog } from "@/components/entities/task-dialog";
import { TaskListItem } from "@/components/entities/task-list-item";
import { TasksByGroupView, type TaskGroup } from "@/components/views/tasks-by-group-view";
import { NotesByGroupView, type NoteGroup } from "@/components/views/notes-by-group-view";
import { ResourcesByGroupView, type ResourceGroup } from "@/components/views/resources-by-group-view";
import { ProjectsByAreaView, type ProjectsByAreaGroup } from "@/components/views/projects-by-area-view";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/views/empty-state";
import { ErrorState } from "@/components/views/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";

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

import { Separator } from "@/components/ui/separator";
import ProgressRing from "@/components/charts/progress-ring";
import { useAreas } from "@/lib/hooks/use-areas";
import {
  useContacts,
  useContactByGoal,
  useCreateContact,
  useDeleteContact,
  useLinkContactToArea,
  useLinkContactToGoal,
  useLinkContactToProject,
  useToggleContactFavorite,
  useArchiveContact,
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
  useArchiveTask,
  useCompleteTaskWithGoalRefresh,
  useFocusTask,
  usePermanentDeleteTask,
  useRestoreTask,
  useTasks,
  useUpdateTask,
} from "@/lib/hooks/use-tasks";
import { useProjects, useLinkProjectToGoal, useArchiveProject, useRestoreProject } from "@/lib/hooks/use-projects";
import { useNotes, useToggleFavoriteNote, useTogglePinNote, useArchiveNote, useRestoreNote, useDeleteNote, useUpdateNote, useLinkNoteToGoal } from "@/lib/hooks/use-notes";
import { useResources, useToggleFavoriteResource, useCreateResource, useDeleteResource, useUpdateResource, useArchiveResource, useUnarchiveResource, useLinkResourceToGoal } from "@/lib/hooks/use-resources";
import { useTopics } from "@/lib/hooks/use-topics";
import { useEscapeBack } from "@/lib/hooks/use-escape-back";
import { contactService } from "@/lib/services/contact.service";
import { cn } from "@/lib/utils";
import type { Contact, CreateResourceInput, Project, Resource, Task } from "@/lib/types/domain.types";
import { NOTE_STATUS, RESOURCE_STATUS } from "@/lib/utils/constants";
import { useUIStore } from "@/lib/stores/ui.store";
import { getGoalLinkedAreaIds } from "@/lib/utils/goals";
import { getNoteLinkedAreaIds, getNoteLinkedGoalIds, getNoteLinkedProjectIds, getNoteLinkedTaskIds } from "@/lib/utils/notes";
import { getProjectLinkedAreaIds } from "@/lib/utils/projects";
import { getResourceLinkedAreaIds, getResourceLinkedProjectIds } from "@/lib/utils/resources";
import { filterCandidatesByAreaScope, getContactLinkedAreaIds } from "@/lib/utils/area-scoped-candidates";
import {
  buildAreaContactGroupSections,
  buildAreaContactFollowUpSections,
  buildAreaContactProjectSections,
  buildContactByAreaSections,
} from "@/lib/utils/area-detail";
import { buildGroupSections } from "@/lib/utils/contact-category-sections";
import { buildReturnTo, buildReturnToChain, encodeReturnTo, getRawReturnToChain, popReturnToHref, resolveGoalDetailNavigation } from "@/lib/utils/return-to";
import { getTaskLinkedAreaIds, getTaskLinkedGoalIds, getTaskLinkedProjectIds } from "@/lib/utils/tasks";
import { PRIORITY_COLORS, BADGE_COLOR } from "@/lib/constants/entity-colors";

const TERM_LABELS: Record<string, string> = {
  short: "Short Term",
  mid: "Mid Term",
  long: "Long Term",
};

const TERM_COLORS: Record<string, string> = {
  short: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  mid: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  long: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
};

const TERM_EMOJIS: Record<string, string> = {
  short: "⚡",
  mid: "📅",
  long: "🏔️",
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

export function GoalDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const goalId = params.id as string;
  const { setPageTitle } = useUIStore();
  const currentPagePath = `/goals/${goalId}`;

  // UI state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLinkAreaOpen, setIsLinkAreaOpen] = useState(false);
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [targetDateDraft, setTargetDateDraft] = useState("");
  const [projectTab, setProjectTab] = useState("all");
  const [taskTab, setTaskTab] = useState("all");
  const [noteTab, setNoteTab] = useState("all");
  const [resourceTab, setResourceTab] = useState("all");
  const [contactTab, setContactTab] = useState("all");
  const [isNewContactOpen, setIsNewContactOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [newProjectAreaId, setNewProjectAreaId] = useState<string | null>(null);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [newTaskAreaId, setNewTaskAreaId] = useState<string | null>(null);
  const [newTaskProjectId, setNewTaskProjectId] = useState<string | null>(null);
  const [newTaskProjectScopedId, setNewTaskProjectScopedId] = useState<string | null>(null);
  const [isNewResourceOpen, setIsNewResourceOpen] = useState(false);
  const [newResourceGroupId, setNewResourceGroupId] = useState<string | null>(null);
  const [newResourceGroupType, setNewResourceGroupType] = useState<"area" | "project" | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [createContactDefaults, setCreateContactDefaults] = useState<ContactDialogDefaults | undefined>(undefined);
  const [isLinkProjectOpen, setIsLinkProjectOpen] = useState(false);
  const [isLinkTaskOpen, setIsLinkTaskOpen] = useState(false);
  const [isLinkNoteOpen, setIsLinkNoteOpen] = useState(false);
  const [isLinkResourceOpen, setIsLinkResourceOpen] = useState(false);
  const [isLinkContactOpen, setIsLinkContactOpen] = useState(false);

  // Refs for scroll-to-section
  const projectsRef = useRef<HTMLDivElement>(null);
  const tasksRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);
  const resourcesRef = useRef<HTMLDivElement>(null);
  const peopleRef = useRef<HTMLDivElement>(null);

  // Queries
  const { data: goalData, isLoading, isError: goalError, refetch: refetchGoalDetail } = useGoalDetail(goalId);
  const resolvedGoalId = goalData?.goal.id ?? "";
  const { data: areas = [] } = useAreas();
  const { data: allProjects = [] } = useProjects({ status: "all" });
  const { data: allNotes = [] } = useNotes({ status: "all" });
  const { data: allResources = [] } = useResources({ status: "all" });
  const { data: allTasksGlobal = [] } = useTasks();
  const { data: allGoalsGlobal = [] } = useGoals({ status: "all" });
  const { data: topics = [] } = useTopics();
  const { data: allContacts = [] } = useContacts();
  const { data: allArchivedContacts = [] } = useContacts({ archive: true });
  const { data: goalContactLinks = [] } = useContactByGoal(resolvedGoalId);

  // Mutations
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();
  const linkGoalToArea = useLinkGoalToArea();
  const unlinkGoalFromArea = useUnlinkGoalFromArea();
  const completeTask = useCompleteTaskWithGoalRefresh();
  const updateTask = useUpdateTask();
  const archiveTask = useArchiveTask();
  const restoreTask = useRestoreTask();
  const permanentDeleteTask = usePermanentDeleteTask();
  const focusTask = useFocusTask();
  const toggleFavoriteNote = useToggleFavoriteNote();
  const togglePinNote = useTogglePinNote();
  const archiveNote = useArchiveNote();
  const restoreNote = useRestoreNote();
  const deleteNote = useDeleteNote();
  const updateNote = useUpdateNote();
  const toggleFavoriteResource = useToggleFavoriteResource();
  const createResource = useCreateResource();
  const updateResource = useUpdateResource();
  const archiveResource = useArchiveResource();
  const unarchiveResource = useUnarchiveResource();
  const deleteResource = useDeleteResource();
  const linkContactToGoal = useLinkContactToGoal();
  const linkContactToProject = useLinkContactToProject();
  const linkContactToArea = useLinkContactToArea();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();
  const toggleContactFavorite = useToggleContactFavorite();
  const archiveContact = useArchiveContact();
  const linkProjectToGoal = useLinkProjectToGoal();
  const archiveProject = useArchiveProject();
  const restoreProject = useRestoreProject();
  const linkNoteToGoal = useLinkNoteToGoal();
  const linkResourceToGoal = useLinkResourceToGoal();

  // Derived
  const goal = goalData?.goal;
  // Inline `[newProjectAreaId]` literals are intentional: the dialogs
  // gate their reset effect on a stable reset key (lastResetKeyRef), so
  // a new array reference on each render no longer wipes the user's
  // in-progress form values.
  const newProjectDefaultAreaIds = newProjectAreaId ? [newProjectAreaId] : undefined;

  const areaNames = useMemo(() => new Map(areas.map((a) => [a.id, a.name])), [areas]);
  const areaIcons = useMemo(() => new Map(areas.map((a) => [a.id, a.icon ?? null])), [areas]);
  const goalNamesMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of allGoalsGlobal ?? []) map.set(g.id, g.name);
    if (goalData?.goal) map.set(goalData.goal.id, goalData.goal.name);
    for (const g of goalData?.extraGoalNames ?? []) map.set(g.id, g.name);
    return map;
  }, [allGoalsGlobal, goalData]);
  const projectNamesMap = useMemo(() => {
    const map = new Map(allProjects.map((p) => [p.id, p.name]));
    for (const p of goalData?.projects ?? []) map.set(p.id, p.name);
    return map;
  }, [allProjects, goalData?.projects]);
  const taskNamesMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of allTasksGlobal ?? []) map.set(t.id, t.name);
    for (const t of goalData?.tasks ?? []) map.set(t.id, t.name);
    for (const t of goalData?.extraTaskNames ?? []) map.set(t.id, t.name);
    return map;
  }, [allTasksGlobal, goalData?.tasks, goalData?.extraTaskNames]);

  const topicNamesMap = useMemo(() => {
    // Prefer names carried in the goal-detail payload (available on first paint)
    // and fall back to the live topics query for anything not yet hydrated.
    const map = new Map(topics.map((t) => [t.id, t.name]));
    for (const t of goalData?.topicNames ?? []) map.set(t.id, t.name);
    return map;
  }, [topics, goalData?.topicNames]);
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
  const goalNestedReturnTo = goalNavigation.nestedReturnTo;
  const returnToChain = buildReturnToChain(searchParams);
  const goalBackHref = popReturnToHref(searchParams, "/goals");
  useEscapeBack(goalBackHref);
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
  const allLinkedContacts = useMemo(
    () => [
      ...allContacts.filter((c) => linkedContactIds.has(c.id)),
      ...allArchivedContacts.filter((c) => linkedContactIds.has(c.id)),
    ],
    [allContacts, allArchivedContacts, linkedContactIds],
  );
  const activeLinkedContacts = useMemo(
    () => allLinkedContacts.filter((c) => !c.archive),
    [allLinkedContacts],
  );
  const archivedLinkedContacts = useMemo(
    () => allLinkedContacts.filter((c) => c.archive),
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
      case "by_project":
      case "by_area":
        return activeLinkedContacts;
      case "archived":
        return archivedLinkedContacts;
      default:
        return activeLinkedContacts;
    }
  }, [contactTab, activeLinkedContacts, archivedLinkedContacts]);

  const goalContactFollowUpSections = useMemo(
    () => buildAreaContactFollowUpSections(activeLinkedContacts),
    [activeLinkedContacts],
  );
  const goalContactGroupSections = useMemo(() => {
    const grouped = contactService.getByGroupSync(activeLinkedContacts);
    return buildGroupSections(grouped);
  }, [activeLinkedContacts]);
  const goalContactAreaSections = useMemo(
    () => buildContactByAreaSections(activeLinkedContacts, areas),
    [activeLinkedContacts, areas],
  );
  const goalContactProjectSections = useMemo(
    () => buildAreaContactProjectSections(activeLinkedContacts, allProjects),
    [activeLinkedContacts, allProjects],
  );

  const handleCreateContactInSection = useCallback(
    (section: { id: string }) => {
      const defaults: ContactDialogDefaults = {};
      const [category, entityId] = section.id.split(":");
      if (category === "group") {
        defaults.group = entityId;
        if (goal?.id) defaults.goal_ids = [goal.id];
      } else if (category === "project" && entityId !== "unassigned") {
        defaults.project_ids = [entityId];
      } else if (category === "area" && entityId !== "unassigned") {
        defaults.area_ids = [entityId];
      } else if (category === "goal" && entityId !== "unassigned") {
        defaults.goal_ids = [entityId];
      } else if (goal?.id) {
        defaults.goal_ids = [goal.id];
      }
      setCreateContactDefaults(defaults);
      setIsNewContactOpen(true);
    },
    [goal],
  );

  // Sync page title with goal name
  useEffect(() => {
    if (goal) {
      setPageTitle(goal.name);
    }
    return () => setPageTitle("");
  }, [goal, setPageTitle]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTargetDateDraft(goal?.target_date ?? "");
  }, [goal?.target_date]);

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
  const noteTabs = useMemo(() => {
    const all = goalData?.notes ?? [];
    const active = all.filter((n) => !n.is_archived);
    const archived = all.filter((n) => n.is_archived);
    return [
      { value: "all", label: "All", count: active.length },
      { value: "inbox", label: "Inbox", count: active.filter((n) => n.status === NOTE_STATUS.INBOX).length },
      { value: "to_review", label: "To Review", count: active.filter((n) => n.status === NOTE_STATUS.TO_REVIEW).length },
      { value: "active", label: "Active", count: active.filter((n) => n.status === NOTE_STATUS.ACTIVE).length },
      { value: "by_area", label: "By Area" },
      { value: "by_project", label: "By Project" },
      { value: "completed", label: "Completed", count: active.filter((n) => n.status === NOTE_STATUS.COMPLETED).length },
      { value: "archived", label: "Archive", count: archived.length },
    ];
  }, [goalData?.notes]);

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
      case "completed":
        return activeNotes.filter((n) => n.status === NOTE_STATUS.COMPLETED);
      case "by_area":
      case "by_project":
        return activeNotes;
      default:
        return activeNotes;
    }
  }, [goalData?.notes, noteTab]);

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
      groupName: areaId === "unassigned" ? "No Area" : (areaNames.get(areaId) ?? areaId),
      notes,
    }));
  }, [filteredNotes, areaNames]);

  const noteGroupsByProject = useMemo<NoteGroup[]>(() => {
    const grouped = new Map<string, typeof filteredNotes>();
    for (const note of filteredNotes) {
      const ids = getNoteLinkedProjectIds(note);
      const keys = ids.length > 0 ? ids : ["unassigned"];
      for (const projectId of keys) {
        const current = grouped.get(projectId) ?? [];
        current.push(note);
        grouped.set(projectId, current);
      }
    }
    return Array.from(grouped.entries()).map(([projectId, notes]) => ({
      groupId: projectId,
      groupName: projectId === "unassigned" ? "No Project" : (projectNamesMap.get(projectId) ?? projectId),
      notes,
    }));
  }, [filteredNotes, projectNamesMap]);

  // Static resource tabs — no dynamic type tabs on goal detail
  const resourceTabs = useMemo(() => {
    const all = goalData?.resources ?? [];
    const active = all.filter((r) => !r.is_archived);
    const archived = all.filter((r) => r.is_archived);
    return [
      { value: "all", label: "All", count: active.length },
      { value: "inbox", label: "Inbox", count: active.filter((r) => r.status === RESOURCE_STATUS.INBOX).length },
      { value: "to_review", label: "To Review", count: active.filter((r) => r.status === RESOURCE_STATUS.TO_REVIEW).length },
      { value: "active", label: "Active", count: active.filter((r) => r.status === RESOURCE_STATUS.ACTIVE).length },
      { value: "by_area", label: "By Area" },
      { value: "by_project", label: "By Project" },
      { value: "completed", label: "Completed", count: active.filter((r) => r.status === RESOURCE_STATUS.COMPLETED).length },
      { value: "archived", label: "Archive", count: archived.length },
    ];
  }, [goalData?.resources]);

  // Filter resources by tab
  const filteredResources = useMemo(() => {
    const resources = goalData?.resources ?? [];
    switch (resourceTab) {
      case "inbox":
        return resources.filter((r) => r.status === RESOURCE_STATUS.INBOX && !r.is_archived);
      case "to_review":
        return resources.filter((r) => r.status === RESOURCE_STATUS.TO_REVIEW && !r.is_archived);
      case "active":
        return resources.filter((r) => r.status === RESOURCE_STATUS.ACTIVE && !r.is_archived);
      case "completed":
        return resources.filter((r) => r.status === RESOURCE_STATUS.COMPLETED && !r.is_archived);
      case "archived":
        return resources.filter((r) => r.is_archived);
      case "by_area":
      case "by_project":
        return resources.filter((r) => !r.is_archived);
      default:
        return resources.filter((r) => !r.is_archived);
    }
  }, [goalData?.resources, resourceTab]);

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
      groupName: areaId === "unassigned" ? "No Area" : (areaNames.get(areaId) ?? areaId),
      resources,
    }));
  }, [filteredResources, areaNames]);

  const resourceGroupsByProject = useMemo<ResourceGroup[]>(() => {
    const grouped = new Map<string, typeof filteredResources>();
    for (const resource of filteredResources) {
      const ids = getResourceLinkedProjectIds(resource);
      const keys = ids.length > 0 ? ids : ["unassigned"];
      for (const projectId of keys) {
        const current = grouped.get(projectId) ?? [];
        current.push(resource);
        grouped.set(projectId, current);
      }
    }
    return Array.from(grouped.entries()).map(([projectId, resources]) => ({
      groupId: projectId,
      groupName: projectId === "unassigned" ? "No Project" : (projectNamesMap.get(projectId) ?? projectId),
      resources,
    }));
  }, [filteredResources, projectNamesMap]);

  // Project section tabs
  const projectTabs = [
    { value: "all", label: "All", count: goalData?.rollups.projectCount },
    {
      value: "inbox",
      label: "Inbox",
      count: goalData?.projects.filter((p) => p.status === "inbox" && !p.is_archived).length,
    },
    {
      value: "planning",
      label: "Planning",
      count: goalData?.projects.filter((p) => p.status === "planning" && !p.is_archived).length,
    },
    {
      value: "in_progress",
      label: "In Progress",
      count: goalData?.projects.filter((p) => p.status === "active" && !p.is_archived).length,
    },
    {
      value: "on_hold",
      label: "On Hold",
      count: goalData?.projects.filter((p) => p.status === "on_hold" && !p.is_archived).length,
    },
    { value: "by_status", label: "By Status" },
    { value: "by_area", label: "By Area" },
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
      case "inbox":
        return projects.filter((p) => p.status === "inbox" && !p.is_archived);
      case "planning":
        return projects.filter((p) => p.status === "planning" && !p.is_archived);
      case "in_progress":
        return projects.filter((p) => p.status === "active" && !p.is_archived);
      case "on_hold":
        return projects.filter((p) => p.status === "on_hold" && !p.is_archived);
      case "completed":
        return projects.filter((p) => p.status === "completed" && !p.is_archived);
      case "archived":
        return projects.filter((p) => p.is_archived);
      case "by_status":
      case "by_area":
        return projects.filter((p) => !p.is_archived);
      default:
        return projects.filter((p) => !p.is_archived);
    }
  }, [goalData?.projects, projectTab]);

  const projectGroupsByArea = useMemo<ProjectsByAreaGroup[]>(() => {
    const grouped = new Map<string, Project[]>();
    for (const project of filteredProjects) {
      const ids = getProjectLinkedAreaIds(project);
      if (ids.length === 0) {
        const current = grouped.get("unassigned") ?? [];
        current.push(project);
        grouped.set("unassigned", current);
      } else {
        for (const areaId of ids) {
          const current = grouped.get(areaId) ?? [];
          current.push(project);
          grouped.set(areaId, current);
        }
      }
    }
    return Array.from(grouped.entries()).map(([areaId, projects]) => ({
      areaId,
      areaName: areaId === "unassigned" ? "Unassigned" : (areaNames.get(areaId) ?? areaId),
      projects,
    }));
  }, [filteredProjects, areaNames]);

  // Task section tabs
  const taskTabs = useMemo(() => {
    const tasks = goalData?.tasks ?? [];
    const active = tasks.filter((t) => !t.is_archived);
    const archived = tasks.filter((t) => t.is_archived);
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
      { value: "by_project", label: "By Project" },
      {
        value: "completed",
        label: "Completed",
        count: active.filter((t) => t.is_completed).length,
      },
      { value: "archived", label: "Archived", count: archived.length },
    ];
  }, [goalData?.tasks]);

  const filteredTasks = useMemo(() => {
    const tasks = goalData?.tasks ?? [];
    if (taskTab === "archived") return tasks.filter((t) => t.is_archived);
    const active = tasks.filter((t) => !t.is_archived);
    switch (taskTab) {
      case "inbox":
        return active.filter((t) => t.status === "inbox" && !t.is_completed);
      case "upcoming":
        return active.filter(
          (t) => t.status !== "inbox" && t.status !== "completed" && !t.is_completed,
        );
      case "overdue":
        return active.filter((t) => {
          if (!t.due_date || t.is_completed) return false;
          return new Date(t.due_date) < new Date();
        });
      case "by_area":
      case "by_project":
        return active;
      case "completed":
        return active.filter((t) => t.is_completed);
      default:
        return active;
    }
  }, [goalData?.tasks, taskTab]);

  // Group builders for by-area / by-project tabs (mirror /tasks page semantics)
  const taskGroupAreaMap = useMemo(() => {
    const map = new Map<string, { name: string; icon?: string | null }>();
    for (const a of areas) map.set(a.id, { name: a.name, icon: a.icon ?? null });
    return map;
  }, [areas]);
  const taskGroupGoalMap = useMemo(() => {
    const map = new Map<string, { name: string }>();
    for (const g of allGoalsGlobal ?? []) map.set(g.id, { name: g.name });
    if (goal) map.set(goal.id, { name: goal.name });
    for (const g of goalData?.extraGoalNames ?? []) map.set(g.id, { name: g.name });
    return map;
  }, [allGoalsGlobal, goal, goalData?.extraGoalNames]);
  const taskGroupProjectMap = useMemo(() => {
    const map = new Map<string, { name: string }>();
    for (const p of allProjects) map.set(p.id, { name: p.name });
    for (const p of goalData?.projects ?? []) map.set(p.id, { name: p.name });
    return map;
  }, [allProjects, goalData?.projects]);

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

  const taskGroupsByProject = useMemo<TaskGroup[]>(() => {
    const grouped = new Map<string, Task[]>();
    for (const task of filteredTasks) {
      const ids = getTaskLinkedProjectIds(task);
      if (ids.length === 0) {
        const current = grouped.get("unassigned") ?? [];
        current.push(task);
        grouped.set("unassigned", current);
      } else {
        for (const projectId of ids) {
          const current = grouped.get(projectId) ?? [];
          current.push(task);
          grouped.set(projectId, current);
        }
      }
    }
    return Array.from(grouped.entries()).map(([projectId, groupTasks]) => ({
      groupId: projectId,
      groupName:
        projectId === "unassigned"
          ? "No Project"
          : (taskGroupProjectMap.get(projectId)?.name ?? projectId),
      tasks: groupTasks,
    }));
  }, [filteredTasks, taskGroupProjectMap]);

  const getTaskLinkedAreaNames = useCallback(
    (task: Task) =>
      getTaskLinkedAreaIds(task)
        .map((id) => areaNames.get(id))
        .filter((n): n is string => Boolean(n)),
    [areaNames],
  );
  const getTaskLinkedAreaIcons = useCallback(
    (task: Task) =>
      getTaskLinkedAreaIds(task).map((id) => areaIcons.get(id) ?? null),
    [areaIcons],
  );
  const getTaskLinkedGoalNames = useCallback(
    (task: Task) =>
      (task.linkedGoalIds ?? [])
        .map((id) => goalNamesMap.get(id))
        .filter((n): n is string => Boolean(n)),
    [goalNamesMap],
  );
  const getTaskLinkedProjectNames = useCallback(
    (task: Task) =>
      getTaskLinkedProjectIds(task)
        .map((id) => projectNamesMap.get(id))
        .filter((n): n is string => Boolean(n)),
    [projectNamesMap],
  );

  // Scroll helpers
  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  // Handlers
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

  const handleTaskEdit = useCallback((task: Task) => {
    setEditingTask(task);
  }, []);

  const handleResourceEdit = useCallback((resource: Resource) => {
    setEditingResource(resource);
  }, []);

  const handleGoalInactiveToggle = useCallback(async (checked: boolean) => {
    if (!goal || checked === goal.is_inactive) return;
    await updateGoal.mutateAsync({
      id: goal.id,
      input: { is_inactive: checked },
    });
  }, [goal, updateGoal]);

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

  const handleResourceToggleFavorite = useCallback(
    (resourceId: string, favorite: boolean) => {
      toggleFavoriteResource.mutate({ id: resourceId, favorite });
    },
    [toggleFavoriteResource],
  );

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
            const extraProjectIds = createContactDefaults?.project_ids ?? [];
            for (const projectId of extraProjectIds) {
              linkContactToProject.mutate({ contactId: createdContact.id, projectId });
            }
            const extraAreaIds = createContactDefaults?.area_ids ?? [];
            for (const areaId of extraAreaIds) {
              linkContactToArea.mutate({ contactId: createdContact.id, areaId });
            }
            setCreateContactDefaults(undefined);
          },
        },
      );
    },
    [createContact, createContactDefaults, goal, linkContactToGoal, linkContactToProject, linkContactToArea],
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

  // Link-existing candidate lists (entities NOT yet linked to this goal).
  // Each list is scoped to the goal's areas: only entities tied to one of
  // those areas, plus entities with no area assigned, are eligible.
  const linkedProjectIdSet = useMemo(
    () => new Set((goalData?.projects ?? []).map((p) => p.id)),
    [goalData?.projects],
  );
  const linkProjectCandidates = useMemo(
    () =>
      filterCandidatesByAreaScope(
        allProjects.filter((p) => !p.is_archived && !linkedProjectIdSet.has(p.id)),
        linkedAreaIds,
        getProjectLinkedAreaIds,
      ),
    [allProjects, linkedProjectIdSet, linkedAreaIds],
  );
  const linkedTaskIdSet = useMemo(
    () => new Set((goalData?.tasks ?? []).map((t) => t.id)),
    [goalData?.tasks],
  );
  const linkTaskCandidates = useMemo(
    () =>
      filterCandidatesByAreaScope(
        allTasksGlobal.filter((t) => !t.is_archived && !linkedTaskIdSet.has(t.id)),
        linkedAreaIds,
        getTaskLinkedAreaIds,
      ),
    [allTasksGlobal, linkedTaskIdSet, linkedAreaIds],
  );
  const linkedNoteIdSet = useMemo(
    () => new Set((goalData?.notes ?? []).map((n) => n.id)),
    [goalData?.notes],
  );
  const linkNoteCandidates = useMemo(
    () =>
      filterCandidatesByAreaScope(
        allNotes.filter((n) => !n.is_archived && !linkedNoteIdSet.has(n.id)),
        linkedAreaIds,
        getNoteLinkedAreaIds,
      ),
    [allNotes, linkedNoteIdSet, linkedAreaIds],
  );
  const linkedResourceIdSet = useMemo(
    () => new Set((goalData?.resources ?? []).map((r) => r.id)),
    [goalData?.resources],
  );
  const linkResourceCandidates = useMemo(
    () =>
      filterCandidatesByAreaScope(
        allResources.filter((r) => !r.is_archived && !linkedResourceIdSet.has(r.id)),
        linkedAreaIds,
        getResourceLinkedAreaIds,
      ),
    [allResources, linkedResourceIdSet, linkedAreaIds],
  );
  const linkContactCandidates = useMemo(
    () =>
      filterCandidatesByAreaScope(
        allContacts.filter((c) => !c.archive && !linkedContactIds.has(c.id)),
        linkedAreaIds,
        getContactLinkedAreaIds,
      ),
    [allContacts, linkedContactIds, linkedAreaIds],
  );

  const handleLinkProject = useCallback((projectId: string) => {
    if (!goal) return;
    linkProjectToGoal.mutate({ projectId, goalId: goal.id });
    setIsLinkProjectOpen(false);
  }, [goal, linkProjectToGoal]);

  const handleLinkTask = useCallback(async (task: Task) => {
    if (!goal) return;
    const existing = task.linkedGoalIds ?? [];
    if (existing.includes(goal.id)) {
      setIsLinkTaskOpen(false);
      return;
    }
    const nextGoalIds = Array.from(new Set([...existing, goal.id]));
    try {
      await updateTask.mutateAsync({ id: task.id, input: { goal_ids: nextGoalIds } });
      toast.success("Task linked to goal");
    } catch {
      // updateTask already surfaces an error toast.
    }
    setIsLinkTaskOpen(false);
  }, [goal, updateTask]);

  const handleLinkNote = useCallback((noteId: string) => {
    if (!goal) return;
    linkNoteToGoal.mutate({ noteId, goalId: goal.id });
    setIsLinkNoteOpen(false);
  }, [goal, linkNoteToGoal]);

  const handleLinkResource = useCallback((resourceId: string) => {
    if (!goal) return;
    linkResourceToGoal.mutate({ resourceId, goalId: goal.id });
    setIsLinkResourceOpen(false);
  }, [goal, linkResourceToGoal]);

  const handleLinkContact = useCallback((contactId: string) => {
    if (!goal) return;
    linkContactToGoal.mutate({ contactId, goalId: goal.id });
    setIsLinkContactOpen(false);
  }, [goal, linkContactToGoal]);

  if (goalError) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16">
        <ErrorState message="Failed to load this goal." onRetry={() => refetchGoalDetail()} />
      </div>
    );
  }

  if (isLoading) {
    return <GoalDetailSkeleton />;
  }

  if (!goal) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
        <Button variant="ghost" onClick={() => router.push("/goals")} className="gap-2">
          <ArrowLeft className="size-4" />
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
    <div className="content-fade-in reveal-stagger flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={() => router.push(goalBackHref)}
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
        <div className="flex items-start justify-between gap-3 p-4 sm:gap-4 sm:p-6">
          <div className="flex items-start gap-2 sm:gap-4 min-w-0">
            {/* Progress ring — mobile matches GoalCard (48/4); desktop keeps detail scale */}
            <ProgressRing
              percentage={goalProgressPercent}
              size={48}
              strokeWidth={4}
              className="shrink-0 sm:hidden"
            />
            <div className="relative hidden items-center justify-center sm:flex">
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

            <div className="min-w-0 space-y-1.5 sm:space-y-2">
              {/* Title — mobile matches GoalCard (text-sm font-medium); desktop keeps detail scale */}
              <h1 className="truncate text-sm font-medium tracking-tight font-heading sm:text-3xl sm:font-bold sm:overflow-visible sm:whitespace-normal">
                {goal.name}
              </h1>

              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {getGoalLinkedAreaIds(goal).map((areaId) => {
                  const area = areas.find((a) => a.id === areaId);
                  if (!area) return null;
                  return (
                    <Badge
                      key={areaId}
                      variant="outline"
                      className={cn("h-5 text-xs px-1.5 py-0 items-center", BADGE_COLOR.slate)}
                    >
                      {area.icon ? `${area.icon} ` : ""}{area.name}
                    </Badge>
                  );
                })}
                <Badge variant="outline" className={cn("h-5 text-xs px-1.5 py-0 items-center", TERM_COLORS[goal.term])}>
                  {TERM_EMOJIS[goal.term] ? `${TERM_EMOJIS[goal.term]} ` : ""}{TERM_LABELS[goal.term] ?? goal.term}
                </Badge>
                <Badge variant="outline" className={cn("h-5 text-xs px-1.5 py-0 uppercase items-center", PRIORITY_COLORS[goal.priority])}>
                  {goal.priority}
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
                    "flex items-center gap-1.5 text-xs sm:text-sm",
                    dueState.isOverdue && "text-destructive font-medium",
                  )}
                >
                  <Calendar className="size-3 sm:size-3.5" />
                  {dueState.text}
                </div>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPropertiesOpen(!isPropertiesOpen)}
            className="gap-1 shrink-0 text-xs sm:text-sm"
          >
            Properties
            {isPropertiesOpen ? (
              <ChevronDownIcon className="size-3.5" />
            ) : (
              <ChevronRightIcon className="size-3.5" />
            )}
          </Button>
        </div>

        {/* Goal Activity Rollups — mobile: emoji + count (GoalCard); desktop: bubble chips */}
        <div className="flex flex-wrap items-center gap-4 px-4 pb-4 text-sm text-muted-foreground sm:hidden">
          <button
            type="button"
            onClick={() => scrollToSection("projects")}
            className="flex items-center gap-1 transition-colors hover:text-foreground"
            title="Projects"
          >
            <span className="text-xs">📁</span>
            <span>{goal?.projectCount ?? 0}</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("tasks")}
            className="flex items-center gap-1 transition-colors hover:text-foreground"
            title="Tasks"
          >
            <span className="text-xs">☑️</span>
            <span>{goal?.taskCount ?? 0}</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("notes")}
            className="flex items-center gap-1 transition-colors hover:text-foreground"
            title="Notes"
          >
            <span className="text-xs">📝</span>
            <span>{goal?.noteCount ?? 0}</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("resources")}
            className="flex items-center gap-1 transition-colors hover:text-foreground"
            title="Resources"
          >
            <span className="text-xs">🔗</span>
            <span>{goal?.resourceCount ?? 0}</span>
          </button>
        </div>
        <div className="hidden flex-wrap items-center gap-4 px-6 pb-4 sm:flex">
          <button
            type="button"
            onClick={() => scrollToSection("projects")}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-blue-600 dark:text-blue-400">
              {goal?.projectCount ?? 0}
            </span>
            <span className="text-muted-foreground">Projects</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("tasks")}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-green-600 dark:text-green-400">
              {goal?.taskCount ?? 0}
            </span>
            <span className="text-muted-foreground">Tasks</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("notes")}
            className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors hover:bg-muted/50"
          >
            <span className="font-medium text-purple-600 dark:text-purple-400">
              {goal?.noteCount ?? 0}
            </span>
            <span className="text-muted-foreground">Notes</span>
          </button>
          <button
            type="button"
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
            <div className="space-y-4 p-4 sm:p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 md:grid-cols-4">
                {/* Areas */}
                <div>
                  <Label className="text-xs text-muted-foreground">Areas</Label>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {linkedAreas.length > 0 ? (
                      linkedAreas.map((area) => (
                        <Badge
                          key={area.id}
                          variant="secondary"
                          className="flex items-center gap-1 text-xs sm:text-sm"
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
                  <p className="mt-1 text-sm font-medium sm:text-base">
                    {TERM_LABELS[goal.term] ?? goal.term}
                  </p>
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
                  <DatePicker
                    value={targetDateDraft || null}
                    onChange={(value) => {
                      const newDate = value ?? "";
                      setTargetDateDraft(newDate);
                      if (newDate !== (goal.target_date ?? "")) {
                        updateGoal.mutate({ id: goal.id, input: { target_date: newDate || null } });
                      }
                    }}
                    min={new Date().toISOString().slice(0, 10)}
                    className={cn(
                      "mt-1 text-sm font-medium sm:text-base",
                      dueState?.isOverdue && "text-destructive",
                    )}
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
                <DeleteEntityPopover
                  variant="detail"
                  entityLabel="goal"
                  entityName={goal.name}
                  requireTypedConfirmation
                  disabled={deleteGoal.isPending}
                  onConfirm={() => {
                    void handleDeleteGoal();
                  }}
                />
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="goal-inactive"
                    checked={goal.is_inactive ?? false}
                    disabled={updateGoal.isPending}
                    onCheckedChange={(checked) => handleGoalInactiveToggle(checked === true)}
                  />
                  <Label htmlFor="goal-inactive" className="cursor-pointer text-sm">
                    Inactive
                  </Label>
                </div>
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
          onLinkExisting={() => setIsLinkProjectOpen(true)}
          linkLabel="Link Project"
        >
          {projectTab === "by_status" ? (
            <KanbanBoard
              projects={filteredProjects}
              areas={areas}
              onProjectClick={(project) => router.push(`/projects/${project.slug ?? project.id}?returnTo=${encodeReturnTo(currentPagePathWithSlug)}&chain=${returnToChain}`)}
            />
          ) : projectTab === "by_area" ? (
            <ProjectsByAreaView
              groups={projectGroupsByArea}
              areaNames={areaNames}
              areaIcons={areaIcons}
              duplicateIndices={new Map()}
              isLoading={isLoading}
              onEdit={(project) => router.push(`/projects/${project.slug ?? project.id}?returnTo=${encodeReturnTo(currentPagePathWithSlug)}&chain=${returnToChain}`)}
              onCreateProject={(areaId) => {
                setNewProjectAreaId(areaId === "unassigned" ? null : areaId);
                setIsNewProjectOpen(true);
              }}
              returnTo={currentPagePathWithSlug}
              returnToChain={returnToChain}
            />
          ) : filteredProjects.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  areaName={project.area_id ? areaNames.get(project.area_id) : undefined}
                  areaNames={getProjectAreaNames(project)}
                  areaIcons={getProjectAreaIcons(project)}
                  returnTo={currentPagePathWithSlug}
                  returnToChain={returnToChain}
                  onArchive={(p) => archiveProject.mutate(p.id)}
                  onRestore={(p) => restoreProject.mutate(p.id)}
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
                setNewTaskProjectId(null);
                setIsNewTaskOpen(true);
              }}
              getLinkedAreaNames={getTaskLinkedAreaNames}
              getLinkedAreaIcons={getTaskLinkedAreaIcons}
              getLinkedGoalNames={getTaskLinkedGoalNames}
              getLinkedProjectNames={getTaskLinkedProjectNames}
              emptyMessage="Tasks will be grouped by area here."
            />
          ) : taskTab === "by_project" ? (
            <TasksByGroupView
              groups={taskGroupsByProject}
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
                setNewTaskProjectId(null);
                setNewTaskProjectScopedId(groupId === "unassigned" ? null : groupId);
                setIsNewTaskOpen(true);
              }}
              getLinkedAreaNames={getTaskLinkedAreaNames}
              getLinkedAreaIcons={getTaskLinkedAreaIcons}
              getLinkedGoalNames={getTaskLinkedGoalNames}
              getLinkedProjectNames={getTaskLinkedProjectNames}
              emptyMessage="Tasks will be grouped by project here."
            />
          ) : filteredTasks.length > 0 ? (
            <div className="rounded-lg border bg-card">
              {filteredTasks.map((task) => {
                const taskLinkedAreaIds = getTaskLinkedAreaIds(task);
                return (
                  <TaskListItem
                    key={task.id}
                    task={task}
                    linkedAreaNames={taskLinkedAreaIds.map((id) => areaNames.get(id)).filter((n): n is string => Boolean(n))}
                    linkedAreaIcons={taskLinkedAreaIds.map((id) => areaIcons.get(id) ?? null)}
                    linkedGoalNames={getTaskLinkedGoalIds(task).map((id) => goalNamesMap.get(id)).filter((n): n is string => Boolean(n))}
                    projectName={
                      (() => { const id = getTaskLinkedProjectIds(task)[0]; return id ? projectNamesMap.get(id) ?? null : null; })()
                    }
                    linkedProjectNames={getTaskLinkedProjectIds(task).map((id) => projectNamesMap.get(id)).filter((n): n is string => Boolean(n))}
                    onCompletionToggle={handleTaskCompletion}
                    onFocusToggle={handleTaskFocus}
                    onNameSave={handleTaskNameSave}
                    onArchiveToggle={handleTaskArchiveToggle}
                    onPermanentDelete={handlePermanentDelete}
                    onEdit={handleTaskEdit}
                  />
                );
              })}
            </div>
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
            params.set("returnTo", goalNestedReturnTo);
            params.set("chain", JSON.stringify(getRawReturnToChain(searchParams)));
            params.set("goalId", goal.id);
            router.push(`/notes/new?${params.toString()}`);
          }}
          createLabel="New Note"
          onLinkExisting={() => setIsLinkNoteOpen(true)}
          linkLabel="Link Note"
        >
          {(noteTab === "by_area" || noteTab === "by_project") ? (
            <NotesByGroupView
              groups={noteTab === "by_area" ? noteGroupsByArea : noteGroupsByProject}
              renderNote={(note) => {
                const noteAreas = getNoteLinkedAreaIds(note)
                  .map((id) => { const name = areaNames.get(id); return name ? { name, icon: areaIcons.get(id) ?? null } : null; })
                  .filter((a): a is { name: string; icon: string | null } => Boolean(a));
                const noteGoalNames = getNoteLinkedGoalIds(note).map((id) => goalNamesMap.get(id)).filter((n): n is string => Boolean(n));
                const noteProjectNames = getNoteLinkedProjectIds(note).map((id) => projectNamesMap.get(id)).filter((n): n is string => Boolean(n));
                const noteTaskNames = getNoteLinkedTaskIds(note).map((id) => taskNamesMap.get(id)).filter((n): n is string => Boolean(n));
                return (
                  <NoteRow
                    note={note}
                    returnTo={goalNestedReturnTo}
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
                const params = new URLSearchParams();
                params.set("returnTo", goalNestedReturnTo);
                params.set("chain", JSON.stringify(getRawReturnToChain(searchParams)));
                params.set("goalId", goal.id);
                if (noteTab === "by_area") {
                  params.set("areaId", groupId);
                } else {
                  params.set("projectId", groupId);
                }
                router.push(`/notes/new?${params.toString()}`);
              }}
              emptyMessage={noteTab === "by_area" ? "Notes will be grouped by area here." : "Notes will be grouped by project here."}
            />
          ) : filteredNotes.length > 0 ? (
            <div className="rounded-lg border bg-card">
              {filteredNotes.map((note) => {
                const noteAreas = getNoteLinkedAreaIds(note)
                  .map((id) => { const name = areaNames.get(id); return name ? { name, icon: areaIcons.get(id) ?? null } : null; })
                  .filter((a): a is { name: string; icon: string | null } => Boolean(a));
                const noteGoalNames = getNoteLinkedGoalIds(note).map((id) => goalNamesMap.get(id)).filter((n): n is string => Boolean(n));
                const noteProjectNames = getNoteLinkedProjectIds(note).map((id) => projectNamesMap.get(id)).filter((n): n is string => Boolean(n));
                const noteTaskNames = getNoteLinkedTaskIds(note).map((id) => taskNamesMap.get(id)).filter((n): n is string => Boolean(n));
                return (
                  <NoteRow
                    key={note.id}
                    note={note}
                    returnTo={goalNestedReturnTo}
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
          onLinkExisting={() => setIsLinkResourceOpen(true)}
          linkLabel="Link Resource"
        >
          {(resourceTab === "by_area" || resourceTab === "by_project") ? (
            <ResourcesByGroupView
              groups={resourceTab === "by_area" ? resourceGroupsByArea : resourceGroupsByProject}
              getAreas={(resource) => {
                const ids = (resource.linkedAreaIds && resource.linkedAreaIds.length > 0)
                  ? resource.linkedAreaIds
                  : (resource.area_id ? [resource.area_id] : []);
                return ids
                  .map((id) => ({ name: areaNames.get(id), icon: areaIcons.get(id) ?? null }))
                  .filter((e): e is { name: string; icon: string | null } => Boolean(e.name));
              }}
              getGoalNames={(resource) => (resource.linkedGoalIds ?? []).map((id) => goalNamesMap.get(id)).filter((n): n is string => Boolean(n))}
              getProjectNames={(resource) => getResourceLinkedProjectIds(resource).map((id) => projectNamesMap.get(id)).filter((n): n is string => Boolean(n))}
              getTaskNames={(resource) => (resource.linkedTaskIds ?? []).map((id) => taskNamesMap.get(id)).filter((n): n is string => Boolean(n))}
              getTopicName={(resource) => resource.topic_id ? topicNamesMap.get(resource.topic_id) : undefined}
              onToggleFavorite={handleResourceToggleFavorite}
              onArchive={(id) => archiveResource.mutate(id)}
              onUnarchive={(id) => unarchiveResource.mutate(id)}
              onDelete={(id) => deleteResource.mutate(id)}
              onEdit={handleResourceEdit}
              onSaveStatusChange={(id, saved) => updateResource.mutate({ id, input: { status: saved ? "completed" : "inbox" } })}
              onNewResource={(groupId) => {
                setNewResourceGroupId(groupId === "unassigned" ? null : groupId);
                setNewResourceGroupType(resourceTab === "by_area" ? "area" : "project");
                setIsNewResourceOpen(true);
              }}
              emptyMessage={resourceTab === "by_area" ? "Resources will be grouped by area here." : "Resources will be grouped by project here."}
            />
          ) : filteredResources.length > 0 ? (
            <div className="rounded-lg border border-border">
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
                const resourceProjectNames = getResourceLinkedProjectIds(resource)
                  .map((id) => projectNamesMap.get(id))
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
                    onToggleFavorite={handleResourceToggleFavorite}
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

      {/* People Section */}
      <div ref={peopleRef}>
        <GoalDetailSection
          id="people"
          entityType="people"
          heading="Contacts"
          tabs={contactTabs}
          activeTab={contactTab}
          onTabChange={setContactTab}
          isLoading={isLoading}
          emptyTitle="No people linked to this goal"
          emptyDescription="Add people to track relationships that contribute to this goal."
          onCreateNew={() => setIsNewContactOpen(true)}
          createLabel="New Contact"
          onLinkExisting={() => setIsLinkContactOpen(true)}
          linkLabel="Link Contact"
        >
          {contactTab === "follow_up" ? (
            <ContactsFollowUpView
              sections={goalContactFollowUpSections}
              onEdit={handleContactEdit}
              onDelete={handleContactDelete}
              onToggleFavorite={handleContactToggleFavorite}
              onArchive={handleContactArchive}
            />
          ) : contactTab === "by_group" ? (
            <ContactsByCategoryView
              sections={goalContactGroupSections}
              onCreateInSection={handleCreateContactInSection}
              onEdit={handleContactEdit}
              onDelete={handleContactDelete}
              onToggleFavorite={handleContactToggleFavorite}
              onArchive={handleContactArchive}
            />
          ) : contactTab === "by_area" ? (
            <ContactsByCategoryView
              sections={goalContactAreaSections}
              onCreateInSection={handleCreateContactInSection}
              onEdit={handleContactEdit}
              onDelete={handleContactDelete}
              onToggleFavorite={handleContactToggleFavorite}
              onArchive={handleContactArchive}
            />
          ) : contactTab === "by_project" ? (
            <ContactsByCategoryView
              sections={goalContactProjectSections}
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
                    returnTo={buildReturnTo(`/goals/${goalId}`)}
                    returnToChain={returnToChain}
                  />
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

      <LinkEntityDialog
        open={isLinkAreaOpen}
        onOpenChange={setIsLinkAreaOpen}
        title="Link Area"
        emptyMessage="All active areas are already linked to this goal."
        candidates={unlinkedAreas}
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

      {/* Inline Project Creation */}
      <ProjectDialog
        open={isNewProjectOpen}
        onOpenChange={(open) => {
          setIsNewProjectOpen(open);
          if (!open) setNewProjectAreaId(null);
        }}
        goalId={goal.id}
        defaultAreaIds={newProjectDefaultAreaIds}
        onSuccess={() => {
          setIsNewProjectOpen(false);
          setNewProjectAreaId(null);
        }}
      />

      {/* Inline Task Creation */}
      <TaskDialog
        open={isNewTaskOpen}
        onOpenChange={(open) => {
          setIsNewTaskOpen(open);
          if (!open) {
            setNewTaskAreaId(null);
            setNewTaskProjectId(null);
            setNewTaskProjectScopedId(null);
          }
        }}
        defaultGoalId={newTaskProjectScopedId ? undefined : goal.id}
        defaultAreaId={newTaskAreaId ?? undefined}
        defaultProjectId={newTaskProjectId ?? undefined}
        allowedProjectIds={newTaskProjectScopedId ? undefined : allowedProjectIds}
        projectScoped={(() => {
          if (!newTaskProjectScopedId) return undefined;
          const scopedProject =
            (goalData?.projects ?? []).find((p) => p.id === newTaskProjectScopedId) ??
            allProjects.find((p) => p.id === newTaskProjectScopedId);
          if (!scopedProject) return undefined;
          const scopedAreaIds = getProjectLinkedAreaIds(scopedProject);
          const scopedGoalIds = Array.from(
            new Set([
              ...(scopedProject.linkedGoalIds ?? []),
              goal.id,
            ]),
          );
          return {
            projectId: scopedProject.id,
            projectName: scopedProject.name,
            areaId: scopedProject.area_id ?? null,
            linkedAreaIds: scopedAreaIds,
            linkedGoalIds: scopedGoalIds,
          };
        })()}
        onSuccess={() => {
          setIsNewTaskOpen(false);
          setNewTaskAreaId(null);
          setNewTaskProjectId(null);
          setNewTaskProjectScopedId(null);
        }}
      />

      {/* Task Edit Dialog */}
      <TaskDialog
        open={!!editingTask}
        onOpenChange={(open) => !open && setEditingTask(null)}
        task={editingTask}
        defaultGoalId={goal.id}
        allowedProjectIds={allowedProjectIds}
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

      {/* Inline Resource Creation */}
      <ResourceDialog
        open={isNewResourceOpen}
        onOpenChange={(open) => {
          setIsNewResourceOpen(open);
          if (!open) {
            setNewResourceGroupId(null);
            setNewResourceGroupType(null);
          }
        }}
        initialGoalIds={[goal.id]}
        initialAreaIds={newResourceGroupType === "area" && newResourceGroupId ? [newResourceGroupId] : []}
        initialProjectId={newResourceGroupType === "project" && newResourceGroupId ? newResourceGroupId : undefined}
        onSubmit={async (input) => {
          await createResource.mutateAsync(input as CreateResourceInput);
          setIsNewResourceOpen(false);
          setNewResourceGroupId(null);
          setNewResourceGroupType(null);
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
        onOpenChange={(open) => {
          setIsNewContactOpen(open);
          if (!open) setCreateContactDefaults(undefined);
        }}
        contact={null}
        defaults={createContactDefaults ?? (goal?.id ? { goal_ids: [goal.id] } : undefined)}
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

      {/* Link existing dialogs */}
      <LinkEntityDialog
        open={isLinkProjectOpen}
        onOpenChange={setIsLinkProjectOpen}
        title="Link Project"
        emptyMessage="No more active projects available to link."
        candidates={linkProjectCandidates}
        getKey={(p) => p.id}
        getSearchText={(p) => p.name}
        renderItem={(p) => (
          <p className="truncate font-medium">{p.name}</p>
        )}
        onLink={(p) => handleLinkProject(p.id)}
      />

      <LinkEntityDialog
        open={isLinkTaskOpen}
        onOpenChange={setIsLinkTaskOpen}
        title="Link Task"
        emptyMessage="No more active tasks available to link."
        candidates={linkTaskCandidates}
        getKey={(t) => t.id}
        getSearchText={(t) => t.name}
        renderItem={(t) => (
          <p className="truncate font-medium">{t.name}</p>
        )}
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
        renderItem={(n) => (
          <p className="truncate font-medium">{n.name}</p>
        )}
        onLink={(n) => handleLinkNote(n.id)}
      />

      <LinkEntityDialog
        open={isLinkResourceOpen}
        onOpenChange={setIsLinkResourceOpen}
        title="Link Resource"
        emptyMessage="No more active resources available to link."
        candidates={linkResourceCandidates}
        getKey={(r) => r.id}
        getSearchText={(r) => r.name}
        renderItem={(r) => (
          <p className="truncate font-medium">{r.name}</p>
        )}
        onLink={(r) => handleLinkResource(r.id)}
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
        onLink={(c) => handleLinkContact(c.id)}
      />
    </div>
  );
}

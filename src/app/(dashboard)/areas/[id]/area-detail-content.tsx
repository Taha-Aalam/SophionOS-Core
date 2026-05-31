"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronDownIcon,
  ChevronRightIcon,
  Edit,
  Target,
  Trash2,
} from "lucide-react";

import { ContactCard } from "@/components/entities/contact-card";
import { ContactDialog, type ContactDialogDefaults } from "@/components/entities/contact-dialog";
import { ContactsByCategoryView } from "@/components/views/contacts-by-category-view";
import { ContactsFollowUpView } from "@/components/views/contacts-follow-up-view";
import { GoalDetailSection } from "@/components/entities/goal-detail-section";
import { GoalCard } from "@/components/entities/goal-card";
import { GoalDialog } from "@/components/entities/goal-dialog";
import { LinkEntityDialog } from "@/components/entities/link-entity-dialog";
import { ProjectCard } from "@/components/entities/project-card";
import { ProjectDialog } from "@/components/entities/project-dialog";
import { ResourceDialog } from "@/components/entities/resource-dialog";
import { NoteRow } from "@/components/entities/note-row";
import { NotesByGroupView, type NoteGroup } from "@/components/views/notes-by-group-view";
import { ResourcesByGroupView, type ResourceGroup } from "@/components/views/resources-by-group-view";
import { ProjectsByGoalView, type ProjectsByGoalGroup } from "@/components/views/projects-by-goal-view";
import { Skeleton } from "@/components/ui/skeleton";
import { useArchiveNote, useRestoreNote, useDeleteNote, useToggleFavoriteNote, useTogglePinNote, useUpdateNote, useNotes } from "@/lib/hooks/use-notes";
import { ResourceRow } from "@/components/entities/resource-row";
import { TaskDialog } from "@/components/entities/task-dialog";
import { TaskListItem } from "@/components/entities/task-list-item";
import { EmptyState } from "@/components/views/empty-state";
import { TasksByGroupView } from "@/components/views/tasks-by-group-view";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/components/providers/auth-provider";
import {
  useContacts,
  useCreateContact,
  useLinkContactToArea,
  useToggleContactFavorite,
  useArchiveContact,
  useDeleteContact,
  useUpdateContact,
} from "@/lib/hooks/use-contacts";
import { useAreaDetail, AREA_DETAIL_QUERY_KEY } from "@/lib/hooks/use-area-detail";
import { useAreas, useArchiveArea, useRestoreArea, useUpdateArea } from "@/lib/hooks/use-areas";
import { useRestoreGoal, useGoals, useLinkGoalToArea, useArchiveGoal } from "@/lib/hooks/use-goals";
import { useProjects, useLinkProjectToArea, useArchiveProject, useRestoreProject } from "@/lib/hooks/use-projects";
import {
  useArchiveTask,
  useCompleteTaskWithGoalRefresh,
  useFocusTask,
  usePermanentDeleteTask,
  useRestoreTask,
  useUpdateTask,
  useTasks,
} from "@/lib/hooks/use-tasks";
import {
  useArchiveResource,
  useCreateResource,
  useToggleFavoriteResource,
  useUnarchiveResource,
  useUpdateResource,
  useResources,
} from "@/lib/hooks/use-resources";
import { useTopics } from "@/lib/hooks/use-topics";
import { contactService } from "@/lib/services/contact.service";
import { useQueryClient } from "@tanstack/react-query";
import { type Contact, type CreateResourceInput, type Resource, type Task } from "@/lib/types/domain.types";
import { RESOURCE_STATUS } from "@/lib/utils/constants";
import { useUIStore } from "@/lib/stores/ui.store";
import { cn } from "@/lib/utils";
import { normalizeAreaType, classifyAreaStatus, type AreaStatus } from "@/lib/utils/areas";
import { buildGoalDetailHref } from "@/lib/utils/goal-urls";
import { buildReturnTo, encodeReturnTo, getReturnToFromSearchParams, resolveBackNavigation } from "@/lib/utils/return-to";
import { getTaskLinkedAreaIds, getTaskLinkedGoalIds, getTaskLinkedProjectIds } from "@/lib/utils/tasks";
import { buildAreaTaskGroupsByGoal, buildAreaTaskGroupsByProject, getFilteredAreaProjects, getFilteredAreaNotes, getFilteredAreaResources, buildAreaContactGoalSections, buildAreaContactProjectSections, buildAreaContactGroupSections, buildAreaContactFollowUpSections } from "@/lib/utils/area-detail";
import { getGoalLinkedAreaIds } from "@/lib/utils/goals";
import { getProjectLinkedAreaIds } from "@/lib/utils/projects";

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
  const [createDefaults, setCreateDefaults] = useState<ContactDialogDefaults | undefined>(undefined);
  const [isNewResourceOpen, setIsNewResourceOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [newResourceGoalId, setNewResourceGoalId] = useState<string | null>(null);
  const [newResourceProjectId, setNewResourceProjectId] = useState<string | null>(null);
  const [isNewGoalOpen, setIsNewGoalOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [newProjectGoalId, setNewProjectGoalId] = useState<string | null>(null);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isTaskEditOpen, setIsTaskEditOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTaskGoalId, setNewTaskGoalId] = useState<string | null>(null);
  const [newTaskProjectId, setNewTaskProjectId] = useState<string | null>(null);
  const [isLinkGoalOpen, setIsLinkGoalOpen] = useState(false);
  const [isLinkProjectOpen, setIsLinkProjectOpen] = useState(false);
  const [isLinkTaskOpen, setIsLinkTaskOpen] = useState(false);
  const [isLinkNoteOpen, setIsLinkNoteOpen] = useState(false);
  const [isLinkResourceOpen, setIsLinkResourceOpen] = useState(false);
  const [isLinkContactOpen, setIsLinkContactOpen] = useState(false);

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
  const restoreGoal = useRestoreGoal();
  const archiveGoal = useArchiveGoal();
  const completeTask = useCompleteTaskWithGoalRefresh();
  const updateTask = useUpdateTask();
  const archiveTask = useArchiveTask();
  const restoreTask = useRestoreTask();
  const permanentDeleteTask = usePermanentDeleteTask();
  const focusTask = useFocusTask();
  const linkContactToArea = useLinkContactToArea();
  const createContact = useCreateContact();
  const createResource = useCreateResource();
  const updateResource = useUpdateResource();
  const archiveResource = useArchiveResource();
  const unarchiveResource = useUnarchiveResource();
  const toggleFavoriteResource = useToggleFavoriteResource();
  const { data: topics = [] } = useTopics();
  const toggleContactFavorite = useToggleContactFavorite();
  const archiveContact = useArchiveContact();
  const deleteContact = useDeleteContact();
  const updateContact = useUpdateContact();
  const archiveNote = useArchiveNote();
  const restoreNote = useRestoreNote();
  const deleteNote = useDeleteNote();
  const updateNote = useUpdateNote();
  const linkGoalToArea = useLinkGoalToArea();
  const linkProjectToArea = useLinkProjectToArea();
  const archiveProject = useArchiveProject();
  const restoreProject = useRestoreProject();
  const { data: allGoalsGlobal = [] } = useGoals({ status: "all" });
  const { data: allProjectsGlobal = [] } = useProjects({ status: "all" });
  const { data: allTasksGlobal = [] } = useTasks();
  const { data: allNotesGlobal = [] } = useNotes({ status: "all" });
  const { data: allResourcesGlobal = [] } = useResources({ status: "all" });
  const toggleFavoriteNote = useToggleFavoriteNote();
  const togglePinNote = useTogglePinNote();

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
    for (const p of allProjectsGlobal ?? []) {
      if (p?.name) map.set(p.id, p.name);
    }
    for (const p of areaData?.projects ?? []) {
      if (p?.name) map.set(p.id, p.name);
    }
    return map;
  }, [areaData?.projects, allProjectsGlobal]);

  const tasksById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of areaData?.tasks ?? []) {
      if (t?.name) map.set(t.id, t.name);
    }
    return map;
  }, [areaData?.tasks]);

  const topicNamesMap = useMemo(() => {
    const map = new Map(topics.map((t) => [t.id, t.name]));
    for (const t of areaData?.topicNames ?? []) map.set(t.id, t.name);
    return map;
  }, [topics, areaData?.topicNames]);

  const areaMap = useMemo(() => {
    const map = new Map<string, { name: string; icon?: string | null }>();
    for (const a of allAreasList) {
      map.set(a.id, { name: a.name, icon: a.icon ?? null });
    }
    if (area) map.set(area.id, { name: area.name, icon: area.icon ?? null });
    return map;
  }, [allAreasList, area]);

  const goalMap = useMemo(() => {
    const map = new Map<string, { name: string }>();
    for (const g of areaData?.allGoals ?? []) {
      if (g?.name) map.set(g.id, { name: g.name });
    }
    return map;
  }, [areaData?.allGoals]);

  const projectMap = useMemo(() => {
    const map = new Map<string, { name: string }>();
    for (const p of areaData?.projects ?? []) {
      if (p?.name) map.set(p.id, { name: p.name });
    }
    return map;
  }, [areaData?.projects]);

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
      if (goalTab === "active" && isAutoInactive(g)) return false;
      if (term && g.term !== term) return false;
      return true;
    });
  }, [areaData?.goals, goalTab]);

  const filteredProjects = useMemo(
    () => getFilteredAreaProjects(areaData?.projects ?? [], projectTab as "all" | "inbox" | "planning" | "in_progress" | "on_hold" | "completed" | "archived"),
    [areaData?.projects, projectTab],
  );

  const projectsByGoalGroups = useMemo<ProjectsByGoalGroup[]>(() => {
    const projects = (areaData?.projects ?? []).filter((p) => !p.is_archived);
    const grouped = new Map<string, typeof projects>();
    for (const project of projects) {
      const ids = project.linkedGoalIds ?? [];
      const keys = ids.length > 0 ? ids : ["unassigned"];
      for (const goalId of keys) {
        const current = grouped.get(goalId) ?? [];
        current.push(project);
        grouped.set(goalId, current);
      }
    }
    return Array.from(grouped.entries()).map(([goalId, ps]) => ({
      goalId,
      goalName: goalId === "unassigned" ? "No Goal" : (allGoalsById.get(goalId) ?? goalId),
      projects: ps,
    }));
  }, [areaData?.projects, allGoalsById]);

  const activeTasks = useMemo(() => {
    const tasks = areaData?.tasks;
    if (!tasks) return [];
    return tasks.filter((t) => !t.is_archived);
  }, [areaData?.tasks]);

  const filteredTasks = useMemo(() => {
    if (taskTab === "archived") return areaData?.archivedTasks ?? [];
    const nonArchived = activeTasks;
    if (taskTab === "all") return nonArchived;
    if (taskTab === "inbox") return nonArchived.filter((t) => t.status === "inbox" && !t.is_completed);
    if (taskTab === "upcoming")
      return nonArchived.filter((t) => t.status !== "inbox" && t.status !== "completed" && !t.is_completed);
    if (taskTab === "overdue")
      return nonArchived.filter((t) => {
        if (!t.due_date || t.is_completed) return false;
        return new Date(t.due_date) < new Date();
      });
    if (taskTab === "by_goal") return nonArchived;
    if (taskTab === "by_project") return nonArchived;
    if (taskTab === "completed") return nonArchived.filter((t) => t.is_completed);
    return nonArchived;
  }, [activeTasks, areaData?.archivedTasks, taskTab]);

  const taskGroupsByGoal = useMemo(
    () => buildAreaTaskGroupsByGoal(activeTasks, areaData?.allGoals ?? []),
    [activeTasks, areaData?.allGoals],
  );

  const taskGroupsByProject = useMemo(
    () => buildAreaTaskGroupsByProject(activeTasks, areaData?.projects ?? []),
    [activeTasks, areaData?.projects],
  );

  const filteredNotes = useMemo(
    () => getFilteredAreaNotes(areaData?.notes ?? [], noteTab),
    [areaData?.notes, noteTab],
  );

  const noteGroupsByGoal = useMemo<NoteGroup[]>(() => {
    const notes = (areaData?.notes ?? []).filter((n) => !n.is_archived);
    const grouped = new Map<string, typeof notes>();
    for (const note of notes) {
      const ids = note.linkedGoalIds ?? [];
      const keys = ids.length > 0 ? ids : ["unassigned"];
      for (const goalId of keys) {
        const current = grouped.get(goalId) ?? [];
        current.push(note);
        grouped.set(goalId, current);
      }
    }
    return Array.from(grouped.entries()).map(([goalId, ns]) => ({
      groupId: goalId,
      groupName: goalId === "unassigned" ? "No Goal" : (allGoalsById.get(goalId) ?? goalId),
      notes: ns,
    }));
  }, [areaData?.notes, allGoalsById]);

  const noteGroupsByProject = useMemo<NoteGroup[]>(() => {
    const notes = (areaData?.notes ?? []).filter((n) => !n.is_archived);
    const grouped = new Map<string, typeof notes>();
    for (const note of notes) {
      const ids = note.linkedProjectIds ?? [];
      const keys = ids.length > 0 ? ids : ["unassigned"];
      for (const projectId of keys) {
        const current = grouped.get(projectId) ?? [];
        current.push(note);
        grouped.set(projectId, current);
      }
    }
    return Array.from(grouped.entries()).map(([projectId, ns]) => ({
      groupId: projectId,
      groupName: projectId === "unassigned" ? "No Project" : (projectsById.get(projectId) ?? projectId),
      notes: ns,
    }));
  }, [areaData?.notes, projectsById]);

  const filteredResources = useMemo(
    () => getFilteredAreaResources(linkedResources, resourceTab),
    [linkedResources, resourceTab],
  );

  const resourceGroupsByGoal = useMemo<ResourceGroup[]>(() => {
    const resources = linkedResources.filter((r) => !r.is_archived);
    const grouped = new Map<string, typeof resources>();
    for (const resource of resources) {
      const ids = resource.linkedGoalIds ?? [];
      const keys = ids.length > 0 ? ids : ["unassigned"];
      for (const goalId of keys) {
        const current = grouped.get(goalId) ?? [];
        current.push(resource);
        grouped.set(goalId, current);
      }
    }
    return Array.from(grouped.entries()).map(([goalId, rs]) => ({
      groupId: goalId,
      groupName: goalId === "unassigned" ? "No Goal" : (allGoalsById.get(goalId) ?? goalId),
      resources: rs,
    }));
  }, [linkedResources, allGoalsById]);

  const resourceGroupsByProject = useMemo<ResourceGroup[]>(() => {
    const resources = linkedResources.filter((r) => !r.is_archived);
    const grouped = new Map<string, typeof resources>();
    for (const resource of resources) {
      const projectId = resource.project_id ?? "unassigned";
      const current = grouped.get(projectId) ?? [];
      current.push(resource);
      grouped.set(projectId, current);
    }
    return Array.from(grouped.entries()).map(([projectId, rs]) => ({
      groupId: projectId,
      groupName: projectId === "unassigned" ? "No Project" : (projectsById.get(projectId) ?? projectId),
      resources: rs,
    }));
  }, [linkedResources, projectsById]);

  const linkedContacts = useMemo(
    () =>
      area?.id
        ? allContacts.filter((contact) => (contact.linkedAreaIds ?? []).includes(area.id))
        : [],
    [allContacts, area?.id],
  );
  const linkedArchivedContacts = useMemo(
    () =>
      area?.id
        ? archivedContactsAll.filter((contact) => (contact.linkedAreaIds ?? []).includes(area.id))
        : [],
    [archivedContactsAll, area?.id],
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
      { value: "by_goal", label: "By Goal", count: activeLinkedContacts.filter((c) => (c.linkedGoalIds?.length ?? 0) > 0).length },
      { value: "by_project", label: "By Project", count: activeLinkedContacts.filter((c) => (c.linkedProjectIds?.length ?? 0) > 0).length },
      { value: "archived", label: "Archive", count: linkedArchivedContacts.length },
    ],
    [activeLinkedContacts, linkedArchivedContacts],
  );
  const filteredContacts = useMemo(() => {
    switch (contactTab) {
      case "favorite":
        return activeLinkedContacts.filter((c) => c.favorite);
      case "follow_up":
      case "by_group":
      case "by_goal":
      case "by_project":
        return activeLinkedContacts;
      case "archived":
        return linkedArchivedContacts;
      default:
        return activeLinkedContacts;
    }
  }, [contactTab, activeLinkedContacts, linkedArchivedContacts]);

  const followUpSections = useMemo(
    () => buildAreaContactFollowUpSections(activeLinkedContacts),
    [activeLinkedContacts],
  );
  const groupSections = useMemo(
    () => buildAreaContactGroupSections(activeLinkedContacts),
    [activeLinkedContacts],
  );
  const goalSections = useMemo(
    () => buildAreaContactGoalSections(activeLinkedContacts, areaData?.allGoals ?? []),
    [activeLinkedContacts, areaData?.allGoals],
  );
  const projectSections = useMemo(
    () => buildAreaContactProjectSections(activeLinkedContacts, areaData?.projects ?? []),
    [activeLinkedContacts, areaData?.projects],
  );

  const handleCreateInSection = (section: { id: string; label: string; createLabel: string }) => {
    const defaults: ContactDialogDefaults = area ? { area_ids: [area.id] } : {};
    const category = section.id.split(":")[0];
    const entityId = section.id.split(":")[1];

    if (category === "group") {
      defaults.group = entityId;
    } else if (category === "project" && entityId !== "unassigned") {
      defaults.project_ids = [entityId];
    } else if (category === "goal" && entityId !== "unassigned") {
      defaults.goal_ids = [entityId];
    }

    setCreateDefaults(defaults);
    setEditingContact(null);
    setIsNewContactOpen(true);
  };

  const handleCreateContactWithDefaults = (values: {
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
        onSuccess: (createdContact) => {
          if (area && createdContact) {
            linkContactToArea.mutate({ contactId: createdContact.id, areaId: area.id });
          }
          const projectIds = createDefaults?.project_ids ?? [];
          const goalIds = createDefaults?.goal_ids ?? [];
          if (createdContact && userId && projectIds.length > 0) {
            contactService.linkToProject(userId, createdContact.id, projectIds[0]);
          }
          if (createdContact && userId && goalIds.length > 0) {
            contactService.linkToGoal(userId, createdContact.id, goalIds[0]);
          }
          setIsNewContactOpen(false);
          setCreateDefaults(undefined);
        },
      },
    );
  };

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

  const handleTaskArchiveToggle = async (task: Task) => {
    if (task.is_archived) {
      await restoreTask.mutateAsync(task.id);
    } else {
      await archiveTask.mutateAsync(task.id);
    }
  };

  const handlePermanentDelete = (id: string) => {
    permanentDeleteTask.mutate(id);
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

  const getLinkedAreaNames = useCallback(
    (task: Task) =>
      getTaskLinkedAreaIds(task)
        .map((id) => areaNamesById.get(id))
        .filter((n): n is string => Boolean(n)),
    [areaNamesById],
  );

  const getLinkedAreaIcons = useCallback(
    (task: Task) =>
      getTaskLinkedAreaIds(task).map((id) => areaIconsById.get(id) ?? null),
    [areaIconsById],
  );

  const getLinkedGoalNames = useCallback(
    (task: Task) =>
      getTaskLinkedGoalIds(task)
        .map((id) => allGoalsById.get(id))
        .filter((n): n is string => Boolean(n)),
    [allGoalsById],
  );

  const getLinkedProjectNames = useCallback(
    (task: Task) =>
      getTaskLinkedProjectIds(task)
        .map((id) => projectsById.get(id))
        .filter((n): n is string => Boolean(n)),
    [projectsById],
  );

  const handleNewGroupTask = (groupId: string) => {
    setEditingTask(null);
    if (taskTab === "by_goal") {
      setNewTaskGoalId(groupId === "unassigned" ? null : groupId);
      setNewTaskProjectId(null);
    } else if (taskTab === "by_project") {
      setNewTaskGoalId(null);
      setNewTaskProjectId(groupId === "unassigned" ? null : groupId);
    }
    setIsNewTaskOpen(true);
  };

  // Link-existing candidate lists for area sections
  const linkedGoalIdSet = useMemo(
    () => new Set((areaData?.goals ?? []).map((g) => g.id)),
    [areaData?.goals],
  );

  const goalTabCounts = useMemo(() => {
    const goals = areaData?.goals ?? [];
    const isAutoInactive = (g: typeof goals[number]) =>
      !g.is_archived && !g.is_completed &&
      (g.projectCount ?? 0) === 0 && (g.taskCount ?? 0) === 0 &&
      (g.noteCount ?? 0) === 0 && (g.resourceCount ?? 0) === 0;
    const nonArchived = goals.filter((g) => !g.is_archived);
    return {
      active: nonArchived.filter((g) => !g.is_completed && !isAutoInactive(g)).length,
      short: nonArchived.filter((g) => !g.is_completed && g.term === "short").length,
      mid: nonArchived.filter((g) => !g.is_completed && g.term === "mid").length,
      long: nonArchived.filter((g) => !g.is_completed && g.term === "long").length,
      inactive: nonArchived.filter((g) => !g.is_completed && isAutoInactive(g)).length,
      completed: nonArchived.filter((g) => g.is_completed).length,
      archived: goals.filter((g) => g.is_archived).length,
    };
  }, [areaData?.goals]);

  const projectTabCounts = useMemo(() => {
    const projects = areaData?.projects ?? [];
    const active = projects.filter((p) => !p.is_archived);
    return {
      all: active.length,
      planning: active.filter((p) => p.status === "planning").length,
      in_progress: active.filter((p) => p.status === "active").length,
      on_hold: active.filter((p) => p.status === "on_hold").length,
      completed: active.filter((p) => p.status === "completed").length,
      archived: projects.filter((p) => p.is_archived).length,
    };
  }, [areaData?.projects]);

  const taskTabCounts = useMemo(() => {
    const active = activeTasks;
    return {
      all: active.length,
      inbox: active.filter((t) => t.status === "inbox" && !t.is_completed).length,
      upcoming: active.filter((t) => t.status !== "inbox" && t.status !== "completed" && !t.is_completed).length,
      overdue: active.filter((t) => {
        if (!t.due_date || t.is_completed) return false;
        return new Date(t.due_date) < new Date();
      }).length,
      completed: active.filter((t) => t.is_completed).length,
      archived: (areaData?.archivedTasks ?? []).length,
    };
  }, [activeTasks, areaData?.archivedTasks]);

  const noteTabCounts = useMemo(() => {
    const notes = areaData?.notes ?? [];
    const active = notes.filter((n) => !n.is_archived);
    return {
      all: active.length,
      inbox: active.filter((n) => n.status === "inbox").length,
      to_review: active.filter((n) => n.status === "to_review").length,
      active: active.filter((n) => n.status === "active").length,
      saved: active.filter((n) => n.status === "saved").length,
      archived: notes.filter((n) => n.is_archived).length,
    };
  }, [areaData?.notes]);

  const resourceTabCounts = useMemo(() => {
    const active = linkedResources.filter((r) => !r.is_archived);
    return {
      all: active.length,
      inbox: active.filter((r) => r.status === "inbox").length,
      to_review: active.filter((r) => r.status === "to_review").length,
      active: active.filter((r) => r.status === "active").length,
      saved: active.filter((r) => r.status === "saved").length,
      archived: linkedResources.filter((r) => r.is_archived).length,
    };
  }, [linkedResources]);
  const linkGoalCandidates = useMemo(
    () => allGoalsGlobal.filter((g) => !g.is_archived && !linkedGoalIdSet.has(g.id)),
    [allGoalsGlobal, linkedGoalIdSet],
  );
  const linkedProjectIdSet = useMemo(
    () => new Set((areaData?.projects ?? []).map((p) => p.id)),
    [areaData?.projects],
  );
  const linkProjectCandidates = useMemo(
    () => allProjectsGlobal.filter((p) => !p.is_archived && !linkedProjectIdSet.has(p.id)),
    [allProjectsGlobal, linkedProjectIdSet],
  );
  const linkedTaskIdSet = useMemo(
    () => new Set((areaData?.tasks ?? []).map((t) => t.id)),
    [areaData?.tasks],
  );
  const linkTaskCandidates = useMemo(
    () => allTasksGlobal.filter((t) => !t.is_archived && !linkedTaskIdSet.has(t.id)),
    [allTasksGlobal, linkedTaskIdSet],
  );
  const linkedNoteIdSet = useMemo(
    () => new Set((areaData?.notes ?? []).map((n) => n.id)),
    [areaData?.notes],
  );
  const linkNoteCandidates = useMemo(
    () => allNotesGlobal.filter((n) => !n.is_archived && !linkedNoteIdSet.has(n.id)),
    [allNotesGlobal, linkedNoteIdSet],
  );
  const linkedResourceIdSet = useMemo(
    () => new Set(linkedResources.map((r) => r.id)),
    [linkedResources],
  );
  const linkResourceCandidates = useMemo(
    () => allResourcesGlobal.filter((r) => !r.is_archived && !linkedResourceIdSet.has(r.id)),
    [allResourcesGlobal, linkedResourceIdSet],
  );
  const linkedContactIdSet = useMemo(
    () => new Set(allLinkedContacts.map((c) => c.id)),
    [allLinkedContacts],
  );
  const linkContactCandidates = useMemo(
    () => allContacts.filter((c) => !c.archive && !linkedContactIdSet.has(c.id)),
    [allContacts, linkedContactIdSet],
  );

  const handleLinkGoal = (goalId: string) => {
    if (!area) return;
    linkGoalToArea.mutate({ goalId, areaId: area.id });
    setIsLinkGoalOpen(false);
  };
  const handleLinkProject = (projectId: string) => {
    if (!area) return;
    linkProjectToArea.mutate({ projectId, areaId: area.id });
    setIsLinkProjectOpen(false);
  };
  const handleLinkTask = (task: Task) => {
    if (!area) return;
    const nextAreaIds = Array.from(new Set([...(task.linkedAreaIds ?? (task.area_id ? [task.area_id] : [])), area.id]));
    updateTask.mutate({ id: task.id, input: { area_ids: nextAreaIds } });
    setIsLinkTaskOpen(false);
  };
  const handleLinkNote = (note: { id: string; linkedAreaIds?: string[] | null; area_id?: string | null }) => {
    if (!area) return;
    const nextAreaIds = Array.from(new Set([
      ...((note.linkedAreaIds ?? (note.area_id ? [note.area_id] : [])).filter(Boolean) as string[]),
      area.id,
    ]));
    updateNote.mutate({ id: note.id, input: { area_ids: nextAreaIds } });
    setIsLinkNoteOpen(false);
  };
  const handleLinkResource = (resource: { id: string; linkedAreaIds?: string[] | null; area_id?: string | null }) => {
    if (!area) return;
    const nextAreaIds = Array.from(new Set([
      ...((resource.linkedAreaIds ?? (resource.area_id ? [resource.area_id] : [])).filter(Boolean) as string[]),
      area.id,
    ]));
    updateResource.mutate({ id: resource.id, input: { area_ids: nextAreaIds } });
    setIsLinkResourceOpen(false);
  };
  const handleLinkContact = (contactId: string) => {
    if (!area) return;
    linkContactToArea.mutate({ contactId, areaId: area.id });
    setIsLinkContactOpen(false);
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
            { value: "active", label: "Active", count: goalTabCounts.active },
            { value: "short", label: "Short Term", count: goalTabCounts.short },
            { value: "mid", label: "Mid Term", count: goalTabCounts.mid },
            { value: "long", label: "Long Term", count: goalTabCounts.long },
            { value: "inactive", label: "Inactive", count: goalTabCounts.inactive },
            { value: "completed", label: "Completed", count: goalTabCounts.completed },
            { value: "archived", label: "Archive", count: goalTabCounts.archived },
          ]}
          activeTab={goalTab}
          onTabChange={setGoalTab}
          isLoading={isLoading}
          emptyTitle="No goals linked to this area"
          emptyDescription="Create a goal to track objectives for this area."
          onCreateNew={() => setIsNewGoalOpen(true)}
          createLabel="New Goal"
          onLinkExisting={() => setIsLinkGoalOpen(true)}
          linkLabel="Link Goal"
        >
          {filteredGoals.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredGoals.map((goal) => {
                const goalReturnTo = buildReturnTo(`/areas/${area.slug ?? area.id}`);
                const goalAreaIds = getGoalLinkedAreaIds(goal);
                const goalAreaNames = goalAreaIds
                  .map((id) => areaNamesById.get(id))
                  .filter((name): name is string => Boolean(name));
                const goalAreaIcons = goalAreaIds.map(
                  (id) => areaIconsById.get(id) ?? null,
                );
                return (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    areaName={area.name}
                    areaNames={goalAreaNames.length > 0 ? goalAreaNames : [area.name]}
                    areaIcons={goalAreaIcons.length > 0 ? goalAreaIcons : [area.icon ?? null]}
                    onEdit={() => router.push(`${buildGoalDetailHref(goal)}?returnTo=${encodeReturnTo(goalReturnTo)}`)}
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

      {/* Linked Projects Section */}
      <div ref={projectsRef}>
        <GoalDetailSection
          id="projects"
          entityType="projects"
          tabs={[
            { value: "all", label: "All", count: rollups.projectCount },
            { value: "inbox", label: "Inbox", count: projectTabCounts.planning },
            { value: "planning", label: "Planning", count: projectTabCounts.planning },
            { value: "in_progress", label: "In Progress", count: projectTabCounts.in_progress },
            { value: "on_hold", label: "On Hold", count: projectTabCounts.on_hold },
            { value: "by_status", label: "By Status" },
            { value: "by_goal", label: "By Goal" },
            { value: "completed", label: "Completed", count: projectTabCounts.completed },
            { value: "archived", label: "Archive", count: projectTabCounts.archived },
          ]}
          activeTab={projectTab}
          onTabChange={setProjectTab}
          isLoading={isLoading}
          emptyTitle="No projects linked to this area"
          emptyDescription="Create a project to track work in this area."
          onCreateNew={() => setIsNewProjectOpen(true)}
          createLabel="New Project"
          onLinkExisting={() => setIsLinkProjectOpen(true)}
          linkLabel="Link Project"
        >
          {projectTab === "by_status" ? (
            <KanbanBoard
              projects={(areaData?.projects ?? []).filter((p) => !p.is_archived)}
              areas={allAreasList}
              onProjectClick={(project) => router.push(`/projects/${project.slug ?? project.id}?returnTo=${encodeReturnTo(buildReturnTo(`/areas/${area.slug ?? area.id}`))}`)}
            />
          ) : projectTab === "by_goal" ? (
            <ProjectsByGoalView
              groups={projectsByGoalGroups}
              areaNames={areaNamesById}
              duplicateIndices={new Map()}
              isLoading={isLoading}
              onEdit={(project) => router.push(`/projects/${project.slug ?? project.id}?returnTo=${encodeReturnTo(buildReturnTo(`/areas/${area.slug ?? area.id}`))}`)}
              onCreateProject={(goalId) => {
                setNewProjectGoalId(goalId === "unassigned" ? null : goalId);
                setIsNewProjectOpen(true);
              }}
              returnTo={buildReturnTo(`/areas/${area.slug ?? area.id}`)}
            />
          ) : filteredProjects.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredProjects.map((project) => {
                const projectReturnTo = buildReturnTo(`/areas/${area.slug ?? area.id}`);
                const linkedAreaIds = getProjectLinkedAreaIds(project);
                const projectAreaNames = linkedAreaIds
                  .map((id) => areaNamesById.get(id))
                  .filter((name): name is string => Boolean(name));
                const projectAreaIcons = linkedAreaIds.map(
                  (id) => areaIconsById.get(id) ?? null,
                );
                return (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    areaName={area.name}
                    areaNames={projectAreaNames.length > 0 ? projectAreaNames : [area.name]}
                    areaIcons={
                      projectAreaIcons.length > 0 ? projectAreaIcons : [area.icon ?? null]
                    }
                    returnTo={projectReturnTo}
                    onArchive={(p) => archiveProject.mutate(p.id)}
                    onRestore={(p) => restoreProject.mutate(p.id)}
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
            { value: "all", label: "All", count: taskTabCounts.all },
            { value: "inbox", label: "Inbox", count: taskTabCounts.inbox },
            { value: "upcoming", label: "Upcoming", count: taskTabCounts.upcoming },
            { value: "overdue", label: "Overdue", count: taskTabCounts.overdue },
            { value: "by_goal", label: "By Goal" },
            { value: "by_project", label: "By Project" },
            { value: "completed", label: "Completed", count: taskTabCounts.completed },
            { value: "archived", label: "Archived", count: taskTabCounts.archived },
          ]}
          activeTab={taskTab}
          onTabChange={setTaskTab}
          isLoading={isLoading}
          emptyTitle="No tasks linked to this area"
          emptyDescription="Create a task to track work in this area."
          onCreateNew={() => setIsNewTaskOpen(true)}
          createLabel="New Task"
          onLinkExisting={() => setIsLinkTaskOpen(true)}
          linkLabel="Link Task"
        >
          {taskTab === "by_goal" ? (
            <TasksByGroupView
              groups={taskGroupsByGoal}
              areaMap={areaMap}
              goalMap={goalMap}
              projectMap={projectMap}
              onCompletionToggle={handleTaskCompletion}
              onFocusToggle={handleTaskFocus}
              onNameSave={handleTaskNameSave}
              onEdit={(task) => {
                setEditingTask(task);
                setIsTaskEditOpen(true);
              }}
              onArchiveToggle={handleTaskArchiveToggle}
              onPermanentDelete={handlePermanentDelete}
              onNewTask={handleNewGroupTask}
              getLinkedAreaNames={getLinkedAreaNames}
              getLinkedAreaIcons={getLinkedAreaIcons}
              getLinkedGoalNames={getLinkedGoalNames}
              getLinkedProjectNames={getLinkedProjectNames}
              emptyMessage="Tasks will be grouped by goal here."
            />
          ) : taskTab === "by_project" ? (
            <TasksByGroupView
              groups={taskGroupsByProject}
              areaMap={areaMap}
              goalMap={goalMap}
              projectMap={projectMap}
              onCompletionToggle={handleTaskCompletion}
              onFocusToggle={handleTaskFocus}
              onNameSave={handleTaskNameSave}
              onEdit={(task) => {
                setEditingTask(task);
                setIsTaskEditOpen(true);
              }}
              onArchiveToggle={handleTaskArchiveToggle}
              onPermanentDelete={handlePermanentDelete}
              onNewTask={handleNewGroupTask}
              getLinkedAreaNames={getLinkedAreaNames}
              getLinkedAreaIcons={getLinkedAreaIcons}
              getLinkedGoalNames={getLinkedGoalNames}
              getLinkedProjectNames={getLinkedProjectNames}
              emptyMessage="Tasks will be grouped by project here."
            />
          ) : filteredTasks.length > 0 ? (
            <div className="rounded-lg border bg-card">
              {filteredTasks.map((task) => (
                <TaskListItem
                  key={task.id}
                  task={task}
                  linkedAreaNames={getLinkedAreaNames(task)}
                  linkedAreaIcons={getLinkedAreaIcons(task)}
                  linkedGoalNames={getLinkedGoalNames(task)}
                  linkedProjectNames={getLinkedProjectNames(task)}
                  onCompletionToggle={handleTaskCompletion}
                  onFocusToggle={handleTaskFocus}
                  onNameSave={handleTaskNameSave}
                  onArchiveToggle={handleTaskArchiveToggle}
                  onPermanentDelete={handlePermanentDelete}
                  onEdit={(task) => {
                    setEditingTask(task);
                    setIsTaskEditOpen(true);
                  }}
                />
              ))}
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
            { value: "all", label: "All", count: noteTabCounts.all },
            { value: "inbox", label: "Inbox", count: noteTabCounts.inbox },
            { value: "to_review", label: "To Review", count: noteTabCounts.to_review },
            { value: "active", label: "Active", count: noteTabCounts.active },
            { value: "by_goal", label: "By Goal" },
            { value: "by_project", label: "By Project" },
            { value: "saved", label: "Saved", count: noteTabCounts.saved },
            { value: "archived", label: "Archive", count: noteTabCounts.archived },
          ]}
          activeTab={noteTab}
          onTabChange={setNoteTab}
          isLoading={isLoading}
          emptyTitle="No notes linked to this area"
          emptyDescription="Create a note to capture thoughts for this area."
          onCreateNew={() => area && router.push(`/notes/new?areaId=${area.id}&returnTo=${encodeReturnTo(buildReturnTo(`/areas/${area.slug ?? area.id}`))}`)}
          createLabel="New Note"
          onLinkExisting={() => setIsLinkNoteOpen(true)}
          linkLabel="Link Note"
        >
          {(noteTab === "by_goal" || noteTab === "by_project") ? (
            <NotesByGroupView
              groups={noteTab === "by_goal" ? noteGroupsByGoal : noteGroupsByProject}
              renderNote={(note) => {
                const noteReturnTo = buildReturnTo(`/areas/${area.slug ?? area.id}`);
                const noteAreas = (note.linkedAreaIds ?? (note.area_id ? [note.area_id] : []))
                  .map((id) => { const name = areaNamesById.get(id); return name ? { name, icon: areaIconsById.get(id) ?? null } : null; })
                  .filter((a): a is { name: string; icon: string | null } => Boolean(a));
                const noteGoalNames = (note.linkedGoalIds ?? []).map((id) => allGoalsById.get(id)).filter((n): n is string => Boolean(n));
                const noteProjectNames = (note.linkedProjectIds ?? []).map((id) => projectsById.get(id)).filter((n): n is string => Boolean(n));
                const noteTaskNames = (note.linkedTaskIds ?? []).map((id) => tasksById.get(id)).filter((n): n is string => Boolean(n));
                return (
                  <NoteRow
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
              }}
              onNewNote={(groupId) => {
                const params = new URLSearchParams();
                params.set("areaId", area.id);
                params.set("returnTo", encodeReturnTo(buildReturnTo(`/areas/${area.slug ?? area.id}`)));
                if (noteTab === "by_goal") {
                  params.set("goalId", groupId);
                } else {
                  params.set("projectId", groupId);
                }
                router.push(`/notes/new?${params.toString()}`);
              }}
              emptyMessage={noteTab === "by_goal" ? "Notes will be grouped by goal here." : "Notes will be grouped by project here."}
            />
          ) : filteredNotes.length > 0 ? (
            <div className="rounded-lg border bg-card">
              {filteredNotes.map((note) => {
                const noteReturnTo = buildReturnTo(`/areas/${area.slug ?? area.id}`);
                const noteAreas = (note.linkedAreaIds ?? (note.area_id ? [note.area_id] : []))
                  .map((id) => { const name = areaNamesById.get(id); return name ? { name, icon: areaIconsById.get(id) ?? null } : null; })
                  .filter((a): a is { name: string; icon: string | null } => Boolean(a));
                const noteGoalNames = (note.linkedGoalIds ?? []).map((id) => allGoalsById.get(id)).filter((n): n is string => Boolean(n));
                const noteProjectNames = (note.linkedProjectIds ?? []).map((id) => projectsById.get(id)).filter((n): n is string => Boolean(n));
                const noteTaskNames = (note.linkedTaskIds ?? [])
                  .map((id) => tasksById.get(id))
                  .filter((n): n is string => Boolean(n));
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

      {/* Linked Resources Section */}
      <div ref={resourcesRef}>
        <GoalDetailSection
          id="resources"
          entityType="resources"
          tabs={[
            { value: "all", label: "All", count: resourceTabCounts.all },
            { value: "inbox", label: "Inbox", count: resourceTabCounts.inbox },
            { value: "to_review", label: "To Review", count: resourceTabCounts.to_review },
            { value: "active", label: "Active", count: resourceTabCounts.active },
            { value: "by_goal", label: "By Goal" },
            { value: "by_project", label: "By Project" },
            { value: "saved", label: "Saved", count: resourceTabCounts.saved },
            { value: "archived", label: "Archive", count: resourceTabCounts.archived },
          ]}
          activeTab={resourceTab}
          onTabChange={setResourceTab}
          isLoading={isLoading}
          emptyTitle="No resources linked to this area"
          emptyDescription="Add resources to track external references for this area."
          onCreateNew={() => setIsNewResourceOpen(true)}
          createLabel="New Resource"
          onLinkExisting={() => setIsLinkResourceOpen(true)}
          linkLabel="Link Resource"
        >
          {(resourceTab === "by_goal" || resourceTab === "by_project") ? (
            <ResourcesByGroupView
              groups={resourceTab === "by_goal" ? resourceGroupsByGoal : resourceGroupsByProject}
              getAreas={(resource) => {
                const ids = (resource.linkedAreaIds && resource.linkedAreaIds.length > 0)
                  ? resource.linkedAreaIds
                  : (resource.area_id ? [resource.area_id] : []);
                return ids
                  .map((id) => ({ name: areaNamesById.get(id), icon: areaIconsById.get(id) ?? null }))
                  .filter((e): e is { name: string; icon: string | null } => Boolean(e.name));
              }}
              getGoalNames={(resource) => (resource.linkedGoalIds ?? []).map((id) => allGoalsById.get(id)).filter((n): n is string => Boolean(n))}
              getProjectNames={(resource) => resource.project_id ? [projectsById.get(resource.project_id)].filter((n): n is string => Boolean(n)) : []}
              getTaskNames={(resource) => (resource.linkedTaskIds ?? []).map((id) => tasksById.get(id)).filter((n): n is string => Boolean(n))}
              getTopicName={(resource) => resource.topic_id ? topicNamesMap.get(resource.topic_id) : undefined}
              onToggleFavorite={(id, favorite) => toggleFavoriteResource.mutate({ id, favorite })}
              onArchive={(id) => archiveResource.mutate(id)}
              onUnarchive={(id) => unarchiveResource.mutate(id)}
              onDelete={() => {}}
              onEdit={(r) => setEditingResource(r)}
              onNewResource={(groupId) => {
                if (resourceTab === "by_goal") {
                  setNewResourceGoalId(groupId === "unassigned" ? null : groupId);
                  setNewResourceProjectId(null);
                } else {
                  setNewResourceGoalId(null);
                  setNewResourceProjectId(groupId === "unassigned" ? null : groupId);
                }
                setIsNewResourceOpen(true);
              }}
              emptyMessage={resourceTab === "by_goal" ? "Resources will be grouped by goal here." : "Resources will be grouped by project here."}
            />
          ) : filteredResources.length > 0 ? (
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
                const resourceTaskNames = (resource.linkedTaskIds ?? [])
                  .map((id) => tasksById.get(id))
                  .filter((name): name is string => Boolean(name));
                return (
                  <ResourceRow
                    key={resource.id}
                    resource={resource}
                    areas={resourceAreas}
                    goalNames={resourceGoalNames}
                    projectNames={resourceProjectName ? [resourceProjectName] : []}
                    taskNames={resourceTaskNames}
                    topicName={resource.topic_id ? topicNamesMap.get(resource.topic_id) : undefined}
                    onToggleFavorite={(id, favorite) =>
                      toggleFavoriteResource.mutate({ id, favorite })
                    }
                    onArchive={(id) => archiveResource.mutate(id)}
                    onUnarchive={(id) => unarchiveResource.mutate(id)}
                    onDelete={() => {}}
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
          heading="Contacts"
          tabs={contactTabs}
          activeTab={contactTab}
          onTabChange={setContactTab}
          isLoading={isLoading}
          emptyTitle="No people linked to this area"
          emptyDescription="Add people to track relationships that contribute to this area."
          onCreateNew={() => setIsNewContactOpen(true)}
          createLabel="New Contact"
          onLinkExisting={() => setIsLinkContactOpen(true)}
          linkLabel="Link Contact"
        >
          {contactTab === "follow_up" ? (
            <ContactsFollowUpView
              sections={followUpSections}
              onEdit={handleContactEdit}
              onDelete={handleContactDelete}
              onToggleFavorite={handleContactToggleFavorite}
              onArchive={handleContactArchive}
            />
          ) : contactTab === "by_group" ? (
            <ContactsByCategoryView
              sections={groupSections}
              onCreateInSection={handleCreateInSection}
              onEdit={handleContactEdit}
              onDelete={handleContactDelete}
              onToggleFavorite={handleContactToggleFavorite}
              onArchive={handleContactArchive}
            />
          ) : contactTab === "by_goal" ? (
            <ContactsByCategoryView
              sections={goalSections}
              onCreateInSection={handleCreateInSection}
              onEdit={handleContactEdit}
              onDelete={handleContactDelete}
              onToggleFavorite={handleContactToggleFavorite}
              onArchive={handleContactArchive}
            />
          ) : contactTab === "by_project" ? (
            <ContactsByCategoryView
              sections={projectSections}
              onCreateInSection={handleCreateInSection}
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
                    returnTo={buildReturnTo(`/areas/${area.slug ?? area.id}`)}
                  />
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
        onOpenChange={(open) => {
          setIsNewProjectOpen(open);
          if (!open) setNewProjectGoalId(null);
        }}
        defaultAreaIds={area?.id ? [area.id] : []}
        goalId={newProjectGoalId ?? undefined}
        onSuccess={() => {
          setIsNewProjectOpen(false);
          setNewProjectGoalId(null);
        }}
      />

      {/* Inline Task Creation */}
      <TaskDialog
        open={isNewTaskOpen}
        onOpenChange={setIsNewTaskOpen}
        defaultAreaId={area?.id}
        defaultGoalId={newTaskGoalId ?? undefined}
        defaultProjectId={newTaskProjectId ?? undefined}
        onSuccess={() => {
          setIsNewTaskOpen(false);
          setNewTaskGoalId(null);
          setNewTaskProjectId(null);
        }}
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
        onArchiveToggle={(task) => {
          handleTaskArchiveToggle(task);
          setEditingTask(null);
        }}
        onPermanentDelete={(id) => {
          handlePermanentDelete(id);
          setEditingTask(null);
        }}
      />

      {/* Note creation navigates directly to /notes/new */}

      {/* Inline Contact Creation */}
      <ContactDialog
        open={isNewContactOpen}
        onOpenChange={(open) => {
          setIsNewContactOpen(open);
          if (!open) setCreateDefaults(undefined);
        }}
        contact={null}
        defaults={createDefaults ?? { area_ids: area?.id ? [area.id] : [] }}
        onSubmit={handleCreateContactWithDefaults}
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
        onOpenChange={(open) => {
          setIsNewResourceOpen(open);
          if (!open) {
            setNewResourceGoalId(null);
            setNewResourceProjectId(null);
          }
        }}
        initialAreaIds={area?.id ? [area.id] : []}
        initialGoalIds={newResourceGoalId ? [newResourceGoalId] : []}
        initialProjectId={newResourceProjectId ?? undefined}
        onSubmit={async (input) => {
          await createResource.mutateAsync(input as CreateResourceInput);
          setIsNewResourceOpen(false);
          setNewResourceGoalId(null);
          setNewResourceProjectId(null);
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

      {/* Link existing dialogs */}
      <LinkEntityDialog
        open={isLinkGoalOpen}
        onOpenChange={setIsLinkGoalOpen}
        title="Link Goal"
        emptyMessage="No more active goals available to link."
        candidates={linkGoalCandidates}
        getKey={(g) => g.id}
        getSearchText={(g) => g.name}
        renderItem={(g) => <p className="truncate font-medium">{g.name}</p>}
        onLink={(g) => handleLinkGoal(g.id)}
      />
      <LinkEntityDialog
        open={isLinkProjectOpen}
        onOpenChange={setIsLinkProjectOpen}
        title="Link Project"
        emptyMessage="No more active projects available to link."
        candidates={linkProjectCandidates}
        getKey={(p) => p.id}
        getSearchText={(p) => p.name}
        renderItem={(p) => <p className="truncate font-medium">{p.name}</p>}
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
        onLink={(r) => handleLinkResource(r)}
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

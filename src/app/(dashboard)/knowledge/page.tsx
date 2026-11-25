"use client";
import { useI18n } from "@/components/providers/i18n-provider";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  BookOpen,
  ChevronDownIcon,
  ChevronRightIcon,
  CircleDot,
  CircleOff,
  FilePlus,
  FolderOpen,
  Globe,
  Heart,
  LayoutGrid,
  Map as MapIcon,
  NotebookPen,
  Pin,
  Bookmark,
  Clock,
  Inbox as InboxIcon,
  Plus,
  Search,
  Star,
  Tag,
  Target,
  X,
  Zap,
} from "lucide-react";

import { BrainIcon, LayersIcon, Link2Icon, SquarePenIcon } from "@/components/icons";
import { EmptyState } from "@/components/views/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResourceDialog } from "@/components/entities/resource-dialog";
import { ResourceRow } from "@/components/entities/resource-row";
import { ResourceRowSkeleton } from "@/components/views/list-page-skeleton";
import { TopicCard } from "@/components/entities/topic-card";
import { NoteRow } from "@/components/entities/note-row";
import { NotesByGroupView, type NoteGroup } from "@/components/views/notes-by-group-view";
import { encodeReturnTo } from "@/lib/utils/return-to";
import { useAreas } from "@/lib/hooks/use-areas";
import { useGoals } from "@/lib/hooks/use-goals";
import { useProjects } from "@/lib/hooks/use-projects";
import { useTasks } from "@/lib/hooks/use-tasks";
import {
  useArchiveNoteWithUndo,
  useDeleteNote,
  useNotes,
  useRestoreNote,
  useToggleFavoriteNote,
  useTogglePinNote,
  useUpdateNote,
} from "@/lib/hooks/use-notes";
import {
  useArchiveResource,
  useArchivedResources,
  useCreateResource,
  useResources,
  useToggleFavoriteResource,
  useDeleteResource,
  useUnarchiveResource,
  useUpdateResource,
} from "@/lib/hooks/use-resources";
import { useKnowledgeSearch } from "@/lib/hooks/use-knowledge-hub";
import {
  useTopics,
  useCreateTopic,
  useUpdateTopic,
  useToggleFavoriteTopic,
  useArchiveTopic,
  useArchivedTopics,
  useRestoreTopic,
} from "@/lib/hooks/use-topics";
import type { Note, Resource } from "@/lib/types/domain.types";
import type { TopicWithCounts } from "@/lib/services/topic.service";
import {
  RESOURCE_STATUS,
} from "@/lib/utils/constants";
import {
  RESOURCE_VIEW,
  getResourceLinkedAreaIds,
  getResourceLinkedGoalIds,
  getResourceLinkedProjectIds,
  getResourceLinkedTaskIds,
  type ResourceView,
} from "@/lib/utils/resources";
import { ResourcesByGroupView, type ResourceGroup } from "@/components/views/resources-by-group-view";
import { GalleryGrid } from "@/components/views/gallery-grid";
import { ErrorState } from "@/components/views/error-state";
import { contentColumnGrid, sectionGap } from "@/components/ui/layout";
import { NOTES_TABS_LIST_CLASS_NAME } from "@/lib/utils/note-page-display";
import { cn } from "@/lib/utils";
import {
  NOTE_VIEW,
  getNoteCounts,
  getNoteLinkedAreaIds,
  getNoteLinkedGoalIds,
  getNoteLinkedProjectIds,
  getVisibleNotes,
  type NoteView,
} from "@/lib/utils/notes";

// ─── SectionHeader ────────────────────────────────────────────────────────────
function SectionHeader({
  accentClass,
  title,
  description,
  totalCount,
  buttonLabel,
  onNew,
  isPending,
}: {
  accentClass: string;
  title: string;
  description: string;
  totalCount?: number;
  buttonLabel: string;
  onNew: () => void;
  isPending?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className={cn("mt-1.5 h-full min-h-[2.5rem] w-1 shrink-0 rounded-full", accentClass)} />
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">{title}</h2>
            {typeof totalCount === "number" ? (
              <span className="text-sm text-muted-foreground">{totalCount} {t("goalDetailSection.total")}</span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Button size="sm" onClick={onNew} disabled={isPending} className="shrink-0">
        <FilePlus className="mr-1.5 size-3.5" />
        {buttonLabel}
      </Button>
    </div>
  );
}

// ─── CollapsibleTopicGroup (matches topics page By Area layout) ──────────────
function CollapsibleTopicGroup({
  areaId,
  areaName,
  areaIcon,
  topics: areaTopics,
  areaNames,
  areaIcons,
  duplicateIndices,
  onToggleFavorite,
  onEdit,
  onArchive,
  onCreateNew,
  defaultOpen = true,
}: {
  areaId: string;
  areaName: string;
  areaIcon: string | null;
  topics: TopicWithCounts[];
  areaNames: Map<string, string>;
  areaIcons: Map<string, string | null>;
  duplicateIndices: Map<string, number>;
  onToggleFavorite: (id: string, favorite: boolean) => void;
  onEdit: (topic: TopicWithCounts) => void;
  onArchive: (topic: TopicWithCounts) => void;
  onCreateNew: (areaId: string) => void;
  defaultOpen?: boolean;
}) {
  const { t, tp } = useI18n();
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-6">
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className="w-full flex items-center gap-2 mb-3 group cursor-pointer"
      >
        <span className="text-muted-foreground">
          {isOpen ? <ChevronDownIcon className="size-4" /> : <ChevronRightIcon className="size-4" />}
        </span>
        {areaIcon ? (
          <span className="text-base leading-none">{areaIcon}</span>
        ) : (
          <MapIcon className="size-4 text-muted-foreground" />
        )}
        <Badge variant="outline" className="text-xs font-medium">
          {areaName}
        </Badge>
        <span className="text-sm text-muted-foreground">
          ({areaTopics.length} {areaTopics.length === 1 ? "topic" : "topics"})
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onCreateNew(areaId);
          }}
          title={t("page.createTopicInV0", { v0: areaName })}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {isOpen && (
        <GalleryGrid>
          {areaTopics.map((t) => (
            <TopicCard
              key={t.id}
              topic={t}
              areaNames={areaNames}
              areaIcons={areaIcons}
              duplicateIndex={duplicateIndices.get(t.id)}
              returnTo="/knowledge"
              onToggleFavorite={onToggleFavorite}
              onEdit={onEdit}
              onArchive={onArchive}
            />
          ))}
          <button
            onClick={() => onCreateNew(areaId)}
            className="flex flex-col items-center justify-center gap-2 h-full min-h-[120px] rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <Plus className="size-6" />
            <span className="text-sm font-medium">{t("page.newTopic")}</span>
          </button>
        </GalleryGrid>
      )}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────
export default function KnowledgeHubPage() {
  const { t, tp } = useI18n();
  const router = useRouter();

  // ── global search ─────────────────────────────────────────────────────────
  const [rawQuery, setRawQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(rawQuery), 300);
    return () => clearTimeout(t);
  }, [rawQuery]);
  const isSearchActive = debouncedQuery.trim().length >= 2;
  const { data: sr, isLoading: srLoading } = useKnowledgeSearch(debouncedQuery);

  // ── data ──────────────────────────────────────────────────────────────────
  const { data: topics = [], isLoading: topicsLoading, isError: topicsError, refetch: refetchTopics } = useTopics();
  const { data: notes = [], isLoading: notesLoading, isError: notesError, refetch: refetchNotes } = useNotes({ status: "all", includeArchived: true });
  const { data: resources = [], isLoading: resourcesLoading, isError: resourcesError, refetch: refetchResources } = useResources({ status: "all" });
  const { data: archivedResources = [] } = useArchivedResources();
  const { data: areas = [] } = useAreas();
  const { data: projects = [] } = useProjects({ status: "all" });
  const { data: allTasks = [] } = useTasks();
  const { data: goals = [] } = useGoals({});

  // ── derived maps ─────────────────────────────────────────────────────────
  const areaNames = useMemo(() => new Map(areas.map((a) => [a.id, a.name])), [areas]);
  const areaIcons = useMemo(
    () => new Map(areas.map((a) => [a.id, (a.icon as string | null | undefined) ?? null])),
    [areas],
  );
  const projNames = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);
  const topicNames = useMemo(() => new Map(topics.map((t) => [t.id, t.name])), [topics]);
  const goalNames = useMemo(() => new Map(goals.map((g) => [g.id, g.name])), [goals]);

  // ── note related counts ──────────────────────────────────────────────────


  // ── topics section state ─────────────────────────────────────────────────
  const [topicsTab, setTopicsTab] = useState("active");
  const [topicCreateOpen, setTopicCreateOpen] = useState(false);
  const [topicEditData, setTopicEditData] = useState<TopicWithCounts | null>(null);
  const [topicForm, setTopicForm] = useState({
    name: "",
    area_ids: [] as string[],
    note_ids: [] as string[],
    resource_ids: [] as string[],
    favorite: false,
  });

  const activeTopics = useMemo(() => topics.filter((t) => !t.inactive), [topics]);
  const favoriteTopics = useMemo(() => topics.filter((t) => t.favorite), [topics]);
  const inactiveTopics = useMemo(() => topics.filter((t) => t.inactive), [topics]);

  const duplicateIndices = useMemo(() => {
    const result = new Map<string, number>();
    const grouped = new Map<string, TopicWithCounts[]>();
    for (const topic of topics) {
      if (!grouped.has(topic.name)) grouped.set(topic.name, []);
      grouped.get(topic.name)!.push(topic);
    }
    for (const group of grouped.values()) {
      if (group.length < 2) continue;
      [...group]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .forEach((t, i) => result.set(t.id, i + 1));
    }
    return result;
  }, [topics]);

  const groupedTopicsByArea = useMemo(() => {
    const grouped = new Map<string, { areaName: string; topics: TopicWithCounts[] }>();
    for (const topic of topics) {
      const areaIds = topic.linkedAreaIds ?? [];
      if (areaIds.length === 0) {
        const g = grouped.get("__none__") ?? { areaName: t("common.noArea"), topics: [] };
        if (!g.topics.find((t) => t.id === topic.id)) g.topics.push(topic);
        grouped.set("__none__", g);
      } else {
        for (const areaId of areaIds) {
          const g = grouped.get(areaId) ?? { areaName: areaNames.get(areaId) ?? areaId, topics: [] };
          if (!g.topics.find((t) => t.id === topic.id)) g.topics.push(topic);
          grouped.set(areaId, g);
        }
      }
    }
    return Array.from(grouped.entries())
      .filter(([key]) => key !== "__none__")
      .sort(([, a], [, b]) => a.areaName.localeCompare(b.areaName))
      .map(([areaId, { areaName, topics: ts }]) => ({ areaId, areaName, topics: ts }));
  }, [topics, areaNames, t]);

  // ── notes section state ──────────────────────────────────────────────────
  const [notesTab, setNotesTab] = useState<NoteView>(NOTE_VIEW.ALL);

  const noteCounts = useMemo(() => getNoteCounts(notes), [notes]);
  const visibleNotes = useMemo(() => {
    const list = getVisibleNotes(notes, notesTab).slice();
    return list.sort((a, b) => {
      if (a.pin && !b.pin) return -1;
      if (!a.pin && b.pin) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [notes, notesTab]);


  const noteGroupsByArea = useMemo((): NoteGroup[] => {
    const grouped = new Map<string, Note[]>();
    for (const n of notes.filter((x) => !x.is_archived)) {
      const ids = getNoteLinkedAreaIds(n);
      const keys = ids.length > 0 ? ids : ["unassigned"];
      for (const id of keys) {
        const cur = grouped.get(id) ?? [];
        cur.push(n);
        grouped.set(id, cur);
      }
    }
    return Array.from(grouped.entries()).map(([id, ns]) => ({
      groupId: id,
      groupName: id === "unassigned" ? t("common.noArea") : (areaNames.get(id) ?? id),
      notes: ns,
    }));
  }, [notes, areaNames, t]);

  const noteGroupsByGoal = useMemo((): NoteGroup[] => {
    const grouped = new Map<string, Note[]>();
    for (const n of notes.filter((x) => !x.is_archived)) {
      const ids = getNoteLinkedGoalIds(n);
      const keys = ids.length > 0 ? ids : ["unassigned"];
      for (const id of keys) {
        const cur = grouped.get(id) ?? [];
        cur.push(n);
        grouped.set(id, cur);
      }
    }
    return Array.from(grouped.entries()).map(([id, ns]) => ({
      groupId: id,
      groupName: id === "unassigned" ? t("common.noGoal") : (goalNames.get(id) ?? id),
      notes: ns,
    }));
  }, [notes, goalNames, t]);

  const noteGroupsByProject = useMemo((): NoteGroup[] => {
    const grouped = new Map<string, Note[]>();
    for (const n of notes.filter((x) => !x.is_archived)) {
      const ids = getNoteLinkedProjectIds(n);
      const keys = ids.length > 0 ? ids : ["unassigned"];
      for (const id of keys) {
        const cur = grouped.get(id) ?? [];
        cur.push(n);
        grouped.set(id, cur);
      }
    }
    return Array.from(grouped.entries()).map(([id, ns]) => ({
      groupId: id,
      groupName: id === "unassigned" ? t("common.noProject") : (projNames.get(id) ?? id),
      notes: ns,
    }));
  }, [notes, projNames, t]);

  const noteGroupsByTopic = useMemo((): NoteGroup[] => {
    const grouped = new Map<string, Note[]>();
    for (const n of notes.filter((x) => !x.is_archived)) {
      const key = n.topic_id ?? "unassigned";
      const cur = grouped.get(key) ?? [];
      cur.push(n);
      grouped.set(key, cur);
    }
    return Array.from(grouped.entries()).map(([id, ns]) => ({
      groupId: id,
      groupName: id === "unassigned" ? t("common.noTopic") : (topicNames.get(id) ?? id),
      notes: ns,
    }));
  }, [notes, topicNames, t]);

  const noteGroupsByNotebook = useMemo((): NoteGroup[] => {
    const grouped = new Map<string, Note[]>();
    for (const n of notes.filter((x) => !x.is_archived)) {
      const keys = (n.notebooks ?? []).length > 0 ? n.notebooks! : ["unassigned"];
      for (const k of keys) {
        grouped.set(k, [...(grouped.get(k) ?? []), n]);
      }
    }
    return Array.from(grouped.entries()).map(([id, ns]) => ({
      groupId: id,
      groupName: id === "unassigned" ? t("common.noNotebook") : id,
      notes: ns,
    }));
  }, [notes, t]);

  // ── resources section state ──────────────────────────────────────────────
  const [resourcesTab, setResourcesTab] = useState<ResourceView>(RESOURCE_VIEW.ALL);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [resourceCreateOpen, setResourceCreateOpen] = useState(false);
  const [resourcePrefill, setResourcePrefill] = useState<{
    areaIds?: string[];
    goalIds?: string[];
    projectId?: string;
    topicId?: string;
  }>({});

  const filteredResources = useMemo(() => {
    switch (resourcesTab) {
      case RESOURCE_VIEW.INBOX: return resources.filter((r) => r.status === RESOURCE_STATUS.INBOX);
      case RESOURCE_VIEW.TO_REVIEW: return resources.filter((r) => r.status === RESOURCE_STATUS.TO_REVIEW);
      case RESOURCE_VIEW.ACTIVE: return resources.filter((r) => r.status === RESOURCE_STATUS.ACTIVE);
      case RESOURCE_VIEW.COMPLETED: return resources.filter((r) => r.status === RESOURCE_STATUS.COMPLETED);
      case RESOURCE_VIEW.FAVORITE: return resources.filter((r) => r.favorite);
      case RESOURCE_VIEW.ARCHIVED: return archivedResources;
      default: return resources;
    }
  }, [resourcesTab, resources, archivedResources]);

  const resourceGroupsByTopic = useMemo((): ResourceGroup[] => {
    const grouped = new Map<string, Resource[]>();
    for (const r of resources.filter((x) => !x.is_archived)) {
      const id = r.topic_id ?? "unassigned";
      const cur = grouped.get(id) ?? [];
      cur.push(r);
      grouped.set(id, cur);
    }
    return Array.from(grouped.entries()).map(([id, rs]) => ({
      groupId: id,
      groupName: id === "unassigned" ? t("common.noTopic") : (topicNames.get(id) ?? id),
      resources: rs,
    }));
  }, [resources, topicNames, t]);

  const resourceGroupsByArea = useMemo((): ResourceGroup[] => {
    const grouped = new Map<string, Resource[]>();
    for (const r of resources.filter((x) => !x.is_archived)) {
      const ids = getResourceLinkedAreaIds(r);
      const keys = ids.length > 0 ? ids : ["unassigned"];
      for (const id of keys) {
        const cur = grouped.get(id) ?? [];
        cur.push(r);
        grouped.set(id, cur);
      }
    }
    return Array.from(grouped.entries()).map(([id, rs]) => ({
      groupId: id,
      groupName: id === "unassigned" ? t("common.noArea") : (areaNames.get(id) ?? id),
      resources: rs,
    }));
  }, [resources, areaNames, t]);

  const resourceGroupsByGoal = useMemo((): ResourceGroup[] => {
    const grouped = new Map<string, Resource[]>();
    for (const r of resources.filter((x) => !x.is_archived)) {
      const ids = getResourceLinkedGoalIds(r);
      const keys = ids.length > 0 ? ids : ["unassigned"];
      for (const id of keys) {
        const cur = grouped.get(id) ?? [];
        cur.push(r);
        grouped.set(id, cur);
      }
    }
    return Array.from(grouped.entries()).map(([id, rs]) => ({
      groupId: id,
      groupName: id === "unassigned" ? t("common.noGoal") : (goalNames.get(id) ?? id),
      resources: rs,
    }));
  }, [resources, goalNames, t]);

  const resourceGroupsByProject = useMemo((): ResourceGroup[] => {
    const grouped = new Map<string, Resource[]>();
    for (const r of resources.filter((x) => !x.is_archived)) {
      const ids = getResourceLinkedProjectIds(r);
      const keys = ids.length > 0 ? ids : ["unassigned"];
      for (const id of keys) {
        const cur = grouped.get(id) ?? [];
        cur.push(r);
        grouped.set(id, cur);
      }
    }
    return Array.from(grouped.entries()).map(([id, rs]) => ({
      groupId: id,
      groupName: id === "unassigned" ? t("common.noProject") : (projNames.get(id) ?? id),
      resources: rs,
    }));
  }, [resources, projNames, t]);

  // ── mutations ─────────────────────────────────────────────────────────────
  const createTopic = useCreateTopic();
  const updateTopic = useUpdateTopic();
  const toggleFavoriteTopic = useToggleFavoriteTopic();
  const archiveTopic = useArchiveTopic();
  const restoreTopic = useRestoreTopic();
  const { data: archivedTopics = [] } = useArchivedTopics();

  const toggleFavoriteNote = useToggleFavoriteNote();
  const togglePinNote = useTogglePinNote();
  const archiveNote = useArchiveNoteWithUndo();
  const restoreNote = useRestoreNote();
  const deleteNote = useDeleteNote();
  const updateNote = useUpdateNote();

  const createResource = useCreateResource();
  const toggleFavoriteResource = useToggleFavoriteResource();
  const archiveResource = useArchiveResource();
  const unarchiveResource = useUnarchiveResource();
  const updateResource = useUpdateResource();
  const deleteResource = useDeleteResource();

  // ── handlers ─────────────────────────────────────────────────────────────
  const openTopicCreate = () => {
    setTopicForm({ name: "", area_ids: [], note_ids: [], resource_ids: [], favorite: false });
    setTopicCreateOpen(true);
  };
  const openTopicCreateInArea = (areaId: string) => {
    setTopicForm({ name: "", area_ids: [areaId], note_ids: [], resource_ids: [], favorite: false });
    setTopicCreateOpen(true);
  };
  const handleTopicCreate = async () => {
    await createTopic.mutateAsync({
      name: topicForm.name,
      area_ids: topicForm.area_ids,
      note_ids: topicForm.note_ids,
      resource_ids: topicForm.resource_ids,
      favorite: topicForm.favorite,
    });
    setTopicCreateOpen(false);
    setTopicForm({ name: "", area_ids: [], note_ids: [], resource_ids: [], favorite: false });
  };
  const handleTopicEdit = (topic: TopicWithCounts) => {
    setTopicEditData(topic);
    setTopicForm({
      name: topic.name,
      area_ids: topic.linkedAreaIds ?? [],
      note_ids: [],
      resource_ids: [],
      favorite: topic.favorite,
    });
  };
  const handleTopicUpdate = async () => {
    if (!topicEditData) return;
    await updateTopic.mutateAsync({
      id: topicEditData.id,
      input: {
        name: topicForm.name,
        area_ids: topicForm.area_ids,
        note_ids: topicForm.note_ids,
        resource_ids: topicForm.resource_ids,
        favorite: topicForm.favorite,
      },
    });
    setTopicEditData(null);
    setTopicForm({ name: "", area_ids: [], note_ids: [], resource_ids: [], favorite: false });
  };

  const openNoteCreate = () => {
    router.push(`/notes/new?returnTo=${encodeReturnTo("/knowledge")}`);
  };

  const handleNewResourceForGroup = (tab: ResourceView, groupId: string) => {
    setEditingResource(null);
    if (tab === RESOURCE_VIEW.BY_AREA) {
      setResourcePrefill({ areaIds: [groupId] });
    } else if (tab === RESOURCE_VIEW.BY_GOAL) {
      setResourcePrefill({ goalIds: [groupId] });
    } else if (tab === RESOURCE_VIEW.BY_PROJECT) {
      setResourcePrefill({ projectId: groupId });
    } else if (tab === RESOURCE_VIEW.BY_TOPIC) {
      setResourcePrefill({ topicId: groupId });
    } else {
      setResourcePrefill({});
    }
    setResourceCreateOpen(true);
  };


  function renderNoteRow(note: Note) {
    const noteAreas = getNoteLinkedAreaIds(note)
      .map((id) => ({ name: areaNames.get(id) ?? id, icon: areaIcons.get(id) ?? null }))
      .filter((a) => Boolean(a.name));
    const noteGoalNames = getNoteLinkedGoalIds(note)
      .map((id) => goalNames.get(id))
      .filter((n): n is string => Boolean(n));
    const noteProjectNames = getNoteLinkedProjectIds(note)
      .map((id) => projNames.get(id))
      .filter((n): n is string => Boolean(n));
    const noteTaskNames = (note.linkedTaskIds ?? [])
      .map((id) => allTasks.find((t) => t.id === id)?.name)
      .filter((n): n is string => Boolean(n));
    return (
      <NoteRow
        key={note.id}
        note={note}
        returnTo="/knowledge"
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
  }

  function renderNotesList(list: Note[]) {
    return (
      <div className="rounded-lg border border-border">
        {list.map((n) => renderNoteRow(n))}
      </div>
    );
  }

  function renderResourceRow(r: Resource) {
    const areas = getResourceLinkedAreaIds(r)
      .map((id) => ({ name: areaNames.get(id), icon: areaIcons.get(id) ?? null }))
      .filter((a): a is { name: string; icon: string | null } => Boolean(a.name));
    const goalNamesList = getResourceLinkedGoalIds(r)
      .map((id) => goalNames.get(id))
      .filter((n): n is string => Boolean(n));
    const projectNamesList = getResourceLinkedProjectIds(r)
      .map((id) => projNames.get(id))
      .filter((n): n is string => Boolean(n));
    const taskNamesList = getResourceLinkedTaskIds(r)
      .map((id) => allTasks.find((t) => t.id === id)?.name)
      .filter((n): n is string => Boolean(n));
    return (
      <ResourceRow
        key={r.id}
        resource={r}
        areas={areas}
        goalNames={goalNamesList}
        projectNames={projectNamesList}
        taskNames={taskNamesList}
        topicName={r.topic_id ? topicNames.get(r.topic_id) : undefined}
        onToggleFavorite={(id, fav) => toggleFavoriteResource.mutate({ id, favorite: fav })}
        onSaveStatusChange={(id, saved) => updateResource.mutate({ id, input: { status: saved ? "completed" : "inbox" } })}
        onArchive={(id) => archiveResource.mutate(id)}
        onUnarchive={(id) => unarchiveResource.mutate(id)}
        onDelete={(id) => deleteResource.mutate(id)}
        onEdit={(res) => setEditingResource(res)}
      />
    );
  }

  function renderResourcesList(list: Resource[]) {
    return (
      <div className="rounded-lg border border-border">
        {list.map((r) => renderResourceRow(r))}
      </div>
    );
  }

  function getAreasForResource(r: Resource) {
    return getResourceLinkedAreaIds(r)
      .map((id) => ({ name: areaNames.get(id), icon: areaIcons.get(id) ?? null }))
      .filter((a): a is { name: string; icon: string | null } => Boolean(a.name));
  }
  function getGoalNamesForResource(r: Resource) {
    return getResourceLinkedGoalIds(r)
      .map((id) => goalNames.get(id))
      .filter((n): n is string => Boolean(n));
  }
  function getProjectNamesForResource(r: Resource) {
    return getResourceLinkedProjectIds(r)
      .map((id) => projNames.get(id))
      .filter((n): n is string => Boolean(n));
  }
  function getTaskNamesForResource(r: Resource) {
    return getResourceLinkedTaskIds(r)
      .map((id) => allTasks.find((t) => t.id === id)?.name)
      .filter((n): n is string => Boolean(n));
  }

  function renderSearchResults() {
    if (srLoading) {
      return (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      );
    }

    const hasResults = sr && (sr.topics.length > 0 || sr.notes.length > 0 || sr.resources.length > 0);

    if (!hasResults) {
      return (
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <Search className="mx-auto mb-3 size-10 text-muted-foreground/40" />
          <p className="font-medium">{t("page.noResultsForLdquo")}{debouncedQuery}{t("areaDialog.rdquo")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("page.tryDifferentKeywords")}</p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {sr!.topics.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <LayersIcon size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
              <h3 className="font-semibold">{t("nav.topics")}</h3>
              <Badge variant="secondary" className="text-xs">{sr!.counts.topics} {t("page.found")}</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sr!.topics.map((topic) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  areaNames={areaNames}
                  areaIcons={areaIcons}
                  duplicateIndex={duplicateIndices.get(topic.id)}
                  returnTo="/knowledge"
                  onToggleFavorite={(id, fav) => toggleFavoriteTopic.mutate({ id, favorite: fav })}
                  onEdit={handleTopicEdit}
                />
              ))}
            </div>
          </div>
        )}

        {sr!.notes.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <SquarePenIcon size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
              <h3 className="font-semibold">{t("nav.notes")}</h3>
              <Badge variant="secondary" className="text-xs">{sr!.counts.notes} {t("page.found2")}</Badge>
            </div>
            {renderNotesList(sr!.notes)}
          </div>
        )}

        {sr!.resources.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Link2Icon size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
              <h3 className="font-semibold">{t("nav.resources")}</h3>
              <Badge variant="secondary" className="text-xs">{sr!.counts.resources} {t("page.found3")}</Badge>
            </div>
            {renderResourcesList(sr!.resources)}
          </div>
        )}
      </div>
    );
  }

  // ── render ────────────────────────────────────────────────────────────────
  if (topicsError || notesError || resourcesError) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16">
        <ErrorState
          message="Failed to load knowledge hub."
          onRetry={() => {
            if (topicsError) refetchTopics();
            if (notesError) refetchNotes();
            if (resourcesError) refetchResources();
          }}
        />
      </div>
    );
  }

  return (
    <div className={cn("content-fade-in reveal-stagger flex flex-col", contentColumnGrid, sectionGap)}>
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <BrainIcon size={24} className="shrink-0 text-muted-foreground" aria-hidden="true" />
          <h1 className="text-2xl font-bold tracking-tight">{t("nav.knowledgeHub")}</h1>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {t("page.storeSearchAndBrowseYourNotesAndResourcesO")}
        </p>
      </div>

      {/* Global Search */}
      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={rawQuery}
          onChange={(e) => setRawQuery(e.target.value)}
          placeholder={t("page.searchTopicsNotesResources")}
          className="pl-9 pr-16"
        />
        {rawQuery && (
          <button
            type="button"
            onClick={() => { setRawQuery(""); setDebouncedQuery(""); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
          >
            {t("action.clear")}
          </button>
        )}
      </div>

      {/* Content */}
      {isSearchActive ? (
        renderSearchResults()
      ) : (
        <div className="space-y-12">
          {/* ── Topics Section ─────────────────────────────────────────────── */}
          <section>
            <SectionHeader
              accentClass="bg-blue-500"
              title={t("nav.topics")}
              totalCount={topics.length}
              description={t("page.exploreYourLibraryOfTopics")}
              buttonLabel="New Topic"
              onNew={openTopicCreate}
              isPending={createTopic.isPending}
            />
            <div className="mt-4">
              <Tabs value={topicsTab} onValueChange={setTopicsTab}>
                <TabsList className="w-full justify-start overflow-x-auto bg-muted/50 p-1 max-[1023px]:snap-x max-[1023px]:snap-mandatory max-[1023px]:touch-pan-x max-[1023px]:overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <TabsTrigger value="active">
                    <CircleDot className="mr-1.5 size-3.5" />{t("goals.tabs.active")}
                  </TabsTrigger>
                  <TabsTrigger value="favorite">
                    <Heart className="mr-1.5 size-3.5" />{t("notes.tabs.favorite")}
                  </TabsTrigger>
                  <TabsTrigger value="inactive">
                    <CircleOff className="mr-1.5 size-3.5" />{t("goals.tabs.inactive")}
                  </TabsTrigger>
                  <TabsTrigger value="by_area">
                    <MapIcon className="mr-1.5 size-3.5" />{t("tasks.tabs.byArea")}
                  </TabsTrigger>
                  <TabsTrigger value="all">
                    <LayoutGrid className="mr-1.5 size-3.5" />{t("notes.tabs.all")}
                  </TabsTrigger>
                  <TabsTrigger value="archived">
                    <Archive className="mr-1.5 size-3.5" />{t("areas.tabs.archived")}
                  </TabsTrigger>
                </TabsList>

                {topicsLoading ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} className="h-28 w-full rounded-xl" />
                    ))}
                  </div>
                ) : (
                  <>
                    <TabsContent value="active" className="mt-4">
                      {activeTopics.length === 0
                        ? <EmptyState icon={Tag} title={t("page.noActiveTopics")} description={t("page.linkNotesOrResourcesToActivateTopics")} />
                        : (
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {activeTopics.map((t) => (
                              <TopicCard key={t.id} topic={t} areaNames={areaNames} areaIcons={areaIcons} duplicateIndex={duplicateIndices.get(t.id)}
                                returnTo="/knowledge"
                                onToggleFavorite={(id, fav) => toggleFavoriteTopic.mutate({ id, favorite: fav })}
                                onEdit={handleTopicEdit}
                                onArchive={(topic) => archiveTopic.mutate(topic.id)} />
                            ))}
                          </div>
                        )}
                    </TabsContent>

                    <TabsContent value="favorite" className="mt-4">
                      {favoriteTopics.length === 0
                        ? <EmptyState icon={Heart} title={t("page.noFavoriteTopics")} description={t("page.starTopicsToSeeThemHere")} />
                        : (
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {favoriteTopics.map((t) => (
                              <TopicCard key={t.id} topic={t} areaNames={areaNames} areaIcons={areaIcons} duplicateIndex={duplicateIndices.get(t.id)}
                                returnTo="/knowledge"
                                onToggleFavorite={(id, fav) => toggleFavoriteTopic.mutate({ id, favorite: fav })}
                                onEdit={handleTopicEdit}
                                onArchive={(topic) => archiveTopic.mutate(topic.id)} />
                            ))}
                          </div>
                        )}
                    </TabsContent>

                    <TabsContent value="inactive" className="mt-4">
                      {inactiveTopics.length === 0
                        ? <EmptyState icon={Tag} title={t("page.noInactiveTopics")} description={t("page.topicsWithNoLinkedItemsAppearHere")} />
                        : (
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {inactiveTopics.map((t) => (
                              <TopicCard key={t.id} topic={t} areaNames={areaNames} areaIcons={areaIcons} duplicateIndex={duplicateIndices.get(t.id)}
                                returnTo="/knowledge"
                                onToggleFavorite={(id, fav) => toggleFavoriteTopic.mutate({ id, favorite: fav })}
                                onEdit={handleTopicEdit}
                                onArchive={(topic) => archiveTopic.mutate(topic.id)} />
                            ))}
                          </div>
                        )}
                    </TabsContent>

                    <TabsContent value="by_area" className="mt-4">
                      {groupedTopicsByArea.length === 0
                        ? <EmptyState icon={Globe} title={t("page.noTopicsLinkedToAreas")} description={t("page.linkTopicsToAreasToSeeThemGroupedHere")} />
                        : (
                          <div className="px-1">
                            {groupedTopicsByArea.map(({ areaId, areaName, topics: areaTopics }) => {
                              const areaIcon = areaIcons.get(areaId) ?? null;
                              return (
                                <CollapsibleTopicGroup
                                  key={areaId}
                                  areaId={areaId}
                                  areaName={areaName}
                                  areaIcon={areaIcon}
                                  topics={areaTopics}
                                  areaNames={areaNames}
                                  areaIcons={areaIcons}
                                  duplicateIndices={duplicateIndices}
                                  onToggleFavorite={(id, fav) => toggleFavoriteTopic.mutate({ id, favorite: fav })}
                                  onEdit={handleTopicEdit}
                                  onArchive={(topic) => archiveTopic.mutate(topic.id)}
                                  onCreateNew={openTopicCreateInArea}
                                />
                              );
                            })}
                          </div>
                        )}
                    </TabsContent>

                    <TabsContent value="all" className="mt-4">
                      {topics.length === 0
                        ? <EmptyState icon={Tag} title={t("page.noTopicsYet")} description={t("page.createYourFirstTopic")} actionLabel="New Topic" onAction={openTopicCreate} />
                        : (
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {topics.map((t) => (
                              <TopicCard key={t.id} topic={t} areaNames={areaNames} areaIcons={areaIcons} duplicateIndex={duplicateIndices.get(t.id)}
                                returnTo="/knowledge"
                                onToggleFavorite={(id, fav) => toggleFavoriteTopic.mutate({ id, favorite: fav })}
                                onEdit={handleTopicEdit}
                                onArchive={(topic) => archiveTopic.mutate(topic.id)} />
                            ))}
                          </div>
                        )}
                    </TabsContent>

                    <TabsContent value="archived" className="mt-4">
                      {archivedTopics.length === 0 ? (
                        <EmptyState icon={Archive} title={t("page.noArchivedTopics")} description={t("page.archivedTopicsWillAppearHere")} />
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {archivedTopics.map((t) => (
                            <TopicCard
                              key={t.id}
                              topic={t}
                              areaNames={areaNames}
                              areaIcons={areaIcons}
                              duplicateIndex={duplicateIndices.get(t.id)}
                              returnTo="/knowledge"
                              onToggleFavorite={(id, fav) => toggleFavoriteTopic.mutate({ id, favorite: fav })}
                              onRestore={(topic) => restoreTopic.mutate(topic.id)}
                            />
                          ))}
                        </div>
                      )}
                    </TabsContent>
                  </>
                )}
              </Tabs>
            </div>
          </section>

          {/* ── Notes Section ──────────────────────────────────────────────── */}
          <section>
            <SectionHeader
              accentClass="bg-purple-500"
              title={t("nav.notes")}
              totalCount={noteCounts.all}
              description={t("knowledgeNotesSection.accessAndSearchYourLatestNotes")}
              buttonLabel="New Note"
              onNew={openNoteCreate}
            />
            <div className="mt-4">
              <Tabs
                value={notesTab}
                onValueChange={(v) => { setNotesTab(v as NoteView); }}
              >
                <TabsList className={NOTES_TABS_LIST_CLASS_NAME}>
                  <TabsTrigger value={NOTE_VIEW.ALL}><LayoutGrid className="mr-1.5 size-3.5" />{t("notes.tabs.all")}</TabsTrigger>
                  <TabsTrigger value={NOTE_VIEW.INBOX}><InboxIcon className="mr-1.5 size-3.5" />{t("nav.inbox")}</TabsTrigger>
                  <TabsTrigger value={NOTE_VIEW.TO_REVIEW}><Clock className="mr-1.5 size-3.5" />{t("notes.tabs.toReview")}</TabsTrigger>
                  <TabsTrigger value={NOTE_VIEW.ACTIVE}><Zap className="mr-1.5 size-3.5" />{t("goals.tabs.active")}</TabsTrigger>
                  <TabsTrigger value={NOTE_VIEW.PINNED}><Pin className="mr-1.5 size-3.5" />{t("notes.tabs.pinned")}</TabsTrigger>
                  <TabsTrigger value={NOTE_VIEW.FAVORITE}><Star className="mr-1.5 size-3.5" />{t("knowledgeNotesSection.favorites")}</TabsTrigger>
                  <TabsTrigger value={NOTE_VIEW.BY_AREA}><MapIcon className="mr-1.5 size-3.5" />{t("tasks.tabs.byArea")}</TabsTrigger>
                  <TabsTrigger value={NOTE_VIEW.BY_GOAL}><Target className="mr-1.5 size-3.5" />{t("tasks.tabs.byGoal")}</TabsTrigger>
                  <TabsTrigger value={NOTE_VIEW.BY_PROJECT}><FolderOpen className="mr-1.5 size-3.5" />{t("tasks.tabs.byProject")}</TabsTrigger>
                  <TabsTrigger value={NOTE_VIEW.BY_TOPIC}><Tag className="mr-1.5 size-3.5" />{t("notes.tabs.byTopic")}</TabsTrigger>
                  <TabsTrigger value={NOTE_VIEW.BY_NOTEBOOK}><BookOpen className="mr-1.5 size-3.5" />{t("notes.tabs.byNotebook")}</TabsTrigger>
                  <TabsTrigger value={NOTE_VIEW.COMPLETED}><Bookmark className="mr-1.5 size-3.5" />{t("tasks.tabs.completed")}</TabsTrigger>
                  <TabsTrigger value={NOTE_VIEW.ARCHIVED}><Archive className="mr-1.5 size-3.5" />{t("areas.tabs.archived")}</TabsTrigger>
                </TabsList>

                {([
                  NOTE_VIEW.ALL,
                  NOTE_VIEW.INBOX,
                  NOTE_VIEW.TO_REVIEW,
                  NOTE_VIEW.ACTIVE,
                  NOTE_VIEW.PINNED,
                  NOTE_VIEW.FAVORITE,
                  NOTE_VIEW.COMPLETED,
                  NOTE_VIEW.ARCHIVED,
                ] as NoteView[]).map((tab) => (
                  <TabsContent key={tab} value={tab} className="mt-4">
                    {notesLoading ? (
                      <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">{t("page.loadingNotes")}</div>
                    ) : visibleNotes.length === 0 ? (
                      <EmptyState
                        icon={NotebookPen}
                        title={t("knowledgeNotesSection.noV0Notes", { v0: tab.replace(/_/g, " ") })}
                        description={t("notes.empty.description")}
                        actionLabel="New Note"
                        onAction={openNoteCreate}
                      />
                    ) : (
                      renderNotesList(visibleNotes)
                    )}
                  </TabsContent>
                ))}

                <TabsContent value={NOTE_VIEW.BY_AREA} className="mt-4">
                  <NotesByGroupView
                    groups={noteGroupsByArea}
                    renderNote={(n) => renderNoteRow(n)}
                    onNewNote={(groupId) => router.push(`/notes/new?areaId=${groupId}&returnTo=${encodeReturnTo("/knowledge")}`)}
                    emptyMessage={t("notes.group.byArea")}
                  />
                </TabsContent>
                <TabsContent value={NOTE_VIEW.BY_GOAL} className="mt-4">
                  <NotesByGroupView
                    groups={noteGroupsByGoal}
                    renderNote={(n) => renderNoteRow(n)}
                    onNewNote={(groupId) => router.push(`/notes/new?goalId=${groupId}&returnTo=${encodeReturnTo("/knowledge")}`)}
                    emptyMessage={t("notes.group.byGoal")}
                  />
                </TabsContent>
                <TabsContent value={NOTE_VIEW.BY_PROJECT} className="mt-4">
                  <NotesByGroupView
                    groups={noteGroupsByProject}
                    renderNote={(n) => renderNoteRow(n)}
                    onNewNote={(groupId) => router.push(`/notes/new?projectId=${groupId}&returnTo=${encodeReturnTo("/knowledge")}`)}
                    emptyMessage={t("notes.group.byProject")}
                  />
                </TabsContent>
                <TabsContent value={NOTE_VIEW.BY_TOPIC} className="mt-4">
                  <NotesByGroupView
                    groups={noteGroupsByTopic}
                    renderNote={(n) => renderNoteRow(n)}
                    onNewNote={(groupId) => router.push(`/notes/new?topicId=${groupId}&returnTo=${encodeReturnTo("/knowledge")}`)}
                    emptyMessage={t("notes.group.byTopic")}
                  />
                </TabsContent>
                <TabsContent value={NOTE_VIEW.BY_NOTEBOOK} className="mt-4">
                  <NotesByGroupView
                    groups={noteGroupsByNotebook}
                    renderNote={(n) => renderNoteRow(n)}
                    onNewNote={(groupId) => router.push(`/notes/new?notebook=${encodeURIComponent(groupId)}&returnTo=${encodeReturnTo("/knowledge")}`)}
                    emptyMessage={t("notes.group.byNotebook")}
                  />
                </TabsContent>              </Tabs>
            </div>
          </section>

          {/* ── Resources Section ──────────────────────────────────────────── */}
          <section>
            <SectionHeader
              accentClass="bg-orange-500"
              title={t("nav.resources")}
              totalCount={resources.length}
              description={t("page.accessAndSearchYourLatestResources")}
              buttonLabel="New Resource"
              onNew={() => setResourceCreateOpen(true)}
              isPending={createResource.isPending}
            />
            <div className="mt-4">
              <Tabs value={resourcesTab} onValueChange={setResourcesTab}>
                <TabsList className="w-full justify-start overflow-x-auto bg-muted/50 p-1 max-[1023px]:snap-x max-[1023px]:snap-mandatory max-[1023px]:touch-pan-x max-[1023px]:overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <TabsTrigger value={RESOURCE_VIEW.ALL}><LayoutGrid className="mr-1.5 size-3.5" />{t("notes.tabs.all")}
                  </TabsTrigger>
                  <TabsTrigger value={RESOURCE_VIEW.INBOX}><InboxIcon className="mr-1.5 size-3.5" />{t("nav.inbox")}
                  </TabsTrigger>
                  <TabsTrigger value={RESOURCE_VIEW.TO_REVIEW}><Clock className="mr-1.5 size-3.5" />{t("notes.tabs.toReview")}
                  </TabsTrigger>
                  <TabsTrigger value={RESOURCE_VIEW.ACTIVE}><Zap className="mr-1.5 size-3.5" />{t("goals.tabs.active")}
                  </TabsTrigger>
                  <TabsTrigger value={RESOURCE_VIEW.FAVORITE}><Heart className="mr-1.5 size-3.5" />{t("knowledgeNotesSection.favorites")}
                  </TabsTrigger>
                  <TabsTrigger value={RESOURCE_VIEW.BY_TOPIC}><Tag className="mr-1.5 size-3.5" />{t("notes.tabs.byTopic")}</TabsTrigger>
                  <TabsTrigger value={RESOURCE_VIEW.BY_AREA}><MapIcon className="mr-1.5 size-3.5" />{t("tasks.tabs.byArea")}</TabsTrigger>
                  <TabsTrigger value={RESOURCE_VIEW.BY_GOAL}><Target className="mr-1.5 size-3.5" />{t("tasks.tabs.byGoal")}</TabsTrigger>
                  <TabsTrigger value={RESOURCE_VIEW.BY_PROJECT}><FolderOpen className="mr-1.5 size-3.5" />{t("tasks.tabs.byProject")}</TabsTrigger>
                  <TabsTrigger value={RESOURCE_VIEW.COMPLETED}><Bookmark className="mr-1.5 size-3.5" />{t("tasks.tabs.completed")}
                  </TabsTrigger>
                  <TabsTrigger value={RESOURCE_VIEW.ARCHIVED}><Archive className="mr-1.5 size-3.5" />{t("areas.tabs.archived")}
                  </TabsTrigger>
                </TabsList>

                {([RESOURCE_VIEW.ALL, RESOURCE_VIEW.INBOX, RESOURCE_VIEW.TO_REVIEW, RESOURCE_VIEW.ACTIVE, RESOURCE_VIEW.FAVORITE, RESOURCE_VIEW.COMPLETED, RESOURCE_VIEW.ARCHIVED] as ResourceView[]).map((v) => (
                  <TabsContent key={v} value={v} className="mt-4">
                    {resourcesLoading && v !== RESOURCE_VIEW.ARCHIVED ? (
                      <div className="flex flex-col">
                        {Array.from({ length: 5 }).map((_, i) => <ResourceRowSkeleton key={i} />)}
                      </div>
                    ) : filteredResources.length === 0 ? (
                      <EmptyState
                        icon={Globe}
                        title={v === RESOURCE_VIEW.ALL ? t("page.noResourcesYet") : t("page.noResources")}
                        description={v === RESOURCE_VIEW.ALL ? t("page.addYourFirstResourceToGetStarted") : t("page.tryADifferentFilter")}
                        actionLabel={v === RESOURCE_VIEW.ALL ? t("goalDetailContent.newResource") : undefined}
                        onAction={v === RESOURCE_VIEW.ALL ? () => setResourceCreateOpen(true) : undefined}
                      />
                    ) : (
                      renderResourcesList(filteredResources)
                    )}
                  </TabsContent>
                ))}

                <TabsContent value={RESOURCE_VIEW.BY_TOPIC} className="mt-4">
                  <ResourcesByGroupView
                    groups={resourceGroupsByTopic}
                    getAreas={getAreasForResource}
                    getGoalNames={getGoalNamesForResource}
                    getProjectNames={getProjectNamesForResource}
                    getTaskNames={getTaskNamesForResource}
                    getTopicName={(r) => r.topic_id ? topicNames.get(r.topic_id) : undefined}
                    onToggleFavorite={(id, fav) => toggleFavoriteResource.mutate({ id, favorite: fav })}
                    onArchive={(id) => archiveResource.mutate(id)}
                    onUnarchive={(id) => unarchiveResource.mutate(id)}
                    onDelete={(id) => deleteResource.mutate(id)}
                    onEdit={(r) => setEditingResource(r)}
                    onNewResource={(groupId) => handleNewResourceForGroup(RESOURCE_VIEW.BY_TOPIC, groupId)}
                    emptyMessage={t("page.resourcesWillBeGroupedByTopicHere")}
                  />
                </TabsContent>
                <TabsContent value={RESOURCE_VIEW.BY_AREA} className="mt-4">
                  <ResourcesByGroupView
                    groups={resourceGroupsByArea}
                    getAreas={getAreasForResource}
                    getGoalNames={getGoalNamesForResource}
                    getProjectNames={getProjectNamesForResource}
                    getTaskNames={getTaskNamesForResource}
                    getTopicName={(r) => r.topic_id ? topicNames.get(r.topic_id) : undefined}
                    onToggleFavorite={(id, fav) => toggleFavoriteResource.mutate({ id, favorite: fav })}
                    onArchive={(id) => archiveResource.mutate(id)}
                    onUnarchive={(id) => unarchiveResource.mutate(id)}
                    onDelete={(id) => deleteResource.mutate(id)}
                    onEdit={(r) => setEditingResource(r)}
                    onNewResource={(groupId) => handleNewResourceForGroup(RESOURCE_VIEW.BY_AREA, groupId)}
                    emptyMessage={t("goalDetailContent.resourcesWillBeGroupedByAreaHere")}
                  />
                </TabsContent>
                <TabsContent value={RESOURCE_VIEW.BY_GOAL} className="mt-4">
                  <ResourcesByGroupView
                    groups={resourceGroupsByGoal}
                    getAreas={getAreasForResource}
                    getGoalNames={getGoalNamesForResource}
                    getProjectNames={getProjectNamesForResource}
                    getTaskNames={getTaskNamesForResource}
                    getTopicName={(r) => r.topic_id ? topicNames.get(r.topic_id) : undefined}
                    onToggleFavorite={(id, fav) => toggleFavoriteResource.mutate({ id, favorite: fav })}
                    onArchive={(id) => archiveResource.mutate(id)}
                    onUnarchive={(id) => unarchiveResource.mutate(id)}
                    onDelete={(id) => deleteResource.mutate(id)}
                    onEdit={(r) => setEditingResource(r)}
                    onNewResource={(groupId) => handleNewResourceForGroup(RESOURCE_VIEW.BY_GOAL, groupId)}
                    emptyMessage={t("areaDetailContent.resourcesWillBeGroupedByGoalHere")}
                  />
                </TabsContent>
                <TabsContent value={RESOURCE_VIEW.BY_PROJECT} className="mt-4">
                  <ResourcesByGroupView
                    groups={resourceGroupsByProject}
                    getAreas={getAreasForResource}
                    getGoalNames={getGoalNamesForResource}
                    getProjectNames={getProjectNamesForResource}
                    getTaskNames={getTaskNamesForResource}
                    getTopicName={(r) => r.topic_id ? topicNames.get(r.topic_id) : undefined}
                    onToggleFavorite={(id, fav) => toggleFavoriteResource.mutate({ id, favorite: fav })}
                    onArchive={(id) => archiveResource.mutate(id)}
                    onUnarchive={(id) => unarchiveResource.mutate(id)}
                    onDelete={(id) => deleteResource.mutate(id)}
                    onEdit={(r) => setEditingResource(r)}
                    onNewResource={(groupId) => handleNewResourceForGroup(RESOURCE_VIEW.BY_PROJECT, groupId)}
                    emptyMessage={t("goalDetailContent.resourcesWillBeGroupedByProjectHere")}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </section>
        </div>
      )}

      {/* ── Topic Create / Edit Dialog ──────────────────────────────────────── */}
      {(topicCreateOpen || !!topicEditData) && (
        <Dialog
          open={topicCreateOpen || !!topicEditData}
          onOpenChange={(open) => {
            if (!open) {
              setTopicCreateOpen(false);
              setTopicEditData(null);
              setTopicForm({ name: "", area_ids: [], note_ids: [], resource_ids: [], favorite: false });
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{topicEditData ? t("page.editTopic") : t("page.newTopic")}</DialogTitle>
              <DialogDescription>
                {topicEditData ? t("page.updateTopicDetails") : t("page.createATopicToOrganizeNotesAndResources")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="kh-topic-name">{t("goalDialog.name")}</Label>
                <Input
                  id="kh-topic-name"
                  placeholder={t("page.egProductivityMachineLearningRecipes")}
                  value={topicForm.name}
                  onChange={(e) => setTopicForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>{t("page.linkedAreas")}</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      {topicForm.area_ids.length === 0 ? t("taskDialog.selectAreas") : `${topicForm.area_ids.length} selected`}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuItem onClick={() => setTopicForm((p) => ({ ...p, area_ids: [] }))}>
                        {t("taskDialog.clearSelection")}
                      </DropdownMenuItem>
                      <div className="max-h-56 overflow-y-auto overscroll-contain">
                        {areas.length === 0 ? (
                          <p className="text-sm text-muted-foreground px-2 py-1.5">{t("page.noAreasAvailable")}</p>
                        ) : (
                          areas.map((area) => {
                            const isSelected = topicForm.area_ids.includes(area.id);
                            const icon = (area.icon as string | null | undefined) ?? null;
                            return (
                              <DropdownMenuItem
                                key={area.id}
                                onSelect={(e) => e.preventDefault()}
                                onClick={() =>
                                  setTopicForm((p) => ({
                                    ...p,
                                    area_ids: isSelected
                                      ? p.area_ids.filter((id) => id !== area.id)
                                      : [...p.area_ids, area.id],
                                  }))
                                }
                                className="flex items-center gap-2"
                              >
                                <Checkbox checked={isSelected} readOnly />
                                {icon && <span className="text-sm leading-none">{icon}</span>}
                                {area.name}
                              </DropdownMenuItem>
                            );
                          })
                        )}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {topicForm.area_ids.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {topicForm.area_ids
                      .map((id) => areas.find((a) => a.id === id))
                      .filter((a): a is NonNullable<typeof a> => Boolean(a))
                      .map((area) => (
                        <Badge key={area.id} variant="secondary" className="flex items-center gap-1">
                          {area.icon ? `${area.icon} ` : ""}{area.name}
                          <button
                            type="button"
                            onClick={() =>
                              setTopicForm((p) => ({
                                ...p,
                                area_ids: p.area_ids.filter((id) => id !== area.id),
                              }))
                            }
                            className="ml-1 rounded-full p-0.5 hover:bg-muted"
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>{t("page.linkNotes")}</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      {topicForm.note_ids.length === 0 ? t("page.selectNotes") : `${topicForm.note_ids.length} selected`}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                      <DropdownMenuItem onClick={() => setTopicForm((p) => ({ ...p, note_ids: [] }))}>
                        {t("taskDialog.clearSelection")}
                      </DropdownMenuItem>
                      <div className="max-h-56 overflow-y-auto overscroll-contain">
                        {notes.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">{t("page.noNotesAvailable")}</div>
                        ) : (
                          notes.map((note) => {
                            const isSelected = topicForm.note_ids.includes(note.id);
                            return (
                              <DropdownMenuItem
                                key={note.id}
                                onSelect={(e) => e.preventDefault()}
                                onClick={() =>
                                  setTopicForm((p) => ({
                                    ...p,
                                    note_ids: isSelected
                                      ? p.note_ids.filter((id) => id !== note.id)
                                      : [...p.note_ids, note.id],
                                  }))
                                }
                                className="flex items-center gap-2"
                              >
                                <Checkbox checked={isSelected} readOnly />
                                <span className="truncate">{note.name}</span>
                              </DropdownMenuItem>
                            );
                          })
                        )}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {topicForm.note_ids.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {topicForm.note_ids
                      .map((id) => notes.find((n) => n.id === id))
                      .filter((n): n is NonNullable<typeof n> => Boolean(n))
                      .map((note) => (
                        <Badge key={note.id} variant="secondary" className="flex items-center gap-1">
                          <span className="truncate max-w-[120px]">{note.name}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setTopicForm((p) => ({
                                ...p,
                                note_ids: p.note_ids.filter((id) => id !== note.id),
                              }))
                            }
                            className="ml-1 rounded-full p-0.5 hover:bg-muted"
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                  </div>
                )}
              </div>
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>{t("page.linkResources")}</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className={buttonVariants({ variant: "outline", size: "sm" })}
                    >
                      {topicForm.resource_ids.length === 0 ? t("page.selectResources") : `${topicForm.resource_ids.length} selected`}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-64">
                      <DropdownMenuItem onClick={() => setTopicForm((p) => ({ ...p, resource_ids: [] }))}>
                        {t("taskDialog.clearSelection")}
                      </DropdownMenuItem>
                      <div className="max-h-56 overflow-y-auto overscroll-contain">
                        {resources.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">{t("page.noResourcesAvailable")}</div>
                        ) : (
                          resources.map((resource) => {
                            const isSelected = topicForm.resource_ids.includes(resource.id);
                            return (
                              <DropdownMenuItem
                                key={resource.id}
                                onSelect={(e) => e.preventDefault()}
                                onClick={() =>
                                  setTopicForm((p) => ({
                                    ...p,
                                    resource_ids: isSelected
                                      ? p.resource_ids.filter((id) => id !== resource.id)
                                      : [...p.resource_ids, resource.id],
                                  }))
                                }
                                className="flex items-center gap-2"
                              >
                                <Checkbox checked={isSelected} readOnly />
                                <span className="truncate">{resource.name}</span>
                              </DropdownMenuItem>
                            );
                          })
                        )}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {topicForm.resource_ids.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {topicForm.resource_ids
                      .map((id) => resources.find((r) => r.id === id))
                      .filter((r): r is NonNullable<typeof r> => Boolean(r))
                      .map((resource) => (
                        <Badge key={resource.id} variant="secondary" className="flex items-center gap-1">
                          <span className="truncate max-w-[120px]">{resource.name}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setTopicForm((p) => ({
                                ...p,
                                resource_ids: p.resource_ids.filter((id) => id !== resource.id),
                              }))
                            }
                            className="ml-1 rounded-full p-0.5 hover:bg-muted"
                          >
                            <X className="size-3" />
                          </button>
                        </Badge>
                      ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTopicForm((p) => ({ ...p, favorite: !p.favorite }))}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
                    topicForm.favorite
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-muted/50 text-muted-foreground hover:border-primary/40",
                  )}
                >
                  <Heart className={cn("size-3.5", topicForm.favorite && "fill-current")} />
                  {t("notes.tabs.favorite")}
                </button>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setTopicCreateOpen(false);
                  setTopicEditData(null);
                  setTopicForm({ name: "", area_ids: [], note_ids: [], resource_ids: [], favorite: false });
                }}
              >
                {t("action.cancel")}
              </Button>
              <Button
                onClick={topicEditData ? handleTopicUpdate : handleTopicCreate}
                disabled={!topicForm.name || (topicEditData ? updateTopic.isPending : createTopic.isPending)}
              >
                {topicEditData ? t("goalDialog.saveChanges") : t("page.createTopic")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Resource Create / Edit Dialog ───────────────────────────────────── */}
      <ResourceDialog
        open={resourceCreateOpen || !!editingResource}
        onOpenChange={(open) => {
          if (!open) {
            setResourceCreateOpen(false);
            setEditingResource(null);
            setResourcePrefill({});
          }
        }}
        resource={editingResource}
        initialAreaIds={resourcePrefill.areaIds}
        initialGoalIds={resourcePrefill.goalIds}
        initialProjectId={resourcePrefill.projectId}
        initialTopicId={resourcePrefill.topicId}
        onSubmit={async (input) => {
          if (editingResource) {
            await updateResource.mutateAsync({ id: editingResource.id, input });
            setEditingResource(null);
          } else {
            await createResource.mutateAsync(input as Parameters<typeof createResource.mutateAsync>[0]);
            setResourceCreateOpen(false);
            setResourcePrefill({});
          }
        }}
        isPending={createResource.isPending || updateResource.isPending}
      />
    </div>
  );
}

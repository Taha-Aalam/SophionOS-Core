"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Archive,
  ArchiveRestore,
  BookOpen,
  ChevronDown,
  ChevronRight,
  FilePlus,
  FolderOpen,
  Globe,
  Heart,
  Library,
  Link2,
  NotebookPen,
  Pin,
  Search,
  Star,
  Tag,
} from "lucide-react";

import { EmptyState } from "@/components/views/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResourceRow, ResourceRowSkeleton } from "@/components/entities/resource-row";
import { TopicCard } from "@/components/entities/topic-card";
import { useAuth } from "@/components/providers/auth-provider";
import { useAreas } from "@/lib/hooks/use-areas";
import { useGoals } from "@/lib/hooks/use-goals";
import { useProjects } from "@/lib/hooks/use-projects";
import {
  useArchiveNoteWithUndo,
  useCreateNote,
  useNoteByIdentifier,
  useNotes,
  useNotesByGoal,
  useNotesByNotebook,
  useNotebooks,
  useRelatedNotes,
  useRestoreNote,
  useToggleFavoriteNote,
  useTogglePinNote,
  NOTES_QUERY_KEY,
} from "@/lib/hooks/use-notes";
import {
  useArchiveResource,
  useArchivedResources,
  useCreateResource,
  useResources,
  useToggleFavoriteResource,
  useUpdateResource,
} from "@/lib/hooks/use-resources";
import { useNoteDefaults } from "@/lib/hooks/use-user-settings";
import { useKnowledgeSearch } from "@/lib/hooks/use-knowledge-hub";
import {
  useTopics,
  useCreateTopic,
  useUpdateTopic,
  useToggleFavoriteTopic,
} from "@/lib/hooks/use-topics";
import { noteService } from "@/lib/services/note.service";
import type { Note, Resource } from "@/lib/types/domain.types";
import type { TopicWithCounts } from "@/lib/services/topic.service";
import {
  NOTE_STATUS,
  NOTE_TYPE,
  RESOURCE_STATUS,
  RESOURCE_TYPE,
  type NoteStatus,
  type NoteType,
  type ResourceStatus,
} from "@/lib/utils/constants";
import { cn } from "@/lib/utils";

// ─── colour maps ─────────────────────────────────────────────────────────────
const NOTE_SC: Record<string, string> = {
  inbox: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  to_review: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  archive: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};
const NOTE_TC: Record<string, string> = {
  note: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  research: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  journal: "bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300",
};

// ─── notes tabs ───────────────────────────────────────────────────────────────
const NOTE_TABS: {
  value: string;
  label: string;
  filter: (n: Note) => boolean;
  gb?: "topic_id" | "project_id";
}[] = [
  { value: "all", label: "All", filter: (n) => !n.is_archived },
  { value: "inbox", label: "Inbox", filter: (n) => n.status === NOTE_STATUS.INBOX && !n.is_archived },
  { value: "to_review", label: "To review", filter: (n) => n.status === NOTE_STATUS.TO_REVIEW && !n.is_archived },
  { value: "pinned", label: "Pinned", filter: (n) => !!n.pin && !n.is_archived },
  { value: "favorite", label: "Favorite", filter: (n) => !!n.favorite && !n.is_archived },
  { value: "by_topic", label: "By Topic", filter: (n) => !n.is_archived && !!n.topic_id, gb: "topic_id" },
  { value: "by_project", label: "By Project", filter: (n) => !n.is_archived && !!n.project_id, gb: "project_id" },
  { value: "archived", label: "Archived", filter: (n) => !!n.is_archived },
];

const RESOURCE_TYPE_OPTIONS = [
  { value: RESOURCE_TYPE.WEBSITE, label: "Website" },
  { value: RESOURCE_TYPE.ARTICLE, label: "Article" },
  { value: RESOURCE_TYPE.VIDEO, label: "Video" },
  { value: RESOURCE_TYPE.DOCUMENT, label: "Document" },
  { value: RESOURCE_TYPE.PODCAST, label: "Podcast" },
  { value: RESOURCE_TYPE.SOCIAL_MEDIA, label: "Social Media" },
  { value: RESOURCE_TYPE.TOOL, label: "Tool" },
];

const RESOURCE_TABS = [
  { v: "inbox", l: "Inbox" },
  { v: "to_review", l: "To Review" },
  { v: "favorites", l: "Favorites" },
  { v: "by_topics", l: "By Topics" },
  { v: "archive", l: "Archive" },
  { v: "all", l: "All" },
];

// ─── SectionHeader ────────────────────────────────────────────────────────────
function SectionHeader({
  accentClass,
  title,
  description,
  buttonLabel,
  onNew,
  isPending,
}: {
  accentClass: string;
  title: string;
  description: string;
  buttonLabel: string;
  onNew: () => void;
  isPending?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className={cn("mt-1.5 h-full min-h-[2.5rem] w-1 shrink-0 rounded-full", accentClass)} />
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
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

// ─── page ─────────────────────────────────────────────────────────────────────
export default function KnowledgeHubPage() {
  const router = useRouter();
  const { user } = useAuth();

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
  const { data: topics = [], isLoading: topicsLoading } = useTopics();
  const { data: notes = [], isLoading: notesLoading } = useNotes({ status: "all" });
  const { data: resources = [], isLoading: resourcesLoading } = useResources({ status: "all" });
  const { data: archivedResources = [] } = useArchivedResources();
  const { data: areas = [] } = useAreas();
  const { data: projects = [] } = useProjects({ status: "all" });
  const { data: goals = [] } = useGoals({});
  const { data: notebooks = [] } = useNotebooks();
  const { data: noteDefs } = useNoteDefaults();

  // ── derived maps ─────────────────────────────────────────────────────────
  const areaNames = useMemo(() => new Map(areas.map((a) => [a.id, a.name])), [areas]);
  const projNames = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);
  const topicNames = useMemo(() => new Map(topics.map((t) => [t.id, t.name])), [topics]);
  const goalNames = useMemo(() => new Map(goals.map((g) => [g.id, g.name])), [goals]);

  // ── note related counts ──────────────────────────────────────────────────
  const noteIds = useMemo(() => notes.map((n) => n.id), [notes]);
  const { data: rCounts } = useQuery({
    queryKey: [NOTES_QUERY_KEY, "rc", user?.id, noteIds],
    queryFn: () => noteService.getNoteRelatedCounts(user!.id, noteIds),
    enabled: !!user && noteIds.length > 0,
  });
  const { data: gLinks } = useQuery({
    queryKey: [NOTES_QUERY_KEY, "gl", user?.id, noteIds],
    queryFn: () => noteService.getNoteGoalIds(user!.id, noteIds),
    enabled: !!user && noteIds.length > 0,
  });

  // ── topics section state ─────────────────────────────────────────────────
  const [topicsTab, setTopicsTab] = useState("active");
  const [topicCreateOpen, setTopicCreateOpen] = useState(false);
  const [topicEditData, setTopicEditData] = useState<TopicWithCounts | null>(null);
  const [topicForm, setTopicForm] = useState({ name: "", area_ids: [] as string[], favorite: false });

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
        const g = grouped.get("__none__") ?? { areaName: "No Area", topics: [] };
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
  }, [topics, areaNames]);

  // ── notes section state ──────────────────────────────────────────────────
  const [notesTab, setNotesTab] = useState("all");
  const [noteCreateOpen, setNoteCreateOpen] = useState(false);
  const [noteForm, setNoteForm] = useState({
    name: "",
    status: NOTE_STATUS.INBOX as NoteStatus,
    type: NOTE_TYPE.NOTE as NoteType,
    notebook: "",
  });
  const [noteOpenGroups, setNoteOpenGroups] = useState<Set<string>>(new Set());

  const noteTabConfig = useMemo(() => NOTE_TABS.find((t) => t.value === notesTab), [notesTab]);
  const filteredNotes = useMemo(() => {
    const cfg = NOTE_TABS.find((t) => t.value === notesTab);
    const list = (cfg ? notes.filter(cfg.filter) : notes.filter((n) => !n.is_archived)).slice();
    return list.sort((a, b) => {
      if (a.pin && !b.pin) return -1;
      if (!a.pin && b.pin) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  }, [notes, notesTab]);

  // ── resources section state ──────────────────────────────────────────────
  const [resourcesTab, setResourcesTab] = useState("inbox");
  const [resourceCreateOpen, setResourceCreateOpen] = useState(false);
  const [resourceForm, setResourceForm] = useState({
    name: "",
    url: "",
    type: RESOURCE_TYPE.WEBSITE,
    area_id: "",
    project_id: "",
    topic_id: "",
    status: RESOURCE_STATUS.INBOX,
  });

  const filteredResources = useMemo(() => {
    switch (resourcesTab) {
      case "inbox": return resources.filter((r) => r.status === RESOURCE_STATUS.INBOX);
      case "to_review": return resources.filter((r) => r.status === RESOURCE_STATUS.TO_REVIEW);
      case "favorites": return resources.filter((r) => r.favorite);
      case "archive": return archivedResources;
      default: return resources;
    }
  }, [resourcesTab, resources, archivedResources]);

  const resourcesByTopic = useMemo(() => {
    const map = new Map<string, Resource[]>();
    for (const r of resources) {
      if (r.topic_id) {
        const list = map.get(r.topic_id) ?? [];
        list.push(r);
        map.set(r.topic_id, list);
      }
    }
    return map;
  }, [resources]);

  // ── mutations ─────────────────────────────────────────────────────────────
  const createTopic = useCreateTopic();
  const updateTopic = useUpdateTopic();
  const toggleFavoriteTopic = useToggleFavoriteTopic();

  const createNote = useCreateNote();
  const toggleFavoriteNote = useToggleFavoriteNote();
  const togglePinNote = useTogglePinNote();
  const archiveNote = useArchiveNoteWithUndo();
  const restoreNote = useRestoreNote();

  const createResource = useCreateResource();
  const toggleFavoriteResource = useToggleFavoriteResource();
  const archiveResource = useArchiveResource();
  const updateResource = useUpdateResource();

  // ── handlers ─────────────────────────────────────────────────────────────
  const openTopicCreate = () => {
    setTopicForm({ name: "", area_ids: [], favorite: false });
    setTopicCreateOpen(true);
  };
  const handleTopicCreate = async () => {
    await createTopic.mutateAsync({ name: topicForm.name, area_ids: topicForm.area_ids, favorite: topicForm.favorite });
    setTopicCreateOpen(false);
    setTopicForm({ name: "", area_ids: [], favorite: false });
  };
  const handleTopicEdit = (topic: TopicWithCounts) => {
    setTopicEditData(topic);
    setTopicForm({ name: topic.name, area_ids: topic.linkedAreaIds ?? [], favorite: topic.favorite });
  };
  const handleTopicUpdate = async () => {
    if (!topicEditData) return;
    await updateTopic.mutateAsync({
      id: topicEditData.id,
      input: { name: topicForm.name, area_ids: topicForm.area_ids, favorite: topicForm.favorite },
    });
    setTopicEditData(null);
    setTopicForm({ name: "", area_ids: [], favorite: false });
  };

  const openNoteCreate = () => {
    setNoteForm({
      name: "",
      status: noteDefs?.default_status ?? NOTE_STATUS.INBOX,
      type: noteDefs?.default_type ?? NOTE_TYPE.NOTE,
      notebook: noteDefs?.default_notebook ?? "",
    });
    setNoteCreateOpen(true);
  };
  const handleNoteCreate = async () => {
    const note = await createNote.mutateAsync({
      name: noteForm.name.trim() || "Untitled note",
      status: noteForm.status,
      type: noteForm.type,
      notebook: noteForm.notebook || null,
    });
    setNoteCreateOpen(false);
    router.push(`/notes/${note.slug ?? note.id}`);
  };

  const handleResourceCreate = async () => {
    await createResource.mutateAsync({
      name: resourceForm.name,
      url: resourceForm.url || undefined,
      type: resourceForm.type as Resource["type"],
      status: resourceForm.status as ResourceStatus,
      area_id: resourceForm.area_id || undefined,
      project_id: resourceForm.project_id || undefined,
      topic_id: resourceForm.topic_id || undefined,
    });
    setResourceCreateOpen(false);
    setResourceForm({ name: "", url: "", type: RESOURCE_TYPE.WEBSITE, area_id: "", project_id: "", topic_id: "", status: RESOURCE_STATUS.INBOX });
  };
  const handleResourceUrlBlur = () => {
    if (resourceForm.url && !resourceForm.name) {
      try {
        const host = new URL(resourceForm.url).hostname.replace(/^www\./, "");
        setResourceForm((p) => ({ ...p, name: host }));
      } catch { /* invalid URL */ }
    }
  };

  // ── render helpers ────────────────────────────────────────────────────────
  function renderNoteRow(note: Note) {
    const rc = rCounts?.get(note.id) ?? 0;
    const gs = (gLinks?.get(note.id) ?? []).slice(0, 2).map((gid) => ({ id: gid, name: goalNames.get(gid) ?? "Goal" }));
    return (
      <TableRow
        key={note.id}
        className="group cursor-pointer"
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("[data-sc]")) return;
          router.push(`/notes/${note.slug ?? note.id}`);
        }}
      >
        <TableCell className="w-8">
          <button
            data-sc
            type="button"
            onClick={() => togglePinNote.mutate({ id: note.id, pin: !note.pin })}
            className={cn("rounded p-1 transition-colors", note.pin ? "text-primary" : "text-muted-foreground opacity-0 group-hover:opacity-100")}
            title={note.pin ? "Unpin" : "Pin"}
          >
            <Pin className={cn("size-3.5", note.pin && "fill-current")} />
          </button>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <span className="font-medium">{note.name}</span>
            {rc > 0 && (
              <Badge variant="outline" className="h-4 px-1 text-[10px]">
                <Link2 className="mr-0.5 size-2.5" />{rc}
              </Badge>
            )}
          </div>
        </TableCell>
        <TableCell className="hidden sm:table-cell">
          <Badge variant="secondary" className={cn("text-xs", NOTE_TC[note.type])}>{note.type}</Badge>
        </TableCell>
        <TableCell className="hidden sm:table-cell">
          <Badge variant="secondary" className={cn("text-xs", NOTE_SC[note.status])}>{note.status.replace("_", " ")}</Badge>
        </TableCell>
        <TableCell className="hidden md:table-cell">
          {note.notebook
            ? <Badge variant="outline" className="text-xs"><BookOpen className="mr-1 size-2.5" />{note.notebook}</Badge>
            : <span className="text-xs text-muted-foreground">—</span>}
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          {note.project_id && projNames.has(note.project_id)
            ? (
              <Badge
                variant="outline"
                className="cursor-pointer text-xs hover:bg-muted"
                onClick={(e) => { e.stopPropagation(); router.push(`/projects/${note.project_id}`); }}
              >
                <FolderOpen className="mr-1 size-2.5" />{projNames.get(note.project_id)}
              </Badge>
            )
            : <span className="text-xs text-muted-foreground">—</span>}
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          <div className="flex flex-wrap gap-1">
            {gs.map((g) => (
              <Badge
                key={g.id}
                variant="outline"
                className="cursor-pointer text-xs hover:bg-muted"
                onClick={(e) => { e.stopPropagation(); router.push(`/goals/${g.id}`); }}
              >
                <Tag className="mr-1 size-2.5" />{g.name}
              </Badge>
            ))}
          </div>
        </TableCell>
        <TableCell className="w-8">
          <button
            data-sc
            type="button"
            onClick={() => toggleFavoriteNote.mutate({ id: note.id, favorite: !note.favorite })}
            className={cn("rounded p-1 transition-colors", note.favorite ? "text-rose-500" : "text-muted-foreground opacity-0 group-hover:opacity-100")}
            title={note.favorite ? "Unfavorite" : "Favorite"}
          >
            <Star className={cn("size-3.5", note.favorite && "fill-current")} />
          </button>
        </TableCell>
        <TableCell className="w-8">
          {note.is_archived
            ? (
              <button data-sc type="button" onClick={() => restoreNote.mutate(note.id)} className="rounded p-1 text-muted-foreground hover:text-foreground" title="Restore">
                <ArchiveRestore className="size-3.5" />
              </button>
            )
            : (
              <button data-sc type="button" onClick={() => archiveNote.mutate(note.id)} className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground" title="Archive">
                <Archive className="size-3.5" />
              </button>
            )}
        </TableCell>
        <TableCell className="hidden sm:table-cell w-20 text-xs text-muted-foreground">
          {new Date(note.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </TableCell>
      </TableRow>
    );
  }

  function renderNotesTable(list: Note[]) {
    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8" />
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Type</TableHead>
              <TableHead className="hidden sm:table-cell">Status</TableHead>
              <TableHead className="hidden md:table-cell">Notebook</TableHead>
              <TableHead className="hidden lg:table-cell">Project</TableHead>
              <TableHead className="hidden lg:table-cell">Goals</TableHead>
              <TableHead className="w-8" />
              <TableHead className="w-8" />
              <TableHead className="hidden sm:table-cell w-20">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{list.map(renderNoteRow)}</TableBody>
        </Table>
      </div>
    );
  }

  function renderGroupedNotes(gb: "topic_id" | "project_id") {
    const map = new Map<string, Note[]>();
    for (const n of filteredNotes) {
      const k = (n[gb] as string | null) ?? "Uncategorized";
      const a = map.get(k) ?? [];
      a.push(n);
      map.set(k, a);
    }
    const groups = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    return (
      <div className="space-y-2">
        {groups.map(([k, g]) => {
          const isOpen = noteOpenGroups.has(k) || groups.length <= 3;
          const label = gb === "topic_id" ? topicNames.get(k) : projNames.get(k);
          return (
            <div key={k} className="rounded-lg border">
              <button
                className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-muted/50"
                onClick={() =>
                  setNoteOpenGroups((p) => {
                    const n = new Set(p);
                    if (n.has(k)) n.delete(k); else n.add(k);
                    return n;
                  })
                }
              >
                {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                {label ?? k}
                <Badge variant="secondary" className="ml-auto h-4 px-1.5 text-[10px]">{g.length}</Badge>
              </button>
              {isOpen && <div className="border-t">{renderNotesTable(g)}</div>}
            </div>
          );
        })}
      </div>
    );
  }

  function renderResourcesTable(list: Resource[]) {
    return (
      <div className="rounded-lg border border-border">
        <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-3 py-2">
          <span className="w-20 text-xs font-medium text-muted-foreground">Status</span>
          <span className="flex-1 text-xs font-medium text-muted-foreground">Name</span>
          <span className="hidden sm:inline w-20 text-xs font-medium text-muted-foreground">Type</span>
          <span className="hidden md:inline w-16 text-xs font-medium text-muted-foreground">Topic</span>
          <span className="hidden lg:inline w-16 text-xs font-medium text-muted-foreground">Area</span>
          <span className="hidden xl:inline w-16 text-xs font-medium text-muted-foreground">Project</span>
          <span className="w-8" />
          <span className="w-8" />
          <span className="w-8" />
        </div>
        {list.map((r) => (
          <ResourceRow
            key={r.id}
            resource={r}
            areaName={r.area_id ? areaNames.get(r.area_id) : undefined}
            projectName={r.project_id ? projNames.get(r.project_id) : undefined}
            topicName={r.topic_id ? topicNames.get(r.topic_id) : undefined}
            onToggleFavorite={(id, fav) => toggleFavoriteResource.mutate({ id, favorite: fav })}
            onArchive={(id) => archiveResource.mutate(id)}
            onStatusChange={(id, status) => updateResource.mutate({ id, input: { status } })}
          />
        ))}
      </div>
    );
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
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Search className="mx-auto mb-3 size-10 text-muted-foreground/40" />
          <p className="font-medium">No results for &ldquo;{debouncedQuery}&rdquo;</p>
          <p className="mt-1 text-sm text-muted-foreground">Try different keywords</p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {sr!.topics.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Tag className="size-4 text-blue-500" />
              <h3 className="font-semibold">Topics</h3>
              <Badge variant="secondary" className="text-xs">{sr!.counts.topics} found</Badge>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sr!.topics.map((topic) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  areaNames={areaNames}
                  duplicateIndex={duplicateIndices.get(topic.id)}
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
              <NotebookPen className="size-4 text-purple-500" />
              <h3 className="font-semibold">Notes</h3>
              <Badge variant="secondary" className="text-xs">{sr!.counts.notes} found</Badge>
            </div>
            {renderNotesTable(sr!.notes)}
          </div>
        )}

        {sr!.resources.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Globe className="size-4 text-emerald-500" />
              <h3 className="font-semibold">Resources</h3>
              <Badge variant="secondary" className="text-xs">{sr!.counts.resources} found</Badge>
            </div>
            {renderResourcesTable(sr!.resources)}
          </div>
        )}
      </div>
    );
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <Library className="size-6 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Knowledge Hub</h1>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          This hub is your go-to place for storing and easily retrieving all your knowledge.
          Access and search your resources and notes, neatly organized by type or topic.
        </p>
      </div>

      {/* Global Search */}
      <div className="relative max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={rawQuery}
          onChange={(e) => setRawQuery(e.target.value)}
          placeholder="Search topics, notes, resources…"
          className="pl-9 pr-16"
        />
        {rawQuery && (
          <button
            type="button"
            onClick={() => { setRawQuery(""); setDebouncedQuery(""); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear
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
              title="Topics"
              description="Explore your library of Topics."
              buttonLabel="New Topic"
              onNew={openTopicCreate}
              isPending={createTopic.isPending}
            />
            <div className="mt-4">
              <Tabs value={topicsTab} onValueChange={setTopicsTab}>
                <TabsList>
                  <TabsTrigger value="active">
                    Active
                    {activeTopics.length > 0 && <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">{activeTopics.length}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="favorite">
                    <Heart className="mr-1 size-3" />Favorite
                    {favoriteTopics.length > 0 && <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">{favoriteTopics.length}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="inactive">
                    Inactive
                    {inactiveTopics.length > 0 && <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">{inactiveTopics.length}</Badge>}
                  </TabsTrigger>
                  <TabsTrigger value="by_area">
                    <Globe className="mr-1 size-3" />By Area
                  </TabsTrigger>
                  <TabsTrigger value="all">
                    All
                    {topics.length > 0 && <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">{topics.length}</Badge>}
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
                        ? <EmptyState icon={Tag} title="No active topics" description="Link notes or resources to activate topics" />
                        : (
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {activeTopics.map((t) => (
                              <TopicCard key={t.id} topic={t} areaNames={areaNames} duplicateIndex={duplicateIndices.get(t.id)}
                                onToggleFavorite={(id, fav) => toggleFavoriteTopic.mutate({ id, favorite: fav })} onEdit={handleTopicEdit} />
                            ))}
                          </div>
                        )}
                    </TabsContent>

                    <TabsContent value="favorite" className="mt-4">
                      {favoriteTopics.length === 0
                        ? <EmptyState icon={Heart} title="No favorite topics" description="Star topics to see them here" />
                        : (
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {favoriteTopics.map((t) => (
                              <TopicCard key={t.id} topic={t} areaNames={areaNames} duplicateIndex={duplicateIndices.get(t.id)}
                                onToggleFavorite={(id, fav) => toggleFavoriteTopic.mutate({ id, favorite: fav })} onEdit={handleTopicEdit} />
                            ))}
                          </div>
                        )}
                    </TabsContent>

                    <TabsContent value="inactive" className="mt-4">
                      {inactiveTopics.length === 0
                        ? <EmptyState icon={Tag} title="No inactive topics" description="Topics with no linked items appear here" />
                        : (
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {inactiveTopics.map((t) => (
                              <TopicCard key={t.id} topic={t} areaNames={areaNames} duplicateIndex={duplicateIndices.get(t.id)}
                                onToggleFavorite={(id, fav) => toggleFavoriteTopic.mutate({ id, favorite: fav })} onEdit={handleTopicEdit} />
                            ))}
                          </div>
                        )}
                    </TabsContent>

                    <TabsContent value="by_area" className="mt-4">
                      {groupedTopicsByArea.length === 0
                        ? <EmptyState icon={Globe} title="No topics linked to areas" description="Link topics to areas to see them grouped here" />
                        : (
                          <div className="space-y-6">
                            {groupedTopicsByArea.map(({ areaId, areaName, topics: areaTopics }) => (
                              <div key={areaId}>
                                <div className="mb-3 flex items-center gap-2">
                                  <Globe className="size-4 text-muted-foreground" />
                                  <h3 className="font-semibold">{areaName}</h3>
                                  <Badge variant="secondary" className="text-xs">{areaTopics.length}</Badge>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                  {areaTopics.map((t) => (
                                    <TopicCard key={t.id} topic={t} areaNames={areaNames} duplicateIndex={duplicateIndices.get(t.id)}
                                      onToggleFavorite={(id, fav) => toggleFavoriteTopic.mutate({ id, favorite: fav })} onEdit={handleTopicEdit} />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                    </TabsContent>

                    <TabsContent value="all" className="mt-4">
                      {topics.length === 0
                        ? <EmptyState icon={Tag} title="No topics yet" description="Create your first topic" actionLabel="New Topic" onAction={openTopicCreate} />
                        : (
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {topics.map((t) => (
                              <TopicCard key={t.id} topic={t} areaNames={areaNames} duplicateIndex={duplicateIndices.get(t.id)}
                                onToggleFavorite={(id, fav) => toggleFavoriteTopic.mutate({ id, favorite: fav })} onEdit={handleTopicEdit} />
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
              title="Notes"
              description="Access and search your latest Notes."
              buttonLabel="New Note"
              onNew={openNoteCreate}
              isPending={createNote.isPending}
            />
            <div className="mt-4">
              <Tabs
                value={notesTab}
                onValueChange={(v) => { setNotesTab(v); setNoteOpenGroups(new Set()); }}
              >
                <TabsList className="h-auto flex-wrap">
                  {NOTE_TABS.map((t) => {
                    const count = notes.filter(t.filter).length;
                    return (
                      <TabsTrigger key={t.value} value={t.value}>
                        {t.label}
                        {count > 0 && <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">{count}</Badge>}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {NOTE_TABS.map((t) => (
                  <TabsContent key={t.value} value={t.value} className="mt-4">
                    {notesLoading ? (
                      <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className="flex items-center gap-4 rounded-lg border p-3">
                            <Skeleton className="h-4 w-8" />
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-16" />
                          </div>
                        ))}
                      </div>
                    ) : filteredNotes.length === 0 ? (
                      <EmptyState
                        icon={NotebookPen}
                        title={`No ${t.label.toLowerCase()} notes`}
                        description="Try a different filter or create a new note."
                        actionLabel="New Note"
                        onAction={openNoteCreate}
                      />
                    ) : noteTabConfig?.gb ? (
                      renderGroupedNotes(noteTabConfig.gb)
                    ) : (
                      renderNotesTable(filteredNotes)
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </section>

          {/* ── Resources Section ──────────────────────────────────────────── */}
          <section>
            <SectionHeader
              accentClass="bg-emerald-500"
              title="Resources"
              description="Access and search your latest Resources."
              buttonLabel="New Resource"
              onNew={() => setResourceCreateOpen(true)}
              isPending={createResource.isPending}
            />
            <div className="mt-4">
              <Tabs value={resourcesTab} onValueChange={setResourcesTab}>
                <TabsList>
                  {RESOURCE_TABS.map(({ v, l }) => {
                    let count: number | undefined;
                    if (v === "inbox") count = resources.filter((r) => r.status === RESOURCE_STATUS.INBOX).length;
                    else if (v === "to_review") count = resources.filter((r) => r.status === RESOURCE_STATUS.TO_REVIEW).length;
                    else if (v === "favorites") count = resources.filter((r) => r.favorite).length;
                    else if (v === "archive") count = archivedResources.length;
                    else if (v === "all") count = resources.length;
                    return (
                      <TabsTrigger key={v} value={v}>
                        {l}
                        {count != null && count > 0 && <Badge variant="secondary" className="ml-1.5 h-4 px-1.5 text-[10px]">{count}</Badge>}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {["inbox", "to_review", "favorites", "archive", "all"].map((v) => (
                  <TabsContent key={v} value={v} className="mt-4">
                    {resourcesLoading && v !== "archive" ? (
                      <div className="flex flex-col">
                        {Array.from({ length: 5 }).map((_, i) => <ResourceRowSkeleton key={i} />)}
                      </div>
                    ) : filteredResources.length === 0 ? (
                      <EmptyState
                        icon={Globe}
                        title={v === "all" ? "No resources yet" : "No resources"}
                        description={v === "all" ? "Add your first resource to get started" : "Try a different filter"}
                        actionLabel={v === "all" ? "New Resource" : undefined}
                        onAction={v === "all" ? () => setResourceCreateOpen(true) : undefined}
                      />
                    ) : (
                      renderResourcesTable(filteredResources)
                    )}
                  </TabsContent>
                ))}

                <TabsContent value="by_topics" className="mt-4">
                  {resourcesByTopic.size === 0 ? (
                    <EmptyState
                      icon={Globe}
                      title="No resources linked to topics"
                      description="Link resources to topics to see them grouped here"
                      actionLabel="New Resource"
                      onAction={() => setResourceCreateOpen(true)}
                    />
                  ) : (
                    <div className="flex flex-col gap-4">
                      {Array.from(resourcesByTopic.entries()).map(([topicId, rs]) => {
                        const tname = topicNames.get(topicId) ?? "Unknown";
                        return (
                          <div key={topicId} className="rounded-lg border border-border">
                            <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
                              <Badge variant="secondary" className="text-xs">{tname}</Badge>
                              <span className="text-xs text-muted-foreground">{rs.length} resources</span>
                            </div>
                            <div className="divide-y divide-border">
                              {rs.map((r) => (
                                <ResourceRow
                                  key={r.id}
                                  resource={r}
                                  areaName={r.area_id ? areaNames.get(r.area_id) : undefined}
                                  projectName={r.project_id ? projNames.get(r.project_id) : undefined}
                                  topicName={tname}
                                  onToggleFavorite={(id, fav) => toggleFavoriteResource.mutate({ id, favorite: fav })}
                                  onArchive={(id) => archiveResource.mutate(id)}
                                  onStatusChange={(id, status) => updateResource.mutate({ id, input: { status } })}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
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
              setTopicForm({ name: "", area_ids: [], favorite: false });
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{topicEditData ? "Edit Topic" : "New Topic"}</DialogTitle>
              <DialogDescription>
                {topicEditData ? "Update topic details" : "Create a topic to organize notes and resources"}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="kh-topic-name">Name</Label>
                <Input
                  id="kh-topic-name"
                  placeholder="e.g., Productivity, Machine Learning"
                  value={topicForm.name}
                  onChange={(e) => setTopicForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="grid gap-2">
                <Label>Linked Areas</Label>
                <div className="flex flex-wrap gap-2">
                  {areas.map((area) => (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() =>
                        setTopicForm((p) => ({
                          ...p,
                          area_ids: p.area_ids.includes(area.id)
                            ? p.area_ids.filter((id) => id !== area.id)
                            : [...p.area_ids, area.id],
                        }))
                      }
                      className={cn(
                        "rounded-full border px-3 py-1 text-sm transition-colors",
                        topicForm.area_ids.includes(area.id)
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/50 text-muted-foreground hover:border-primary/40",
                      )}
                    >
                      {area.name}
                    </button>
                  ))}
                  {areas.length === 0 && <p className="text-sm text-muted-foreground">No areas available</p>}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTopicForm((p) => ({ ...p, favorite: !p.favorite }))}
                className={cn(
                  "flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors",
                  topicForm.favorite
                    ? "border-rose-500 bg-rose-500/10 text-rose-500"
                    : "border-border bg-muted/50 text-muted-foreground hover:border-rose-500/40",
                )}
              >
                <Heart className={cn("size-3.5", topicForm.favorite && "fill-current")} />
                Favorite
              </button>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => { setTopicCreateOpen(false); setTopicEditData(null); setTopicForm({ name: "", area_ids: [], favorite: false }); }}
              >
                Cancel
              </Button>
              <Button
                onClick={topicEditData ? handleTopicUpdate : handleTopicCreate}
                disabled={!topicForm.name || (topicEditData ? updateTopic.isPending : createTopic.isPending)}
              >
                {topicEditData ? "Save Changes" : "Create Topic"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Note Create Dialog ──────────────────────────────────────────────── */}
      <Dialog open={noteCreateOpen} onOpenChange={setNoteCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Note</DialogTitle>
            <DialogDescription>Create a new note.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Title</Label>
              <Input
                value={noteForm.name}
                onChange={(e) => setNoteForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="Note title"
                className="h-9"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={noteForm.status} onValueChange={(v) => setNoteForm((p) => ({ ...p, status: v as NoteStatus }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NOTE_STATUS.INBOX}>Inbox</SelectItem>
                    <SelectItem value={NOTE_STATUS.TO_REVIEW}>To Review</SelectItem>
                    <SelectItem value={NOTE_STATUS.ACTIVE}>Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={noteForm.type} onValueChange={(v) => setNoteForm((p) => ({ ...p, type: v as NoteType }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NOTE_TYPE.NOTE}>Note</SelectItem>
                    <SelectItem value={NOTE_TYPE.RESEARCH}>Research</SelectItem>
                    <SelectItem value={NOTE_TYPE.JOURNAL}>Journal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Notebook</Label>
              <div className="relative">
                <BookOpen className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={noteForm.notebook}
                  onChange={(e) => setNoteForm((p) => ({ ...p, notebook: e.target.value }))}
                  placeholder="Select or create notebook"
                  className="h-9 pl-8"
                  list="kh-notebook-list"
                />
                <datalist id="kh-notebook-list">
                  {notebooks.map((b) => <option key={b} value={b} />)}
                </datalist>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleNoteCreate} disabled={createNote.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Resource Create Dialog ──────────────────────────────────────────── */}
      <Dialog open={resourceCreateOpen} onOpenChange={setResourceCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Resource</DialogTitle>
            <DialogDescription>Add an external reference to your PARA system</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input
                placeholder="My favorite article"
                value={resourceForm.name}
                onChange={(e) => setResourceForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label>URL</Label>
              <Input
                type="url"
                placeholder="https://..."
                value={resourceForm.url}
                onChange={(e) => setResourceForm((p) => ({ ...p, url: e.target.value }))}
                onBlur={handleResourceUrlBlur}
              />
            </div>
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={resourceForm.type} onValueChange={(v) => setResourceForm((p) => ({ ...p, type: v ?? p.type }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESOURCE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={resourceForm.status} onValueChange={(v) => setResourceForm((p) => ({ ...p, status: v ?? p.status }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={RESOURCE_STATUS.INBOX}>Inbox</SelectItem>
                  <SelectItem value={RESOURCE_STATUS.TO_REVIEW}>To Review</SelectItem>
                  <SelectItem value={RESOURCE_STATUS.ACTIVE}>Active</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Topic</Label>
              <Select value={resourceForm.topic_id} onValueChange={(v) => setResourceForm((p) => ({ ...p, topic_id: v ?? "" }))}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  {topics.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResourceCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleResourceCreate} disabled={!resourceForm.name || createResource.isPending}>
              Create Resource
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

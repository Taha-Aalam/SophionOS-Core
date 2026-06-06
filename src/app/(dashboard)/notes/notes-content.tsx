"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Bookmark,
  BookOpen,
  ChevronDownIcon,
  Clock,
  Filter,
  FolderOpen,
  Inbox as InboxIcon,
  Map as LucideMap,
  NotebookPen,
  Pin,
  Plus,
  Search,
  Star,
  Tag,
  Target,
  Trash2,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { DeleteEntityPopover } from "@/components/entities/delete-entity-popover";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/views/empty-state";
import { NotesByGroupView, type NoteGroup } from "@/components/views/notes-by-group-view";
import { useAreas } from "@/lib/hooks/use-areas";
import { useGoals } from "@/lib/hooks/use-goals";
import {
  useArchiveNote,
  useBulkArchiveNotes,
  useBulkDeleteNotes,
  useDeleteNote,
  useNotes,
  useRestoreNote,
  useUpdateNote,
} from "@/lib/hooks/use-notes";
import { useProjects } from "@/lib/hooks/use-projects";
import { useTasks } from "@/lib/hooks/use-tasks";
import { useTopics } from "@/lib/hooks/use-topics";
import { cn } from "@/lib/utils";
import {
  getNoteLinkedAreaIds,
  getNoteLinkedGoalIds,
  getNoteLinkedProjectIds,
  getNoteCounts,
  getVisibleNotes,
  NOTE_VIEW,
  noteMatchesAreaId,
  noteMatchesGoalId,
  noteMatchesProjectId,
  noteMatchesTaskId,
  type NoteView,
} from "@/lib/utils/notes";
import {
  formatNotesSummary,
  NOTES_LOADING_LABEL,
  NOTES_PAGE_SHELL_CLASS_NAME,
  NOTES_SEARCH_PLACEHOLDER,
  NOTES_TABS_LIST_CLASS_NAME,
} from "@/lib/utils/note-page-display";
import type { Note } from "@/lib/types/domain.types";

const ALL_STATUS_VALUE = "__all_status__";
const ALL_NOTEBOOK_VALUE = "__all_notebooks__";

const statusColors: Record<string, string> = {
  inbox: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  to_review: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  saved: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  archive: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export function NotesContent() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<NoteView>(NOTE_VIEW.ALL);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAreaIds, setFilterAreaIds] = useState<string[]>([]);
  const [filterGoalIds, setFilterGoalIds] = useState<string[]>([]);
  const [filterProjectIds, setFilterProjectIds] = useState<string[]>([]);
  const [filterTaskIds, setFilterTaskIds] = useState<string[]>([]);
  const [filterNotebook, setFilterNotebook] = useState(ALL_NOTEBOOK_VALUE);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [areaPopoverOpen, setAreaPopoverOpen] = useState(false);
  const [goalPopoverOpen, setGoalPopoverOpen] = useState(false);
  const [projectPopoverOpen, setProjectPopoverOpen] = useState(false);
  const [taskPopoverOpen, setTaskPopoverOpen] = useState(false);

  const { data: allNotes = [], isLoading } = useNotes({ includeArchived: true });
  const { data: allAreas = [] } = useAreas();
  const { data: allGoals = [] } = useGoals({ status: "all" });
  const { data: allProjects = [] } = useProjects({ status: "all" });
  const { data: allTasks = [] } = useTasks();
  const { data: allTopics = [] } = useTopics();

  const updateNote = useUpdateNote();
  const archiveNote = useArchiveNote();
  const bulkArchive = useBulkArchiveNotes();
  const bulkDelete = useBulkDeleteNotes();
  const restoreNote = useRestoreNote();
  const deleteNote = useDeleteNote();

  const areaMap = useMemo(
    () => new Map(allAreas.map((area) => [area.id, area])),
    [allAreas],
  );
  const goalMap = useMemo(
    () => new Map(allGoals.map((goal) => [goal.id, goal])),
    [allGoals],
  );
  const taskMap = useMemo(
    () => new Map(allTasks.map((task) => [task.id, task])),
    [allTasks],
  );
  const projectMap = useMemo(
    () => new Map(allProjects.map((project) => [project.id, project])),
    [allProjects],
  );
  const topicNamesMap = useMemo(
    () => new Map(allTopics.map((t) => [t.id, t.name])),
    [allTopics],
  );

  const notebooks = useMemo(
    () => Array.from(new Set(allNotes.flatMap((n) => n.notebooks ?? []))).sort(),
    [allNotes],
  );

  const counts = useMemo(() => getNoteCounts(allNotes), [allNotes]);

  const visibleNotes = useMemo(() => {
    let result = getVisibleNotes(allNotes, activeTab);

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((n) => n.name.toLowerCase().includes(q));
    }

    if (filterStatus) {
      result = result.filter((n) => n.status === filterStatus);
    }

    if (filterAreaIds.length > 0) {
      result = result.filter((n) =>
        filterAreaIds.some((areaId) => noteMatchesAreaId(n, areaId)),
      );
    }

    if (filterGoalIds.length > 0) {
      result = result.filter((n) =>
        filterGoalIds.some((goalId) => noteMatchesGoalId(n, goalId)),
      );
    }

    if (filterProjectIds.length > 0) {
      result = result.filter((n) =>
        filterProjectIds.some((projectId) => noteMatchesProjectId(n, projectId)),
      );
    }

    if (filterTaskIds.length > 0) {
      result = result.filter((n) =>
        filterTaskIds.some((taskId) => noteMatchesTaskId(n, taskId)),
      );
    }

    if (filterNotebook !== ALL_NOTEBOOK_VALUE) {
      result = result.filter((n) => (n.notebooks ?? []).includes(filterNotebook));
    }

    return result;
  }, [
    activeTab,
    allNotes,
    filterAreaIds,
    filterGoalIds,
    filterNotebook,
    filterProjectIds,
    filterStatus,
    filterTaskIds,
    search,
  ]);

  // ── Grouped note computations ──────────────────────────────────────────────

  const noteGroupsByArea = useMemo((): NoteGroup[] => {
    const grouped = new Map<string, Note[]>();
    for (const note of allNotes.filter((n) => !n.is_archived)) {
      const areaIds = getNoteLinkedAreaIds(note);
      const keys = areaIds.length > 0 ? areaIds : ["unassigned"];
      for (const areaId of keys) {
        const current = grouped.get(areaId) ?? [];
        current.push(note);
        grouped.set(areaId, current);
      }
    }
    return Array.from(grouped.entries()).map(([areaId, notes]) => ({
      groupId: areaId,
      groupName: areaId === "unassigned" ? "No Area" : (areaMap.get(areaId)?.name ?? areaId),
      notes,
    }));
  }, [allNotes, areaMap]);

  const noteGroupsByGoal = useMemo((): NoteGroup[] => {
    const grouped = new Map<string, Note[]>();
    for (const note of allNotes.filter((n) => !n.is_archived)) {
      const goalIds = getNoteLinkedGoalIds(note);
      const keys = goalIds.length > 0 ? goalIds : ["unassigned"];
      for (const goalId of keys) {
        const current = grouped.get(goalId) ?? [];
        current.push(note);
        grouped.set(goalId, current);
      }
    }
    return Array.from(grouped.entries()).map(([goalId, notes]) => ({
      groupId: goalId,
      groupName: goalId === "unassigned" ? "No Goal" : (goalMap.get(goalId)?.name ?? goalId),
      notes,
    }));
  }, [allNotes, goalMap]);

  const noteGroupsByProject = useMemo((): NoteGroup[] => {
    const grouped = new Map<string, Note[]>();
    for (const note of allNotes.filter((n) => !n.is_archived)) {
      const projectIds = getNoteLinkedProjectIds(note);
      const keys = projectIds.length > 0 ? projectIds : ["unassigned"];
      for (const projectId of keys) {
        const current = grouped.get(projectId) ?? [];
        current.push(note);
        grouped.set(projectId, current);
      }
    }
    return Array.from(grouped.entries()).map(([projectId, notes]) => ({
      groupId: projectId,
      groupName: projectId === "unassigned" ? "No Project" : (projectMap.get(projectId)?.name ?? projectId),
      notes,
    }));
  }, [allNotes, projectMap]);

  const noteGroupsByTopic = useMemo((): NoteGroup[] => {
    const grouped = new Map<string, Note[]>();
    for (const note of allNotes.filter((n) => !n.is_archived)) {
      const key = note.topic_id ?? "unassigned";
      const current = grouped.get(key) ?? [];
      current.push(note);
      grouped.set(key, current);
    }
    return Array.from(grouped.entries()).map(([topicId, notes]) => ({
      groupId: topicId,
      groupName: topicId === "unassigned" ? "No Topic" : (topicNamesMap.get(topicId) ?? topicId),
      notes,
    }));
  }, [allNotes, topicNamesMap]);

  const noteGroupsByNotebook = useMemo((): NoteGroup[] => {
    const grouped = new Map<string, Note[]>();
    for (const note of allNotes.filter((n) => !n.is_archived)) {
      const keys = (note.notebooks ?? []).length > 0 ? note.notebooks! : ["unassigned"];
      for (const key of keys) {
        grouped.set(key, [...(grouped.get(key) ?? []), note]);
      }
    }
    return Array.from(grouped.entries()).map(([notebook, notes]) => ({
      groupId: notebook,
      groupName: notebook === "unassigned" ? "No Notebook" : notebook,
      notes,
    }));
  }, [allNotes]);

  useEffect(() => {
    if (selectedIds.size === 0) {
      return;
    }

    const visibleNoteIds = new Set(visibleNotes.map((note) => note.id));
    const nextSelectedIds = new Set(
      Array.from(selectedIds).filter((id) => visibleNoteIds.has(id)),
    );

    if (nextSelectedIds.size !== selectedIds.size) {
      let cancelled = false;

      queueMicrotask(() => {
        if (!cancelled) {
          setSelectedIds(nextSelectedIds);
        }
      });

      return () => {
        cancelled = true;
      };
    }
  }, [selectedIds, visibleNotes]);

  const hasFilters = Boolean(
    filterStatus ||
      filterAreaIds.length > 0 ||
      filterGoalIds.length > 0 ||
      filterProjectIds.length > 0 ||
      filterTaskIds.length > 0 ||
      filterNotebook !== ALL_NOTEBOOK_VALUE ||
      search.trim(),
  );

  const activeAreas = allAreas.filter((a) => !a.archive);
  const activeGoals = allGoals.filter((g) => !g.is_archived);
  const activeProjects = allProjects.filter((p) => !p.is_archived);

  const selectedAreaLabels = filterAreaIds
    .map((id) => activeAreas.find((a) => a.id === id))
    .filter(Boolean)
    .map((a) => `${a!.icon ? `${a!.icon} ` : ""}${a!.name}`);

  const selectedGoalLabels = filterGoalIds
    .map((id) => activeGoals.find((g) => g.id === id))
    .filter(Boolean)
    .map((g) => g!.name);

  const selectedProjectLabels = filterProjectIds
    .map((id) => activeProjects.find((p) => p.id === id))
    .filter(Boolean)
    .map((p) => p!.name);

  const selectedTaskLabels = filterTaskIds
    .map((id) => allTasks.find((t) => t.id === id))
    .filter(Boolean)
    .map((t) => t!.name);

  const filterPopoverContentClassName = "w-80 max-w-[calc(100vw-2rem)] overflow-x-hidden p-2";
  const filterOptionClassName =
    "flex w-full cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm leading-5 transition-colors hover:bg-muted/40";
  const filterOptionLabelClassName = "min-w-0 flex-1 whitespace-normal break-words text-sm";
  const compactTabTriggerClassName =
    "rounded-none border-b-2 border-transparent px-2.5 py-1.5 text-xs leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none";

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleArchiveSelected = async () => {
    if (selectedIds.size === 0) return;
    await bulkArchive.mutateAsync(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    await bulkDelete.mutateAsync(Array.from(selectedIds));
    setSelectedIds(new Set());
  };

  const handleRestoreSelected = async () => {
    for (const id of selectedIds) {
      await restoreNote.mutateAsync(id);
    }
    setSelectedIds(new Set());
  };

  const clearFilters = () => {
    setSearch("");
    setFilterStatus("");
    setFilterAreaIds([]);
    setFilterGoalIds([]);
    setFilterProjectIds([]);
    setFilterTaskIds([]);
    setFilterNotebook(ALL_NOTEBOOK_VALUE);
  };

  // ── Note row renderer (shared by flat list and grouped views) ──────────────

  const renderNoteRow = (note: Note) => {
    const isSelected = selectedIds.has(note.id);
    const linkedAreas = (note.linkedAreaIds ?? (note.area_id ? [note.area_id] : []))
      .map((id) => areaMap.get(id))
      .filter((a): a is NonNullable<typeof a> => Boolean(a));
    const linkedGoals = getNoteLinkedGoalIds(note)
      .map((id) => goalMap.get(id))
      .filter((g): g is NonNullable<typeof g> => Boolean(g));
    const linkedProjects = getNoteLinkedProjectIds(note)
      .map((id) => projectMap.get(id))
      .filter((p): p is NonNullable<typeof p> => Boolean(p));
    const linkedTasks = (note.linkedTaskIds ?? [])
      .map((id) => taskMap.get(id))
      .filter((t): t is NonNullable<typeof t> => Boolean(t));

    return (
      <div
        key={note.id}
        className={cn(
          "group flex items-center gap-3 border-b border-border/40 px-4 py-2.5 transition-colors hover:bg-muted/30 cursor-pointer",
          isSelected && "bg-muted/50",
        )}
        onClick={() => router.push(`/notes/${note.slug ?? note.id}`)}
      >
        {/* Checkbox */}
        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => toggleSelect(note.id)}
          />
        </div>

        {/* Pin button */}
        <div onClick={(e) => e.stopPropagation()} className="shrink-0">
          <button
            type="button"
            onClick={() =>
              updateNote.mutate({
                id: note.id,
                input: { pin: !note.pin },
              })
            }
            className={cn(
              "rounded p-1 transition-colors",
              note.pin
                ? "text-primary"
                : "text-muted-foreground opacity-0 hover:text-primary group-hover:opacity-100",
            )}
            title={note.pin ? "Unpin" : "Pin"}
          >
            <Pin className={cn("size-3.5", note.pin && "fill-current")} />
          </button>
        </div>

        {/* Status + Type */}
        <div className="hidden md:flex shrink-0 items-center gap-1">
          <Badge
            variant="outline"
            className={cn("text-[10px] uppercase", statusColors[note.status])}
          >
            {note.status.replace("_", " ")}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            {note.type}
          </Badge>
        </div>

        {/* Name */}
        <div className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{note.name}</span>
        </div>

        {/* Metadata cluster — all badges, no +N collapse */}
        <div className="hidden md:flex shrink-0 items-center gap-1.5 flex-wrap">
          {(note.notebooks ?? []).map((nb) => (
            <Badge key={nb} variant="outline" className="gap-1 text-xs font-normal">
              <span className="text-xs leading-none">📓</span>
              {nb}
            </Badge>
          ))}
          {linkedAreas.map((area) => (
            <Badge key={area.id} variant="outline" className="gap-1 text-xs font-normal">
              {area.icon ? (
                <span className="text-xs leading-none">{area.icon}</span>
              ) : (
                <LucideMap className="size-3" />
              )}
              {area.name}
            </Badge>
          ))}
          {linkedGoals.map((goal) => (
            <Badge key={goal.id} variant="outline" className="gap-1 text-xs font-normal">
              <span className="text-xs leading-none">🎯</span>
              {goal.name}
            </Badge>
          ))}
          {linkedProjects.map((project) => (
            <Badge key={project.id} variant="outline" className="gap-1 text-xs font-normal">
              <span className="text-xs leading-none">📁</span>
              {project.name}
            </Badge>
          ))}
          {linkedTasks.map((task) => (
            <Badge key={task.id} variant="outline" className="gap-1 text-xs font-normal">
              <span className="text-xs leading-none">☑️</span>
              {task.name}
            </Badge>
          ))}
          <span className="text-xs text-muted-foreground">
            {new Date(note.updated_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>

        {/* Favorite button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            updateNote.mutate({
              id: note.id,
              input: { favorite: !note.favorite },
            });
          }}
          className={cn(
            "shrink-0 rounded-md p-1.5 transition-colors",
            note.favorite
              ? "text-amber-500"
              : "text-muted-foreground/20 opacity-0 hover:text-amber-400 group-hover:opacity-100",
          )}
          title={note.favorite ? "Unfavorite" : "Favorite"}
        >
          <Star className={cn("size-4", note.favorite && "fill-current")} />
        </button>

        {/* Archive + Delete */}
        <div
          className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              if (note.is_archived) {
                restoreNote.mutate(note.id);
              } else {
                archiveNote.mutate(note.id);
              }
            }}
            disabled={archiveNote.isPending || restoreNote.isPending}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-red-500"
            title={note.is_archived ? "Restore" : "Archive"}
          >
            {note.is_archived ? (
              <ArchiveRestore className="size-3.5" />
            ) : (
              <Archive className="size-3.5" />
            )}
          </button>
          <DeleteEntityPopover
            variant="row"
            entityLabel="note"
            entityName={note.name}
            requireTypedConfirmation={false}
            disabled={deleteNote.isPending}
            onConfirm={() => deleteNote.mutate(note.id)}
          />
        </div>
      </div>
    );
  };

  return (
    <div className={NOTES_PAGE_SHELL_CLASS_NAME}>
      <div className="flex items-center justify-between border-b border-border/50 px-6 py-5">
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none" aria-hidden="true">📝</span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
            <p className="text-sm text-muted-foreground">
              {formatNotesSummary(counts.all, counts.archived)}
            </p>
          </div>
        </div>
        <Button onClick={() => router.push("/notes/new")}>
          <Plus className="size-4" />
          New Note
        </Button>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => {
          setActiveTab(value as NoteView);
          setSelectedIds(new Set());
        }}
        className="flex flex-1 flex-col"
      >
        <div className="border-b border-border/50 px-6 pt-4">
          <TabsList className={NOTES_TABS_LIST_CLASS_NAME}>
            <TabsTrigger value={NOTE_VIEW.ALL} className={compactTabTriggerClassName}>
              All
            </TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.INBOX} className={compactTabTriggerClassName}>
              <InboxIcon className="mr-1 size-3" />
              Inbox
            </TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.TO_REVIEW} className={compactTabTriggerClassName}>
              <Clock className="mr-1 size-3" />
              To Review
            </TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.ACTIVE} className={compactTabTriggerClassName}>
              <Zap className="mr-1 size-3" />
              Active
            </TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.PINNED} className={compactTabTriggerClassName}>
              <Pin className="mr-1 size-3" />
              Pinned
            </TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.FAVORITE} className={compactTabTriggerClassName}>
              <Star className="mr-1 size-3" />
              Favorite
            </TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.BY_AREA} className={compactTabTriggerClassName}>
              <LucideMap className="mr-1 size-3" />
              By Area
            </TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.BY_GOAL} className={compactTabTriggerClassName}>
              <Target className="mr-1 size-3" />
              By Goal
            </TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.BY_PROJECT} className={compactTabTriggerClassName}>
              <FolderOpen className="mr-1 size-3" />
              By Project
            </TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.BY_TOPIC} className={compactTabTriggerClassName}>
              <Tag className="mr-1 size-3" />
              By Topic
            </TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.BY_NOTEBOOK} className={compactTabTriggerClassName}>
              <BookOpen className="mr-1 size-3" />
              By Notebook
            </TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.SAVED} className={compactTabTriggerClassName}>
              <Bookmark className="mr-1 size-3" />
              Saved
            </TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.ARCHIVED} className={compactTabTriggerClassName}>
              <Archive className="mr-1 size-3" />
              Archive
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex items-center gap-3 border-b border-border/30 px-6 py-3">
          <Filter className="size-3.5 shrink-0 text-muted-foreground" />
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={NOTES_SEARCH_PLACEHOLDER}
                className="h-7 w-44 pl-8 text-xs"
              />
            </div>

            <Select
              value={filterStatus || ALL_STATUS_VALUE}
              onValueChange={(value) =>
                setFilterStatus(value === ALL_STATUS_VALUE ? "" : (value || ""))
              }
            >
              <SelectTrigger className="h-7 w-[120px] text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STATUS_VALUE}>All statuses</SelectItem>
                <SelectItem value="inbox">Inbox</SelectItem>
                <SelectItem value="to_review">To Review</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="saved">Saved</SelectItem>
                <SelectItem value="archive">Archive</SelectItem>
              </SelectContent>
            </Select>

            <Popover open={areaPopoverOpen} onOpenChange={setAreaPopoverOpen}>
              <PopoverTrigger
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-7 gap-1 px-2 py-0 text-xs font-normal",
                )}
              >
                {filterAreaIds.length === 0 ? (
                  "Area"
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="max-w-[100px] truncate">{selectedAreaLabels[0]}</span>
                    {selectedAreaLabels.length > 1 && (
                      <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                        +{selectedAreaLabels.length - 1}
                      </Badge>
                    )}
                  </span>
                )}
                <ChevronDownIcon className="size-3 text-muted-foreground" />
              </PopoverTrigger>
              <PopoverContent className={filterPopoverContentClassName}>
                <div className="space-y-1">
                  {activeAreas.length === 0 && (
                    <p className="px-2 py-1 text-xs text-muted-foreground">No areas available.</p>
                  )}
                  <ScrollArea className="max-h-60 w-full">
                    {activeAreas.map((area) => {
                      const checked = filterAreaIds.includes(area.id);
                      return (
                        <label key={area.id} className={filterOptionClassName}>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(next) => {
                              setFilterAreaIds((prev) =>
                                next === true
                                  ? Array.from(new Set([...prev, area.id]))
                                  : prev.filter((id) => id !== area.id),
                              );
                            }}
                          />
                          <span className={filterOptionLabelClassName}>
                            {area.icon ? `${area.icon} ` : ""}
                            {area.name}
                          </span>
                        </label>
                      );
                    })}
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>

            <Popover open={goalPopoverOpen} onOpenChange={setGoalPopoverOpen}>
              <PopoverTrigger
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-7 gap-1 px-2 py-0 text-xs font-normal",
                )}
              >
                {filterGoalIds.length === 0 ? (
                  "Goal"
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="max-w-[100px] truncate">{selectedGoalLabels[0]}</span>
                    {selectedGoalLabels.length > 1 && (
                      <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                        +{selectedGoalLabels.length - 1}
                      </Badge>
                    )}
                  </span>
                )}
                <ChevronDownIcon className="size-3 text-muted-foreground" />
              </PopoverTrigger>
              <PopoverContent className={filterPopoverContentClassName}>
                <div className="space-y-1">
                  {activeGoals.length === 0 && (
                    <p className="px-2 py-1 text-xs text-muted-foreground">No goals available.</p>
                  )}
                  <ScrollArea className="max-h-60 w-full">
                    {activeGoals.map((goal) => {
                      const checked = filterGoalIds.includes(goal.id);
                      return (
                        <label key={goal.id} className={filterOptionClassName}>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(next) => {
                              setFilterGoalIds((prev) =>
                                next === true
                                  ? Array.from(new Set([...prev, goal.id]))
                                  : prev.filter((id) => id !== goal.id),
                              );
                            }}
                          />
                          <span className={filterOptionLabelClassName}>{goal.name}</span>
                        </label>
                      );
                    })}
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>

            <Popover open={projectPopoverOpen} onOpenChange={setProjectPopoverOpen}>
              <PopoverTrigger
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-7 gap-1 px-2 py-0 text-xs font-normal",
                )}
              >
                {filterProjectIds.length === 0 ? (
                  "Project"
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="max-w-[100px] truncate">{selectedProjectLabels[0]}</span>
                    {selectedProjectLabels.length > 1 && (
                      <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                        +{selectedProjectLabels.length - 1}
                      </Badge>
                    )}
                  </span>
                )}
                <ChevronDownIcon className="size-3 text-muted-foreground" />
              </PopoverTrigger>
              <PopoverContent className={filterPopoverContentClassName}>
                <div className="space-y-1">
                  {activeProjects.length === 0 && (
                    <p className="px-2 py-1 text-xs text-muted-foreground">No projects available.</p>
                  )}
                  <ScrollArea className="max-h-60 w-full">
                    {activeProjects.map((project) => {
                      const checked = filterProjectIds.includes(project.id);
                      return (
                        <label key={project.id} className={filterOptionClassName}>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(next) => {
                              setFilterProjectIds((prev) =>
                                next === true
                                  ? Array.from(new Set([...prev, project.id]))
                                  : prev.filter((id) => id !== project.id),
                              );
                            }}
                          />
                          <span className={filterOptionLabelClassName}>{project.name}</span>
                        </label>
                      );
                    })}
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>

            <Popover open={taskPopoverOpen} onOpenChange={setTaskPopoverOpen}>
              <PopoverTrigger
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-7 gap-1 px-2 py-0 text-xs font-normal",
                )}
              >
                {filterTaskIds.length === 0 ? (
                  "Task"
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="max-w-[100px] truncate">{selectedTaskLabels[0]}</span>
                    {selectedTaskLabels.length > 1 && (
                      <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                        +{selectedTaskLabels.length - 1}
                      </Badge>
                    )}
                  </span>
                )}
                <ChevronDownIcon className="size-3 text-muted-foreground" />
              </PopoverTrigger>
              <PopoverContent className={filterPopoverContentClassName}>
                <div className="space-y-1">
                  {allTasks.length === 0 && (
                    <p className="px-2 py-1 text-xs text-muted-foreground">No tasks available.</p>
                  )}
                  <ScrollArea className="max-h-60 w-full">
                    {allTasks.map((task) => {
                      const checked = filterTaskIds.includes(task.id);
                      return (
                        <label key={task.id} className={filterOptionClassName}>
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(next) => {
                              setFilterTaskIds((prev) =>
                                next === true
                                  ? Array.from(new Set([...prev, task.id]))
                                  : prev.filter((id) => id !== task.id),
                              );
                            }}
                          />
                          <span className={filterOptionLabelClassName}>{task.name}</span>
                        </label>
                      );
                    })}
                  </ScrollArea>
                </div>
              </PopoverContent>
            </Popover>

            <Select
              value={filterNotebook}
              onValueChange={(value) => setFilterNotebook(value || "")}
            >
              <SelectTrigger className="h-7 w-[140px] text-xs">
                <SelectValue placeholder="Notebook" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_NOTEBOOK_VALUE}>All notebooks</SelectItem>
                {notebooks.map((nb) => (
                  <SelectItem key={nb} value={nb}>
                    <BookOpen className="mr-1 inline size-3" />
                    {nb}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 border-b border-border/30 px-6 py-2">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleArchiveSelected}>
                <Archive className="mr-1.5 size-3.5" />
                Archive
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleRestoreSelected}>
                <Archive className="mr-1.5 size-3.5" />
                Restore
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="h-7 text-xs"
                onClick={handleDeleteSelected}
                disabled={bulkDelete.isPending}
              >
                <Trash2 className="mr-1.5 size-3.5" />
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setSelectedIds(new Set())}
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Flat list tabs: All, Inbox, To Review, Active, Pinned, Favorite, Saved, Archived */}
        {([
          NOTE_VIEW.ALL,
          NOTE_VIEW.INBOX,
          NOTE_VIEW.TO_REVIEW,
          NOTE_VIEW.ACTIVE,
          NOTE_VIEW.PINNED,
          NOTE_VIEW.FAVORITE,
          NOTE_VIEW.SAVED,
          NOTE_VIEW.ARCHIVED,
        ] as NoteView[]).map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-0 flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
                {NOTES_LOADING_LABEL}
              </div>
            ) : visibleNotes.length === 0 ? (
              <EmptyState
                icon={NotebookPen}
                title={`No ${tab.replace(/_/g, " ")} notes`}
                description="Try a different filter or create a new note."
                actionLabel="New Note"
                onAction={() => router.push("/notes/new")}
              />
            ) : (
              <div className="rounded-lg border border-border">
                {visibleNotes.map((note) => renderNoteRow(note))}
              </div>
            )}
          </TabsContent>
        ))}

        {/* Grouped tabs */}
        <TabsContent value={NOTE_VIEW.BY_AREA} className="mt-0 flex-1">
          <NotesByGroupView
            groups={noteGroupsByArea}
            renderNote={renderNoteRow}
            onNewNote={(groupId) => router.push(`/notes/new?areaId=${groupId}`)}
            emptyMessage="Notes will be grouped by area here."
          />
        </TabsContent>

        <TabsContent value={NOTE_VIEW.BY_GOAL} className="mt-0 flex-1">
          <NotesByGroupView
            groups={noteGroupsByGoal}
            renderNote={renderNoteRow}
            onNewNote={(groupId) => router.push(`/notes/new?goalId=${groupId}`)}
            emptyMessage="Notes will be grouped by goal here."
          />
        </TabsContent>

        <TabsContent value={NOTE_VIEW.BY_PROJECT} className="mt-0 flex-1">
          <NotesByGroupView
            groups={noteGroupsByProject}
            renderNote={renderNoteRow}
            onNewNote={(groupId) => router.push(`/notes/new?projectId=${groupId}`)}
            emptyMessage="Notes will be grouped by project here."
          />
        </TabsContent>

        <TabsContent value={NOTE_VIEW.BY_TOPIC} className="mt-0 flex-1">
          <NotesByGroupView
            groups={noteGroupsByTopic}
            renderNote={renderNoteRow}
            onNewNote={(groupId) => router.push(`/notes/new?topicId=${groupId}`)}
            emptyMessage="Notes will be grouped by topic here."
          />
        </TabsContent>

        <TabsContent value={NOTE_VIEW.BY_NOTEBOOK} className="mt-0 flex-1">
          <NotesByGroupView
            groups={noteGroupsByNotebook}
            renderNote={renderNoteRow}
            onNewNote={(groupId) => router.push(`/notes/new?notebook=${encodeURIComponent(groupId)}`)}
            emptyMessage="Notes will be grouped by notebook here."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

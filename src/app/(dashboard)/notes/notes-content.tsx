"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import {
  Archive,
  Bookmark,
  BookOpen,
  Clock,
  FolderOpen,
  Inbox as InboxIcon,
  LayoutGrid,
  Map as LucideMap,
  NotebookPen,
  Pin,
  Plus,
  Star,
  Tag,
  Target,
  Trash2,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NoteRow } from "@/components/entities/note-row";
import { NotesFilterBar } from "@/components/filters/notes-filter-bar";
import { NotesByGroupView, type NoteGroup } from "@/components/views/notes-by-group-view";
import { EmptyState } from "@/components/views/empty-state";
import { ErrorState } from "@/components/views/error-state";
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
import {
  getNoteLinkedAreaIds,
  getNoteLinkedGoalIds,
  getNoteLinkedProjectIds,
  getNoteLinkedTaskIds,
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
  NOTES_TABS_LIST_CLASS_NAME,
} from "@/lib/utils/note-page-display";
import type { Note } from "@/lib/types/domain.types";

export function NotesContent() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<NoteView>(NOTE_VIEW.ALL);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterAreaIds, setFilterAreaIds] = useState<string[]>([]);
  const [filterGoalIds, setFilterGoalIds] = useState<string[]>([]);
  const [filterProjectIds, setFilterProjectIds] = useState<string[]>([]);
  const [filterTaskIds, setFilterTaskIds] = useState<string[]>([]);
  const [filterNotebook, setFilterNotebook] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { data: allNotes = [], isLoading, isError, refetch } = useNotes({ includeArchived: true });
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

    if (filterNotebook) {
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

  const activeAreas = useMemo(() => allAreas.filter((a) => !a.archive), [allAreas]);
  const activeGoals = useMemo(() => allGoals.filter((g) => !g.is_archived), [allGoals]);
  const activeProjects = useMemo(
    () => allProjects.filter((p) => !p.is_archived),
    [allProjects],
  );
  const compactTabTriggerClassName = "snap-start";

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

  // ── Note row renderer (shared by flat list and grouped views) ──────────────

  const renderNoteRow = (note: Note) => {
    const isSelected = selectedIds.has(note.id);
    const noteAreas = getNoteLinkedAreaIds(note)
      .map((id) => {
        const area = areaMap.get(id);
        return area ? { name: area.name, icon: area.icon } : null;
      })
      .filter((a): a is NonNullable<typeof a> => Boolean(a));
    const noteGoalNames = getNoteLinkedGoalIds(note)
      .map((id) => goalMap.get(id)?.name)
      .filter((n): n is string => Boolean(n));
    const noteProjectNames = getNoteLinkedProjectIds(note)
      .map((id) => projectMap.get(id)?.name)
      .filter((n): n is string => Boolean(n));
    const noteTaskNames = getNoteLinkedTaskIds(note)
      .map((id) => taskMap.get(id)?.name)
      .filter((n): n is string => Boolean(n));

    return (
      <NoteRow
        key={note.id}
        note={note}
        areas={noteAreas}
        goalNames={noteGoalNames}
        projectNames={noteProjectNames}
        taskNames={noteTaskNames}
        isSelected={isSelected}
        onPinToggle={(id, pin) => updateNote.mutate({ id, input: { pin } })}
        onFavoriteToggle={(id, favorite) => updateNote.mutate({ id, input: { favorite } })}
        onSaveStatusChange={(id, saved) => updateNote.mutate({ id, input: { status: saved ? "completed" : "inbox" } })}
        onArchive={(id) => archiveNote.mutate(id)}
        onRestore={(id) => restoreNote.mutate(id)}
        onDelete={(id) => deleteNote.mutate(id)}
      />
    );
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center px-4 py-16">
        <ErrorState message="Failed to load notes." onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className={NOTES_PAGE_SHELL_CLASS_NAME}>
      <div className="flex items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none" aria-hidden="true">📝</span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
            <p className="text-sm text-muted-foreground" suppressHydrationWarning>
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
        <TabsList className={NOTES_TABS_LIST_CLASS_NAME}>
          <TabsTrigger value={NOTE_VIEW.ALL} className={compactTabTriggerClassName}>
              <LayoutGrid className="mr-1.5 size-3.5" />
              All
            </TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.INBOX} className={compactTabTriggerClassName}>
              <InboxIcon className="mr-1.5 size-3.5" />
              Inbox
            </TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.TO_REVIEW} className={compactTabTriggerClassName}>
              <Clock className="mr-1.5 size-3.5" />
              To Review
            </TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.ACTIVE} className={compactTabTriggerClassName}>
              <Zap className="mr-1.5 size-3.5" />
              Active
            </TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.PINNED} className={compactTabTriggerClassName}>
              <Pin className="mr-1.5 size-3.5" />
              Pinned
            </TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.FAVORITE} className={compactTabTriggerClassName}>
              <Star className="mr-1.5 size-3.5" />
              Favorite
            </TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.BY_AREA} className={compactTabTriggerClassName}>
              <LucideMap className="mr-1.5 size-3.5" />
              By Area
            </TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.BY_GOAL} className={compactTabTriggerClassName}>
              <Target className="mr-1.5 size-3.5" />
              By Goal
            </TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.BY_PROJECT} className={compactTabTriggerClassName}>
              <FolderOpen className="mr-1.5 size-3.5" />
              By Project
            </TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.BY_TOPIC} className={compactTabTriggerClassName}>
              <Tag className="mr-1.5 size-3.5" />
              By Topic
            </TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.BY_NOTEBOOK} className={compactTabTriggerClassName}>
              <BookOpen className="mr-1.5 size-3.5" />
              By Notebook
            </TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.COMPLETED} className={compactTabTriggerClassName}>
              <Bookmark className="mr-1.5 size-3.5" />
              Completed
            </TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.ARCHIVED} className={compactTabTriggerClassName}>
              <Archive className="mr-1.5 size-3.5" />
              Archive
            </TabsTrigger>
          </TabsList>

        <NotesFilterBar
          search={search}
          status={filterStatus}
          areaIds={filterAreaIds}
          goalIds={filterGoalIds}
          projectIds={filterProjectIds}
          taskIds={filterTaskIds}
          notebook={filterNotebook}
          areas={activeAreas}
          goals={activeGoals}
          projects={activeProjects}
          tasks={allTasks}
          notebooks={notebooks}
          onSearchChange={setSearch}
          onStatusChange={setFilterStatus}
          onAreaIdsChange={setFilterAreaIds}
          onGoalIdsChange={setFilterGoalIds}
          onProjectIdsChange={setFilterProjectIds}
          onTaskIdsChange={setFilterTaskIds}
          onNotebookChange={setFilterNotebook}
        />

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 border-b border-border/30 px-6 py-2">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-10 sm:h-8 text-xs" onClick={handleArchiveSelected}>
                <Archive className="mr-1.5 size-3.5" />
                Archive
              </Button>
              <Button variant="outline" size="sm" className="h-10 sm:h-8 text-xs" onClick={handleRestoreSelected}>
                <Archive className="mr-1.5 size-3.5" />
                Restore
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="h-10 sm:h-8 text-xs"
                onClick={handleDeleteSelected}
                disabled={bulkDelete.isPending}
              >
                <Trash2 className="mr-1.5 size-3.5" />
                Delete
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-10 sm:h-8 text-xs"
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
          NOTE_VIEW.COMPLETED,
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
              visibleNotes.map((note) => renderNoteRow(note))
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

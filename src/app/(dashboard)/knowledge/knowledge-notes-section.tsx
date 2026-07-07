"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  BookOpen,
  Bookmark,
  Clock,
  FolderOpen,
  Inbox as InboxIcon,
  Map as MapIcon,
  NotebookPen,
  Pin,
  Star,
  Tag,
  Target,
  Zap,
} from "lucide-react";

import { EmptyState } from "@/components/views/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NoteRow } from "@/components/entities/note-row";
import { NotesByGroupView, type NoteGroup } from "@/components/views/notes-by-group-view";
import { NOTES_TABS_LIST_CLASS_NAME } from "@/lib/utils/note-page-display";
import { encodeReturnTo } from "@/lib/utils/return-to";
import {
  NOTE_VIEW,
  getNoteCounts,
  getNoteLinkedAreaIds,
  getNoteLinkedGoalIds,
  getNoteLinkedProjectIds,
  getVisibleNotes,
  type NoteView,
} from "@/lib/utils/notes";
import type { Note } from "@/lib/types/domain.types";
import { SectionHeader } from "./knowledge-section-header";

export interface KnowledgeNotesSectionProps {
  notes: Note[];
  notesLoading: boolean;
  areaNames: Map<string, string>;
  areaIcons: Map<string, string | null>;
  goalNames: Map<string, string>;
  projNames: Map<string, string>;
  topicNames: Map<string, string>;
  allTasks: { id: string; name: string }[];
  onPinToggle: (id: string, pin: boolean) => void;
  onFavoriteToggle: (id: string, favorite: boolean) => void;
  onSaveStatusChange: (id: string, saved: boolean) => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string) => void;
}

export function KnowledgeNotesSection({
  notes,
  notesLoading,
  areaNames,
  areaIcons,
  goalNames,
  projNames,
  topicNames,
  allTasks,
  onPinToggle,
  onFavoriteToggle,
  onSaveStatusChange,
  onArchive,
  onRestore,
  onDelete,
}: KnowledgeNotesSectionProps) {
  const router = useRouter();
  const [notesTab, setNotesTab] = useState<NoteView>(NOTE_VIEW.ALL);

  const noteCounts = getNoteCounts(notes);
  const visibleNotes = (() => {
    const list = getVisibleNotes(notes, notesTab).slice();
    return list.sort((a, b) => {
      if (a.pin && !b.pin) return -1;
      if (!a.pin && b.pin) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });
  })();

  const noteGroupsByArea = (): NoteGroup[] => {
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
      groupName: id === "unassigned" ? "No Area" : (areaNames.get(id) ?? id),
      notes: ns,
    }));
  };

  const noteGroupsByGoal = (): NoteGroup[] => {
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
      groupName: id === "unassigned" ? "No Goal" : (goalNames.get(id) ?? id),
      notes: ns,
    }));
  };

  const noteGroupsByProject = (): NoteGroup[] => {
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
      groupName: id === "unassigned" ? "No Project" : (projNames.get(id) ?? id),
      notes: ns,
    }));
  };

  const noteGroupsByTopic = (): NoteGroup[] => {
    const grouped = new Map<string, Note[]>();
    for (const n of notes.filter((x) => !x.is_archived)) {
      const key = n.topic_id ?? "unassigned";
      const cur = grouped.get(key) ?? [];
      cur.push(n);
      grouped.set(key, cur);
    }
    return Array.from(grouped.entries()).map(([id, ns]) => ({
      groupId: id,
      groupName: id === "unassigned" ? "No Topic" : (topicNames.get(id) ?? id),
      notes: ns,
    }));
  };

  const noteGroupsByNotebook = (): NoteGroup[] => {
    const grouped = new Map<string, Note[]>();
    for (const n of notes.filter((x) => !x.is_archived)) {
      const keys = (n.notebooks ?? []).length > 0 ? n.notebooks! : ["unassigned"];
      for (const k of keys) {
        grouped.set(k, [...(grouped.get(k) ?? []), n]);
      }
    }
    return Array.from(grouped.entries()).map(([id, ns]) => ({
      groupId: id,
      groupName: id === "unassigned" ? "No Notebook" : id,
      notes: ns,
    }));
  };

  const openNoteCreate = () => {
    router.push(`/notes/new?returnTo=${encodeReturnTo("/knowledge")}`);
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
        onPinToggle={onPinToggle}
        onFavoriteToggle={onFavoriteToggle}
        onSaveStatusChange={onSaveStatusChange}
        onArchive={onArchive}
        onRestore={onRestore}
        onDelete={onDelete}
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

  return (
    <section>
      <SectionHeader
        accentClass="bg-primary"
        title="Notes"
        totalCount={notes.length}
        description="Access and search your latest Notes."
        buttonLabel="New Note"
        onNew={() => router.push(`/notes/new?returnTo=${encodeReturnTo("/knowledge")}`)}
      />
      <div className="mt-4">
        <Tabs
          value={notesTab}
          onValueChange={(v) => { setNotesTab(v as NoteView); }}
        >
          <TabsList className={NOTES_TABS_LIST_CLASS_NAME}>
            <TabsTrigger value={NOTE_VIEW.ALL} className="rounded-none border-b-2 border-transparent px-2.5 py-1.5 text-xs leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">All</TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.INBOX} className="rounded-none border-b-2 border-transparent px-2.5 py-1.5 text-xs leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"><InboxIcon className="mr-1 size-3" />Inbox</TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.TO_REVIEW} className="rounded-none border-b-2 border-transparent px-2.5 py-1.5 text-xs leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"><Clock className="mr-1 size-3" />To Review</TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.ACTIVE} className="rounded-none border-b-2 border-transparent px-2.5 py-1.5 text-xs leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"><Zap className="mr-1 size-3" />Active</TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.PINNED} className="rounded-none border-b-2 border-transparent px-2.5 py-1.5 text-xs leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"><Pin className="mr-1 size-3" />Pinned</TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.FAVORITE} className="rounded-none border-b-2 border-transparent px-2.5 py-1.5 text-xs leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"><Star className="mr-1 size-3" />Favorites</TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.BY_AREA} className="rounded-none border-b-2 border-transparent px-2.5 py-1.5 text-xs leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"><MapIcon className="mr-1 size-3" />By Area</TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.BY_GOAL} className="rounded-none border-b-2 border-transparent px-2.5 py-1.5 text-xs leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"><Target className="mr-1 size-3" />By Goal</TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.BY_PROJECT} className="rounded-none border-b-2 border-transparent px-2.5 py-1.5 text-xs leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"><FolderOpen className="mr-1 size-3" />By Project</TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.BY_TOPIC} className="rounded-none border-b-2 border-transparent px-2.5 py-1.5 text-xs leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"><Tag className="mr-1 size-3" />By Topic</TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.BY_NOTEBOOK} className="rounded-none border-b-2 border-transparent px-2.5 py-1.5 text-xs leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"><BookOpen className="mr-1 size-3" />By Notebook</TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.COMPLETED} className="rounded-none border-b-2 border-transparent px-2.5 py-1.5 text-xs leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"><Bookmark className="mr-1 size-3" />Completed</TabsTrigger>
            <TabsTrigger value={NOTE_VIEW.ARCHIVED} className="rounded-none border-b-2 border-transparent px-2.5 py-1.5 text-xs leading-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"><Archive className="mr-1 size-3" />Archived</TabsTrigger>
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
                <div className="flex flex-col gap-1" aria-busy="true" role="status" aria-label="Loading notes">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="h-4 w-4 rounded bg-muted animate-pulse" />
                      <div className="h-4 flex-1 rounded bg-muted animate-pulse" />
                      <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : visibleNotes.length === 0 ? (
                <EmptyState
                  icon={NotebookPen}
                  title={`No ${tab.replace(/_/g, " ")} notes`}
                  description="Try a different filter or create a new note."
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
              groups={noteGroupsByArea()}
              renderNote={(n) => renderNoteRow(n)}
              onNewNote={(groupId) => router.push(`/notes/new?areaId=${groupId}&returnTo=${encodeReturnTo("/knowledge")}`)}
              emptyMessage="Notes will be grouped by area here."
            />
          </TabsContent>
          <TabsContent value={NOTE_VIEW.BY_GOAL} className="mt-4">
            <NotesByGroupView
              groups={noteGroupsByGoal()}
              renderNote={(n) => renderNoteRow(n)}
              onNewNote={(groupId) => router.push(`/notes/new?goalId=${groupId}&returnTo=${encodeReturnTo("/knowledge")}`)}
              emptyMessage="Notes will be grouped by goal here."
            />
          </TabsContent>
          <TabsContent value={NOTE_VIEW.BY_PROJECT} className="mt-4">
            <NotesByGroupView
              groups={noteGroupsByProject()}
              renderNote={(n) => renderNoteRow(n)}
              onNewNote={(groupId) => router.push(`/notes/new?projectId=${groupId}&returnTo=${encodeReturnTo("/knowledge")}`)}
              emptyMessage="Notes will be grouped by project here."
            />
          </TabsContent>
          <TabsContent value={NOTE_VIEW.BY_TOPIC} className="mt-4">
            <NotesByGroupView
              groups={noteGroupsByTopic()}
              renderNote={(n) => renderNoteRow(n)}
              onNewNote={(groupId) => router.push(`/notes/new?topicId=${groupId}&returnTo=${encodeReturnTo("/knowledge")}`)}
              emptyMessage="Notes will be grouped by topic here."
            />
          </TabsContent>
          <TabsContent value={NOTE_VIEW.BY_NOTEBOOK} className="mt-4">
            <NotesByGroupView
              groups={noteGroupsByNotebook()}
              renderNote={(n) => renderNoteRow(n)}
              onNewNote={(groupId) => router.push(`/notes/new?notebook=${encodeURIComponent(groupId)}&returnTo=${encodeReturnTo("/knowledge")}`)}
              emptyMessage="Notes will be grouped by notebook here."
            />
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

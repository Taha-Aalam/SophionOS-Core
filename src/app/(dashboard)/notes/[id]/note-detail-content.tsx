"use client";

import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Link2,
  NotebookPen,
  Pin,
  X,
} from "lucide-react";

import { NoteArchiveToggle } from "@/components/entities/note-archive-toggle";
import { NoteEditor } from "@/components/entities/note-editor";
import { NoteMetadataPanel } from "@/components/entities/note-metadata-panel";
import { EmptyState } from "@/components/views/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteEntityPopover } from "@/components/entities/delete-entity-popover";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAreas } from "@/lib/hooks/use-areas";
import { useGoals } from "@/lib/hooks/use-goals";
import {
  useAddNotesToNotebook,
  useArchiveNote,
  useDeleteNote,
  useNoteByIdentifier,
  useNoteTypes,
  useNotebooks,
  useNotes,
  useRelatedNotesByNotebook,
  useRemoveNoteFromNotebook,
  useRestoreNote,
  useUpdateNote,
} from "@/lib/hooks/use-notes";
import { useProjects } from "@/lib/hooks/use-projects";
import { useTasks } from "@/lib/hooks/use-tasks";
import type { Note, UpdateNoteInput } from "@/lib/types/domain.types";
import { buildNoteMetadataUpdateInput } from "@/lib/utils/note-detail-metadata";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/stores/ui.store";
import { buildReturnToChain, encodeReturnTo, popReturnToHref } from "@/lib/utils/return-to";
import { getNoteLinkedAreaIds, getNoteLinkedGoalIds, getNoteLinkedProjectIds, getNoteLinkedTaskIds } from "@/lib/utils/notes";

const STATUS_COLORS: Record<string, string> = {
  inbox: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  to_review: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  active: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  completed: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  archive: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const AUTOSAVE_DELAY_MS = 1000;

export function NoteDetailContent() {
  const params = useParams();
  const router = useRouter();
  const noteId = params.id as string;
  const { setPageTitle } = useUIStore();

  const searchParams = useSearchParams();

  const [localIsArchived, setLocalIsArchived] = useState(false);
  const [optimisticArchivedTarget, setOptimisticArchivedTarget] = useState<boolean | null>(null);
  const [localTitle, setLocalTitle] = useState("");
  const [localNotebooks, setLocalNotebooks] = useState<string[]>([]);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const [localAreaIds, setLocalAreaIds] = useState<string[]>([]);
  const [localGoalIds, setLocalGoalIds] = useState<string[]>([]);
  const [localProjectIds, setLocalProjectIds] = useState<string[]>([]);
  const [localTaskIds, setLocalTaskIds] = useState<string[]>([]);

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContent = useRef<string | null>(null);
  const syncedNoteIdRef = useRef<string | null>(null);

  const { data: note, isLoading } = useNoteByIdentifier(noteId);
  const { data: areas = [] } = useAreas();
  const { data: goals = [] } = useGoals({ status: "all" });
  const { data: projects = [] } = useProjects({ status: "all" });
  const { data: tasks = [] } = useTasks();
  const { data: noteTypes = [] } = useNoteTypes();
  const { data: allNotes = [] } = useNotes({ status: "all" });
  const { data: relatedGroups = [] } = useRelatedNotesByNotebook(note?.id ?? "");
  const { data: notebookOptions = [] } = useNotebooks();
  const addToNotebook = useAddNotesToNotebook();
  const removeFromNotebook = useRemoveNoteFromNotebook();
  const archiveNote = useArchiveNote();
  const restoreNote = useRestoreNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const isArchiveMutationPending = archiveNote.isPending || restoreNote.isPending;

  useEffect(() => {
    if (note) {
      const isFirstSync = syncedNoteIdRef.current !== note.id;
      syncedNoteIdRef.current = note.id;

      startTransition(() => {
        if (optimisticArchivedTarget === null) {
          setLocalIsArchived(note.is_archived);
        } else if (note.is_archived === optimisticArchivedTarget) {
          setLocalIsArchived(note.is_archived);
          setOptimisticArchivedTarget(null);
        }
        setPageTitle(note.name);

        // Only sync editable local state on first load — not on refetches triggered by saves,
        // which would overwrite in-flight local edits with potentially stale server data.
        if (isFirstSync) {
          setLocalTitle(note.name);
          setLocalNotebooks(note.notebooks ?? []);
          setLocalAreaIds(getNoteLinkedAreaIds(note));
          setLocalGoalIds(getNoteLinkedGoalIds(note));
          setLocalProjectIds(getNoteLinkedProjectIds(note));
          setLocalTaskIds(getNoteLinkedTaskIds(note));
        }
      });
    }
    return () => setPageTitle("");
  }, [note, optimisticArchivedTarget, setPageTitle]);

  const save = useCallback(
    async (input: UpdateNoteInput) => {
      if (!note) return;
      setSaveState("saving");
      try {
        await updateNote.mutateAsync({ id: note.id, input });
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2000);
      } catch {
        setSaveState("idle");
      }
    },
    [note, updateNote],
  );

  const handleContentChange = useCallback(
    (content: string) => {
      pendingContent.current = content;
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
      autosaveTimer.current = setTimeout(() => {
        if (pendingContent.current !== null) {
          save({ content: pendingContent.current });
          pendingContent.current = null;
        }
      }, AUTOSAVE_DELAY_MS);
    },
    [save],
  );

  const handleTitleBlur = () => {
    if (note && localTitle !== note.name && localTitle.trim()) {
      save({ name: localTitle.trim() });
    }
  };

  const buildMetadataInput = useCallback(
    (overrides: UpdateNoteInput) => {
      if (!note) return overrides;

      return buildNoteMetadataUpdateInput(
        {
          status: note.status,
          type: note.type,
          notebooks: localNotebooks,
          areaIds: localAreaIds,
          goalIds: localGoalIds,
          projectIds: localProjectIds,
          taskIds: localTaskIds,
          favorite: note.favorite,
          pin: note.pin,
        },
        overrides,
      );
    },
    [localAreaIds, localGoalIds, localNotebooks, localProjectIds, localTaskIds, note],
  );

  const handleMetaChange = (input: UpdateNoteInput) => {
    save(buildMetadataInput(input));
  };

  const handleDelete = async () => {
    if (!note) return;
    await deleteNote.mutateAsync(note.id);
    router.push("/notes");
  };

  const handleArchiveToggle = async () => {
    if (!note) return;

    const nextArchived = !localIsArchived;
    setLocalIsArchived(nextArchived);
    setOptimisticArchivedTarget(nextArchived);

    try {
      if (nextArchived) {
        await archiveNote.mutateAsync(note.id);
        return;
      }

      await restoreNote.mutateAsync(note.id);
    } catch {
      setLocalIsArchived(!nextArchived);
      setOptimisticArchivedTarget(null);
    }
  };

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full max-w-xl" />
        <Skeleton className="flex-1" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
        <EmptyState
          icon={NotebookPen}
          title="Note not found"
          description="This note may have been deleted or you don't have access to it."
          actionLabel="Back to Notes"
          onAction={() => router.push("/notes")}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={() => router.push(popReturnToHref(searchParams, "/notes"))}>
            <ArrowLeft className="size-4" />
          </Button>
          <span className="text-sm text-muted-foreground">/ Notes / {note.name}</span>
          <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[note.status])}>
            {note.status === "completed" ? "Done" : note.status.replace("_", " ")}
          </Badge>
          {note.pin && (
            <Badge variant="outline" className="text-xs gap-1">
              <Pin className="size-2.5" /> Pinned
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {saveState === "saving" && <span className="text-xs">Saving…</span>}
          {saveState === "saved" && <span className="text-xs text-green-600 dark:text-green-400">Saved</span>}
          <NoteArchiveToggle
            isArchived={localIsArchived}
            mode="detail"
            disabled={isArchiveMutationPending}
            onClick={handleArchiveToggle}
          />
          <DeleteEntityPopover
            variant="detail"
            entityLabel="note"
            entityName={note.name}
            requireTypedConfirmation={false}
            disabled={deleteNote.isPending}
            onConfirm={() => {
              void handleDelete();
            }}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
          <input
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            onBlur={handleTitleBlur}
            placeholder="Note title"
            className="mb-4 w-full bg-transparent text-2xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/50"
          />
          <NoteEditor
            content={note.content}
            onChange={handleContentChange}
            placeholder="Start writing your note…"
            className="flex-1"
          />

          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Related Notes</h3>
              <Button variant="outline" size="sm" onClick={() => setLinkDialogOpen(true)}>
                <Link2 className="mr-1.5 size-3.5" />Link to Notebook
              </Button>
            </div>
            {relatedGroups.length === 0 ? (
              <p className="text-sm text-muted-foreground">No related notes yet.</p>
            ) : (
              relatedGroups.map((group) => (
                <div key={group.notebook} className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <BookOpen className="size-3.5" />
                    {group.notebook}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 max-h-[108px] overflow-y-auto">
                    {group.notes.map((rn) => (
                      <div
                        key={rn.id}
                        className="group flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
                        onClick={() => {
                          const sourcePath = `/notes/${note.slug ?? note.id}`;
                          const params = new URLSearchParams();
                          params.set("returnTo", encodeReturnTo(sourcePath));
                          params.set("chain", buildReturnToChain(searchParams));
                          const destination = `/notes/${rn.slug ?? rn.id}`;
                          router.push(`${destination}?${params.toString()}`);
                        }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <NotebookPen className="size-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate text-sm font-medium">{rn.name}</span>
                          <Badge variant="secondary" className="text-[10px] h-4 px-1 shrink-0">{rn.type}</Badge>
                        </div>
                        <button
                          type="button"
                          className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFromNotebook.mutate({ noteId: rn.id, notebook: group.notebook });
                          }}
                          title={`Remove from ${group.notebook}`}
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <aside className="hidden w-72 shrink-0 flex-col gap-5 overflow-y-auto border-l border-border p-4 xl:flex">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Metadata
          </p>

          <NoteMetadataPanel
            areas={areas}
            goals={goals}
            projects={projects}
            tasks={tasks}
            noteTypes={noteTypes}
            status={note.status}
            type={note.type}
            notebooks={localNotebooks}
            notebookOptions={notebookOptions}
            areaIds={localAreaIds}
            goalIds={localGoalIds}
            projectIds={localProjectIds}
            taskIds={localTaskIds}
            favorite={note.favorite}
            pin={note.pin}
            onStatusChange={(status) => handleMetaChange({ status })}
            onTypeChange={(type) => handleMetaChange({ type })}
            onNotebooksChange={(notebooks) => { setLocalNotebooks(notebooks); handleMetaChange({ notebooks }); }}
            onAreaIdsChange={(ids) => { setLocalAreaIds(ids); handleMetaChange({ area_ids: ids }); }}
            onGoalIdsChange={(ids) => { setLocalGoalIds(ids); handleMetaChange({ goal_ids: ids }); }}
            onProjectIdsChange={(ids) => { setLocalProjectIds(ids); handleMetaChange({ project_ids: ids }); }}
            onTaskIdsChange={(ids) => { setLocalTaskIds(ids); handleMetaChange({ task_ids: ids }); }}
            onFavoriteChange={(favorite) => handleMetaChange({ favorite })}
            onPinChange={(pin) => handleMetaChange({ pin })}
            disabled={updateNote.isPending}
          />

          <div className="mt-auto space-y-1 border-t border-border pt-4 text-xs text-muted-foreground">
            <p>
              Created{" "}
              {new Date(note.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <p>
              Updated{" "}
              {new Date(note.updated_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </aside>
      </div>

      <LinkToNotebookDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        notebookOptions={notebookOptions}
        currentNotebooks={note.notebooks ?? []}
        candidateNotes={allNotes.filter((n) => n.id !== note.id)}
        onSubmit={(notebook, noteIds) => {
          addToNotebook.mutate({ notebook, noteIds: [note.id, ...noteIds] });
          if (!localNotebooks.includes(notebook)) {
            setLocalNotebooks((prev) => [...prev, notebook].sort());
          }
          setLinkDialogOpen(false);
        }}
      />

    </div>
  );
}

function LinkToNotebookDialog({
  open,
  onOpenChange,
  notebookOptions,
  currentNotebooks,
  candidateNotes,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notebookOptions: string[];
  currentNotebooks: string[];
  candidateNotes: Note[];
  onSubmit: (notebook: string, noteIds: string[]) => void;
}) {
  const [notebook, setNotebook] = useState<string>("");
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setNotebook(currentNotebooks[0] ?? notebookOptions[0] ?? "");
      setPicked(new Set());
      setQuery("");
    }
    wasOpenRef.current = open;
  }, [open, currentNotebooks, notebookOptions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return candidateNotes
      .filter((n) => !notebook || !(n.notebooks ?? []).includes(notebook))
      .filter((n) => !q || n.name.toLowerCase().includes(q))
      .slice(0, 50);
  }, [candidateNotes, query, notebook]);

  const togglePick = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link notes to a notebook</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Notebook</Label>
            <Select value={notebook} onValueChange={(v) => setNotebook(v ?? "")}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Select a notebook" />
              </SelectTrigger>
              <SelectContent>
                {notebookOptions.map((nb) => (
                  <SelectItem key={nb} value={nb}>{nb}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Notes to add</Label>
            <Command shouldFilter={false} className="rounded-md border">
              <CommandInput placeholder="Search notes…" value={query} onValueChange={setQuery} />
              <CommandList className="max-h-72">
                <CommandEmpty>No notes found.</CommandEmpty>
                <CommandGroup>
                  {filtered.map((n) => (
                    <CommandItem key={n.id} value={n.id} onSelect={() => togglePick(n.id)} className="flex items-center gap-2">
                      <Checkbox checked={picked.has(n.id)} />
                      <span className="truncate text-sm">{n.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={!notebook || picked.size === 0}
            onClick={() => onSubmit(notebook, Array.from(picked))}
          >
            Add {picked.size > 0 ? `(${picked.size})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

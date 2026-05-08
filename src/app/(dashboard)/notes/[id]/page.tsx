"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Link2,
  NotebookPen,
  Pin,
  Trash2,
  X,
} from "lucide-react";

import { NoteArchiveToggle } from "@/components/entities/note-archive-toggle";
import { NoteEditor } from "@/components/entities/note-editor";
import { NoteMetadataPanel } from "@/components/entities/note-metadata-panel";
import { EmptyState } from "@/components/views/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useAreas } from "@/lib/hooks/use-areas";
import { useGoals } from "@/lib/hooks/use-goals";
import {
  useArchiveNote,
  useDeleteNote,
  useNoteByIdentifier,
  useNoteTypes,
  useNotes,
  useRelatedNotes,
  useLinkRelatedNote,
  useRestoreNote,
  useUnlinkRelatedNote,
  useUpdateNote,
} from "@/lib/hooks/use-notes";
import { useProjects } from "@/lib/hooks/use-projects";
import { useTasks } from "@/lib/hooks/use-tasks";
import type { UpdateNoteInput } from "@/lib/types/domain.types";
import { buildNoteMetadataUpdateInput } from "@/lib/utils/note-detail-metadata";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/stores/ui.store";

const STATUS_COLORS: Record<string, string> = {
  inbox: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  to_review: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  archive: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const AUTOSAVE_DELAY_MS = 1000;

export default function NoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const noteId = params.id as string;
  const { setPageTitle } = useUIStore();

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [localIsArchived, setLocalIsArchived] = useState(false);
  const [optimisticArchivedTarget, setOptimisticArchivedTarget] = useState<boolean | null>(null);
  const [localTitle, setLocalTitle] = useState("");
  const [localNotebook, setLocalNotebook] = useState<string>("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const [localAreaIds, setLocalAreaIds] = useState<string[]>([]);
  const [localGoalIds, setLocalGoalIds] = useState<string[]>([]);
  const [localProjectIds, setLocalProjectIds] = useState<string[]>([]);
  const [localTaskIds, setLocalTaskIds] = useState<string[]>([]);

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContent = useRef<string | null>(null);

  const { data: note, isLoading } = useNoteByIdentifier(noteId);
  const { data: areas = [] } = useAreas();
  const { data: goals = [] } = useGoals({ status: "all" });
  const { data: projects = [] } = useProjects({ status: "all" });
  const { data: tasks = [] } = useTasks();
  const { data: noteTypes = [] } = useNoteTypes();
  const { data: allNotes = [] } = useNotes({ status: "all" });
  const { data: relatedNotes = [] } = useRelatedNotes(noteId);
  const linkRelated = useLinkRelatedNote();
  const unlinkRelated = useUnlinkRelatedNote();
  const archiveNote = useArchiveNote();
  const restoreNote = useRestoreNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();
  const isArchiveMutationPending = archiveNote.isPending || restoreNote.isPending;

  const [linkOpen, setLinkOpen] = useState(false);
  const [linkQuery, setLinkQuery] = useState("");

  useEffect(() => {
    if (note) {
      startTransition(() => {
        setLocalTitle(note.name);
        if (optimisticArchivedTarget === null) {
          setLocalIsArchived(note.is_archived);
        } else if (note.is_archived === optimisticArchivedTarget) {
          setLocalIsArchived(note.is_archived);
          setOptimisticArchivedTarget(null);
        }
        setLocalNotebook(note.notebook ?? "");
        setLocalAreaIds(note.linkedAreaIds ?? (note.area_id ? [note.area_id] : []));
        setLocalGoalIds(note.linkedGoalIds ?? []);
        setLocalProjectIds(note.linkedProjectIds ?? (note.project_id ? [note.project_id] : []));
        setLocalTaskIds(note.linkedTaskIds ?? []);
        setPageTitle(note.name);
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
          notebook: localNotebook,
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
    [localAreaIds, localGoalIds, localNotebook, localProjectIds, localTaskIds, note],
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
      <div className="flex h-full flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full max-w-xl" />
        <Skeleton className="flex-1" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className="flex h-full items-center justify-center p-6">
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
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={() => router.push("/notes")}>
            <ArrowLeft className="size-4" />
          </Button>
          <Badge variant="secondary" className={cn("text-xs", STATUS_COLORS[note.status])}>
            {note.status.replace("_", " ")}
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
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-destructive hover:text-destructive"
            onClick={() => setIsDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
          </Button>
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

          <div className="mt-8 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Related Notes</h3>
              <Popover open={linkOpen} onOpenChange={setLinkOpen}>
                <PopoverTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
                  <Link2 className="mr-1.5 size-3.5" />Link Related Note
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="end">
                  <Command>
                    <CommandInput placeholder="Search notes…" value={linkQuery} onValueChange={setLinkQuery} />
                    <CommandList>
                      <CommandEmpty>No notes found.</CommandEmpty>
                      <CommandGroup>
                        {allNotes
                          .filter((n) => n.id !== note.id && !relatedNotes.some((r) => r.id === n.id))
                          .filter((n) => n.name.toLowerCase().includes(linkQuery.toLowerCase()))
                          .slice(0, 10)
                          .map((n) => (
                            <CommandItem
                              key={n.id}
                              onSelect={() => {
                                linkRelated.mutate({ noteAId: note.id, noteBId: n.id });
                                setLinkOpen(false);
                                setLinkQuery("");
                              }}
                            >
                              <NotebookPen className="mr-2 size-3.5" />
                              {n.name}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            {relatedNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No related notes yet.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {relatedNotes.map((rn) => (
                  <div
                    key={rn.id}
                    className="group flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50 cursor-pointer"
                    onClick={() => router.push(`/notes/${rn.slug ?? rn.id}`)}
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
                        unlinkRelated.mutate({ noteAId: note.id, noteBId: rn.id });
                      }}
                      title="Unlink"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
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
            notebook={localNotebook}
            areaIds={localAreaIds}
            goalIds={localGoalIds}
            projectIds={localProjectIds}
            taskIds={localTaskIds}
            favorite={note.favorite}
            pin={note.pin}
            onStatusChange={(status) => handleMetaChange({ status })}
            onTypeChange={(type) => handleMetaChange({ type })}
            onNotebookChange={(notebook) => setLocalNotebook(notebook ?? "")}
            onNotebookBlur={() => {
              const next = localNotebook.trim() || null;
              if (next !== note.notebook) {
                handleMetaChange({ notebook: next });
              }
            }}
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

      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete note permanently?</DialogTitle>
            <DialogDescription>
              &quot;{note.name}&quot; will be permanently removed. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteNote.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

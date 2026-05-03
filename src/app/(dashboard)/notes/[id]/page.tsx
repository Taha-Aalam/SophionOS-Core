"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Heart,
  Map,
  NotebookPen,
  Pin,
  Trash2,
} from "lucide-react";

import { NoteEditor } from "@/components/entities/note-editor";
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
import { useAreas } from "@/lib/hooks/use-areas";
import {
  useDeleteNote,
  useNoteByIdentifier,
  useNotebooks,
  useUpdateNote,
} from "@/lib/hooks/use-notes";
import { useProjects } from "@/lib/hooks/use-projects";
import type { UpdateNoteInput } from "@/lib/types/domain.types";
import { NOTE_STATUS, NOTE_TYPE } from "@/lib/utils/constants";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/stores/ui.store";

const STATUS_OPTIONS = [
  { value: NOTE_STATUS.INBOX, label: "Inbox" },
  { value: NOTE_STATUS.TO_REVIEW, label: "To Review" },
  { value: NOTE_STATUS.ACTIVE, label: "Active" },
  { value: NOTE_STATUS.ARCHIVE, label: "Archive" },
];

const TYPE_OPTIONS = [
  { value: NOTE_TYPE.NOTE, label: "Note" },
  { value: NOTE_TYPE.RESEARCH, label: "Research" },
  { value: NOTE_TYPE.JOURNAL, label: "Journal" },
];

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
  const [localTitle, setLocalTitle] = useState("");
  const [notebookInput, setNotebookInput] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContent = useRef<string | null>(null);

  const { data: note, isLoading } = useNoteByIdentifier(noteId);
  const { data: areas = [] } = useAreas();
  const { data: projects = [] } = useProjects({ status: "all" });
  const { data: notebooks = [] } = useNotebooks();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  useEffect(() => {
    if (note) {
      setLocalTitle(note.name);
      setNotebookInput(note.notebook ?? "");
      setPageTitle(note.name);
    }
    return () => setPageTitle("");
  }, [note, setPageTitle]);

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

  const handleNotebookBlur = () => {
    const next = notebookInput.trim() || null;
    if (note && next !== note.notebook) {
      save({ notebook: next });
    }
  };

  const handleMetaChange = (input: UpdateNoteInput) => {
    save(input);
  };

  const handleDelete = async () => {
    if (!note) return;
    await deleteNote.mutateAsync(note.id);
    router.push("/notes");
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

  const linkedArea = note.area_id ? areas.find((a) => a.id === note.area_id) : null;
  const linkedProject = note.project_id
    ? projects.find((p) => p.id === note.project_id)
    : null;
  const activeProjects = projects.filter((p) => !p.is_archived);
  const projectsForSelect =
    linkedProject && !activeProjects.some((p) => p.id === linkedProject.id)
      ? [...activeProjects, linkedProject]
      : activeProjects;
  const activeAreas = areas.filter((a) => !a.archive);
  const areasForSelect =
    linkedArea && !activeAreas.some((a) => a.id === linkedArea.id)
      ? [...activeAreas, linkedArea]
      : activeAreas;

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
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => handleMetaChange({ favorite: !note.favorite })}
            title={note.favorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart
              className={cn("size-4", note.favorite && "fill-rose-500 text-rose-500")}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => handleMetaChange({ pin: !note.pin })}
            title={note.pin ? "Unpin" : "Pin note"}
          >
            <Pin className={cn("size-4", note.pin && "text-primary")} />
          </Button>
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
        </div>

        <aside className="hidden w-64 shrink-0 flex-col gap-5 overflow-y-auto border-l border-border p-4 xl:flex">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Metadata
          </p>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Status</Label>
            <Select
              value={note.status}
              onValueChange={(v) =>
                handleMetaChange({ status: v as typeof note.status })
              }
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Type</Label>
            <Select
              value={note.type}
              onValueChange={(v) =>
                handleMetaChange({ type: v as typeof note.type })
              }
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              <BookOpen className="mr-1 inline size-3" />
              Notebook
            </Label>
            <Input
              value={notebookInput}
              onChange={(e) => setNotebookInput(e.target.value)}
              onBlur={handleNotebookBlur}
              placeholder="e.g. Work, Ideas…"
              list="notebooks-list"
              className="h-8 text-sm"
            />
            <datalist id="notebooks-list">
              {notebooks.map((nb) => (
                <option key={nb} value={nb} />
              ))}
            </datalist>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              <Map className="mr-1 inline size-3" />
              Area
            </Label>
            <Select
              value={note.area_id ?? "none"}
              onValueChange={(v) =>
                handleMetaChange({ area_id: v === "none" ? null : v })
              }
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="No area">
                  {linkedArea
                    ? `${linkedArea.icon ? `${linkedArea.icon} ` : ""}${linkedArea.name}`
                    : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No area</SelectItem>
                {areasForSelect.map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.icon ? `${area.icon} ` : ""}
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Project</Label>
            <Select
              value={note.project_id ?? "none"}
              onValueChange={(v) =>
                handleMetaChange({ project_id: v === "none" ? null : v })
              }
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="No project">
                  {linkedProject?.name ?? undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projectsForSelect.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
              "{note.name}" will be permanently removed. This cannot be undone.
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

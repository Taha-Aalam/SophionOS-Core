"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

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
import { Skeleton } from "@/components/ui/skeleton";
import { useCreateNote, useUpdateNote } from "@/lib/hooks/use-notes";
import type { Note } from "@/lib/types/domain.types";

// TipTap is heavy (~150KB+ gz). Defer until the dialog actually mounts.
const NoteEditor = dynamic(
  () => import("@/components/entities/note-editor").then((m) => m.NoteEditor),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[240px] w-full" />,
  },
);

interface NoteEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: Note | null;
  goalId?: string;
  projectId?: string;
  areaId?: string | null;
  topicId?: string;
  returnTo?: string | null;
  onSuccess?: () => void;
}

interface NoteEditorDialogFormProps {
  note: Note | null;
  goalId?: string;
  projectId?: string;
  areaId?: string | null;
  topicId?: string;
  returnTo?: string | null;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

function NoteEditorDialogForm({
  note,
  goalId,
  projectId,
  areaId,
  topicId,
  returnTo,
  onOpenChange,
  onSuccess,
}: NoteEditorDialogFormProps) {
  const router = useRouter();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const [name, setName] = useState(note?.name ?? "");
  const [content, setContent] = useState(note?.content ?? "");

  const handleSave = async () => {
    if (note) {
      await updateNote.mutateAsync({ id: note.id, input: { name, content } });
    } else {
      const createInput: Parameters<typeof createNote.mutateAsync>[0] = {
        name: name || "Untitled note",
        content,
      };

      if (goalId) {
        createInput.goal_ids = [goalId];
      }

      if (projectId) {
        createInput.project_id = projectId;
      }

      if (areaId) {
        createInput.area_id = areaId;
      }

      if (topicId) {
        createInput.topic_id = topicId;
      }

      const newNote = await createNote.mutateAsync(createInput);
      const noteUrl = `/notes/${newNote.slug ?? newNote.id}`;
      if (returnTo) {
        router.push(`${noteUrl}?returnTo=${encodeURIComponent(returnTo)}`);
      } else {
        router.push(noteUrl);
      }
    }

    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{note ? "Edit Note" : "Create Note"}</DialogTitle>
        <DialogDescription>Create or edit a note in your PARA system.</DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="note-name">Title</Label>
          <Input
            id="note-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Note title"
            maxLength={255}
          />
        </div>
        <div className="space-y-2">
          <Label>Content</Label>
          <NoteEditor content={content} onChange={setContent} />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleSave}>{note ? "Save Changes" : "Create Note"}</Button>
      </DialogFooter>
    </>
  );
}

export function NoteEditorDialog({
  open,
  onOpenChange,
  note,
  goalId,
  projectId,
  areaId,
  topicId,
  returnTo,
  onSuccess,
}: NoteEditorDialogProps) {
  const formKey = `${note?.id ?? "new"}-${goalId ?? "no-goal"}-${projectId ?? "no-project"}-${topicId ?? "no-topic"}-${open ? "open" : "closed"}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-2xl overflow-y-auto">
        {open ? (
          <NoteEditorDialogForm
            key={formKey}
            note={note}
            goalId={goalId}
            projectId={projectId}
            areaId={areaId}
            topicId={topicId}
            returnTo={returnTo}
            onOpenChange={onOpenChange}
            onSuccess={onSuccess}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

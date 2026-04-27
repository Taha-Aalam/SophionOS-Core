"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
import { NoteEditor } from "@/components/entities/note-editor";
import { Button } from "@/components/ui/button";
import { useCreateNote } from "@/lib/hooks/use-notes";
import { useUpdateNote } from "@/lib/hooks/use-notes";
import type { Note } from "@/lib/types/domain.types";

interface NoteEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: Note | null;
  goalId?: string;
  onSuccess?: () => void;
}

export function NoteEditorDialog({ open, onOpenChange, note, goalId, onSuccess }: NoteEditorDialogProps) {
  const router = useRouter();
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const [name, setName] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(note?.name ?? "");
    setContent(note?.content ?? "");
  }, [open, note]);

  const handleSave = async () => {
    if (note) {
      await updateNote.mutateAsync({ id: note.id, input: { name, content } });
    } else {
      const createInput: Parameters<typeof createNote.mutateAsync>[0] = {
        name: name || "Untitled note",
        content,
        status: "inbox",
      };
      if (goalId) {
        createInput.goal_ids = [goalId];
      }
      const newNote = await createNote.mutateAsync(createInput);
      router.push(`/notes/${newNote.id}`);
    }

    onSuccess?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
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
          <Button onClick={handleSave}>
            {note ? "Save Changes" : "Create Note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

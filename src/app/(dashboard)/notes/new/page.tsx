"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";

import { NoteEditor } from "@/components/entities/note-editor";
import { NoteMetadataPanel } from "@/components/entities/note-metadata-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAreas } from "@/lib/hooks/use-areas";
import { useGoals } from "@/lib/hooks/use-goals";
import { useCreateNote, useNoteTypes } from "@/lib/hooks/use-notes";
import { useProjects } from "@/lib/hooks/use-projects";
import { useTasks } from "@/lib/hooks/use-tasks";
import { NOTE_STATUS, NOTE_TYPE, type NoteStatus } from "@/lib/utils/constants";

export default function NewNotePage() {
  const router = useRouter();
  const createNote = useCreateNote();

  const { data: areas = [], isLoading: areasLoading } = useAreas();
  const { data: goals = [], isLoading: goalsLoading } = useGoals({ status: "all" });
  const { data: projects = [], isLoading: projectsLoading } = useProjects({ status: "all" });
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: noteTypes = [], isLoading: typesLoading } = useNoteTypes();

  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<NoteStatus>(NOTE_STATUS.INBOX);
  const [type, setType] = useState<string>(NOTE_TYPE.NOTE);
  const [notebook, setNotebook] = useState<string | null>(null);
  const [areaIds, setAreaIds] = useState<string[]>([]);
  const [goalIds, setGoalIds] = useState<string[]>([]);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [taskIds, setTaskIds] = useState<string[]>([]);
  const [favorite, setFavorite] = useState(false);
  const [pin, setPin] = useState(false);

  const isLoading = areasLoading || goalsLoading || projectsLoading || tasksLoading || typesLoading;

  const handleSave = async () => {
    const note = await createNote.mutateAsync({
      name: name.trim() || "Untitled note",
      content: content || null,
      status,
      type,
      notebook,
      area_ids: areaIds,
      goal_ids: goalIds,
      project_ids: projectIds,
      task_ids: taskIds,
      favorite,
      pin,
    });
    router.push(`/notes/${note.slug ?? note.id}`);
  };

  if (isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={() => router.push("/notes")}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-xl font-bold tracking-tight">New Note</h1>
        </div>
        <Button onClick={handleSave} disabled={createNote.isPending}>
          <Save className="mr-2 size-4" />
          Save Note
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Note title"
            className="h-10 text-lg font-semibold"
          />
          <NoteEditor
            content={content}
            onChange={setContent}
            placeholder="Start writing your note…"
            className="min-h-[400px] flex-1"
          />
        </div>

        <aside className="rounded-lg border p-4">
          <NoteMetadataPanel
            areas={areas}
            goals={goals}
            projects={projects}
            tasks={tasks}
            noteTypes={noteTypes}
            status={status}
            type={type}
            notebook={notebook}
            areaIds={areaIds}
            goalIds={goalIds}
            projectIds={projectIds}
            taskIds={taskIds}
            favorite={favorite}
            pin={pin}
            onStatusChange={setStatus}
            onTypeChange={setType}
            onNotebookChange={setNotebook}
            onAreaIdsChange={setAreaIds}
            onGoalIdsChange={setGoalIds}
            onProjectIdsChange={setProjectIds}
            onTaskIdsChange={setTaskIds}
            onFavoriteChange={setFavorite}
            onPinChange={setPin}
            disabled={createNote.isPending}
          />
        </aside>
      </div>
    </div>
  );
}

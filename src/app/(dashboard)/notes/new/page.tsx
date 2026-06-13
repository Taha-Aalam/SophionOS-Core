"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save } from "lucide-react";

import { NoteEditor } from "@/components/entities/note-editor";
import { NoteMetadataPanel } from "@/components/entities/note-metadata-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAreas } from "@/lib/hooks/use-areas";
import { useGoals } from "@/lib/hooks/use-goals";
import { NOTES_QUERY_KEY, useCreateNote, useNotebooks, useNoteTypes } from "@/lib/hooks/use-notes";
import { PROJECTS_QUERY_KEY, useProjects } from "@/lib/hooks/use-projects";
import { useTasks } from "@/lib/hooks/use-tasks";
import { useTopics } from "@/lib/hooks/use-topics";
import { NOTE_STATUS, NOTE_TYPE, type NoteStatus } from "@/lib/utils/constants";
import { decodeReturnTo, popReturnToHref } from "@/lib/utils/return-to";

function parseMultiValue(param: string | null): string[] {
  if (!param) return [];
  return param.split(",").filter(Boolean);
}

export default function NewNotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const createNote = useCreateNote();

  const prefilledAreaId = searchParams.get("areaId");
  const prefilledGoalId = searchParams.get("goalId");
  const prefilledAreaIds = searchParams.get("areaIds");
  const prefilledGoalIds = searchParams.get("goalIds");
  const prefilledProjectId = searchParams.get("projectId");
  const prefilledTopicId = searchParams.get("topicId");
  const prefilledNotebook = searchParams.get("notebook");
  const noteReturnTo = decodeReturnTo(searchParams.get("returnTo") || "");

  const { data: areas = [], isLoading: areasLoading } = useAreas();
  const { data: goals = [], isLoading: goalsLoading } = useGoals({ status: "all" });
  const { data: projects = [], isLoading: projectsLoading } = useProjects({ status: "all" });
  const { data: tasks = [], isLoading: tasksLoading } = useTasks();
  const { data: noteTypes = [], isLoading: typesLoading } = useNoteTypes();
  const { data: topics = [], isLoading: topicsLoading } = useTopics();
  const { data: notebookOptions = [] } = useNotebooks();

  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<NoteStatus>(NOTE_STATUS.INBOX);
  const [type, setType] = useState<string>(NOTE_TYPE.NOTE);
  const [notebooks, setNotebooks] = useState<string[]>([]);
  const [areaIds, setAreaIds] = useState<string[]>([]);
  const [goalIds, setGoalIds] = useState<string[]>([]);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [taskIds, setTaskIds] = useState<string[]>([]);
  const [topicId, setTopicId] = useState<string>("");
  const [favorite, setFavorite] = useState(false);
  const [pin, setPin] = useState(false);

  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const url = new URL(window.location.href);

    const newAreaIds: string[] = [];
    const newGoalIds: string[] = [];
    const newProjectIds: string[] = [];

    if (prefilledAreaId) {
      newAreaIds.push(prefilledAreaId);
      url.searchParams.delete("areaId");
    }
    if (prefilledGoalId) {
      newGoalIds.push(prefilledGoalId);
      url.searchParams.delete("goalId");
    }
    if (prefilledAreaIds) {
      newAreaIds.push(...parseMultiValue(prefilledAreaIds));
      url.searchParams.delete("areaIds");
    }
    if (prefilledGoalIds) {
      newGoalIds.push(...parseMultiValue(prefilledGoalIds));
      url.searchParams.delete("goalIds");
    }
    if (prefilledProjectId) {
      newProjectIds.push(prefilledProjectId);
      url.searchParams.delete("projectId");
    }
    if (prefilledTopicId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTopicId(prefilledTopicId);
      url.searchParams.delete("topicId");
    }
    if (prefilledNotebook) {
      setNotebooks([prefilledNotebook]);
      url.searchParams.delete("notebook");
    }

    if (newAreaIds.length > 0) {
      setAreaIds([...newAreaIds]);
    }
    if (newGoalIds.length > 0) {
      setGoalIds([...newGoalIds]);
    }
    if (newProjectIds.length > 0) {
      setProjectIds([...newProjectIds]);
    }

    if (prefilledAreaId || prefilledGoalId || prefilledAreaIds || prefilledGoalIds || prefilledProjectId || prefilledTopicId || prefilledNotebook) {
      window.history.replaceState({}, "", url.toString());
    }
  }, [prefilledAreaId, prefilledGoalId, prefilledAreaIds, prefilledGoalIds, prefilledProjectId, prefilledTopicId, prefilledNotebook]);

  const isLoading = areasLoading || goalsLoading || projectsLoading || tasksLoading || typesLoading || topicsLoading;

  const handleSave = async () => {
    const note = await createNote.mutateAsync({
      name: name.trim() || "Untitled note",
      content: content || null,
      status,
      type,
      notebooks,
      area_ids: areaIds,
      goal_ids: goalIds,
      project_ids: projectIds,
      task_ids: taskIds,
      favorite,
      pin,
      topic_id: topicId || null,
    });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: [NOTES_QUERY_KEY] }),
      queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY] }),
    ]);
    const noteUrl = `/notes/${note.slug ?? note.id}`;
    if (noteReturnTo) {
      router.push(`${noteUrl}?returnTo=${encodeURIComponent(noteReturnTo)}`);
    } else {
      router.push(noteUrl);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
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
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={() => router.push(popReturnToHref(searchParams, "/notes"))}>
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
            topics={topics}
            topicId={topicId}
            onTopicIdChange={(id) => setTopicId(id ?? "")}
            status={status}
            type={type}
            notebooks={notebooks}
            notebookOptions={notebookOptions}
            areaIds={areaIds}
            goalIds={goalIds}
            projectIds={projectIds}
            taskIds={taskIds}
            favorite={favorite}
            pin={pin}
            onStatusChange={setStatus}
            onTypeChange={setType}
            onNotebooksChange={setNotebooks}
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

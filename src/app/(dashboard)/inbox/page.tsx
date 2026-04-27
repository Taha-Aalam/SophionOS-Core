"use client";

import React, { useMemo, useState } from "react";
import {
  CheckSquare,
  Inbox as InboxIcon,
  Link,
  NotebookPen,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/views/empty-state";
import { useAreas } from "@/lib/hooks/use-areas";
import { useInboxNotes, useInboxTasks, useInboxResources } from "@/lib/hooks/use-inbox";
import { useUpdateNote } from "@/lib/hooks/use-notes";
import { useProjects } from "@/lib/hooks/use-projects";
import { useUpdateResource } from "@/lib/hooks/use-resources";
import { useTopics } from "@/lib/hooks/use-topics";
import { useUpdateTask } from "@/lib/hooks/use-tasks";
import type { Note, Resource, Task } from "@/lib/types/domain.types";
import { NOTE_STATUS, RESOURCE_STATUS, TASK_STATUS } from "@/lib/utils/constants";
import { relativeTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils";

const UNSET = "__none__";

// ─── Task processing form ────────────────────────────────────────────────────

interface TaskProcessFormProps {
  task: Task;
  areaOptions: { id: string; name: string }[];
  projectOptions: { id: string; name: string }[];
  onClose: () => void;
}

function TaskProcessForm({ task, areaOptions, projectOptions, onClose }: TaskProcessFormProps) {
  const updateTask = useUpdateTask();
  const [areaId, setAreaId] = useState(task.area_id ?? UNSET);
  const [projectId, setProjectId] = useState(task.project_id ?? UNSET);
  const [priority, setPriority] = useState<string>(task.priority ?? UNSET);
  const [status, setStatus] = useState<string>(TASK_STATUS.TODO);

  const handleSave = () => {
    updateTask.mutate(
      {
        id: task.id,
        input: {
          area_id: areaId === UNSET ? null : areaId,
          project_id: projectId === UNSET ? null : projectId,
          priority: priority === UNSET ? undefined : (priority as Task["priority"]),
          status: status as Task["status"],
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
      <Select value={areaId} onValueChange={(v) => setAreaId(v ?? UNSET)}>
        <SelectTrigger className="h-8 w-[140px] text-xs">
          <SelectValue placeholder="Area" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNSET}>No area</SelectItem>
          {areaOptions.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={projectId} onValueChange={(v) => setProjectId(v ?? UNSET)}>
        <SelectTrigger className="h-8 w-[150px] text-xs">
          <SelectValue placeholder="Project" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNSET}>No project</SelectItem>
          {projectOptions.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={priority} onValueChange={(v) => setPriority(v ?? UNSET)}>
        <SelectTrigger className="h-8 w-[120px] text-xs">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNSET}>No priority</SelectItem>
          <SelectItem value="urgent">Urgent</SelectItem>
          <SelectItem value="high">High</SelectItem>
          <SelectItem value="medium">Medium</SelectItem>
          <SelectItem value="low">Low</SelectItem>
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={(v) => setStatus(v ?? TASK_STATUS.TODO)}>
        <SelectTrigger className="h-8 w-[130px] text-xs">
          <SelectValue placeholder="Move to" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TASK_STATUS.TODO}>To Do</SelectItem>
          <SelectItem value={TASK_STATUS.IN_PROGRESS}>In Progress</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          className="h-8 text-xs"
          onClick={handleSave}
          disabled={updateTask.isPending}
        >
          Process
        </Button>
        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Note processing form ────────────────────────────────────────────────────

interface NoteProcessFormProps {
  note: Note;
  areaOptions: { id: string; name: string }[];
  projectOptions: { id: string; name: string }[];
  onClose: () => void;
}

function NoteProcessForm({ note, areaOptions, projectOptions, onClose }: NoteProcessFormProps) {
  const updateNote = useUpdateNote();
  const [areaId, setAreaId] = useState(note.area_id ?? UNSET);
  const [projectId, setProjectId] = useState(note.project_id ?? UNSET);
  const [status, setStatus] = useState<string>(NOTE_STATUS.TO_REVIEW);

  const handleSave = () => {
    updateNote.mutate(
      {
        id: note.id,
        input: {
          area_id: areaId === UNSET ? null : areaId,
          project_id: projectId === UNSET ? null : projectId,
          status: status as Note["status"],
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
      <Select value={areaId} onValueChange={(v) => setAreaId(v ?? UNSET)}>
        <SelectTrigger className="h-8 w-[140px] text-xs">
          <SelectValue placeholder="Area" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNSET}>No area</SelectItem>
          {areaOptions.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={projectId} onValueChange={(v) => setProjectId(v ?? UNSET)}>
        <SelectTrigger className="h-8 w-[150px] text-xs">
          <SelectValue placeholder="Project" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNSET}>No project</SelectItem>
          {projectOptions.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={(v) => setStatus(v ?? NOTE_STATUS.TO_REVIEW)}>
        <SelectTrigger className="h-8 w-[130px] text-xs">
          <SelectValue placeholder="Move to" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NOTE_STATUS.TO_REVIEW}>To Review</SelectItem>
          <SelectItem value={NOTE_STATUS.ACTIVE}>Active</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          className="h-8 text-xs"
          onClick={handleSave}
          disabled={updateNote.isPending}
        >
          Process
        </Button>
        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Inbox item row ──────────────────────────────────────────────────────────

interface InboxTaskRowProps {
  task: Task;
  areaName?: string;
  areaOptions: { id: string; name: string }[];
  projectOptions: { id: string; name: string }[];
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}

function InboxTaskRow({
  task,
  areaName,
  areaOptions,
  projectOptions,
  expanded,
  onExpand,
  onCollapse,
}: InboxTaskRowProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-card p-3 transition-colors",
        expanded && "border-primary/40 bg-accent/20",
      )}
    >
      <div className="flex items-center gap-3">
        <Badge
          variant="secondary"
          className="shrink-0 gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
        >
          <CheckSquare className="size-3" />
          task
        </Badge>

        <span className="min-w-0 flex-1 truncate text-sm font-medium">{task.name}</span>

        <div className="flex shrink-0 items-center gap-2">
          {areaName && (
            <span className="hidden text-xs text-muted-foreground sm:block">{areaName}</span>
          )}
          <span className="text-xs text-muted-foreground">{relativeTime(task.created_at)}</span>
          {expanded ? (
            <button
              onClick={onCollapse}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Cancel"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onExpand}>
              Process
            </Button>
          )}
        </div>
      </div>

      {expanded && (
        <TaskProcessForm
          task={task}
          areaOptions={areaOptions}
          projectOptions={projectOptions}
          onClose={onCollapse}
        />
      )}
    </div>
  );
}

interface InboxNoteRowProps {
  note: Note;
  areaName?: string;
  areaOptions: { id: string; name: string }[];
  projectOptions: { id: string; name: string }[];
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}

function InboxNoteRow({
  note,
  areaName,
  areaOptions,
  projectOptions,
  expanded,
  onExpand,
  onCollapse,
}: InboxNoteRowProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-card p-3 transition-colors",
        expanded && "border-primary/40 bg-accent/20",
      )}
    >
      <div className="flex items-center gap-3">
        <Badge
          variant="secondary"
          className="shrink-0 gap-1 bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300"
        >
          <NotebookPen className="size-3" />
          note
        </Badge>

        <span className="min-w-0 flex-1 truncate text-sm font-medium">{note.name}</span>

        <div className="flex shrink-0 items-center gap-2">
          {areaName && (
            <span className="hidden text-xs text-muted-foreground sm:block">{areaName}</span>
          )}
          <span className="text-xs text-muted-foreground">{relativeTime(note.created_at)}</span>
          {expanded ? (
            <button
              onClick={onCollapse}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Cancel"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onExpand}>
              Process
            </Button>
          )}
        </div>
      </div>

      {expanded && (
        <NoteProcessForm
          note={note}
          areaOptions={areaOptions}
          projectOptions={projectOptions}
          onClose={onCollapse}
        />
      )}
    </div>
  );
}

// ─── Resource processing form ────────────────────────────────────────────────

interface ResourceProcessFormProps {
  resource: Resource;
  areaOptions: { id: string; name: string }[];
  projectOptions: { id: string; name: string }[];
  topicOptions: { id: string; name: string }[];
  onClose: () => void;
}

function ResourceProcessForm({
  resource,
  areaOptions,
  projectOptions,
  topicOptions,
  onClose,
}: ResourceProcessFormProps) {
  const updateResource = useUpdateResource();
  const [areaId, setAreaId] = useState(resource.area_id ?? UNSET);
  const [projectId, setProjectId] = useState(resource.project_id ?? UNSET);
  const [topicId, setTopicId] = useState(resource.topic_id ?? UNSET);
  const [status, setStatus] = useState<string>(RESOURCE_STATUS.ACTIVE);

  const handleSave = () => {
    updateResource.mutate(
      {
        id: resource.id,
        input: {
          area_id: areaId === UNSET ? null : areaId,
          project_id: projectId === UNSET ? null : projectId,
          topic_id: topicId === UNSET ? null : topicId,
          status: status as Resource["status"],
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
      <Select value={areaId} onValueChange={(v) => setAreaId(v ?? UNSET)}>
        <SelectTrigger className="h-8 w-[140px] text-xs">
          <SelectValue placeholder="Area" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNSET}>No area</SelectItem>
          {areaOptions.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={projectId} onValueChange={(v) => setProjectId(v ?? UNSET)}>
        <SelectTrigger className="h-8 w-[150px] text-xs">
          <SelectValue placeholder="Project" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNSET}>No project</SelectItem>
          {projectOptions.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={topicId} onValueChange={(v) => setTopicId(v ?? UNSET)}>
        <SelectTrigger className="h-8 w-[140px] text-xs">
          <SelectValue placeholder="Topic" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNSET}>No topic</SelectItem>
          {topicOptions.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={status} onValueChange={(v) => setStatus(v ?? RESOURCE_STATUS.ACTIVE)}>
        <SelectTrigger className="h-8 w-[130px] text-xs">
          <SelectValue placeholder="Move to" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={RESOURCE_STATUS.TO_REVIEW}>To Review</SelectItem>
          <SelectItem value={RESOURCE_STATUS.ACTIVE}>Active</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          className="h-8 text-xs"
          onClick={handleSave}
          disabled={updateResource.isPending}
        >
          Process
        </Button>
        <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ─── Inbox resource row ──────────────────────────────────────────────────────

interface InboxResourceRowProps {
  resource: Resource;
  areaName?: string;
  areaOptions: { id: string; name: string }[];
  projectOptions: { id: string; name: string }[];
  topicOptions: { id: string; name: string }[];
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
}

function InboxResourceRow({
  resource,
  areaName,
  areaOptions,
  projectOptions,
  topicOptions,
  expanded,
  onExpand,
  onCollapse,
}: InboxResourceRowProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-card p-3 transition-colors",
        expanded && "border-primary/40 bg-accent/20",
      )}
    >
      <div className="flex items-center gap-3">
        <Badge
          variant="secondary"
          className="shrink-0 gap-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
        >
          <Link className="size-3" />
          resource
        </Badge>

        <span className="min-w-0 flex-1 truncate text-sm font-medium">{resource.name}</span>

        <div className="flex shrink-0 items-center gap-2">
          {areaName && (
            <span className="hidden text-xs text-muted-foreground sm:block">{areaName}</span>
          )}
          <span className="text-xs text-muted-foreground">{relativeTime(resource.created_at)}</span>
          {expanded ? (
            <button
              onClick={onCollapse}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              aria-label="Cancel"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onExpand}>
              Process
            </Button>
          )}
        </div>
      </div>

      {expanded && (
        <ResourceProcessForm
          resource={resource}
          areaOptions={areaOptions}
          projectOptions={projectOptions}
          topicOptions={topicOptions}
          onClose={onCollapse}
        />
      )}
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function InboxItemSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
      <Skeleton className="h-5 w-10 rounded-full" />
      <Skeleton className="h-4 flex-1" />
      <Skeleton className="h-7 w-20" />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function InboxPage() {
  const { data: inboxTasks, isLoading: tasksLoading } = useInboxTasks();
  const { data: inboxNotes = [], isLoading: notesLoading } = useInboxNotes();
  const { data: inboxResources = [], isLoading: resourcesLoading } = useInboxResources();
  const { data: allAreas } = useAreas();
  const { data: allProjects } = useProjects({ status: "all" });
  const { data: allTopics } = useTopics();

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isLoading = tasksLoading || notesLoading || resourcesLoading;
  const totalCount = inboxTasks.length + inboxNotes.length + inboxResources.length;

  const areaOptions = useMemo(
    () =>
      (allAreas ?? [])
        .filter((a) => !a.archive)
        .map((a) => ({ id: a.id, name: [a.icon, a.name].filter(Boolean).join(" ") })),
    [allAreas],
  );

  const projectOptions = useMemo(
    () =>
      (allProjects ?? [])
        .filter((p) => !p.is_archived)
        .map((p) => ({ id: p.id, name: p.name })),
    [allProjects],
  );

  const topicOptions = useMemo(
    () =>
      (allTopics ?? [])
        .filter((t) => !t.inactive)
        .map((t) => ({ id: t.id, name: t.name })),
    [allTopics],
  );

  const areaMap = useMemo(
    () => new Map((allAreas ?? []).map((a) => [a.id, a.name])),
    [allAreas],
  );

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-0">
      <div className="border-b border-border/50 px-6 py-5">
        <div className="flex items-center gap-3">
          <InboxIcon className="size-6 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Inbox</h1>
            <p className="text-sm text-muted-foreground">
              {isLoading
                ? "Loading…"
                : totalCount === 0
                  ? "Inbox zero — everything processed"
                  : `${totalCount} item${totalCount !== 1 ? "s" : ""} to process`}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6 px-6 py-6">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <InboxItemSkeleton key={i} />
            ))}
          </div>
        ) : totalCount === 0 ? (
          <EmptyState
            icon={InboxIcon}
            title="Inbox zero"
            description="All items have been processed. Great work — capture new tasks and notes to continue."
          />
        ) : (
          <>
            {inboxTasks.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <CheckSquare className="size-3.5" />
                  Tasks
                  <span className="ml-0.5 font-normal normal-case">({inboxTasks.length})</span>
                </h2>
                <div className="flex flex-col gap-2">
                  {inboxTasks.map((task) => (
                    <InboxTaskRow
                      key={task.id}
                      task={task}
                      areaName={task.area_id ? areaMap.get(task.area_id) : undefined}
                      areaOptions={areaOptions}
                      projectOptions={projectOptions}
                      expanded={expandedId === task.id}
                      onExpand={() => setExpandedId(task.id)}
                      onCollapse={() => setExpandedId(null)}
                    />
                  ))}
                </div>
              </section>
            )}

            {inboxNotes.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <NotebookPen className="size-3.5" />
                  Notes
                  <span className="ml-0.5 font-normal normal-case">({inboxNotes.length})</span>
                </h2>
                <div className="flex flex-col gap-2">
                  {inboxNotes.map((note) => (
                    <InboxNoteRow
                      key={note.id}
                      note={note}
                      areaName={note.area_id ? areaMap.get(note.area_id) : undefined}
                      areaOptions={areaOptions}
                      projectOptions={projectOptions}
                      expanded={expandedId === note.id}
                      onExpand={() => setExpandedId(note.id)}
                      onCollapse={() => setExpandedId(null)}
                    />
                  ))}
                </div>
              </section>
            )}

            {inboxResources.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Link className="size-3.5" />
                  Resources
                  <span className="ml-0.5 font-normal normal-case">({inboxResources.length})</span>
                </h2>
                <div className="flex flex-col gap-2">
                  {inboxResources.map((resource) => (
                    <InboxResourceRow
                      key={resource.id}
                      resource={resource}
                      areaName={resource.area_id ? areaMap.get(resource.area_id) : undefined}
                      areaOptions={areaOptions}
                      projectOptions={projectOptions}
                      topicOptions={topicOptions}
                      expanded={expandedId === resource.id}
                      onExpand={() => setExpandedId(resource.id)}
                      onCollapse={() => setExpandedId(null)}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

import type { Note } from "@/lib/types/domain.types";

export const NOTE_VIEW = {
  ALL: "all",
  INBOX: "inbox",
  TO_REVIEW: "to_review",
  ACTIVE: "active",
  PINNED: "pinned",
  FAVORITE: "favorite",
  BY_AREA: "by_area",
  BY_GOAL: "by_goal",
  BY_PROJECT: "by_project",
  BY_TOPIC: "by_topic",
  BY_NOTEBOOK: "by_notebook",
  SAVED: "saved",
  ARCHIVED: "archived",
} as const;

export type NoteView = (typeof NOTE_VIEW)[keyof typeof NOTE_VIEW];

export function getNoteLinkedAreaIds(note: Note): string[] {
  if (note.linkedAreaIds && note.linkedAreaIds.length > 0) {
    return note.linkedAreaIds;
  }
  return note.area_id ? [note.area_id] : [];
}

export function noteMatchesAreaId(note: Note, areaId: string): boolean {
  return getNoteLinkedAreaIds(note).includes(areaId);
}

export function getNoteLinkedGoalIds(note: Note): string[] {
  if (note.linkedGoalIds && note.linkedGoalIds.length > 0) {
    return note.linkedGoalIds;
  }

  const noteRecord = note as Note & Record<string, unknown>;
  const directGoalIds = Array.isArray(noteRecord.goal_ids)
    ? noteRecord.goal_ids.filter((goalId): goalId is string => typeof goalId === "string")
    : [];

  if (directGoalIds.length > 0) {
    return directGoalIds;
  }

  const metadata = note.metadata;
  if (!metadata || Array.isArray(metadata) || typeof metadata !== "object") {
    return [];
  }

  const metadataGoalIds = ["goal_ids", "goalIds"]
    .flatMap((key) => {
      const value = key in metadata ? metadata[key as keyof typeof metadata] : undefined;
      return Array.isArray(value)
        ? value.filter((goalId): goalId is string => typeof goalId === "string")
        : [];
    });

  return Array.from(new Set(metadataGoalIds));
}

export function noteMatchesGoalId(note: Note, goalId: string): boolean {
  return getNoteLinkedGoalIds(note).includes(goalId);
}

export function getNoteLinkedProjectIds(note: Note): string[] {
  if (note.linkedProjectIds && note.linkedProjectIds.length > 0) {
    return note.linkedProjectIds;
  }

  return note.project_id ? [note.project_id] : [];
}

export function noteMatchesProjectId(note: Note, projectId: string): boolean {
  return getNoteLinkedProjectIds(note).includes(projectId);
}

export function getNoteLinkedTaskIds(note: Note): string[] {
  return note.linkedTaskIds ?? [];
}

export function noteMatchesTaskId(note: Note, taskId: string): boolean {
  return getNoteLinkedTaskIds(note).includes(taskId);
}

export interface NoteCounts {
  all: number;
  inbox: number;
  to_review: number;
  active: number;
  saved: number;
  pinned: number;
  favorite: number;
  by_area: number;
  by_goal: number;
  by_project: number;
  by_topic: number;
  by_notebook: number;
  archived: number;
}

export function getNoteCounts(notes: Note[]): NoteCounts {
  return {
    all: notes.filter((n) => !n.is_archived).length,
    inbox: notes.filter((n) => n.status === "inbox" && !n.is_archived).length,
    to_review: notes.filter((n) => n.status === "to_review" && !n.is_archived).length,
    active: notes.filter((n) => n.status === "active" && !n.is_archived).length,
    saved: notes.filter((n) => n.status === "saved" && !n.is_archived).length,
    pinned: notes.filter((n) => n.pin && !n.is_archived).length,
    favorite: notes.filter((n) => n.favorite && !n.is_archived).length,
    by_area: notes.filter((n) => getNoteLinkedAreaIds(n).length > 0 && !n.is_archived).length,
    by_goal: notes.filter((n) => getNoteLinkedGoalIds(n).length > 0 && !n.is_archived).length,
    by_project: notes.filter((n) => getNoteLinkedProjectIds(n).length > 0 && !n.is_archived).length,
    by_topic: notes.filter((n) => !!n.topic_id && !n.is_archived).length,
    by_notebook: notes.filter((n) => !!n.notebook && !n.is_archived).length,
    archived: notes.filter((n) => n.is_archived).length,
  };
}

export function getVisibleNotes(notes: Note[], view: NoteView): Note[] {
  switch (view) {
    case NOTE_VIEW.INBOX:
      return notes.filter((n) => n.status === "inbox" && !n.is_archived);
    case NOTE_VIEW.TO_REVIEW:
      return notes.filter((n) => n.status === "to_review" && !n.is_archived);
    case NOTE_VIEW.ACTIVE:
      return notes.filter((n) => n.status === "active" && !n.is_archived);
    case NOTE_VIEW.SAVED:
      return notes.filter((n) => n.status === "saved" && !n.is_archived);
    case NOTE_VIEW.PINNED:
      return notes.filter((n) => n.pin && !n.is_archived);
    case NOTE_VIEW.FAVORITE:
      return notes.filter((n) => n.favorite && !n.is_archived);
    case NOTE_VIEW.BY_AREA:
    case NOTE_VIEW.BY_GOAL:
    case NOTE_VIEW.BY_PROJECT:
    case NOTE_VIEW.BY_TOPIC:
    case NOTE_VIEW.BY_NOTEBOOK:
      return [];
    case NOTE_VIEW.ARCHIVED:
      return notes.filter((n) => n.is_archived);
    case NOTE_VIEW.ALL:
    default:
      return notes.filter((n) => !n.is_archived);
  }
}

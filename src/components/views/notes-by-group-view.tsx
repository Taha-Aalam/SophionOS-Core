"use client";

import React, { useState } from "react";
import { ChevronDownIcon, ChevronRightIcon, NotebookPen, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/views/empty-state";
import type { Note } from "@/lib/types/domain.types";

export interface NoteGroup {
  groupId: string;
  groupName: string;
  notes: Note[];
}

interface NotesByGroupViewProps {
  groups: NoteGroup[];
  renderNote: (note: Note) => React.ReactNode;
  onNewNote?: (groupId: string) => void;
  emptyMessage?: string;
}

function CollapsibleNoteGroup({
  group,
  renderNote,
  onNewNote,
  defaultOpen = true,
}: {
  group: NoteGroup;
  renderNote: (note: Note) => React.ReactNode;
  onNewNote?: (groupId: string) => void;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-6">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className="flex w-full cursor-pointer items-center gap-2 px-1 py-2"
      >
        <span className="text-muted-foreground">
          {isOpen ? (
            <ChevronDownIcon className="size-4" />
          ) : (
            <ChevronRightIcon className="size-4" />
          )}
        </span>
        <Badge variant="outline" className="text-xs font-medium">
          {group.groupName}
        </Badge>
        <span className="text-sm text-muted-foreground">
          {group.notes.length} {group.notes.length === 1 ? "note" : "notes"}
        </span>
      </div>

      {isOpen && (
        <div className="rounded-lg border divide-y">
          {group.notes.map((note) => (
            <React.Fragment key={note.id}>{renderNote(note)}</React.Fragment>
          ))}
          {onNewNote && group.groupId !== "unassigned" && (
            <button
              onClick={(e) => { e.stopPropagation(); onNewNote(group.groupId); }}
              className="flex w-full items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <Plus className="size-4" />
              New note
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function NotesByGroupView({
  groups,
  renderNote,
  onNewNote,
  emptyMessage = "No notes in this view.",
}: NotesByGroupViewProps) {
  if (groups.length === 0 || groups.every((g) => g.notes.length === 0)) {
    return (
      <EmptyState
        icon={NotebookPen}
        title="No notes here"
        description={emptyMessage}
      />
    );
  }

  const sorted = [
    ...groups.filter((g) => g.groupId !== "unassigned"),
    ...groups.filter((g) => g.groupId === "unassigned"),
  ];

  return (
    <div className="px-6 py-4">
      {sorted.map((group) => (
        <CollapsibleNoteGroup
          key={group.groupId}
          group={group}
          renderNote={renderNote}
          onNewNote={onNewNote}
          defaultOpen={group.groupId !== "unassigned"}
        />
      ))}
    </div>
  );
}

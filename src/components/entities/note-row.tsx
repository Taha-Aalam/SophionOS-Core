"use client";

import {
  Archive,
  ArchiveRestore,
  Map as LucideMap,
  Pin,
  Star,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { encodeReturnTo } from "@/lib/utils/return-to";
import type { Note } from "@/lib/types/domain.types";

export interface NoteRowAreaInfo {
  name: string;
  icon?: string | null;
}

interface NoteRowProps {
  note: Note;
  returnTo?: string;
  areas?: NoteRowAreaInfo[];
  goalNames?: string[];
  projectNames?: string[];
  taskNames?: string[];
  onPinToggle: (id: string, pin: boolean) => void;
  onFavoriteToggle: (id: string, favorite: boolean) => void;
  onArchive?: (id: string) => void;
  onRestore?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  inbox: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  to_review: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  active: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  saved: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  archive: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

export function NoteRow({
  note,
  returnTo,
  areas = [],
  goalNames = [],
  projectNames = [],
  taskNames = [],
  onPinToggle,
  onFavoriteToggle,
  onArchive,
  onRestore,
  onDelete,
}: NoteRowProps) {
  const router = useRouter();

  const href = returnTo
    ? `/notes/${note.slug ?? note.id}?returnTo=${encodeReturnTo(returnTo)}`
    : `/notes/${note.slug ?? note.id}`;

  return (
    <div
      className="group flex cursor-pointer items-center gap-3 border-b border-border/40 px-4 py-2.5 transition-colors hover:bg-muted/30"
      onClick={() => router.push(href)}
    >
      {/* Pin */}
      <div onClick={(e) => e.stopPropagation()} className="shrink-0">
        <button
          type="button"
          onClick={() => onPinToggle(note.id, !note.pin)}
          className={cn(
            "rounded p-1 transition-colors",
            note.pin
              ? "text-primary"
              : "text-muted-foreground opacity-0 hover:text-primary group-hover:opacity-100",
          )}
          title={note.pin ? "Unpin" : "Pin"}
        >
          <Pin className={cn("size-3.5", note.pin && "fill-current")} />
        </button>
      </div>

      {/* Status + Type — left of name */}
      <div className="hidden shrink-0 items-center gap-1 md:flex">
        <Badge
          variant="outline"
          className={cn("text-[10px] uppercase", STATUS_COLORS[note.status])}
        >
          {note.status.replace("_", " ")}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {note.type}
        </Badge>
      </div>

      {/* Name */}
      <div className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{note.name}</span>
      </div>

      {/* Metadata cluster */}
      <div className="hidden shrink-0 flex-wrap items-center gap-1.5 md:flex">
        {(note.notebooks ?? []).map((nb) => (
          <Badge key={nb} variant="outline" className="gap-1 text-xs font-normal">
            <span className="text-xs leading-none">📓</span>
            {nb}
          </Badge>
        ))}
        {areas.map((area, i) => (
          <Badge key={i} variant="outline" className="gap-1 text-xs font-normal">
            {area.icon ? (
              <span className="text-xs leading-none">{area.icon}</span>
            ) : (
              <LucideMap className="size-3" />
            )}
            {area.name}
          </Badge>
        ))}
        {goalNames.map((name) => (
          <Badge key={name} variant="outline" className="gap-1 text-xs font-normal">
            <span className="text-xs leading-none">🎯</span>
            {name}
          </Badge>
        ))}
        {projectNames.map((name) => (
          <Badge key={name} variant="outline" className="gap-1 text-xs font-normal">
            <span className="text-xs leading-none">📁</span>
            {name}
          </Badge>
        ))}
        {taskNames.map((name) => (
          <Badge key={name} variant="outline" className="gap-1 text-xs font-normal">
            <span className="text-xs leading-none">☑️</span>
            {name}
          </Badge>
        ))}
        <span className="text-xs text-muted-foreground">
          {new Date(note.updated_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>

      {/* Favorite */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onFavoriteToggle(note.id, !note.favorite);
        }}
        className={cn(
          "shrink-0 rounded-md p-1.5 transition-colors",
          note.favorite
            ? "text-amber-500"
            : "text-muted-foreground/20 opacity-0 hover:text-amber-400 group-hover:opacity-100",
        )}
        title={note.favorite ? "Unfavorite" : "Favorite"}
      >
        <Star className={cn("size-4", note.favorite && "fill-current")} />
      </button>

      {/* Archive / Restore + Delete */}
      {(onArchive || onRestore || onDelete) && (
        <div
          className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => e.stopPropagation()}
        >
          {(onArchive || onRestore) && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (note.is_archived) onRestore?.(note.id);
                else onArchive?.(note.id);
              }}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-red-500"
              title={note.is_archived ? "Restore" : "Archive"}
            >
              {note.is_archived ? (
                <ArchiveRestore className="size-3.5" />
              ) : (
                <Archive className="size-3.5" />
              )}
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(note.id);
              }}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-red-500"
              title="Delete"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { Archive, ArchiveRestore, Map as LucideMap, Pin, Star } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { Note } from "@/lib/types/domain.types";
import { cn } from "@/lib/utils";
import { encodeReturnTo } from "@/lib/utils/return-to";
import { STATUS_COLORS } from "@/lib/constants/entity-colors";

import { DeleteEntityPopover } from "./delete-entity-popover";

export interface NoteRowAreaInfo {
  name: string;
  icon?: string | null;
}

interface NoteRowProps {
  note: Note;
  returnTo?: string;
  returnToChain?: string;
  areas?: NoteRowAreaInfo[];
  goalNames?: string[];
  projectNames?: string[];
  taskNames?: string[];
  isSelected?: boolean;
  onPinToggle: (id: string, pin: boolean) => void;
  onFavoriteToggle: (id: string, favorite: boolean) => void;
  onSaveStatusChange?: (id: string, saved: boolean) => void;
  onArchive?: (id: string) => void;
  onRestore?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function NoteRow({
  note,
  returnTo,
  returnToChain,
  areas = [],
  goalNames = [],
  projectNames = [],
  taskNames = [],
  isSelected,
  onPinToggle,
  onFavoriteToggle,
  onSaveStatusChange,
  onArchive,
  onRestore,
  onDelete,
}: NoteRowProps) {
  const router = useRouter();

  const href = returnTo
    ? `/notes/${note.slug ?? note.id}?returnTo=${encodeReturnTo(returnTo)}${
        returnToChain ? `&chain=${returnToChain}` : ""
      }`
    : `/notes/${note.slug ?? note.id}`;

  return (
    <div
      className={cn(
        "group flex cursor-pointer items-center gap-3 border-b border-border/40 px-4 py-2.5 transition-colors hover:bg-muted/30",
        isSelected && "bg-muted/50",
      )}
      onClick={() => router.push(href)}
    >
      {/* Save checkbox */}
      {onSaveStatusChange && (
        <span onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={note.status === "completed"}
            onCheckedChange={(checked) => onSaveStatusChange(note.id, checked === true)}
            className="shrink-0"
          />
        </span>
      )}

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
          {note.status === "completed" ? "Done" : note.status.replace("_", " ")}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          {note.type}
        </Badge>
      </div>

      {/* Name + metadata */}
      <div className="min-w-0 flex-1 flex flex-col gap-0.5">
        <span className="block truncate text-sm font-medium">{note.name}</span>

        {/* Metadata cluster — max 2 per category, +N overflow per category, smaller */}
        <div className="hidden flex-wrap items-center gap-1 md:flex">
        {(note.notebooks ?? []).map((nb) => (
          <Badge key={nb} variant="outline" className="gap-1 text-[10px] leading-none font-normal">
            <span className="text-[10px] leading-none">📓</span>
            {nb}
          </Badge>
        ))}
        {areas.slice(0, 2).map((area, i) => (
          <Badge key={i} variant="outline" className="gap-1 text-[10px] leading-none font-normal">
            {area.icon ? (
              <span className="text-[10px] leading-none">{area.icon}</span>
            ) : (
              <LucideMap className="size-2.5" />
            )}
            {area.name}
          </Badge>
        ))}
        {areas.length > 2 && (
          <Badge variant="secondary" className="text-[10px] leading-none font-normal">
            +{areas.length - 2}
          </Badge>
        )}
        {goalNames.slice(0, 2).map((name) => (
          <Badge key={name} variant="outline" className="gap-1 text-[10px] leading-none font-normal">
            <span className="text-[10px] leading-none">🎯</span>
            {name}
          </Badge>
        ))}
        {goalNames.length > 2 && (
          <Badge variant="secondary" className="text-[10px] leading-none font-normal">
            +{goalNames.length - 2}
          </Badge>
        )}
        {projectNames.slice(0, 2).map((name) => (
          <Badge key={name} variant="outline" className="gap-1 text-[10px] leading-none font-normal">
            <span className="text-[10px] leading-none">📁</span>
            {name}
          </Badge>
        ))}
        {projectNames.length > 2 && (
          <Badge variant="secondary" className="text-[10px] leading-none font-normal">
            +{projectNames.length - 2}
          </Badge>
        )}
        {taskNames.slice(0, 2).map((name) => (
          <Badge key={name} variant="outline" className="gap-1 text-[10px] leading-none font-normal">
            <span className="text-[10px] leading-none">☑️</span>
            {name}
          </Badge>
        ))}
        {taskNames.length > 2 && (
          <Badge variant="secondary" className="text-[10px] leading-none font-normal">
            +{taskNames.length - 2}
          </Badge>
        )}
        <span className="text-[10px] leading-none text-muted-foreground">
          {new Date(note.updated_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
        </div>
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
        <Star className={cn("size-3.5", note.favorite && "fill-current")} />
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
            <DeleteEntityPopover
              variant="row"
              entityLabel="note"
              entityName={note.name}
              requireTypedConfirmation={false}
              onConfirm={() => onDelete(note.id)}
            />
          )}
        </div>
      )}
    </div>
  );
}

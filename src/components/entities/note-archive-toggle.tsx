"use client";

import type { ComponentPropsWithoutRef } from "react";
import { Archive, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  NOTES_ROW_ACTION_BUTTON_CLASS_NAME,
  getNoteArchiveActionCopy,
} from "@/lib/utils/note-page-display";

interface NoteArchiveToggleProps
  extends Omit<ComponentPropsWithoutRef<typeof Button>, "children"> {
  isArchived: boolean;
  mode: "row" | "detail";
}

export function NoteArchiveToggle({
  isArchived,
  mode,
  className,
  ...buttonProps
}: NoteArchiveToggleProps) {
  const label = getNoteArchiveActionCopy(isArchived);
  const Icon = isArchived ? RotateCcw : Archive;

  if (mode === "row") {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        {...buttonProps}
        className={cn(
          "h-7 gap-1 px-2 text-xs",
          NOTES_ROW_ACTION_BUTTON_CLASS_NAME,
          className,
        )}
        title={label}
      >
        <Icon className="size-3.5" />
        <span>{label}</span>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      {...buttonProps}
      className={cn("gap-1.5", className)}
      title={label}
    >
      <Icon className="size-4" />
      <span>{label}</span>
    </Button>
  );
}

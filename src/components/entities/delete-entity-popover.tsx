"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { Trash2 } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

/** Lowercase singular label used for titles and button copy, e.g. "task", "area". */
export type DeleteEntityLabel =
  | "task"
  | "area"
  | "goal"
  | "project"
  | "note"
  | "resource"
  | "contact"
  | "topic";

interface DeleteEntityPopoverProps {
  /** "row" = anchored to a small trash icon in a list (high misclick risk). "detail" = a labelled button inside a page or dialog. */
  variant?: "row" | "detail";
  /** Singular lowercase entity label. Drives all copy. */
  entityLabel: DeleteEntityLabel;
  /** Display name of the record being deleted. Used both as the confirmation prompt and as the typed-confirmation gate. */
  entityName: string;
  /** When true (default for row variant), the user must type the entity name to enable the destructive action. */
  requireTypedConfirmation?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
}

const LABELS: Record<
  DeleteEntityLabel,
  { title: string; verb: string; rowAria: string; detailLabel: string }
> = {
  task: {
    title: "Delete this task?",
    verb: "Delete",
    rowAria: "Delete task permanently",
    detailLabel: "Delete permanently",
  },
  area: {
    title: "Delete this area?",
    verb: "Delete",
    rowAria: "Delete area permanently",
    detailLabel: "Delete",
  },
  goal: {
    title: "Delete this goal?",
    verb: "Delete",
    rowAria: "Delete goal permanently",
    detailLabel: "Delete",
  },
  project: {
    title: "Delete this project?",
    verb: "Delete",
    rowAria: "Delete project permanently",
    detailLabel: "Delete",
  },
  note: {
    title: "Delete this note?",
    verb: "Delete",
    rowAria: "Delete note permanently",
    detailLabel: "Delete",
  },
  resource: {
    title: "Delete this resource?",
    verb: "Delete",
    rowAria: "Delete resource permanently",
    detailLabel: "Delete resource permanently",
  },
  contact: {
    title: "Delete this contact?",
    verb: "Delete",
    rowAria: "Delete contact permanently",
    detailLabel: "Delete contact permanently",
  },
  topic: {
    title: "Delete this topic?",
    verb: "Delete",
    rowAria: "Delete topic permanently",
    detailLabel: "Delete",
  },
};

/**
 * Anchored confirmation popover for permanent entity deletion.
 * Layout follows the ReUI base-popover reference: compact card, ring border, rounded-lg,
 * title + muted description in a header slot, body content below with primary action bottom-right.
 *
 * Replaces the native `window.confirm` dialog and ad-hoc shadcn Dialog confirmations with an
 * in-app popover that
 *   - does not block the React tree,
 *   - matches the surrounding UI language (rounded-lg, ring-foreground/10, shadow-md),
 *   - and adds typed confirmation friction for the "row" trash icon variant where
 *     a misclick on a 14px icon would otherwise wipe data.
 */
export function DeleteEntityPopover({
  variant = "row",
  entityLabel,
  entityName,
  requireTypedConfirmation,
  disabled = false,
  onConfirm,
}: DeleteEntityPopoverProps) {
  const [open, setOpen] = React.useState(false);
  const [confirmation, setConfirmation] = React.useState("");

  // Reset the typed field on every open transition so a stale value
  // from a previous open cannot auto-arm the destructive button.
  const handleOpenChange = React.useCallback((next: boolean) => {
    if (next) setConfirmation("");
    setOpen(next);
  }, []);

  const copy = LABELS[entityLabel];
  const requiresText = requireTypedConfirmation ?? variant === "row";
  const canConfirm = !disabled && (!requiresText || confirmation.trim() === entityName);

  const handleConfirm = () => {
    if (!canConfirm) return;
    setOpen(false);
    onConfirm();
  };

  const trigger =
    variant === "row" ? (
      <button
        type="button"
        aria-label={copy.rowAria}
        disabled={disabled}
        className="rounded-md p-1.5 text-destructive/70 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
      >
        <Trash2 className="size-3.5" />
      </button>
    ) : (
      <Button
        type="button"
        variant="outline"
        size="default"
        disabled={disabled}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="size-4" />
        {copy.detailLabel}
      </Button>
    );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger render={trigger} />

      <PopoverContent
        align="end"
        side={variant === "row" ? "left" : "top"}
        sideOffset={8}
        className="w-80 p-0"
      >
        <PopoverHeader className="gap-1 border-b border-border/60 px-4 py-3">
          <PopoverTitle className="font-heading text-sm font-semibold text-foreground">
            {copy.title}
          </PopoverTitle>
          <PopoverDescription className="text-xs text-muted-foreground">
            <span className="line-clamp-2">“{entityName}”</span> will be removed permanently. This
            cannot be undone.
          </PopoverDescription>
        </PopoverHeader>

        <div className="flex flex-col gap-3 px-4 py-3">
          {requiresText && (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="delete-entity-confirm"
                className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
              >
                Type the {entityLabel} name to confirm
              </label>
              <Input
                id="delete-entity-confirm"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder={entityName}
                autoComplete="off"
                spellCheck={false}
                disabled={disabled}
                className="h-8 text-xs"
              />
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <PopoverPrimitive.Close
              render={
                <Button type="button" variant="ghost" size="sm">
                  Cancel
                </Button>
              }
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={!canConfirm}
              onClick={handleConfirm}
            >
              <Trash2 className="size-3.5" />
              {copy.verb}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

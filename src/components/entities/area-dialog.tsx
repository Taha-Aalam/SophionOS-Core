"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm, useWatch, type Resolver, type SubmitHandler } from "react-hook-form";
import { Check, ChevronDownIcon, Plus } from "lucide-react";
import { z } from "zod/v4";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createAreaSchema } from "@/lib/validators/area.schema";
import { Area, CreateAreaInput } from "@/lib/types/domain.types";
import { cn } from "@/lib/utils";
import { normalizeAreaType } from "@/lib/utils/areas";
import { EmojiPickerPopover } from "@/components/ui/emoji-picker-popover";

interface AreaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  area?: Area;
  defaultType?: string;
  suggestedTypes?: string[];
  onSubmit: (data: CreateAreaInput) => Promise<void>;
  isLoading?: boolean;
}

const AREA_COLORS = [
  "#EF4444", "#F97316", "#F59E0B", "#84CC16", "#22C55E",
  "#14B8A6", "#06B6D4", "#3B82F6", "#8B5CF6", "#EC4899",
];
const DEFAULT_SUGGESTED_TYPES = ["Business", "Personal", "Studies"];
type AreaFormValues = z.input<typeof createAreaSchema>;
const areaResolver: Resolver<AreaFormValues> = async (values) => {
  const result = createAreaSchema.safeParse(values);

  if (result.success) {
    return {
      values: result.data,
      errors: {},
    };
  }

  const errors: Record<string, { type: string; message: string }> = {};

  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field === "string" && !errors[field]) {
      errors[field] = {
        type: issue.code,
        message: issue.message,
      };
    }
  }

  return {
    values: {},
    errors,
  };
};

export function AreaDialog({
  open,
  onOpenChange,
  area,
  defaultType,
  suggestedTypes = DEFAULT_SUGGESTED_TYPES,
  onSubmit,
  isLoading,
}: AreaDialogProps) {
  const normalizedDefaultType = normalizeAreaType(area?.type ?? defaultType);

  const form = useForm<AreaFormValues>({
    resolver: areaResolver,
    defaultValues: {
      name: area?.name || "",
      description: area?.description || "",
      icon: area?.icon || undefined,
      color: area?.color || undefined,
      type: normalizedDefaultType,
    },
  });

  const { register, handleSubmit, setValue, reset, control, formState: { errors } } = form;

  /**
   * Tracks the last reset key (area.id or "create") so the reset effect
   * only fires when the dialog opens or the entity being edited changes.
   * Without this guard, an unstable parent prop (e.g. `defaultAreaIds`
   * passed as an inline `[area.id]` array literal) would re-trigger the
   * effect on every render and wipe the user's in-progress selections.
   */
  const lastResetKeyRef = useRef<string>("");

  useEffect(() => {
    if (!open) {
      lastResetKeyRef.current = "";
      return;
    }

    const resetKey = area?.id ?? "create";
    if (lastResetKeyRef.current === resetKey) {
      return;
    }
    lastResetKeyRef.current = resetKey;

    reset({
      name: area?.name || "",
      description: area?.description || "",
      icon: area?.icon || undefined,
      color: area?.color || undefined,
      type: normalizedDefaultType,
    });
  }, [area?.id, normalizedDefaultType, open, reset]);

  const selectedIcon = useWatch({ control, name: "icon" });
  const selectedColor = useWatch({ control, name: "color" });

  const onFormSubmit = async (data: AreaFormValues) => {
    await onSubmit({
      color: data.color,
      description: data.description,
      icon: data.icon,
      name: data.name,
      slug: data.slug,
      type: normalizeAreaType(data.type),
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{area ? "Edit Area" : "Create New Area"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onFormSubmit as SubmitHandler<AreaFormValues>)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="e.g., Career Growth" {...register("name")} />
            {errors.name && <p className="text-xs text-destructive">{String(errors.name.message)}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="Describe this area..." rows={3} {...register("description")} />
            {errors.description && <p className="text-xs text-destructive">{String(errors.description.message)}</p>}
          </div>

          <div className="space-y-2">
            <Label>Icon</Label>
            <EmojiPickerPopover
              value={selectedIcon ?? null}
              onChange={(emoji) =>
                setValue("icon", emoji, { shouldDirty: true })
              }
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {AREA_COLORS.map((color) => (
                <button key={color} type="button" onClick={() => setValue("color", color)}
                  className={cn("w-8 h-8 rounded-full transition-all",
                    selectedColor === color ? "ring-2 ring-offset-2 ring-primary ring-offset-background" : "hover:scale-110")}
                  style={{ backgroundColor: color }} />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <AreaTypeSelector
                  value={field.value || ""}
                  options={suggestedTypes}
                  onChange={(next) => field.onChange(next)}
                  disabled={isLoading}
                />
              )}
            />
            {errors.type && <p className="text-xs text-destructive">{String(errors.type.message)}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{area ? "Save Changes" : "Create Area"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AreaTypeSelector({
  value,
  options,
  onChange,
  disabled,
}: {
  value: string;
  options: string[];
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const normalizedValue = normalizeAreaType(value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.toLowerCase().includes(q));
  }, [options, query]);

  const trimmed = query.trim();
  const canCreate =
    trimmed.length > 0 &&
    !options.some((option) => option.toLowerCase() === trimmed.toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        role="combobox"
        disabled={disabled}
        className={cn(buttonVariants({ variant: "outline" }), "w-full justify-between text-sm font-normal")}
      >
        <span className="truncate">
          {normalizedValue || "Select or create type..."}
        </span>
        <ChevronDownIcon className="ml-2 size-3.5 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search or create..."
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-56 overflow-y-auto">
            {canCreate && (
              <CommandGroup>
                <CommandItem
                  value={`__create__${trimmed}`}
                  onSelect={() => {
                    onChange(normalizeAreaType(trimmed));
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  <Plus className="mr-2 size-3.5" />
                  Create &ldquo;{trimmed}&rdquo;
                </CommandItem>
              </CommandGroup>
            )}
            <CommandEmpty>No types found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => {
                    onChange(normalizeAreaType(option));
                    setQuery("");
                    setOpen(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <span className="flex-1 truncate text-sm">{option}</span>
                  {option === normalizedValue && (
                    <Check className="ml-auto size-3.5" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

"use client";

import React, { useEffect } from "react";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod/v4";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createAreaSchema } from "@/lib/validators/area.schema";
import { Area, CreateAreaInput } from "@/lib/types/domain.types";
import { cn } from "@/lib/utils";
import { normalizeAreaType } from "@/lib/utils/areas";

interface AreaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  area?: Area;
  defaultType?: string;
  suggestedTypes?: string[];
  onSubmit: (data: CreateAreaInput) => Promise<void>;
  isLoading?: boolean;
}

const AREA_ICONS = ["📚", "💼", "🏥", "💰", "🎯", "⚙️", "🏠", "✈️", "🎨", "💪", "🧘", "📱"];
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

  const { register, handleSubmit, setValue, watch, reset, control, formState: { errors } } = form;

  useEffect(() => {
    if (open) {
      reset({
        name: area?.name || "",
        description: area?.description || "",
        icon: area?.icon || undefined,
        color: area?.color || undefined,
        type: normalizedDefaultType,
      });
    }
  }, [area, normalizedDefaultType, open, reset]);

  const selectedIcon = watch("icon");
  const selectedColor = watch("color");

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

        <form onSubmit={handleSubmit(onFormSubmit as any)} className="space-y-4">
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
            <div className="flex flex-wrap gap-2">
              {AREA_ICONS.map((icon) => (
                <button key={icon} type="button" onClick={() => setValue("icon", icon)}
                  className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all",
                    selectedIcon === icon ? "ring-2 ring-primary bg-primary/10" : "bg-muted hover:bg-muted/80")}>
                  {icon}
                </button>
              ))}
            </div>
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
              render={({ field }) => {
                const normalizedValue = normalizeAreaType(field.value);
                const matchingSuggestions = suggestedTypes.filter(
                  (type) =>
                    type.toLowerCase().includes((field.value || "").trim().toLowerCase()) &&
                    type !== normalizedValue,
                );
                return (
                  <>
                    <Input
                      id="type"
                      list="area-types"
                      placeholder="Type or select a type"
                      value={field.value || ""}
                      onChange={(e) => field.onChange(e.target.value)}
                      onBlur={field.onBlur}
                      name={field.name}
                    />
                    <datalist id="area-types">
                      {suggestedTypes.map((type) => (
                        <option key={type} value={type} />
                      ))}
                    </datalist>
                    {matchingSuggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {matchingSuggestions.slice(0, 3).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => field.onChange(type)}
                            className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 transition-colors">
                            {type}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                );
              }}
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

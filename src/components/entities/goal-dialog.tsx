"use client";

import React, { useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAreas } from "@/lib/hooks/use-areas";
import {
  useCreateGoal,
  useUpdateGoal,
} from "@/lib/hooks/use-goals";
import { CreateGoalInput, Goal } from "@/lib/types/domain.types";
import { GOAL_TERM, PRIORITY } from "@/lib/utils/constants";
import {
  createGoalFormSchema,
  updateGoalFormSchema,
} from "@/lib/validators/goal.schema";

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal | null;
  defaultAreaIds?: string[];
  /**
   * When provided, the Areas dropdown is restricted to these area ids only.
   * Used by callers that create a goal scoped to a parent's areas (e.g. the
   * project detail page, where a new goal must inherit the project's areas).
   */
  availableAreaIds?: string[];
  onSuccess?: (goal?: Goal) => void;
}

type GoalFormValues = Omit<CreateGoalInput, "is_archived" | "is_completed"> & {
  area_ids: string[];
  name: string;
  progress: number;
};

function buildGoalResolver(isCreate: boolean): Resolver<GoalFormValues> {
  return async (values) => {
    const schema: z.ZodType<unknown> = isCreate
      ? createGoalFormSchema
      : updateGoalFormSchema;

    const result = await schema.safeParseAsync(values);

    if (result.success) {
      return { values: result.data as GoalFormValues, errors: {} };
    }

    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error.issues) {
      const field = issue.path[0];
      if (typeof field === "string" && !errors[field]) {
        errors[field] = { type: issue.code, message: issue.message };
      }
    }

    return { values: {}, errors };
  };
}

export function GoalDialog({ open, onOpenChange, goal, defaultAreaIds, availableAreaIds, onSuccess }: GoalDialogProps) {
  const isCreate = !goal;
  const { data: allAreas = [] } = useAreas();
  const baseAreas = allAreas.filter((area) => !area.archive);
  const areas =
    availableAreaIds && availableAreaIds.length > 0
      ? baseAreas.filter((area) => availableAreaIds.includes(area.id))
      : baseAreas;

  const createMutation = useCreateGoal();
  const updateMutation = useUpdateGoal();

  const resolver = useMemo(() => buildGoalResolver(isCreate), [isCreate]);

  const form = useForm<GoalFormValues>({
    resolver,
    defaultValues: goal ? {
      name: goal.name || "",
      description: goal.description || "",
      area_ids: goal.linkedAreaIds ?? (goal.area_id ? [goal.area_id] : []),
      term: goal.term || GOAL_TERM.SHORT,
      priority: goal.priority || PRIORITY.MEDIUM,
      target_date: goal.target_date ?? undefined,
      progress: goal.progress || 0,
    } : {
      name: "",
      description: "",
      area_ids: defaultAreaIds ?? [],
      term: GOAL_TERM.SHORT,
      priority: PRIORITY.MEDIUM,
      target_date: undefined,
      progress: 0,
    },
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset({
      name: goal?.name || "",
      description: goal?.description || "",
      area_ids: goal
        ? goal.linkedAreaIds ?? (goal?.area_id ? [goal.area_id] : [])
        : defaultAreaIds ?? [],
      term: goal?.term || GOAL_TERM.SHORT,
      priority: goal?.priority || PRIORITY.MEDIUM,
      target_date: goal?.target_date ?? undefined,
      progress: goal?.progress || 0,
    });
  }, [form, goal, open, defaultAreaIds]);

  const progressValue = useWatch({ control: form.control, name: "progress" }) ?? 0;
  const selectedAreaIds = useWatch({ control: form.control, name: "area_ids" }) ?? [];
  const selectedTerm = useWatch({ control: form.control, name: "term" }) ?? GOAL_TERM.SHORT;
  const selectedPriority =
    useWatch({ control: form.control, name: "priority" }) ?? PRIORITY.MEDIUM;
  const todayStr = new Date().toISOString().split("T")[0];
  const isPending =
    createMutation.isPending ||
    updateMutation.isPending;
  const selectedAreas = areas.filter((area) => selectedAreaIds.includes(area.id));
  const selectedTermLabel =
    selectedTerm === GOAL_TERM.SHORT
      ? "Short Term"
      : selectedTerm === GOAL_TERM.MID
        ? "Mid Term"
        : "Long Term";
  const selectedPriorityLabel =
    selectedPriority === PRIORITY.LOW
      ? "Low"
      : selectedPriority === PRIORITY.MEDIUM
        ? "Medium"
        : selectedPriority === PRIORITY.HIGH
          ? "High"
          : "Urgent";

  const handleSubmit = async (values: GoalFormValues) => {
    const nextProgress = Number.isFinite(values.progress) ? values.progress : 0;
    const input = {
      ...values,
      area_id: values.area_ids[0] ?? null,
      progress: nextProgress,
    };

    try {
      if (goal) {
        const updated = await updateMutation.mutateAsync({ id: goal.id, input });
        onSuccess?.(updated);
      } else {
        const created = await createMutation.mutateAsync(input);
        onSuccess?.(created);
      }
      onOpenChange(false);
    } catch {
      return;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{goal ? "Edit Goal" : "Create New Goal"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goal-name">Name</Label>
            <Input
              id="goal-name"
              placeholder="e.g. Run a marathon"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-xs text-destructive">
                {String(form.formState.errors.name.message)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-description">Description</Label>
            <Textarea
              id="goal-description"
              placeholder="Describe your objective..."
              rows={3}
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="text-xs text-destructive">
                {String(form.formState.errors.description.message)}
              </p>
            )}
          </div>

          {/* Row 1: Term | Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="goal-term">Term</Label>
              <Select
                value={selectedTerm}
                onValueChange={(value) => form.setValue("term", value as Goal["term"])}
              >
                <SelectTrigger id="goal-term" className="w-full">
                  <SelectValue>{selectedTermLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={GOAL_TERM.SHORT}>Short Term</SelectItem>
                  <SelectItem value={GOAL_TERM.MID}>Mid Term</SelectItem>
                  <SelectItem value={GOAL_TERM.LONG}>Long Term</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.term && (
                <p className="text-xs text-destructive">
                  {String(form.formState.errors.term.message)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal-priority">Priority</Label>
              <Select
                value={selectedPriority}
                onValueChange={(value) => form.setValue("priority", value as Goal["priority"])}
              >
                <SelectTrigger id="goal-priority" className="w-full">
                  <SelectValue>{selectedPriorityLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PRIORITY.LOW}>Low</SelectItem>
                  <SelectItem value={PRIORITY.MEDIUM}>Medium</SelectItem>
                  <SelectItem value={PRIORITY.HIGH}>High</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.priority && (
                <p className="text-xs text-destructive">
                  {String(form.formState.errors.priority.message)}
                </p>
              )}
            </div>
          </div>

          {/* Row 2: Area | Target Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="goal-area">Areas</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={buttonVariants({ variant: "outline", size: "sm" })}
                  >
                    {selectedAreaIds.length === 0
                      ? "Select areas..."
                      : `${selectedAreaIds.length} selected`}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => form.setValue("area_ids", [])}>
                      Clear selection
                    </DropdownMenuItem>
                    <ScrollArea className="max-h-56">
                      {areas.map((area) => {
                        const checked = selectedAreaIds.includes(area.id);
                        return (
                          <DropdownMenuItem
                            key={area.id}
                            onSelect={(e) => e.preventDefault()}
                            onClick={() => {
                              const nextAreaIds = checked
                                ? selectedAreaIds.filter((areaId) => areaId !== area.id)
                                : [...selectedAreaIds, area.id];
                              form.setValue("area_ids", nextAreaIds, { shouldDirty: true });
                            }}
                            className="flex items-center gap-2"
                          >
                            <Checkbox checked={checked} />
                            {area.icon ? `${area.icon} ` : ""}
                            {area.name}
                          </DropdownMenuItem>
                        );
                      })}
                    </ScrollArea>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {selectedAreas.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedAreas.map((area) => (
                    <Badge key={area.id} variant="secondary" className="flex items-center gap-1">
                      {area.icon ? `${area.icon} ` : ""}
                      {area.name}
                      <button
                        type="button"
                        onClick={() => {
                          const nextAreaIds = selectedAreaIds.filter((id) => id !== area.id);
                          form.setValue("area_ids", nextAreaIds, { shouldDirty: true });
                        }}
                        className="ml-1 rounded-full p-0.5 hover:bg-muted"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : null}
              {form.formState.errors.area_ids && (
                <p className="text-xs text-destructive">
                  {String(form.formState.errors.area_ids.message)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal-target-date">Target Date</Label>
              <Controller
                control={form.control}
                name="target_date"
                render={({ field }) => (
                  <DatePicker
                    id="goal-target-date"
                    value={field.value ?? null}
                    onChange={(value) => field.onChange(value ?? "")}
                    min={todayStr}
                    ariaInvalid={!!form.formState.errors.target_date}
                  />
                )}
              />
              {form.formState.errors.target_date && (
                <p className="text-xs text-destructive">
                  {String(form.formState.errors.target_date.message)}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="goal-progress">Progress</Label>
              <span className="text-xs font-medium text-muted-foreground">
                {Math.round(progressValue)}%
              </span>
            </div>
            <Input
              id="goal-progress"
              type="range"
              min="0"
              max="100"
              step="1"
              {...form.register("progress", { valueAsNumber: true })}
            />
            {form.formState.errors.progress && (
              <p className="text-xs text-destructive">
                {String(form.formState.errors.progress.message)}
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {goal ? "Save Changes" : "Create Goal"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

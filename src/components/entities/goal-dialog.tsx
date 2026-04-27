"use client";

import React, { useEffect, useMemo } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  useArchiveGoal,
  useCompleteGoal,
  useCreateGoal,
  useRestoreGoal,
  useUpdateGoal,
} from "@/lib/hooks/use-goals";
import { CreateGoalInput, Goal } from "@/lib/types/domain.types";
import { GOAL_TERM, PRIORITY } from "@/lib/utils/constants";
import { createGoalSchema, updateGoalSchema } from "@/lib/validators/goal.schema";

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal | null;
  onSuccess?: () => void;
}

type GoalFormValues = Omit<CreateGoalInput, "is_archived" | "is_completed"> & {
  name: string;
  progress: number;
};

const emptyStringToNull = (value: unknown): unknown => (value === "" ? null : value);

function buildGoalResolver(isCreate: boolean): Resolver<GoalFormValues> {
  return async (values) => {
    let schema: z.ZodType<unknown>;

    if (isCreate) {
      const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid ISO date");
      schema = z.object({
        area_id: z.preprocess(emptyStringToNull, z.string().uuid().optional().nullable()),
        name: z.string().trim().min(1, "Name is required").max(100),
        description: z.preprocess(emptyStringToNull, z.string().trim().max(500).optional().nullable()),
        term: z.nativeEnum(GOAL_TERM),
        priority: z.nativeEnum(PRIORITY).default(PRIORITY.MEDIUM),
        target_date: z.preprocess(
          emptyStringToNull,
          dateStringSchema.optional().nullable(),
        ),
        progress: z.number().min(0).max(100).default(0),
      }).superRefine((data, ctx) => {
        if (data.target_date !== null && data.target_date !== undefined) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const targetDate = new Date(data.target_date + "T00:00:00");
          if (targetDate < today) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Target date cannot be in the past",
              path: ["target_date"],
            });
          }
        }
      });
    } else {
      schema = updateGoalSchema.omit({ is_archived: true, is_completed: true });
    }

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

export function GoalDialog({ open, onOpenChange, goal, onSuccess }: GoalDialogProps) {
  const isCreate = !goal;
  const { data: allAreas = [] } = useAreas();
  const areas = allAreas.filter((area) => !area.archive);
  const UNASSIGNED_AREA_VALUE = "__unassigned__";

  const createMutation = useCreateGoal();
  const updateMutation = useUpdateGoal();
  const archiveMutation = useArchiveGoal();
  const restoreMutation = useRestoreGoal();
  const completeMutation = useCompleteGoal();

  const resolver = useMemo(() => buildGoalResolver(isCreate), [isCreate]);

  const form = useForm<GoalFormValues>({
    resolver,
    defaultValues: goal ? {
      name: goal.name || "",
      description: goal.description || "",
      area_id: goal.area_id ?? undefined,
      term: goal.term || GOAL_TERM.SHORT,
      priority: goal.priority || PRIORITY.MEDIUM,
      target_date: goal.target_date ?? undefined,
      progress: goal.progress || 0,
    } : {
      name: "",
      description: "",
      area_id: undefined,
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
      area_id: goal?.area_id ?? undefined,
      term: goal?.term || GOAL_TERM.SHORT,
      priority: goal?.priority || PRIORITY.MEDIUM,
      target_date: goal?.target_date ?? undefined,
      progress: goal?.progress || 0,
    });
  }, [form, goal, open]);

  const progressValue = form.watch("progress") ?? 0;
  const selectedAreaId = form.watch("area_id");
  const selectedTerm = form.watch("term") ?? GOAL_TERM.SHORT;
  const selectedPriority = form.watch("priority") ?? PRIORITY.MEDIUM;
  const todayStr = new Date().toISOString().split("T")[0];
  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    archiveMutation.isPending ||
    restoreMutation.isPending ||
    completeMutation.isPending;
  const selectedAreaLabel =
    areas.find((area) => area.id === selectedAreaId)?.name ?? "Unassigned";
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
      progress: nextProgress,
    };

    try {
      if (goal) {
        await updateMutation.mutateAsync({ id: goal.id, input });
      } else {
        await createMutation.mutateAsync(input);
      }
      onSuccess?.();
      onOpenChange(false);
    } catch {
      return;
    }
  };

  const handleArchiveToggle = async () => {
    if (!goal) {
      return;
    }

    if (goal.is_archived) {
      await restoreMutation.mutateAsync(goal.id);
    } else {
      await archiveMutation.mutateAsync(goal.id);
    }

    onSuccess?.();
    onOpenChange(false);
  };

  const handleComplete = async () => {
    if (!goal) {
      return;
    }

    await completeMutation.mutateAsync(goal.id);
    onSuccess?.();
    onOpenChange(false);
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="goal-area">Area</Label>
              <Select
                value={selectedAreaId ?? UNASSIGNED_AREA_VALUE}
                onValueChange={(value) =>
                  form.setValue("area_id", value === UNASSIGNED_AREA_VALUE ? undefined : value)
                }
              >
                <SelectTrigger id="goal-area" className="w-full">
                  <SelectValue>{selectedAreaLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED_AREA_VALUE}>Unassigned</SelectItem>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.area_id && (
                <p className="text-xs text-destructive">
                  {String(form.formState.errors.area_id.message)}
                </p>
              )}
            </div>

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
          </div>

          <div className="grid grid-cols-2 gap-4">
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
                  <SelectItem value={PRIORITY.URGENT}>Urgent</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.priority && (
                <p className="text-xs text-destructive">
                  {String(form.formState.errors.priority.message)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal-target-date">Target Date</Label>
              <Input
                id="goal-target-date"
                type="date"
                min={!goal ? todayStr : undefined}
                {...form.register("target_date")}
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

          <DialogFooter className="gap-2 sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {goal && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleArchiveToggle}
                  disabled={isPending}
                >
                  {goal.is_archived ? "Restore" : "Archive"}
                </Button>
              )}
              {goal && !goal.is_completed && !goal.is_archived && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleComplete}
                  disabled={isPending}
                >
                  Complete
                </Button>
              )}
            </div>
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

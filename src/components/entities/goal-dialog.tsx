"use client";

import React, { useEffect } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { createGoalSchema } from "@/lib/validators/goal.schema";

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal | null;
  onSuccess?: () => void;
}

const goalFormSchema = createGoalSchema.omit({ is_archived: true, is_completed: true });
interface GoalFormValues extends Omit<CreateGoalInput, "is_archived" | "is_completed"> {
  name: string;
  progress: number;
  term: Goal["term"];
  priority: Goal["priority"];
}

const goalResolver: Resolver<GoalFormValues> = async (values) => {
  const result = goalFormSchema.safeParse(values);

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

export function GoalDialog({ open, onOpenChange, goal, onSuccess }: GoalDialogProps) {
  const { data: allAreas = [] } = useAreas();
  const areas = allAreas.filter((area) => !area.archive);

  const createMutation = useCreateGoal();
  const updateMutation = useUpdateGoal();
  const archiveMutation = useArchiveGoal();
  const restoreMutation = useRestoreGoal();
  const completeMutation = useCompleteGoal();

  const form = useForm<GoalFormValues>({
    resolver: goalResolver,
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
  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    archiveMutation.isPending ||
    restoreMutation.isPending ||
    completeMutation.isPending;

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
              <select
                id="goal-area"
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                {...form.register("area_id")}
              >
                <option value="">Unassigned</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
              {form.formState.errors.area_id && (
                <p className="text-xs text-destructive">
                  {String(form.formState.errors.area_id.message)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal-term">Term</Label>
              <select
                id="goal-term"
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                {...form.register("term")}
              >
                <option value={GOAL_TERM.SHORT}>Short Term</option>
                <option value={GOAL_TERM.MID}>Mid Term</option>
                <option value={GOAL_TERM.LONG}>Long Term</option>
              </select>
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
              <select
                id="goal-priority"
                className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                {...form.register("priority")}
              >
                <option value={PRIORITY.LOW}>Low</option>
                <option value={PRIORITY.MEDIUM}>Medium</option>
                <option value={PRIORITY.HIGH}>High</option>
                <option value={PRIORITY.URGENT}>Urgent</option>
              </select>
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

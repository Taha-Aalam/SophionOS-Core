"use client";

import { useEffect, useMemo } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";

import { useAreas } from "@/lib/hooks/use-areas";
import { useGoals } from "@/lib/hooks/use-goals";
import {
  useCreateProject,
  useProjectWithRelations,
  useUpdateProject,
} from "@/lib/hooks/use-projects";
import { type Project } from "@/lib/types/domain.types";
import { PRIORITY, PROJECT_STATUS } from "@/lib/utils/constants";
import { createProjectSchema } from "@/lib/validators/project.schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: Project | null;
  goalId?: string;
  onSuccess?: () => void;
}

interface ProjectFormValues {
  area_id: string;
  description: string;
  due_date: string;
  goal_ids: string[];
  is_archived: boolean;
  name: string;
  priority: Project["priority"];
  progress: number;
  start_date: string;
  status: Project["status"];
}

const UNASSIGNED_AREA_VALUE = "__unassigned__";

const EMPTY_FORM_VALUES: ProjectFormValues = {
  area_id: "",
  description: "",
  due_date: "",
  goal_ids: [],
  is_archived: false,
  name: "",
  priority: PRIORITY.MEDIUM,
  progress: 0,
  start_date: "",
  status: PROJECT_STATUS.PLANNING,
};

function buildProjectFormValues(
  project: Project | null | undefined,
  goalIds: string[],
  defaultGoalId?: string,
): ProjectFormValues {
  if (!project) {
    return { ...EMPTY_FORM_VALUES, goal_ids: defaultGoalId ? [defaultGoalId] : [] };
  }

  return {
    area_id: project.area_id ?? "",
    description: project.description ?? "",
    due_date: project.due_date ?? "",
    goal_ids: goalIds,
    is_archived: project.is_archived,
    name: project.name,
    priority: project.priority,
    progress: project.progress ?? 0,
    start_date: project.start_date ?? "",
    status: project.status,
  };
}

export function ProjectDialog({
  open,
  onOpenChange,
  project,
  goalId,
  onSuccess,
}: ProjectDialogProps) {
  const { data: allAreas = [] } = useAreas();
  const { data: allGoals = [] } = useGoals({ status: "all" });
  const { data: projectRelations, isLoading: isLoadingRelations } = useProjectWithRelations(
    project?.id ?? "",
  );
  const createMutation = useCreateProject();
  const updateMutation = useUpdateProject();

  const areas = useMemo(() => allAreas.filter((area) => !area.archive), [allAreas]);
  const activeGoals = useMemo(
    () =>
      allGoals
        .filter((goal) => !goal.is_archived)
        .sort((left, right) => left.name.localeCompare(right.name)),
    [allGoals],
  );
  const linkedGoalIds = projectRelations?.goal_ids ?? [];

  const form = useForm<ProjectFormValues>({
    defaultValues: EMPTY_FORM_VALUES,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset(buildProjectFormValues(project, linkedGoalIds, goalId));
  }, [form, linkedGoalIds, open, project, goalId]);

  const selectedGoalIds = form.watch("goal_ids") ?? [];
  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleGoalToggle = (goalId: string, checked: boolean) => {
    const nextGoalIds = checked
      ? Array.from(new Set([...selectedGoalIds, goalId]))
      : selectedGoalIds.filter((selectedGoalId) => selectedGoalId !== goalId);

    form.setValue("goal_ids", nextGoalIds, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    form.clearErrors();
    const validation = createProjectSchema.safeParse(values);

    if (!validation.success) {
      for (const issue of validation.error.issues) {
        const fieldName = issue.path[0];

        if (typeof fieldName === "string") {
          form.setError(fieldName as keyof ProjectFormValues, {
            message: issue.message,
            type: "validate",
          });
        }
      }

      return;
    }

    try {
      if (project) {
        await updateMutation.mutateAsync({
          id: project.id,
          input: validation.data,
        });
      } else {
        await createMutation.mutateAsync(validation.data);
      }

      onOpenChange(false);
      onSuccess?.();
    } catch {
      // Mutation hooks already surface the error via toast; keep the dialog open for correction.
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{project ? "Edit Project" : "Create Project"}</DialogTitle>
          <DialogDescription>
            Capture the project basics now and link the goals it supports.
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <FormItem>
              <FormLabel>Project Name</FormLabel>
              <FormControl>
                <Input
                  autoFocus
                  placeholder="Enter project name"
                  {...form.register("name")}
                />
              </FormControl>
              <FormMessage>{form.formState.errors.name?.message}</FormMessage>
            </FormItem>

            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add the project outcome or context"
                  rows={3}
                  {...form.register("description")}
                />
              </FormControl>
              <FormMessage>{form.formState.errors.description?.message}</FormMessage>
            </FormItem>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormItem>
                <FormLabel>Area</FormLabel>
                <Controller
                  control={form.control}
                  name="area_id"
                  render={({ field }) => (
                    <Select
                      onValueChange={(value) =>
                        field.onChange(value === UNASSIGNED_AREA_VALUE ? "" : value)
                      }
                      value={field.value || UNASSIGNED_AREA_VALUE}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select area" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={UNASSIGNED_AREA_VALUE}>Unassigned</SelectItem>
                        {areas.map((area) => (
                          <SelectItem key={area.id} value={area.id}>
                            {area.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FormMessage>{form.formState.errors.area_id?.message}</FormMessage>
              </FormItem>

              <FormItem>
                <FormLabel>Priority</FormLabel>
                <Controller
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={PRIORITY.LOW}>Low</SelectItem>
                        <SelectItem value={PRIORITY.MEDIUM}>Medium</SelectItem>
                        <SelectItem value={PRIORITY.HIGH}>High</SelectItem>
                        <SelectItem value={PRIORITY.URGENT}>Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FormMessage>{form.formState.errors.priority?.message}</FormMessage>
              </FormItem>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Controller
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={PROJECT_STATUS.PLANNING}>Planning</SelectItem>
                        <SelectItem value={PROJECT_STATUS.ACTIVE}>In Progress</SelectItem>
                        <SelectItem value={PROJECT_STATUS.COMPLETED}>Completed</SelectItem>
                        <SelectItem value={PROJECT_STATUS.ON_HOLD}>On Hold</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FormMessage>{form.formState.errors.status?.message}</FormMessage>
              </FormItem>

              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <Input type="date" {...form.register("start_date")} />
                </FormControl>
                <FormMessage>{form.formState.errors.start_date?.message}</FormMessage>
              </FormItem>

              <FormItem>
                <FormLabel>Due Date</FormLabel>
                <FormControl>
                  <Input type="date" {...form.register("due_date")} />
                </FormControl>
                <FormMessage>{form.formState.errors.due_date?.message}</FormMessage>
              </FormItem>
            </div>

            <FormItem>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <FormLabel>Linked Goals</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Select the goals this project contributes to.
                  </p>
                </div>
                <Badge variant="secondary">
                  {selectedGoalIds.length} linked
                </Badge>
              </div>

              {isLoadingRelations && project ? (
                <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                  Loading linked goals...
                </div>
              ) : activeGoals.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                  No active goals are available yet.
                </div>
              ) : (
                <ScrollArea className="h-52 rounded-lg border">
                  <div className="space-y-2 p-3">
                    {activeGoals.map((goal) => (
                      <label
                        key={goal.id}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40"
                      >
                        <Checkbox
                          checked={selectedGoalIds.includes(goal.id)}
                          onCheckedChange={(checked) => handleGoalToggle(goal.id, Boolean(checked))}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium">{goal.name}</span>
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {goal.term}
                            </Badge>
                          </div>
                          {goal.description && (
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                              {goal.description}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </ScrollArea>
              )}

              <FormMessage>{form.formState.errors.goal_ids?.message}</FormMessage>
            </FormItem>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : project ? "Update Project" : "Create Project"}
              </Button>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

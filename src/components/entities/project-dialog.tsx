"use client";

import { useEffect, useMemo } from "react";
import { Controller, FormProvider, useForm, useWatch } from "react-hook-form";

import { X } from "lucide-react";

import { useAreas } from "@/lib/hooks/use-areas";
import { useGoals } from "@/lib/hooks/use-goals";
import {
  useCreateProject,
  useProjectWithRelations,
  useUpdateProject,
} from "@/lib/hooks/use-projects";
import { type CreateProjectInput, type Project } from "@/lib/types/domain.types";
import { getProjectLinkedAreaIds } from "@/lib/utils/projects";
import { getStableStringArray } from "@/lib/utils/stable-arrays";
import { PRIORITY, PROJECT_STATUS } from "@/lib/utils/constants";
import {
  filterProjectDialogAreas,
  filterProjectDialogGoals,
} from "@/lib/utils/project-dialog-filters";
import { type GoalScopedConfig } from "@/lib/utils/goal-scoped";
import { createProjectSchema, updateProjectSchema } from "@/lib/validators/project.schema";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FormControl, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
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
  /**
   * When set, the dialog runs in goal-scoped mode:
   *  - the area is locked to the goal's area and not selectable
   *  - goal linkage is locked to the parent goal only
   */
  goalScoped?: GoalScopedConfig;
  defaultAreaIds?: string[];
  onSuccess?: () => void;
}

interface ProjectFormValues {
  area_ids: string[];
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

const EMPTY_FORM_VALUES: ProjectFormValues = {
  area_ids: [],
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
  goalScoped?: GoalScopedConfig,
  defaultAreaIds?: string[],
): ProjectFormValues {
  if (!project) {
    if (goalScoped) {
      return {
        ...EMPTY_FORM_VALUES,
        area_ids: goalScoped.areaId ? [goalScoped.areaId] : [],
        goal_ids: [goalScoped.goalId],
      };
    }
    return {
      ...EMPTY_FORM_VALUES,
      area_ids: defaultAreaIds ?? [],
      goal_ids: defaultGoalId ? [defaultGoalId] : [],
    };
  }

  return {
    area_ids: getProjectLinkedAreaIds(project),
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
  goalScoped,
  defaultAreaIds,
  onSuccess,
}: ProjectDialogProps) {
  const isGoalScoped = Boolean(goalScoped) && !project;
  const { data: allAreas = [] } = useAreas();
  const { data: allGoals = [] } = useGoals({ status: "all" });
  const { data: projectRelations, isLoading: _isLoadingRelations } = useProjectWithRelations(
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
  const linkedGoalIds = getStableStringArray(projectRelations?.goal_ids);

  const form = useForm<ProjectFormValues>({
    defaultValues: EMPTY_FORM_VALUES,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset(
      buildProjectFormValues(project, linkedGoalIds, goalId, goalScoped, defaultAreaIds),
    );
  }, [form, linkedGoalIds, open, project, goalId, goalScoped, defaultAreaIds]);

  const watchedAreaIds = useWatch({ control: form.control, name: "area_ids" });
  const selectedAreaIds = useMemo(() => watchedAreaIds ?? [], [watchedAreaIds]);
  const selectedAreaLabels = useMemo(() => {
    return selectedAreaIds
      .map((id) => areas.find((area) => area.id === id))
      .filter((area): area is NonNullable<typeof area> => Boolean(area));
  }, [selectedAreaIds, areas]);

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
    today.getDate(),
  ).padStart(2, "0")}`;
  const selectedStartDate = useWatch({ control: form.control, name: "start_date" }) ?? "";
  const watchedGoalIds = useWatch({ control: form.control, name: "goal_ids" });
  const selectedGoalIds = useMemo(() => watchedGoalIds ?? [], [watchedGoalIds]);
  // Both create and edit flows enforce a today-or-future minimum for the due
  // date picker. When editing a project whose stored value is in the past,
  // the input still renders that value (the browser allows out-of-range
  // values it received); the user just can't pick another past date from
  // the calendar.
  const dueDateMin =
    selectedStartDate && selectedStartDate > todayStr ? selectedStartDate : todayStr;
  const startDateMin = !project ? todayStr : undefined;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const visibleGoals = useMemo(() => {
    return filterProjectDialogGoals(activeGoals, selectedAreaIds);
  }, [activeGoals, selectedAreaIds]);

  const visibleAreas = useMemo(() => {
    return filterProjectDialogAreas(areas, activeGoals, selectedAreaIds, selectedGoalIds);
  }, [activeGoals, areas, selectedAreaIds, selectedGoalIds]);

  useEffect(() => {
    const allowedGoalIds = new Set(visibleGoals.map((goal) => goal.id));
    const nextGoalIds = selectedGoalIds.filter((goalId) => allowedGoalIds.has(goalId));
    if (nextGoalIds.length !== selectedGoalIds.length) {
      form.setValue("goal_ids", nextGoalIds, { shouldDirty: true, shouldValidate: true });
    }
  }, [visibleGoals, selectedGoalIds, form]);

  useEffect(() => {
    const allowedAreaIds = new Set(visibleAreas.map((area) => area.id));
    const nextAreaIds = selectedAreaIds.filter((areaId) => allowedAreaIds.has(areaId));
    if (nextAreaIds.length !== selectedAreaIds.length) {
      form.setValue("area_ids", nextAreaIds, { shouldDirty: true, shouldValidate: true });
    }
  }, [visibleAreas, selectedAreaIds, form]);

  const handleAreaToggle = (areaId: string, checked: boolean) => {
    const nextAreaIds = checked
      ? Array.from(new Set([...selectedAreaIds, areaId]))
      : selectedAreaIds.filter((id) => id !== areaId);

    form.setValue("area_ids", nextAreaIds, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

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

  const applyValidationErrors = (
    issues: Array<{ path: PropertyKey[]; message: string }>,
  ) => {
    for (const issue of issues) {
      const fieldName = issue.path[0];

      if (typeof fieldName === "string") {
        form.setError(fieldName as keyof ProjectFormValues, {
          message: issue.message,
          type: "validate",
        });
      }
    }
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    form.clearErrors();

    try {
      const areaIdPayload = values.area_ids[0] ?? null;
      if (project) {
        const validation = updateProjectSchema.safeParse(values);

        if (!validation.success) {
          applyValidationErrors(validation.error.issues);
          return;
        }

        await updateMutation.mutateAsync({
          id: project.id,
          input: {
            ...validation.data,
            area_id: areaIdPayload,
          },
        });
      } else {
        const validation = createProjectSchema.safeParse(values);

        if (!validation.success) {
          applyValidationErrors(validation.error.issues);
          return;
        }

        const payload: CreateProjectInput = isGoalScoped && goalScoped
          ? {
              ...validation.data,
              area_ids: goalScoped.areaId ? [goalScoped.areaId] : [],
              area_id: goalScoped.areaId ?? null,
              goal_ids: [goalScoped.goalId],
            }
          : {
              ...validation.data,
              area_id: areaIdPayload,
            };

        await createMutation.mutateAsync(payload);
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

            {/* Row 1: Status | Priority */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

            {/* Row 2: Start Date | Due Date */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <Controller
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormControl>
                      <DatePicker
                        value={field.value || null}
                        onChange={(value) => field.onChange(value ?? "")}
                        min={startDateMin}
                        ariaInvalid={!!form.formState.errors.start_date}
                      />
                    </FormControl>
                  )}
                />
                <FormMessage>{form.formState.errors.start_date?.message}</FormMessage>
              </FormItem>

              <FormItem>
                <FormLabel>Due Date</FormLabel>
                <Controller
                  control={form.control}
                  name="due_date"
                  render={({ field }) => (
                    <FormControl>
                      <DatePicker
                        value={field.value || null}
                        onChange={(value) => field.onChange(value ?? "")}
                        min={dueDateMin}
                        ariaInvalid={!!form.formState.errors.due_date}
                      />
                    </FormControl>
                  )}
                />
                <FormMessage>{form.formState.errors.due_date?.message}</FormMessage>
              </FormItem>
            </div>

            {/* Row 3: Area | Goals (compact dropdown) */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {isGoalScoped ? (
                <FormItem>
                  <FormLabel>Area</FormLabel>
                  <div
                    className="flex h-9 w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground"
                    aria-readonly="true"
                    data-testid="project-dialog-area-locked"
                  >
                    {(() => {
                      const lockedArea = areas.find(
                        (area) => area.id === goalScoped?.areaId,
                      );
                      if (!lockedArea) return "Inherited from goal";
                      return `${lockedArea.icon ? `${lockedArea.icon} ` : ""}${lockedArea.name} (from goal)`;
                    })()}
                  </div>
                </FormItem>
              ) : (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Areas</FormLabel>
                    <DropdownMenu>
                      <DropdownMenuTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
                        {selectedAreaIds.length === 0
                          ? "Select areas..."
                          : `${selectedAreaIds.length} selected`}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => form.setValue("area_ids", [])}>
                          Clear selection
                        </DropdownMenuItem>
                        <ScrollArea className="max-h-56">
                          {visibleAreas.map((area) => {
                            const isSelected = selectedAreaIds.includes(area.id);
                            return (
                              <DropdownMenuItem
                                key={area.id}
                                onSelect={(e) => e.preventDefault()}
                                onClick={() => handleAreaToggle(area.id, !isSelected)}
                                className="flex items-center gap-2"
                              >
                                <Checkbox checked={isSelected} />
                                {area.icon ? `${area.icon} ` : ""}
                                {area.name}
                              </DropdownMenuItem>
                            );
                          })}
                        </ScrollArea>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {selectedAreaLabels.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {selectedAreaLabels.map((area) => (
                        <Badge key={area.id} variant="secondary" className="flex items-center gap-1">
                          {area.icon ? `${area.icon} ` : ""}
                          {area.name}
                          <button
                            type="button"
                            onClick={() => handleAreaToggle(area.id, false)}
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
                </FormItem>
              )}

              {isGoalScoped ? (
                <FormItem>
                  <FormLabel>Linked Goal</FormLabel>
                  <div
                    className="flex items-center gap-2 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
                    data-testid="project-dialog-goal-locked"
                  >
                    Locked to current goal
                    <Badge variant="secondary">1 linked</Badge>
                  </div>
                </FormItem>
              ) : (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Goals</FormLabel>
                    <DropdownMenu>
                      <DropdownMenuTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
                        {selectedGoalIds.length === 0 ? "Select goals..." : `${selectedGoalIds.length} selected`}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => form.setValue("goal_ids", [])}>
                          Clear selection
                        </DropdownMenuItem>
                        <ScrollArea className="max-h-56">
                          {visibleGoals.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              {selectedAreaIds.length > 0
                                ? "No goals in selected areas."
                                : "No active goals available."}
                            </div>
                          ) : (
                            visibleGoals.map((goal) => (
                              <DropdownMenuItem
                                key={goal.id}
                                onSelect={(e) => e.preventDefault()}
                                onClick={() => handleGoalToggle(goal.id, !selectedGoalIds.includes(goal.id))}
                                className="flex items-center gap-2"
                              >
                                <Checkbox checked={selectedGoalIds.includes(goal.id)} />
                                {goal.name}
                              </DropdownMenuItem>
                            ))
                          )}
                        </ScrollArea>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {selectedGoalIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {selectedGoalIds
                        .map((id) => visibleGoals.find((g) => g.id === id) ?? activeGoals.find((g) => g.id === id))
                        .filter((g): g is NonNullable<typeof g> => Boolean(g))
                        .map((goal) => (
                          <Badge key={goal.id} variant="secondary" className="flex items-center gap-1">
                            {goal.name}
                            <button
                              type="button"
                              onClick={() => handleGoalToggle(goal.id, false)}
                              className="ml-1 rounded-full p-0.5 hover:bg-muted"
                            >
                              <X className="size-3" />
                            </button>
                          </Badge>
                        ))}
                    </div>
                  )}
                  <FormMessage>{form.formState.errors.goal_ids?.message}</FormMessage>
                </FormItem>
              )}
            </div>

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

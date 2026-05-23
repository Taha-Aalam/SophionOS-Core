"use client";

import { useEffect, useMemo, useRef } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { X } from "lucide-react";
import { toast } from "sonner";

import { useAreas, useAreasByIds } from "@/lib/hooks/use-areas";
import { useGoals } from "@/lib/hooks/use-goals";
import { useProjects } from "@/lib/hooks/use-projects";
import {
  useCreateTask,
  useTaskWithRelations,
  useUpdateTask,
} from "@/lib/hooks/use-tasks";
import { Task } from "@/lib/types/domain.types";
import { getStableStringArray } from "@/lib/utils/stable-arrays";
import { PRIORITY, TASK_STATUS } from "@/lib/utils/constants";
import {
  applyGoalScopedDefaults,
  applyProjectScopedAreaGuard,
  filterAllowedProjectsForGoal,
  getScopedCandidateAreaIds,
  type GoalScopedTaskConfig,
} from "@/lib/utils/goal-scoped";
import { goalMatchesAreaId } from "@/lib/utils/goals";
import {
  computeFilteredProjects,
  computeVisibleAreas,
  computeVisibleGoals,
} from "@/lib/utils/task-dialog-filters";
import { createTaskSchema, updateTaskSchema } from "@/lib/validators/task.schema";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TaskArchiveToggle } from "./task-archive-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

/**
 * Locked-context configuration for project-scoped task creation flows
 * (e.g., from a project detail page's Tasks section).
 *
 * When set the dialog locks both the project and its area chain, and
 * displays them as resolved names (never raw UUIDs).
 */
export interface ProjectScopedTaskConfig {
  projectId: string;
  /** Resolved project name for display. */
  projectName: string;
  /** Primary area id to persist alongside the task (may be null). */
  areaId: string | null;
  /**
   * All area ids linked to the project. Used to render resolved area name
   * chips when the project has multiple linked areas.
   */
  linkedAreaIds?: string[];
  /**
   * Goal ids already linked to the project. Goal selector will be restricted
   * to these ids and all are pre-selected by default.
   */
  linkedGoalIds?: string[];
}

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  defaultProjectId?: string;
  defaultAreaId?: string;
  defaultGoalId?: string;
  goalId?: string;
  goalScoped?: GoalScopedTaskConfig;
  projectScoped?: ProjectScopedTaskConfig;
  allowedProjectIds?: string[];
  onSuccess?: () => void;
  /** @deprecated Use onArchiveToggle instead. */
  onDelete?: (id: string) => void;
  onArchiveToggle?: (task: Task) => void;
}

interface TaskFormValues {
  area_ids: string[];
  description: string;
  due_date: string;
  goal_ids: string[];
  is_archived: boolean;
  is_completed: boolean;
  is_focused: boolean;
  is_important: boolean;
  is_urgent: boolean;
  name: string;
  priority: Task["priority"];
  project_id: string;
  status: Task["status"];
}


const EMPTY_FORM_VALUES: TaskFormValues = {
  area_ids: [],
  description: "",
  due_date: "",
  goal_ids: [],
  is_archived: false,
  is_completed: false,
  is_focused: false,
  is_important: false,
  is_urgent: false,
  name: "",
  priority: PRIORITY.MEDIUM,
  project_id: "",
  status: TASK_STATUS.INBOX,
};

function buildTaskFormValues(
  task: Task | null | undefined,
  goalIds: string[],
  linkedAreaIds: string[],
  defaultAreaId?: string,
  defaultProjectId?: string,
  defaultGoalId?: string,
  goalScoped?: GoalScopedTaskConfig,
  projectScoped?: ProjectScopedTaskConfig,
): TaskFormValues {
  if (!task) {
    if (goalScoped) {
      const scopedAreaIds = goalScoped.linkedAreaIds?.length
        ? goalScoped.linkedAreaIds
        : goalScoped.areaId ? [goalScoped.areaId] : [];
      return {
        ...EMPTY_FORM_VALUES,
        area_ids: scopedAreaIds,
        project_id: "",
        goal_ids: [goalScoped.goalId],
      };
    }
    if (projectScoped) {
      const scopedAreaIds = projectScoped.linkedAreaIds?.length
        ? projectScoped.linkedAreaIds
        : projectScoped.areaId ? [projectScoped.areaId] : [];
      return {
        ...EMPTY_FORM_VALUES,
        area_ids: scopedAreaIds,
        project_id: projectScoped.projectId,
        goal_ids: projectScoped.linkedGoalIds?.length
          ? projectScoped.linkedGoalIds
          : defaultGoalId
            ? [defaultGoalId]
            : [],
      };
    }
    return {
      ...EMPTY_FORM_VALUES,
      area_ids: defaultAreaId ? [defaultAreaId] : [],
      project_id: defaultProjectId ?? "",
      goal_ids: defaultGoalId ? [defaultGoalId] : [],
    };
  }

  return {
    area_ids: linkedAreaIds.length > 0 ? linkedAreaIds : (task.area_id ? [task.area_id] : []),
    description: task.description ?? "",
    due_date: task.due_date ?? "",
    goal_ids: goalIds,
    is_archived: task.is_archived,
    is_completed: task.is_completed,
    is_focused: task.is_focused,
    is_important: task.is_important,
    is_urgent: task.is_urgent,
    name: task.name,
    priority: task.priority,
    project_id: task.project_id ?? "",
    status: task.status,
  };
}

export function TaskDialog({
  open,
  onOpenChange,
  task,
  defaultProjectId,
  defaultAreaId,
  defaultGoalId: _defaultGoalId,
  goalId,
  goalScoped,
  projectScoped,
  allowedProjectIds,
  onSuccess,
  onDelete,
  onArchiveToggle,
}: TaskDialogProps) {
  const isGoalScoped = Boolean(goalScoped) && !task;
  const isProjectScoped = Boolean(projectScoped) && !task && !isGoalScoped;
  const { data: allAreas = [] } = useAreas();
  const { data: allGoals = [] } = useGoals({ status: "all" });
  const { data: allProjects = [] } = useProjects({ status: "all" });
  const { data: taskRelations } = useTaskWithRelations(task?.id ?? "");

  const scopedCandidateIds = useMemo(() => {
    if (isGoalScoped && goalScoped) return getScopedCandidateAreaIds(goalScoped);
    if (isProjectScoped && projectScoped) return getScopedCandidateAreaIds(projectScoped);
    return [];
  }, [isGoalScoped, isProjectScoped, goalScoped, projectScoped]);

  const { data: scopedAreas = [], isLoading: isScopedAreasLoading } =
    useAreasByIds(scopedCandidateIds);

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const areas = useMemo(() => allAreas.filter((area) => !area.archive), [allAreas]);
  const projects = useMemo(
    () => allProjects.filter((project) => !project.is_archived),
    [allProjects],
  );
  const goals = useMemo(
    () =>
      allGoals
        .filter((goal) => !goal.is_archived)
        .sort((left, right) => left.name.localeCompare(right.name)),
    [allGoals],
  );
  const projectById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );
  const linkedGoalIds = getStableStringArray(taskRelations?.goal_ids);
  const linkedAreaIds = getStableStringArray(taskRelations?.area_ids ?? []);

  const form = useForm<TaskFormValues>({
    defaultValues: EMPTY_FORM_VALUES,
  });

  /**
   * Tracks the "session key" for the last form reset.
   * Reset fires only when the dialog opens (open transitions false→true) or
   * when the task being edited changes. This prevents goalScoped/projectScoped
   * object-literal props — which carry new references on every parent render —
   * from triggering repeated resets that wipe the user's in-progress selections.
   */
  const lastResetKeyRef = useRef<string>("");

  useEffect(() => {
    if (!open) {
      lastResetKeyRef.current = "";
      return;
    }

    const resetKey = task?.id ?? "create";
    if (lastResetKeyRef.current === resetKey) {
      return;
    }
    lastResetKeyRef.current = resetKey;

    form.reset(
      buildTaskFormValues(
        task,
        linkedGoalIds,
        linkedAreaIds,
        defaultAreaId,
        defaultProjectId,
        goalId,
        goalScoped,
        projectScoped,
      ),
    );
  }, [
    defaultAreaId,
    defaultProjectId,
    form,
    goalId,
    goalScoped,
    projectScoped,
    linkedGoalIds,
    linkedAreaIds,
    open,
    task,
  ]);

  /** Hydrate relation fields once after async taskRelations resolve. */
  const hasHydratedRelationsRef = useRef(false);

  useEffect(() => {
    if (!open || !task) {
      hasHydratedRelationsRef.current = false;
      return;
    }
    if (!taskRelations || hasHydratedRelationsRef.current) return;

    const nextGoalIds = getStableStringArray(taskRelations.goal_ids);
    const nextAreaIds = getStableStringArray(taskRelations.area_ids ?? []);
    form.setValue("goal_ids", nextGoalIds, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: true,
    });
    form.setValue("area_ids", nextAreaIds, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: true,
    });
    hasHydratedRelationsRef.current = true;
  }, [open, task, taskRelations, form]);

  const watchedAreaIds = form.watch("area_ids");
  const watchedGoalIds = form.watch("goal_ids");
  const selectedAreaIds = useMemo(() => watchedAreaIds ?? [], [watchedAreaIds]);
  const selectedGoalIds = useMemo(() => watchedGoalIds ?? [], [watchedGoalIds]);
  const selectedProjectId = form.watch("project_id");
  const isPending = createTask.isPending || updateTask.isPending;

  useEffect(() => {
    if (isGoalScoped || isProjectScoped) return;

    const invalidGoalIds = selectedGoalIds.filter((goalId) => {
      if (selectedProjectId) {
        const proj = projectById.get(selectedProjectId);
        if (proj?.linkedGoalIds?.length && !proj.linkedGoalIds.includes(goalId)) return true;
      }
      const goal = allGoals.find((g) => g.id === goalId);
      if (!goal) return true;
      if (selectedAreaIds.length === 0) return false;
      return !selectedAreaIds.some((areaId) => goalMatchesAreaId(goal, areaId));
    });

    if (invalidGoalIds.length > 0) {
      const nextGoalIds = selectedGoalIds.filter((id) => !invalidGoalIds.includes(id));
      form.setValue("goal_ids", nextGoalIds, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }
  }, [selectedAreaIds, selectedProjectId, allGoals, selectedGoalIds, form, isGoalScoped, isProjectScoped, projectById]);

  /** Goals visible in the goal selector — restricted to project-linked goals when project-scoped, or area-linked goals when an area is selected. */
  const visibleGoals = useMemo(() => {
    if (isProjectScoped && projectScoped?.linkedGoalIds?.length) {
      const allowedSet = new Set(projectScoped.linkedGoalIds);
      return goals.filter((goal) => allowedSet.has(goal.id));
    }

    if (!isGoalScoped) {
      return computeVisibleGoals(goals, selectedProjectId || null, selectedAreaIds, projectById);
    }

    return goals;
  }, [isGoalScoped, isProjectScoped, projectScoped, goals, selectedAreaIds, selectedProjectId, projectById]);

  const filteredProjects = useMemo(() => {
    if (isGoalScoped && goalScoped) {
      return filterAllowedProjectsForGoal(projects, goalScoped.allowedProjectIds);
    }

    if (allowedProjectIds && allowedProjectIds.length > 0) {
      return filterAllowedProjectsForGoal(projects, allowedProjectIds);
    }

    return computeFilteredProjects(projects, selectedGoalIds, selectedAreaIds);
  }, [goalScoped, isGoalScoped, projects, selectedAreaIds, selectedGoalIds, allowedProjectIds]);

  // Clear project_id when the currently-selected project is no longer in filteredProjects
  // (e.g. user picks a goal that the project doesn't belong to).
  useEffect(() => {
    if (isGoalScoped || isProjectScoped) return;
    if (!selectedProjectId) return;
    if (!filteredProjects.some((p) => p.id === selectedProjectId)) {
      form.setValue("project_id", "", {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }
  }, [filteredProjects, selectedProjectId, form, isGoalScoped, isProjectScoped]);

  /** Areas visible in the area selector — AND-intersection of goal and project areas. */
  const visibleAreas = useMemo(
    () =>
      computeVisibleAreas(
        areas,
        selectedGoalIds,
        selectedProjectId || null,
        projectById,
        goals,
      ),
    [areas, selectedGoalIds, selectedProjectId, projectById, goals],
  );

  useEffect(() => {
    if (isGoalScoped || isProjectScoped) return;

    const invalidAreaIds = selectedAreaIds.filter((areaId) => {
      if (selectedProjectId) {
        const proj = projectById.get(selectedProjectId);
        if (proj) {
          const projAreaIds = new Set([
            ...(proj.linkedAreaIds ?? []),
            ...(proj.area_id ? [proj.area_id] : []),
          ]);
          if (!projAreaIds.has(areaId)) return true;
        }
      }
      if (selectedGoalIds.length === 0) return false;
      return !selectedGoalIds.some((goalId) => {
        const goal = allGoals.find((g) => g.id === goalId);
        if (!goal) return false;
        return goalMatchesAreaId(goal, areaId);
      });
    });

    if (invalidAreaIds.length > 0) {
      const nextAreaIds = selectedAreaIds.filter((id) => !invalidAreaIds.includes(id));
      form.setValue("area_ids", nextAreaIds, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
    }
  }, [selectedGoalIds, selectedProjectId, allGoals, selectedAreaIds, form, isGoalScoped, isProjectScoped, projectById]);

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

    try {
      if (task) {
        const validation = updateTaskSchema.safeParse(values);

        if (!validation.success) {
          for (const issue of validation.error.issues) {
            const fieldName = issue.path[0];

            if (typeof fieldName === "string") {
              form.setError(fieldName as keyof TaskFormValues, {
                message: issue.message,
                type: "validate",
              });
            }
          }

          return;
        }

        await updateTask.mutateAsync({ id: task.id, input: validation.data });
      } else {
        // intentionally re-applied below for goal-scoped mode
        const validation = createTaskSchema.safeParse(values);

        if (!validation.success) {
          for (const issue of validation.error.issues) {
            const fieldName = issue.path[0];

            if (typeof fieldName === "string") {
              form.setError(fieldName as keyof TaskFormValues, {
                message: issue.message,
                type: "validate",
              });
            }
          }

          toast.error("Please fix the errors in the form.");
          return;
        }

        let payload: typeof validation.data;
        if (isGoalScoped && goalScoped) {
          payload = applyGoalScopedDefaults(validation.data as TaskFormValues, goalScoped);
        } else if (isProjectScoped && projectScoped) {
          payload = applyProjectScopedAreaGuard(validation.data, projectScoped);
        } else {
          payload = validation.data;
        }
        await createTask.mutateAsync(payload);
      }

      onOpenChange(false);
      onSuccess?.();
    } catch {
      // Mutation hooks already surface the error via toast.
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Create Task"}</DialogTitle>
          <DialogDescription>
            Capture the task details, connect it to your PARA chain, and mark the right
            urgency signals.
          </DialogDescription>
        </DialogHeader>

        <FormProvider {...form}>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <FormItem>
              <FormLabel>Task Name</FormLabel>
              <FormControl>
                <Input autoFocus placeholder="What needs to be done?" {...form.register("name")} />
              </FormControl>
              <FormMessage>{form.formState.errors.name?.message}</FormMessage>
            </FormItem>

            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add context, notes, or the next action"
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
                        <SelectItem value={TASK_STATUS.INBOX}>Inbox</SelectItem>
                        <SelectItem value={TASK_STATUS.TODO}>To Do</SelectItem>
                        <SelectItem value={TASK_STATUS.IN_PROGRESS}>In Progress</SelectItem>
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

            {/* Row 2: Due Date (full width) */}
            <FormItem>
              <FormLabel>Due Date</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  min={!task ? new Date().toISOString().split("T")[0] : undefined}
                  {...form.register("due_date")}
                />
              </FormControl>
              <FormMessage>{form.formState.errors.due_date?.message}</FormMessage>
            </FormItem>

            {/* Row 3: Area | Goals (compact dropdown) */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Area — all three scoped variants preserved, positional move only */}
              {isGoalScoped ? (
                <FormItem>
                  <div className="flex items-center justify-between gap-3">
                    <FormLabel>Area</FormLabel>
                    {scopedAreas.length > 1 && selectedAreaIds.length > 0 && (
                      <Badge variant="secondary">{selectedAreaIds.length} selected</Badge>
                    )}
                  </div>
                  {(() => {
                    if (scopedCandidateIds.length === 0 || scopedAreas.length === 0) {
                      return (
                        <div
                          className="flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
                          aria-readonly="true"
                          data-testid="task-dialog-area-locked"
                        >
                          {isScopedAreasLoading ? "Loading area…" : "Inherited from goal"}
                        </div>
                      );
                    }

                    if (scopedAreas.length === 1) {
                      return (
                        <div
                          className="flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
                          aria-readonly="true"
                          data-testid="task-dialog-area-locked"
                        >
                          {`${scopedAreas[0].icon ? `${scopedAreas[0].icon} ` : ""}${scopedAreas[0].name} (from goal)`}
                        </div>
                      );
                    }

                    return (
                      <Controller
                        control={form.control}
                        name="area_ids"
                        render={({ field }) => (
                          <ScrollArea
                            className="h-28 rounded-md border"
                            data-testid="task-dialog-area-scoped-multi"
                          >
                            <div className="space-y-2 p-3">
                              {scopedAreas.map((area) => {
                                const checked = (field.value ?? []).includes(area.id);
                                return (
                                  <label
                                    key={area.id}
                                    className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-1 transition-colors hover:bg-muted/40"
                                    data-testid={`task-dialog-scoped-area-option-${area.id}`}
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(next) => {
                                        const nextAreaIds =
                                          next === true
                                            ? Array.from(new Set([...(field.value ?? []), area.id]))
                                            : (field.value ?? []).filter((id) => id !== area.id);
                                        field.onChange(nextAreaIds);
                                      }}
                                    />
                                    <span className="text-sm">
                                      {area.icon ? `${area.icon} ` : ""}{area.name}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </ScrollArea>
                        )}
                      />
                    );
                  })()}
                </FormItem>
              ) : isProjectScoped ? (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Areas</FormLabel>
                    {scopedAreas.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                        >
                          {selectedAreaIds.length === 0
                            ? "Select areas..."
                            : `${selectedAreaIds.length} selected`}
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                            onClick={() => {
                              form.setValue("area_ids", [], { shouldDirty: true });
                            }}
                          >
                            Clear selection
                          </DropdownMenuItem>
                          <ScrollArea className="max-h-56">
                            {scopedAreas.map((area) => {
                              const isSelected = selectedAreaIds.includes(area.id);
                              return (
                                <DropdownMenuItem
                                  key={area.id}
                                  onSelect={(e) => e.preventDefault()}
                                  onClick={() => {
                                    const nextAreaIds = isSelected
                                      ? selectedAreaIds.filter((id) => id !== area.id)
                                      : [...selectedAreaIds, area.id];
                                    form.setValue("area_ids", nextAreaIds, { shouldDirty: true });
                                  }}
                                  className="flex items-center gap-2"
                                  data-testid={`task-dialog-scoped-area-option-${area.id}`}
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
                    )}
                  </div>
                  {scopedCandidateIds.length === 0 || scopedAreas.length === 0 ? (
                    <div
                      className="flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
                      aria-readonly="true"
                      data-testid="task-dialog-area-locked"
                    >
                      {isScopedAreasLoading ? "Loading area…" : "Inherited from project"}
                    </div>
                  ) : selectedAreaIds.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {selectedAreaIds
                        .map((id) => scopedAreas.find((area) => area.id === id))
                        .filter(Boolean)
                        .map((area) => (
                          <Badge
                            key={area!.id}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {area!.icon ? `${area!.icon} ` : ""}
                            {area!.name}
                            <button
                              type="button"
                              onClick={() => {
                                const nextAreaIds = selectedAreaIds.filter((id) => id !== area!.id);
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
                  <FormMessage>{form.formState.errors.area_ids?.message}</FormMessage>
                </FormItem>
              ) : (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Areas</FormLabel>
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        {selectedAreaIds.length === 0
                          ? "Select areas..."
                          : `${selectedAreaIds.length} selected`}
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuItem
                          onSelect={(e) => e.preventDefault()}
                          onClick={() => {
                            form.setValue("area_ids", [], { shouldDirty: true });
                          }}
                        >
                          Clear selection
                        </DropdownMenuItem>
                        {visibleAreas.map((area) => {
                          const checked = selectedAreaIds.includes(area.id);
                          return (
                            <DropdownMenuItem
                              key={area.id}
                              onSelect={(e) => e.preventDefault()}
                              onClick={() => {
                                const nextAreaIds = checked
                                  ? selectedAreaIds.filter((id) => id !== area.id)
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
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  {selectedAreaIds.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {selectedAreaIds
                        .map((id) => areas.find((area) => area.id === id))
                        .filter(Boolean)
                        .map((area) => (
                          <Badge
                            key={area!.id}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {area!.icon ? `${area!.icon} ` : ""}
                            {area!.name}
                            <button
                              type="button"
                              onClick={() => {
                                const nextAreaIds = selectedAreaIds.filter((id) => id !== area!.id);
                                form.setValue("area_ids", nextAreaIds, { shouldDirty: true });
                              }}
                              className="ml-1 rounded-full p-0.5 hover:bg-muted"
                            >
                              <X className="size-3" />
                            </button>
                          </Badge>
                        ))}
                    </div>
                  )}
                  <FormMessage>{form.formState.errors.area_ids?.message}</FormMessage>
                </FormItem>
              )}

              {/* Goals — compact dropdown (replaces ScrollArea) */}
              {isGoalScoped ? (
                <FormItem>
                  <FormLabel>Linked Goal</FormLabel>
                  <div
                    className="flex items-center gap-2 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground"
                    data-testid="task-dialog-goal-locked"
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
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()} onClick={() => form.setValue("goal_ids", [], { shouldDirty: true })}>
                          Clear selection
                        </DropdownMenuItem>
                        <ScrollArea className="max-h-56">
                          {visibleGoals.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground">
                              {isProjectScoped
                                ? "No goals linked to this project."
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
                        .map((id) => goals.find((g) => g.id === id))
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

            {/* Row 4: Project (full width) */}
            {isProjectScoped ? (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Project</FormLabel>
                  <div
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "pointer-events-none opacity-60 cursor-default")}
                    aria-readonly="true"
                    data-testid="task-dialog-project-locked"
                  >
                    {projectScoped?.projectName ?? "Inherited from project"}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    {projectScoped?.projectName ?? "Inherited from project"}
                  </Badge>
                </div>
              </FormItem>
            ) : (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Project</FormLabel>
                  <DropdownMenu>
                    <DropdownMenuTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
                      {!form.watch("project_id") ? "Select project..." : (projectById.get(form.watch("project_id"))?.name ?? "...")}
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        onClick={() => form.setValue("project_id", "", { shouldDirty: true })}
                      >
                        None
                      </DropdownMenuItem>
                      <ScrollArea className="max-h-56">
                        {filteredProjects.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">No projects available.</div>
                        ) : filteredProjects.map((project) => {
                          const isSelected = form.watch("project_id") === project.id;
                          return (
                            <DropdownMenuItem
                              key={project.id}
                              onSelect={(e) => e.preventDefault()}
                              onClick={() => {
                                const nextId = isSelected ? "" : project.id;
                                form.setValue("project_id", nextId, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
                              }}
                              className="flex items-center gap-2"
                            >
                              <Checkbox checked={isSelected} />
                              {project.name}
                            </DropdownMenuItem>
                          );
                        })}
                      </ScrollArea>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {form.watch("project_id") && projectById.get(form.watch("project_id")) && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      {projectById.get(form.watch("project_id"))!.name}
                      <button
                        type="button"
                        onClick={() => form.setValue("project_id", "", { shouldDirty: true })}
                        className="ml-1 rounded-full p-0.5 hover:bg-muted"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  </div>
                )}
                <FormMessage>{form.formState.errors.project_id?.message}</FormMessage>
              </FormItem>
            )}

            <div className="flex flex-wrap items-center gap-6 pt-1">
              <FormItem className="flex items-center gap-2 space-y-0">
                <Controller
                  control={form.control}
                  name="is_focused"
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                  )}
                />
                <FormLabel className="cursor-pointer text-sm font-normal">Focus</FormLabel>
              </FormItem>

              <FormItem className="flex items-center gap-2 space-y-0">
                <Controller
                  control={form.control}
                  name="is_important"
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                  )}
                />
                <FormLabel className="cursor-pointer text-sm font-normal">Important</FormLabel>
              </FormItem>

              <FormItem className="flex items-center gap-2 space-y-0">
                <Controller
                  control={form.control}
                  name="is_urgent"
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                    />
                  )}
                />
                <FormLabel className="cursor-pointer text-sm font-normal">Urgent</FormLabel>
              </FormItem>
            </div>

            <div className="flex items-center justify-between gap-3 pt-4">
              {task && (onArchiveToggle || onDelete) && (
                <span>
                  <TaskArchiveToggle
                    isArchived={task.is_archived}
                    mode="detail"
                    disabled={isPending}
                    onClick={() => {
                      if (onArchiveToggle) {
                        onArchiveToggle(task);
                      } else {
                        onDelete!(task.id);
                      }
                      onOpenChange(false);
                    }}
                  />
                </span>
              )}
              <div className="ml-auto flex gap-3">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  onClick={(event) => {
                    event.preventDefault();
                    void handleSubmit();
                  }}
                >
                  {isPending ? "Saving..." : task ? "Update Task" : "Create Task"}
                </Button>
              </div>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useMemo, useRef } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { Trash2 } from "lucide-react";
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
import { getGoalLinkedAreaIds, goalMatchesAreaId } from "@/lib/utils/goals";
import { createTaskSchema, updateTaskSchema } from "@/lib/validators/task.schema";
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
  goalId?: string;
  /**
   * When set, the dialog runs in goal-scoped mode:
   *  - the area is locked to the parent goal's area
   *  - goal linkage is locked to the parent goal only
   *  - project options are limited to projects already linked to the goal
   */
  goalScoped?: GoalScopedTaskConfig;
  /**
   * When set, the dialog runs in project-scoped mode:
   *  - the project is locked to the parent project (display: name, not UUID)
   *  - the area is locked to the parent project's primary area
   */
  projectScoped?: ProjectScopedTaskConfig;
  onSuccess?: () => void;
  /** Called when the user deletes an existing task. */
  onDelete?: (id: string) => void;
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

const UNASSIGNED_AREA_VALUE = "__unassigned_area__";
const UNASSIGNED_PROJECT_VALUE = "__unassigned_project__";

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
  goalId,
  goalScoped,
  projectScoped,
  onSuccess,
  onDelete,
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

  const selectedAreaIds = form.watch("area_ids") ?? [];
  const selectedGoalIds = form.watch("goal_ids") ?? [];
  const isPending = createTask.isPending || updateTask.isPending;

  useEffect(() => {
    if (isGoalScoped || isProjectScoped) return;

    const invalidGoalIds = selectedGoalIds.filter((goalId) => {
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
  }, [selectedAreaIds, allGoals, selectedGoalIds, form, isGoalScoped, isProjectScoped]);

  /** Goals visible in the goal selector — restricted to project-linked goals when project-scoped, or area-linked goals when an area is selected. */
  const visibleGoals = useMemo(() => {
    if (isProjectScoped && projectScoped?.linkedGoalIds?.length) {
      const allowedSet = new Set(projectScoped.linkedGoalIds);
      return goals.filter((goal) => allowedSet.has(goal.id));
    }

    if (!isGoalScoped && selectedAreaIds.length > 0) {
      return goals.filter((goal) =>
        selectedAreaIds.some((areaId) => goalMatchesAreaId(goal, areaId)),
      );
    }

    return goals;
  }, [isGoalScoped, isProjectScoped, projectScoped, goals, selectedAreaIds]);

  const filteredProjects = useMemo(() => {
    if (isGoalScoped && goalScoped) {
      return filterAllowedProjectsForGoal(projects, goalScoped.allowedProjectIds);
    }

    if (selectedAreaIds.length === 0) {
      return projects;
    }

    return projects.filter((project) =>
      selectedAreaIds.includes(project.area_id ?? ""),
    );
  }, [goalScoped, isGoalScoped, projects, selectedAreaIds]);

  /** Areas visible in the area selector — restricted to goal-linked areas when goals are selected. */
  const visibleAreas = useMemo(() => {
    if (selectedGoalIds.length === 0) {
      return areas;
    }

    const allowedAreaIds = new Set<string>();
    for (const goalId of selectedGoalIds) {
      const goal = goals.find((g) => g.id === goalId);
      if (goal) {
        for (const areaId of getGoalLinkedAreaIds(goal)) {
          allowedAreaIds.add(areaId);
        }
      }
    }

    return areas.filter((area) => allowedAreaIds.has(area.id));
  }, [areas, goals, selectedGoalIds]);

  useEffect(() => {
    if (isGoalScoped || isProjectScoped) return;

    const invalidAreaIds = selectedAreaIds.filter((areaId) => {
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
  }, [selectedGoalIds, allGoals, selectedAreaIds, form, isGoalScoped, isProjectScoped]);

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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                          {isScopedAreasLoading ? "Loading area…" : "Inherited from project"}
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
                          {`${scopedAreas[0].icon ? `${scopedAreas[0].icon} ` : ""}${scopedAreas[0].name} (from project)`}
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
              ) : (
                <FormItem>
                  <div className="flex items-center justify-between gap-3">
                    <FormLabel>Areas</FormLabel>
                    {selectedAreaIds.length > 0 && (
                      <Badge variant="secondary">{selectedAreaIds.length} selected</Badge>
                    )}
                  </div>
                  <Controller
                    control={form.control}
                    name="area_ids"
                    render={({ field }) => (
                      <ScrollArea className="h-32 rounded-md border">
                        <div className="space-y-2 p-3">
                          {visibleAreas.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No active areas available.</p>
                          ) : (
                            visibleAreas.map((area) => {
                              const checked = (field.value ?? []).includes(area.id);
                              return (
                                <label
                                  key={area.id}
                                  className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-1 transition-colors hover:bg-muted/40"
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(next) => {
                                      const nextAreaIds =
                                        next === true
                                          ? Array.from(new Set([...(field.value ?? []), area.id]))
                                          : (field.value ?? []).filter((id) => id !== area.id);
                                      field.onChange(nextAreaIds);
                                      const currentProjectId = form.getValues("project_id");
                                      if (
                                        currentProjectId &&
                                        nextAreaIds.length > 0 &&
                                        !nextAreaIds.includes(
                                          projectById.get(currentProjectId)?.area_id ?? "",
                                        )
                                      ) {
                                        form.setValue("project_id", "", {
                                          shouldDirty: true,
                                          shouldTouch: true,
                                          shouldValidate: true,
                                        });
                                      }
                                    }}
                                  />
                                  <span className="text-sm">
                                    {area.icon ? `${area.icon} ` : ""}{area.name}
                                  </span>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  />
                  <FormMessage>{form.formState.errors.area_ids?.message}</FormMessage>
                </FormItem>
              )}

              {isProjectScoped ? (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <div
                    className="flex h-9 w-full items-center rounded-md border border-input bg-muted/40 px-3 text-sm text-muted-foreground"
                    aria-readonly="true"
                    data-testid="task-dialog-project-locked"
                  >
                    {projectScoped?.projectName ?? "Inherited from project"}
                  </div>
                </FormItem>
              ) : (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Controller
                    control={form.control}
                    name="project_id"
                    render={({ field }) => {
                      const selectedProject = field.value ? projectById.get(field.value) : null;
                      return (
                        <Select
                          onValueChange={(value) => {
                            const nextProjectId = value === UNASSIGNED_PROJECT_VALUE ? "" : value;
                            field.onChange(nextProjectId);

                            const project = nextProjectId
                              ? projectById.get(nextProjectId)
                              : null;
                            if (project?.area_id) {
                              const currentAreaIds = form.getValues("area_ids") ?? [];
                              if (!currentAreaIds.includes(project.area_id)) {
                                form.setValue("area_ids", [...currentAreaIds, project.area_id], {
                                  shouldDirty: true,
                                  shouldTouch: true,
                                  shouldValidate: true,
                                });
                              }
                            }
                          }}
                          value={field.value || UNASSIGNED_PROJECT_VALUE}
                        >
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select project">
                                {selectedProject ? selectedProject.name : undefined}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value={UNASSIGNED_PROJECT_VALUE}>Unassigned</SelectItem>
                            {/*
                              Always include the currently-selected project so that the
                              trigger renders its name even when the project is filtered
                              out by the area scope or a goal-scoped allow list.
                            */}
                            {selectedProject &&
                            !filteredProjects.some((p) => p.id === selectedProject.id) ? (
                              <SelectItem
                                key={selectedProject.id}
                                value={selectedProject.id}
                              >
                                {selectedProject.name}
                              </SelectItem>
                            ) : null}
                            {filteredProjects.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      );
                    }}
                  />
                  <FormMessage>{form.formState.errors.project_id?.message}</FormMessage>
                </FormItem>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
                        <SelectItem value={TASK_STATUS.COMPLETED}>Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <FormMessage>{form.formState.errors.status?.message}</FormMessage>
              </FormItem>

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
            </div>

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
              <div className="flex items-center justify-between gap-3">
                <div>
                  <FormLabel>Linked Goals</FormLabel>
                  <p className="text-sm text-muted-foreground">
                    Smart Priority uses the actual linked goal count.
                  </p>
                </div>
                <Badge variant="secondary">
                  {selectedGoalIds.length} linked
                </Badge>
              </div>
              <ScrollArea className="h-40 rounded-md border">
                <div className="space-y-3 p-3">
                  {visibleGoals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {isProjectScoped
                        ? "No goals are linked to this project yet."
                        : "No active goals available yet."}
                    </p>
                  ) : (
                    visibleGoals.map((goal) => {
                      const checked = selectedGoalIds.includes(goal.id);

                      return (
                        <label
                          key={goal.id}
                          className="flex cursor-pointer items-start gap-3 rounded-md border p-3 transition-colors hover:bg-muted/40"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(nextValue) =>
                              handleGoalToggle(goal.id, nextValue === true)
                            }
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate font-medium">{goal.name}</span>
                              <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
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
                      );
                    })
                  )}
                </div>
              </ScrollArea>
              <FormMessage>{form.formState.errors.goal_ids?.message}</FormMessage>
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
              {task && onDelete && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={isPending}
                  onClick={() => {
                    onDelete(task.id);
                    onOpenChange(false);
                  }}
                >
                  <Trash2 className="mr-1 size-4" />
                  Delete
                </Button>
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

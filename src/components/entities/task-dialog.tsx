"use client";

import { useEffect, useMemo } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";

import { useAreas } from "@/lib/hooks/use-areas";
import { useGoals } from "@/lib/hooks/use-goals";
import { useProjects } from "@/lib/hooks/use-projects";
import {
  useCreateTask,
  useTaskWithRelations,
  useUpdateTask,
} from "@/lib/hooks/use-tasks";
import { Task } from "@/lib/types/domain.types";
import { PRIORITY, TASK_STATUS } from "@/lib/utils/constants";
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

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  defaultProjectId?: string;
  defaultAreaId?: string;
  onSuccess?: () => void;
}

interface TaskFormValues {
  area_id: string;
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
  area_id: "",
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
  defaultAreaId?: string,
  defaultProjectId?: string,
): TaskFormValues {
  if (!task) {
    return {
      ...EMPTY_FORM_VALUES,
      area_id: defaultAreaId ?? "",
      project_id: defaultProjectId ?? "",
    };
  }

  return {
    area_id: task.area_id ?? "",
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
  onSuccess,
}: TaskDialogProps) {
  const { data: allAreas = [] } = useAreas();
  const { data: allGoals = [] } = useGoals({ status: "all" });
  const { data: allProjects = [] } = useProjects({ status: "all" });
  const { data: taskRelations } = useTaskWithRelations(task?.id ?? "");

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
  const linkedGoalIds = taskRelations?.goal_ids ?? [];

  const form = useForm<TaskFormValues>({
    defaultValues: EMPTY_FORM_VALUES,
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    form.reset(buildTaskFormValues(task, linkedGoalIds, defaultAreaId, defaultProjectId));
  }, [defaultAreaId, defaultProjectId, form, linkedGoalIds, open, task]);

  const selectedAreaId = form.watch("area_id");
  const selectedGoalIds = form.watch("goal_ids") ?? [];
  const isPending = createTask.isPending || updateTask.isPending;

  const filteredProjects = useMemo(() => {
    if (!selectedAreaId) {
      return projects;
    }

    return projects.filter((project) => project.area_id === selectedAreaId);
  }, [projects, selectedAreaId]);

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

          return;
        }

        await createTask.mutateAsync(validation.data);
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
              <FormItem>
                <FormLabel>Area</FormLabel>
                <Controller
                  control={form.control}
                  name="area_id"
                  render={({ field }) => (
                    <Select
                      onValueChange={(value) => {
                        const nextAreaId = value === UNASSIGNED_AREA_VALUE ? "" : value;
                        field.onChange(nextAreaId);

                        const currentProjectId = form.getValues("project_id");
                        if (
                          currentProjectId &&
                          projectById.get(currentProjectId)?.area_id !== nextAreaId
                        ) {
                          form.setValue("project_id", "", {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          });
                        }
                      }}
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
                            {area.icon ? `${area.icon} ` : ""}
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
                <FormLabel>Project</FormLabel>
                <Controller
                  control={form.control}
                  name="project_id"
                  render={({ field }) => (
                    <Select
                      onValueChange={(value) => {
                        const nextProjectId = value === UNASSIGNED_PROJECT_VALUE ? "" : value;
                        field.onChange(nextProjectId);

                        const project = nextProjectId ? projectById.get(nextProjectId) : null;
                        if (project?.area_id) {
                          form.setValue("area_id", project.area_id, {
                            shouldDirty: true,
                            shouldTouch: true,
                            shouldValidate: true,
                          });
                        }
                      }}
                      value={field.value || UNASSIGNED_PROJECT_VALUE}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={UNASSIGNED_PROJECT_VALUE}>Unassigned</SelectItem>
                        {filteredProjects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FormMessage>{form.formState.errors.project_id?.message}</FormMessage>
              </FormItem>
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
                    Smart Priority uses the actual linked goal count.
                  </p>
                </div>
                <Badge variant="secondary">
                  {selectedGoalIds.length} linked
                </Badge>
              </div>
              <ScrollArea className="h-40 rounded-md border">
                <div className="space-y-3 p-3">
                  {goals.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No active goals available yet.
                    </p>
                  ) : (
                    goals.map((goal) => {
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

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : task ? "Update Task" : "Create Task"}
              </Button>
            </div>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

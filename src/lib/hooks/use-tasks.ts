import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { AREAS_QUERY_KEY, AREA_DETAIL_QUERY_KEY } from "@/lib/hooks/use-areas";
import { CONTACTS_QUERY_KEY } from "@/lib/hooks/use-contacts";
import { GOAL_DETAIL_QUERY_KEY } from "@/lib/hooks/use-goal-detail";
import { GOALS_QUERY_KEY } from "@/lib/hooks/use-goals";
import { PROJECTS_QUERY_KEY } from "@/lib/hooks/use-projects";
import { DASHBOARD_QUERY_KEY } from "@/lib/services/dashboard.service";
import { taskService } from "../services/task.service";
import { CreateTaskInput, Task, UpdateTaskInput } from "../types/domain.types";

export const TASKS_QUERY_KEY = "tasks";

function invalidateTaskGraph(queryClient: ReturnType<typeof useQueryClient>): Promise<unknown[]> {
  // Derived-progress list caches (areas/goals/projects) need refetchType: "all" because the
  // global query-provider sets refetchOnMount: false — without it, invalidated-but-inactive
  // queries stay stale until manual refresh when the user navigates back.
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] }),
    queryClient.invalidateQueries({ queryKey: [AREAS_QUERY_KEY], refetchType: "all" }),
    queryClient.invalidateQueries({ queryKey: [GOALS_QUERY_KEY], refetchType: "all" }),
    queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY], refetchType: "all" }),
    queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY], refetchType: "all" }),
    queryClient.invalidateQueries({ queryKey: [DASHBOARD_QUERY_KEY] }),
    queryClient.invalidateQueries({ queryKey: [AREA_DETAIL_QUERY_KEY] }),
    queryClient.invalidateQueries({ queryKey: [GOAL_DETAIL_QUERY_KEY] }),
  ]);
}

// Narrow invalidation for mutations that don't affect area/goal/project counts
function invalidateTaskCoreGraph(
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<unknown[]> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] }),
    queryClient.invalidateQueries({ queryKey: [DASHBOARD_QUERY_KEY] }),
  ]);
}

export function useTasks(options?: { enabled?: boolean }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [TASKS_QUERY_KEY],
    queryFn: () => taskService.list(user!.id),
    enabled: !!user && (options?.enabled ?? true),
  });
}

/**
 * Lists tasks where `is_archived = true`. Used by the Archive tab on the
 * tasks page so that archived tasks remain visible after archival.
 *
 * `useTasks()` filters archived tasks out at the service layer, so the
 * archive tab cannot derive its data from that cache.
 */
export function useArchivedTasks(options?: { enabled?: boolean }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [TASKS_QUERY_KEY, "archived"],
    queryFn: () => taskService.listArchived(user!.id),
    enabled: !!user && (options?.enabled ?? true),
  });
}

export function useTask(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [TASKS_QUERY_KEY, id],
    queryFn: () => taskService.getById(user!.id, id),
    enabled: !!user && !!id,
  });
}

export function useTaskWithRelations(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [TASKS_QUERY_KEY, "relations", id],
    queryFn: () => taskService.getWithRelations(user!.id, id),
    enabled: !!user && !!id,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (input: CreateTaskInput) => taskService.create(user!.id, input),
    onSuccess: async () => {
      await invalidateTaskGraph(queryClient);
      queryClient.invalidateQueries({ queryKey: ["goal-detail"] });
      toast.success("Task created");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create task");
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      taskService.update(user!.id, id, input),
    onSuccess: async () => {
      await invalidateTaskCoreGraph(queryClient);
      queryClient.invalidateQueries({ queryKey: [GOAL_DETAIL_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [AREA_DETAIL_QUERY_KEY] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update task");
    },
  });
}

/** @deprecated Use `useArchiveTask` instead. Kept as alias for backwards compat. */
export function useDeleteTask() {
  return useArchiveTask();
}

export function useArchiveTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => taskService.archive(user!.id, id),
    onSuccess: async () => {
      await invalidateTaskGraph(queryClient);
      toast.success("Task archived");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to archive task");
    },
  });
}

export function useRestoreTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => taskService.restore(user!.id, id),
    onSuccess: async () => {
      await invalidateTaskGraph(queryClient);
      toast.success("Task restored");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to restore task");
    },
  });
}

export function usePermanentDeleteTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => taskService.permanentDelete(user!.id, id),
    onSuccess: async () => {
      await invalidateTaskGraph(queryClient);
      toast.success("Task permanently deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete task");
    },
  });
}

export function useCompleteTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => taskService.complete(user!.id, id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: [TASKS_QUERY_KEY] });
      const previousData = queryClient.getQueriesData<Task[]>({ queryKey: [TASKS_QUERY_KEY] });

      queryClient.setQueriesData<Task[]>({ queryKey: [TASKS_QUERY_KEY] }, (old) => {
        if (!Array.isArray(old)) {
          return old;
        }

        return old.map((task) =>
          task.id === id
            ? { ...task, completed_at: new Date().toISOString(), is_completed: true }
            : task,
        );
      });

      return { previousData };
    },
    onSuccess: (_completedTask, id) => {
      toast.success("Task completed", {
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await taskService.uncomplete(user!.id, id);
              await invalidateTaskGraph(queryClient);
              toast.success("Task restored");
            } catch {
              toast.error("Failed to undo");
            }
          },
        },
      });
    },
    onError: (_error, _id, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      toast.error("Failed to complete task");
    },
    onSettled: async () => {
      await invalidateTaskGraph(queryClient);
      queryClient.invalidateQueries({ queryKey: ["goal-detail"] });
    },
  });
}

export function useUncompleteTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => taskService.uncomplete(user!.id, id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: [TASKS_QUERY_KEY] });
      const previousData = queryClient.getQueriesData<Task[]>({ queryKey: [TASKS_QUERY_KEY] });

      queryClient.setQueriesData<Task[]>({ queryKey: [TASKS_QUERY_KEY] }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((task) =>
          task.id === id
            ? { ...task, completed_at: null, is_completed: false }
            : task,
        );
      });

      return { previousData };
    },
    onError: (_error, _id, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      toast.error("Failed to restore task");
    },
    onSettled: async () => {
      await invalidateTaskGraph(queryClient);
      queryClient.invalidateQueries({ queryKey: ["goal-detail"] });
    },
  });
}

export function useFocusTask() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ id, is_focused }: { id: string; is_focused: boolean }) =>
      taskService.update(user!.id, id, { is_focused }),
    onMutate: async ({ id, is_focused }) => {
      await queryClient.cancelQueries({ queryKey: [TASKS_QUERY_KEY] });
      await queryClient.cancelQueries({ queryKey: [AREA_DETAIL_QUERY_KEY] });
      await queryClient.cancelQueries({ queryKey: [GOAL_DETAIL_QUERY_KEY] });
      const previousData = queryClient.getQueriesData<Task[]>({ queryKey: [TASKS_QUERY_KEY] });
      const previousAreaDetailData = queryClient.getQueriesData<unknown>({ queryKey: [AREA_DETAIL_QUERY_KEY] });
      const previousGoalDetailData = queryClient.getQueriesData<unknown>({ queryKey: [GOAL_DETAIL_QUERY_KEY] });

      queryClient.setQueriesData<Task[]>({ queryKey: [TASKS_QUERY_KEY] }, (old) => {
        if (!Array.isArray(old)) {
          return old;
        }

        return old.map((task) => (task.id === id ? { ...task, is_focused } : task));
      });

      // Optimistically update the area-detail cache so the focus icon
      // updates instantly on the area detail page.
      queryClient.setQueriesData<{ tasks?: Task[]; archivedTasks?: Task[] } | undefined>(
        { queryKey: [AREA_DETAIL_QUERY_KEY] },
        (old) => {
          if (!old) return old;
          const patchTask = (t: Task) => (t.id === id ? { ...t, is_focused } : t);
          return {
            ...old,
            tasks: old.tasks ? old.tasks.map(patchTask) : old.tasks,
            archivedTasks: old.archivedTasks ? old.archivedTasks.map(patchTask) : old.archivedTasks,
          };
        },
      );

      // Mirror the same patch into the goal-detail cache. Without this,
      // toggling Focus on the goal detail page does not flip the icon
      // until a manual refresh, because goalData.tasks is the only source
      // of truth on that page.
      queryClient.setQueriesData<{ tasks?: Task[] } | undefined>(
        { queryKey: [GOAL_DETAIL_QUERY_KEY] },
        (old) => {
          if (!old) return old;
          const patchTask = (t: Task) => (t.id === id ? { ...t, is_focused } : t);
          return {
            ...old,
            tasks: old.tasks ? old.tasks.map(patchTask) : old.tasks,
          };
        },
      );

      return { previousData, previousAreaDetailData, previousGoalDetailData };
    },
    onError: (_error, _vars, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousAreaDetailData) {
        context.previousAreaDetailData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousGoalDetailData) {
        context.previousGoalDetailData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: async () => {
      await invalidateTaskCoreGraph(queryClient);
      queryClient.invalidateQueries({ queryKey: [GOAL_DETAIL_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [AREA_DETAIL_QUERY_KEY] });
    },
  });
}

export function useTasksByGoal(goalId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [TASKS_QUERY_KEY, "byGoal", user?.id ?? null, goalId],
    queryFn: () => taskService.listByGoal(user!.id, goalId),
    enabled: !!user && !!goalId,
  });
}

export function useCompleteTaskWithGoalRefresh() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => taskService.complete(user!.id, id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: [TASKS_QUERY_KEY] });
      const previousData = queryClient.getQueriesData<Task[]>({ queryKey: [TASKS_QUERY_KEY] });

      queryClient.setQueriesData<Task[]>({ queryKey: [TASKS_QUERY_KEY] }, (old) => {
        if (!Array.isArray(old)) {
          return old;
        }

        return old.map((task) =>
          task.id === id
            ? { ...task, completed_at: new Date().toISOString(), is_completed: true }
            : task,
        );
      });

      return { previousData };
    },
    onSuccess: (_completedTask, id) => {
      toast.success("Task completed", {
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await taskService.uncomplete(user!.id, id);
              await invalidateTaskGraph(queryClient);
              toast.success("Task restored");
            } catch {
              toast.error("Failed to undo");
            }
          },
        },
      });
    },
    onError: (_error, _id, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }

      toast.error("Failed to complete task");
    },
    onSettled: async () => {
      await invalidateTaskGraph(queryClient);
      queryClient.invalidateQueries({ queryKey: [GOAL_DETAIL_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [AREA_DETAIL_QUERY_KEY] });
    },
  });
}

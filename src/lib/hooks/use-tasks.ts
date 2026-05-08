import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { AREAS_QUERY_KEY, AREA_DETAIL_QUERY_KEY } from "@/lib/hooks/use-areas";
import { GOALS_QUERY_KEY } from "@/lib/hooks/use-goals";
import { PROJECTS_QUERY_KEY } from "@/lib/hooks/use-projects";
import { DASHBOARD_QUERY_KEY } from "@/lib/services/dashboard.service";
import { taskService } from "../services/task.service";
import { CreateTaskInput, Task, UpdateTaskInput } from "../types/domain.types";

export const TASKS_QUERY_KEY = "tasks";

function invalidateTaskGraph(queryClient: ReturnType<typeof useQueryClient>): Promise<unknown[]> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: [TASKS_QUERY_KEY] }),
    queryClient.invalidateQueries({ queryKey: [AREAS_QUERY_KEY] }),
    queryClient.invalidateQueries({ queryKey: [GOALS_QUERY_KEY] }),
    queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY] }),
    queryClient.invalidateQueries({ queryKey: [DASHBOARD_QUERY_KEY] }),
    queryClient.invalidateQueries({ queryKey: [AREA_DETAIL_QUERY_KEY] }),
  ]);
}

export function useTasks() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [TASKS_QUERY_KEY],
    queryFn: () => taskService.list(user!.id),
    enabled: !!user,
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
      await invalidateTaskGraph(queryClient);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update task");
    },
  });
}

export function useDeleteTask() {
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
      const previousData = queryClient.getQueriesData<Task[]>({ queryKey: [TASKS_QUERY_KEY] });

      queryClient.setQueriesData<Task[]>({ queryKey: [TASKS_QUERY_KEY] }, (old) => {
        if (!Array.isArray(old)) {
          return old;
        }

        return old.map((task) => (task.id === id ? { ...task, is_focused } : task));
      });

      return { previousData };
    },
    onError: (_error, _vars, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: async () => {
      await invalidateTaskGraph(queryClient);
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
      // Also invalidate goal detail queries so completion % updates in real time
      queryClient.invalidateQueries({ queryKey: ["goal-detail"] });
    },
  });
}

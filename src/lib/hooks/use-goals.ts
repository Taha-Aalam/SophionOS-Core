import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { AREAS_QUERY_KEY } from "@/lib/hooks/use-areas";

import { goalService } from "../services/goal.service";
import { CreateGoalInput, Goal, UpdateGoalInput } from "../types/domain.types";
import type { GoalStatusFilter, GoalTermFilter } from "../utils/goals";

export const GOALS_QUERY_KEY = "goals";

export interface GoalQueryFilters {
  term?: GoalTermFilter;
  priority?: string;
  areaId?: string;
  status?: GoalStatusFilter;
}

export function useGoals(filters: GoalQueryFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [GOALS_QUERY_KEY, filters],
    queryFn: () => goalService.list(user!.id, filters),
    enabled: !!user,
  });
}

export function useGoal(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [GOALS_QUERY_KEY, id],
    queryFn: () => goalService.getById(user!.id, id),
    enabled: !!user && !!id,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (input: CreateGoalInput) => goalService.create(user!.id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GOALS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [AREAS_QUERY_KEY] });
      toast.success("Goal created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create goal");
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateGoalInput }) =>
      goalService.update(user!.id, id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GOALS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [AREAS_QUERY_KEY] });
      toast.success("Goal updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update goal");
    },
  });
}

export function useArchiveGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => goalService.archive(user!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GOALS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [AREAS_QUERY_KEY] });
      toast.success("Goal archived");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to archive goal");
    },
  });
}

export function useCompleteGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => goalService.update(user!.id, id, {
      is_completed: true,
      progress: 100,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GOALS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [AREAS_QUERY_KEY] });
      toast.success("Goal marked as completed!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to complete goal");
    },
  });
}

export function useRestoreGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => goalService.restore(user!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [GOALS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [AREAS_QUERY_KEY] });
      toast.success("Goal restored");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to restore goal");
    },
  });
}

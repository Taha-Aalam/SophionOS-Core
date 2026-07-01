import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { AREAS_QUERY_KEY, AREA_DETAIL_QUERY_KEY } from "@/lib/hooks/use-areas";
import {
  GOAL_DETAIL_QUERY_KEY,
  type GoalDetailData,
} from "@/lib/hooks/use-goal-detail";

import { goalService } from "../services/goal.service";
import { entityLimitToastMessage } from "@/lib/entity-limit";
import { CreateGoalInput, Goal, UpdateGoalInput } from "../types/domain.types";
import {
  calculateGoalProgress,
  mergeGoalIntoFilteredList,
  type GoalListFilters,
  type GoalStatusFilter,
  type GoalTermFilter,
} from "../utils/goals";

export const GOALS_QUERY_KEY = "goals";

function invalidateGoalGraph(
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<unknown[]> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: [GOALS_QUERY_KEY] }),
    queryClient.invalidateQueries({ queryKey: [AREAS_QUERY_KEY] }),
    queryClient.invalidateQueries({ queryKey: [GOAL_DETAIL_QUERY_KEY] }),
    queryClient.invalidateQueries({ queryKey: [AREA_DETAIL_QUERY_KEY] }),
  ]);
}

// Narrow invalidation for mutations that don't affect area counts
function invalidateGoalCoreGraph(
  queryClient: ReturnType<typeof useQueryClient>,
): Promise<unknown[]> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: [GOALS_QUERY_KEY] }),
    queryClient.invalidateQueries({ queryKey: [GOAL_DETAIL_QUERY_KEY] }),
  ]);
}

interface GoalMutationContext {
  previousGoalDetails: Array<[readonly unknown[], GoalDetailData | undefined]>;
  previousGoals: Array<[readonly unknown[], Goal | Goal[] | undefined]>;
}

type GoalPatch = Partial<Goal> & { area_ids?: string[] };

function patchGoalCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  nextGoal: Goal,
  previousGoals: Array<[readonly unknown[], Goal | Goal[] | undefined]>,
): void {
  for (const [queryKey, data] of previousGoals) {
    if (Array.isArray(data)) {
      const filters =
        typeof queryKey[1] === "object" && queryKey[1] !== null
          ? (queryKey[1] as GoalListFilters)
          : {};
      queryClient.setQueryData(queryKey, mergeGoalIntoFilteredList(data, nextGoal, filters));
      continue;
    }

    if (data?.id === nextGoal.id) {
      queryClient.setQueryData(queryKey, nextGoal);
    }
  }

  queryClient.setQueriesData<GoalDetailData | undefined>(
    { queryKey: [GOAL_DETAIL_QUERY_KEY] },
    (current) => {
      if (!current || current.goal.id !== nextGoal.id) {
        return current;
      }

      return {
        ...current,
        goal: nextGoal,
      };
    },
  );
}

function syncResolvedGoalCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  nextGoal: Goal,
): void {
  patchGoalCaches(
    queryClient,
    nextGoal,
    queryClient.getQueriesData<Goal | Goal[] | undefined>({
      queryKey: [GOALS_QUERY_KEY],
    }),
  );
}

async function optimisticallyPatchGoal(
  queryClient: ReturnType<typeof useQueryClient>,
  goalId: string,
  patch: GoalPatch,
): Promise<GoalMutationContext> {
  await Promise.all([
    queryClient.cancelQueries({ queryKey: [GOALS_QUERY_KEY] }),
    queryClient.cancelQueries({ queryKey: [GOAL_DETAIL_QUERY_KEY] }),
  ]);

  const previousGoals = queryClient.getQueriesData<Goal | Goal[] | undefined>({
    queryKey: [GOALS_QUERY_KEY],
  });
  const previousGoalDetails = queryClient.getQueriesData<GoalDetailData | undefined>({
    queryKey: [GOAL_DETAIL_QUERY_KEY],
  });
  const goalDetailData = previousGoalDetails.find(([, data]) => data?.goal.id === goalId)?.[1];

  const cachedSingleGoal = previousGoals
    .map(([, data]) => data)
    .find((data): data is Goal => !Array.isArray(data) && data?.id === goalId);
  const cachedListGoal = previousGoals
    .flatMap(([, data]) => (Array.isArray(data) ? data : []))
    .find((goal) => goal.id === goalId);
  const currentGoal: Goal | undefined = goalDetailData?.goal ?? cachedSingleGoal ?? cachedListGoal;

  if (!currentGoal) {
    return {
      previousGoalDetails,
      previousGoals,
    };
  }

  const nextPatch: Partial<Goal> = { ...patch };
  if (patch.area_ids !== undefined) {
    nextPatch.linkedAreaIds = [...patch.area_ids];
    nextPatch.area_id = patch.area_ids[0] ?? null;
    delete (nextPatch as GoalPatch).area_ids;
  }
  if (patch.is_completed === true && patch.progress === undefined) {
    nextPatch.progress = 100;
  } else if (patch.is_completed === false && patch.progress === undefined && goalDetailData) {
    nextPatch.progress = calculateGoalProgress(
      { ...currentGoal, is_completed: false, progress: 0 },
      goalDetailData.projects,
      goalDetailData.tasks,
      goalDetailData.notes,
      goalDetailData.resources,
    );
  } else if (patch.is_completed === false && patch.progress === undefined) {
    nextPatch.progress = 0;
  }

  const nextGoal: Goal = {
    ...currentGoal,
    ...nextPatch,
  };

  patchGoalCaches(queryClient, nextGoal, previousGoals);

  return {
    previousGoalDetails,
    previousGoals,
  };
}

function restoreGoalCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  context?: GoalMutationContext,
): void {
  context?.previousGoals.forEach(([queryKey, data]) => {
    queryClient.setQueryData(queryKey, data);
  });
  context?.previousGoalDetails.forEach(([queryKey, data]) => {
    queryClient.setQueryData(queryKey, data);
  });
}

export interface GoalQueryFilters {
  term?: GoalTermFilter;
  priority?: string;
  areaId?: string;
  status?: GoalStatusFilter;
}

export function useGoals(filters: GoalQueryFilters, options?: { enabled?: boolean }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [GOALS_QUERY_KEY, filters],
    queryFn: () => goalService.list(user!.id, filters),
    enabled: !!user && (options?.enabled ?? true),
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
      invalidateGoalGraph(queryClient);
      toast.success("Goal created successfully");
    },
    onError: (error: Error) => {
      toast.error(entityLimitToastMessage(error, "Failed to create goal"));
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateGoalInput }) =>
      goalService.update(user!.id, id, input),
    onMutate: async ({ id, input }) => optimisticallyPatchGoal(queryClient, id, input),
    onSuccess: (updatedGoal) => {
      syncResolvedGoalCaches(queryClient, updatedGoal);
      toast.success("Goal updated successfully");
    },
    onError: (error: Error, _variables, context) => {
      restoreGoalCaches(queryClient, context);
      toast.error(error.message || "Failed to update goal");
    },
    onSettled: async () => {
      await invalidateGoalCoreGraph(queryClient);
    },
  });
}

export function useArchiveGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => goalService.archive(user!.id, id),
    onMutate: async (id: string) =>
      optimisticallyPatchGoal(queryClient, id, { is_archived: true }),
    onSuccess: (updatedGoal) => {
      syncResolvedGoalCaches(queryClient, updatedGoal);
      toast.success("Goal archived");
    },
    onError: (error: Error, _id, context) => {
      restoreGoalCaches(queryClient, context);
      toast.error(error.message || "Failed to archive goal");
    },
    onSettled: async () => {
      await invalidateGoalCoreGraph(queryClient);
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
    onMutate: async (id: string) =>
      optimisticallyPatchGoal(queryClient, id, { is_completed: true, progress: 100 }),
    onSuccess: (updatedGoal) => {
      syncResolvedGoalCaches(queryClient, updatedGoal);
      toast.success("Goal marked as completed!");
    },
    onError: (error: Error, _id, context) => {
      restoreGoalCaches(queryClient, context);
      toast.error(error.message || "Failed to complete goal");
    },
    onSettled: async () => {
      await invalidateGoalCoreGraph(queryClient);
    },
  });
}

export function useRestoreGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => goalService.restore(user!.id, id),
    onMutate: async (id: string) =>
      optimisticallyPatchGoal(queryClient, id, { is_archived: false }),
    onSuccess: (updatedGoal) => {
      syncResolvedGoalCaches(queryClient, updatedGoal);
      toast.success("Goal restored");
    },
    onError: (error: Error, _id, context) => {
      restoreGoalCaches(queryClient, context);
      toast.error(error.message || "Failed to restore goal");
    },
    onSettled: async () => {
      await invalidateGoalCoreGraph(queryClient);
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => goalService.delete(user!.id, id),
    onSuccess: async () => {
      await invalidateGoalGraph(queryClient);
      toast.success("Goal deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete goal");
    },
  });
}

export function useLinkGoalToArea() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ goalId, areaId }: { goalId: string; areaId: string }) =>
      goalService.linkToArea(user!.id, goalId, areaId),
    onSuccess: async () => {
      await invalidateGoalGraph(queryClient);
      toast.success("Area linked to goal");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to link area to goal");
    },
  });
}

export function useUnlinkGoalFromArea() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ goalId, areaId }: { goalId: string; areaId: string }) =>
      goalService.unlinkFromArea(user!.id, goalId, areaId),
    onSuccess: async () => {
      await invalidateGoalGraph(queryClient);
      toast.success("Area unlinked from goal");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to unlink area from goal");
    },
  });
}

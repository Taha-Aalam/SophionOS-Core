import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { resourceService } from "@/lib/services/resource.service";
import type {
  CreateResourceInput,
  Resource,
  UpdateResourceInput,
} from "@/lib/types/domain.types";
import type { ResourceStatus } from "@/lib/utils/constants";

export const RESOURCES_QUERY_KEY = "resources";

export function useResources(filters?: {
  status?: ResourceStatus | "all";
  favorite?: boolean;
  areaId?: string;
  projectId?: string;
  topicId?: string;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [RESOURCES_QUERY_KEY, "list", user?.id ?? null, filters ?? {}],
    queryFn: () => resourceService.list(user!.id, filters),
    enabled: !!user,
  });
}

export function useResource(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [RESOURCES_QUERY_KEY, "detail", user?.id ?? null, id],
    queryFn: () => resourceService.getById(user!.id, id),
    enabled: !!user && !!id,
  });
}

export function useResourcesByArea(areaId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [RESOURCES_QUERY_KEY, "byArea", user?.id ?? null, areaId],
    queryFn: () => resourceService.listByArea(user!.id, areaId),
    enabled: !!user && !!areaId,
  });
}

export function useResourcesByProject(projectId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [RESOURCES_QUERY_KEY, "byProject", user?.id ?? null, projectId],
    queryFn: () => resourceService.listByProject(user!.id, projectId),
    enabled: !!user && !!projectId,
  });
}

export function useResourcesByTopic(topicId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [RESOURCES_QUERY_KEY, "byTopic", user?.id ?? null, topicId],
    queryFn: () => resourceService.listByTopic(user!.id, topicId),
    enabled: !!user && !!topicId,
  });
}

export function useResourcesByGoal(goalId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [RESOURCES_QUERY_KEY, "byGoal", user?.id ?? null, goalId],
    queryFn: () => resourceService.listByGoal(user!.id, goalId),
    enabled: !!user && !!goalId,
  });
}

export function useLinkResourceToGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ resourceId, goalId }: { resourceId: string; goalId: string }) =>
      resourceService.linkToGoal(goalId, resourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RESOURCES_QUERY_KEY] });
      toast.success("Resource linked to goal");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to link resource to goal");
    },
  });
}

export function useUnlinkResourceFromGoal() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ resourceId, goalId }: { resourceId: string; goalId: string }) =>
      resourceService.unlinkFromGoal(goalId, resourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RESOURCES_QUERY_KEY] });
      toast.success("Resource unlinked from goal");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to unlink resource from goal");
    },
  });
}

export function useFavoriteResources() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [RESOURCES_QUERY_KEY, "favorites", user?.id ?? null],
    queryFn: () => resourceService.listFavorites(user!.id),
    enabled: !!user,
  });
}

export function useArchivedResources() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [RESOURCES_QUERY_KEY, "archived", user?.id ?? null],
    queryFn: () => resourceService.listArchived(user!.id),
    enabled: !!user,
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (input: CreateResourceInput) => resourceService.create(user!.id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [RESOURCES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ["goal-detail"] });
      toast.success("Resource created");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create resource");
    },
  });
}

export function useCreateResourceWithGoal(goalId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (input: CreateResourceInput) =>
      resourceService.create(user!.id, { ...input, goal_ids: [goalId] }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [RESOURCES_QUERY_KEY] });
      toast.success("Resource created");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create resource");
    },
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateResourceInput }) =>
      resourceService.update(user!.id, id, input),
    onSuccess: async (updated: Resource) => {
      queryClient.setQueryData(
        [RESOURCES_QUERY_KEY, "detail", user?.id ?? null, updated.id],
        updated,
      );
      await queryClient.invalidateQueries({ queryKey: [RESOURCES_QUERY_KEY] });
      toast.success("Resource updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update resource");
    },
  });
}

export function useArchiveResource() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => resourceService.archive(user!.id, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [RESOURCES_QUERY_KEY] });
      toast.success("Resource archived");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to archive resource");
    },
  });
}

export function useDeleteResource() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => resourceService.delete(user!.id, id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [RESOURCES_QUERY_KEY] });
      toast.success("Resource deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete resource");
    },
  });
}

export function useToggleFavoriteResource() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) =>
      resourceService.update(user!.id, id, { favorite }),
    onMutate: async ({ id, favorite }) => {
      await queryClient.cancelQueries({ queryKey: [RESOURCES_QUERY_KEY] });
      const previous = queryClient.getQueryData<Resource>([
        RESOURCES_QUERY_KEY,
        "detail",
        user?.id ?? null,
        id,
      ]);
      queryClient.setQueriesData<Resource[]>(
        { queryKey: [RESOURCES_QUERY_KEY, "list"] },
        (current) => {
          if (!Array.isArray(current)) return current;
          return current.map((r) => (r.id === id ? { ...r, favorite } : r));
        },
      );
      queryClient.setQueryData<Resource>(
        [RESOURCES_QUERY_KEY, "detail", user?.id ?? null, id],
        (current) => (current ? { ...current, favorite } : current),
      );
      return { previous };
    },
    onError: (error: Error, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          [RESOURCES_QUERY_KEY, "detail", user?.id ?? null, variables.id],
          context.previous,
        );
      }
      queryClient.invalidateQueries({ queryKey: [RESOURCES_QUERY_KEY] });
      toast.error(error.message || "Failed to update favorite");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [RESOURCES_QUERY_KEY] });
    },
  });
}
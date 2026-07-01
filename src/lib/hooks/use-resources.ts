import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { formatValidationMessage } from "@/lib/api/error-handler";
import { isEntityLimitError, ENTITY_LIMIT_MESSAGE } from "@/lib/entity-limit";
import { resourceService } from "@/lib/services/resource.service";
import { TOPICS_QUERY_KEY } from "@/lib/hooks/use-topics";
import { AREA_DETAIL_QUERY_KEY } from "@/lib/hooks/use-area-detail";
import { GOAL_DETAIL_QUERY_KEY } from "@/lib/hooks/use-goal-detail";
import { GOALS_QUERY_KEY } from "@/lib/hooks/use-goals";
import { PROJECTS_QUERY_KEY } from "@/lib/hooks/use-projects";
import type {
  CreateResourceInput,
  Resource,
  UpdateResourceInput,
} from "@/lib/types/domain.types";
import type { ResourceStatus } from "@/lib/utils/constants";

export const RESOURCES_QUERY_KEY = "resources";

// Optimistically patch a resource's favorite flag inside the goal-detail and
// topic-resource caches (which are keyed independently of RESOURCES_QUERY_KEY),
// so the star toggles instantly on those detail pages without a refetch.
function patchResourceFavoriteInDetailCaches(
  queryClient: QueryClient,
  id: string,
  favorite: boolean,
) {
  const patch = (r: Resource) => (r.id === id ? { ...r, favorite } : r);
  queryClient.setQueriesData<{ resources?: Resource[] } | undefined>(
    { queryKey: [GOAL_DETAIL_QUERY_KEY] },
    (old) => (old?.resources ? { ...old, resources: old.resources.map(patch) } : old),
  );
  queryClient.setQueriesData<Resource[] | undefined>(
    { queryKey: [TOPICS_QUERY_KEY, "resources"] },
    (old) => (Array.isArray(old) ? old.map(patch) : old),
  );
}

// Optimistically flip a resource's is_archived flag inside the goal-detail and
// topic-resource caches so it moves between the All/Archive tabs instantly.
function patchResourceArchivedInDetailCaches(
  queryClient: QueryClient,
  id: string,
  isArchived: boolean,
) {
  const patch = (r: Resource) => (r.id === id ? { ...r, is_archived: isArchived } : r);
  queryClient.setQueriesData<{ resources?: Resource[] } | undefined>(
    { queryKey: [GOAL_DETAIL_QUERY_KEY] },
    (old) => (old?.resources ? { ...old, resources: old.resources.map(patch) } : old),
  );
  queryClient.setQueriesData<Resource[] | undefined>(
    { queryKey: [TOPICS_QUERY_KEY, "resources"] },
    (old) => (Array.isArray(old) ? old.map(patch) : old),
  );
}

export function useResources(
  filters?: {
    status?: ResourceStatus | "all";
    favorite?: boolean;
    areaId?: string;
    projectId?: string;
    topicId?: string;
  },
  options?: { enabled?: boolean },
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [RESOURCES_QUERY_KEY, "list", user?.id ?? null, filters ?? {}],
    queryFn: () => resourceService.list(user!.id, filters),
    enabled: !!user && (options?.enabled ?? true),
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

  return useMutation({
    mutationFn: ({ resourceId, goalId }: { resourceId: string; goalId: string }) =>
      resourceService.linkToGoal(goalId, resourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RESOURCES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [GOAL_DETAIL_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [AREA_DETAIL_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [GOALS_QUERY_KEY], refetchType: "all" });
      toast.success("Resource linked to goal");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to link resource to goal");
    },
  });
}

export function useUnlinkResourceFromGoal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ resourceId, goalId }: { resourceId: string; goalId: string }) =>
      resourceService.unlinkFromGoal(goalId, resourceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [RESOURCES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [GOAL_DETAIL_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [AREA_DETAIL_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [GOALS_QUERY_KEY], refetchType: "all" });
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
      queryClient.invalidateQueries({ queryKey: [TOPICS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [AREA_DETAIL_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY] });
      toast.success("Resource created");
    },
    onError: (error: Error) => {
      toast.error(
        isEntityLimitError(error)
          ? ENTITY_LIMIT_MESSAGE
          : formatValidationMessage(error) || "Failed to create resource",
      );
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
      toast.error(
        isEntityLimitError(error)
          ? ENTITY_LIMIT_MESSAGE
          : formatValidationMessage(error) || "Failed to create resource",
      );
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
      queryClient.invalidateQueries({ queryKey: [TOPICS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [AREA_DETAIL_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [GOAL_DETAIL_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY] });
      toast.success("Resource updated");
    },
    onError: (error: Error) => {
      toast.error(formatValidationMessage(error) || "Failed to update resource");
    },
  });
}

export function useArchiveResource() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => resourceService.archive(user!.id, id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: [AREA_DETAIL_QUERY_KEY] });
      queryClient.setQueriesData(
        { queryKey: [AREA_DETAIL_QUERY_KEY] },
        (old: unknown) => {
          if (!old || typeof old !== "object") return old;
          const data = old as { resources?: Resource[]; archivedResources?: Resource[] };
          const archived = data.resources?.find((r) => r.id === id);
          return {
            ...data,
            resources: data.resources?.filter((r) => r.id !== id) ?? [],
            archivedResources: archived
              ? [...(data.archivedResources ?? []), { ...archived, is_archived: true }]
              : data.archivedResources ?? [],
          };
        },
      );
      patchResourceArchivedInDetailCaches(queryClient, id, true);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [RESOURCES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [AREA_DETAIL_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [GOAL_DETAIL_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [TOPICS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY] });
      toast.success("Resource archived");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to archive resource");
    },
  });
}

export function useUnarchiveResource() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => resourceService.unarchive(user!.id, id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: [AREA_DETAIL_QUERY_KEY] });
      queryClient.setQueriesData(
        { queryKey: [AREA_DETAIL_QUERY_KEY] },
        (old: unknown) => {
          if (!old || typeof old !== "object") return old;
          const data = old as { resources?: Resource[]; archivedResources?: Resource[] };
          const restored = data.archivedResources?.find((r) => r.id === id);
          return {
            ...data,
            resources: restored
              ? [...(data.resources ?? []), { ...restored, is_archived: false }]
              : data.resources ?? [],
            archivedResources: data.archivedResources?.filter((r) => r.id !== id) ?? [],
          };
        },
      );
      patchResourceArchivedInDetailCaches(queryClient, id, false);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [RESOURCES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [AREA_DETAIL_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [GOAL_DETAIL_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [TOPICS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY] });
      toast.success("Resource restored");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to restore resource");
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
      queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [GOAL_DETAIL_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [TOPICS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [AREA_DETAIL_QUERY_KEY] });
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
      await queryClient.cancelQueries({ queryKey: [AREA_DETAIL_QUERY_KEY] });
      const previous = queryClient.getQueryData<Resource>([
        RESOURCES_QUERY_KEY,
        "detail",
        user?.id ?? null,
        id,
      ]);
      const previousAreaDetailData = queryClient.getQueriesData<unknown>({ queryKey: [AREA_DETAIL_QUERY_KEY] });
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
      // Optimistically update the area-detail cache so the favorite icon
      // updates instantly on the area detail page.
      queryClient.setQueriesData<{ resources?: Resource[]; allResources?: Resource[] } | undefined>(
        { queryKey: [AREA_DETAIL_QUERY_KEY] },
        (old) => {
          if (!old) return old;
          const patchResource = (r: Resource) => (r.id === id ? { ...r, favorite } : r);
          return {
            ...old,
            resources: old.resources ? old.resources.map(patchResource) : old.resources,
            allResources: old.allResources ? old.allResources.map(patchResource) : old.allResources,
          };
        },
      );
      // Patch goal-detail and topic resource caches so the favorite icon
      // updates instantly on those detail pages too.
      patchResourceFavoriteInDetailCaches(queryClient, id, favorite);
      return { previous, previousAreaDetailData };
    },
    onError: (error: Error, variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          [RESOURCES_QUERY_KEY, "detail", user?.id ?? null, variables.id],
          context.previous,
        );
      }
      if (context?.previousAreaDetailData) {
        context.previousAreaDetailData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      queryClient.invalidateQueries({ queryKey: [RESOURCES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [GOAL_DETAIL_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [TOPICS_QUERY_KEY] });
      toast.error(error.message || "Failed to update favorite");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [RESOURCES_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [GOAL_DETAIL_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [TOPICS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [AREA_DETAIL_QUERY_KEY] });
    },
  });
}
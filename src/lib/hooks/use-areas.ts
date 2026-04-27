import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { areaService } from "@/lib/services/area.service";
import { groupAreasByType } from "@/lib/utils/areas";

import type { CreateAreaInput, UpdateAreaInput } from "@/lib/types/domain.types";

export const AREAS_QUERY_KEY = "areas";

export function useAreas(filters?: { inactive?: boolean; archive?: boolean }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [AREAS_QUERY_KEY, "list", user?.id ?? null, filters ?? {}],
    queryFn: () => areaService.list(user?.id, filters),
    enabled: !!user,
  });
}

export function useAreasByType() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [AREAS_QUERY_KEY, "grouped", user?.id ?? null],
    queryFn: () => areaService.getGroupedByType(user!.id),
    enabled: !!user,
  });
}

export function useArea(identifier: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [AREAS_QUERY_KEY, "detail", user?.id ?? null, identifier],
    queryFn: () => areaService.getByIdentifier(user!.id, identifier),
    enabled: !!user && !!identifier,
  });
}

export function useCreateArea(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAreaInput) => {
      if (!userId) throw new Error("User not authenticated");
      return areaService.create(userId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [AREAS_QUERY_KEY] });
      toast.success("Area created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create area");
    },
  });
}

export function useUpdateArea(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: UpdateAreaInput & { id: string }) => {
      if (!userId) throw new Error("User not authenticated");
      return areaService.update(userId, id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [AREAS_QUERY_KEY] });
      toast.success("Area updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update area");
    },
  });
}

export function useRestoreArea(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      if (!userId) throw new Error("User not authenticated");
      return areaService.restore(userId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [AREAS_QUERY_KEY] });
      toast.success("Area restored successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to restore area");
    },
  });
}

export function useArchiveArea(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      if (!userId) throw new Error("User not authenticated");
      return areaService.archive(userId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [AREAS_QUERY_KEY] });
      toast.success("Area archived successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to archive area");
    },
  });
}

export function useDeleteArea(userId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      if (!userId) throw new Error("User not authenticated");
      return areaService.delete(userId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [AREAS_QUERY_KEY] });
      toast.success("Area deleted permanently");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete area");
    },
  });
}

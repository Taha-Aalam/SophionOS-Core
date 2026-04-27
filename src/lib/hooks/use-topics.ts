import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import type { CreateTopicInput, Topic, UpdateTopicInput } from "@/lib/types/domain.types";

export const TOPICS_QUERY_KEY = "topics";

export function useTopics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [TOPICS_QUERY_KEY, "list", user?.id ?? null],
    queryFn: async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const { data, error } = await createClient()
        .from("topics")
        .select("id, user_id, area_id, name, favorite, metadata, created_at, updated_at")
        .eq("user_id", user!.id)
        .order("name");
      if (error) throw error;
      return (data || []) as Topic[];
    },
    enabled: !!user,
  });
}

export function useTopic(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [TOPICS_QUERY_KEY, "detail", user?.id ?? null, id],
    queryFn: async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const { data, error } = await createClient()
        .from("topics")
        .select("id, user_id, area_id, name, favorite, metadata, created_at, updated_at")
        .eq("user_id", user!.id)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Topic;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateTopic() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateTopicInput) => {
      const { createClient } = await import("@/lib/supabase/client");
      const { data, error } = await createClient()
        .from("topics")
        .insert({ ...input, user_id: user!.id })
        .select("id, user_id, area_id, name, favorite, metadata, created_at, updated_at")
        .single();
      if (error) throw error;
      return data as Topic;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [TOPICS_QUERY_KEY] });
      toast.success("Topic created");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create topic");
    },
  });
}

export function useUpdateTopic() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateTopicInput }) => {
      const { createClient } = await import("@/lib/supabase/client");
      const { data, error } = await createClient()
        .from("topics")
        .update(input)
        .eq("user_id", user!.id)
        .eq("id", id)
        .select("id, user_id, area_id, name, favorite, metadata, created_at, updated_at")
        .single();
      if (error) throw error;
      return data as Topic;
    },
    onSuccess: async (updated: Topic) => {
      queryClient.setQueryData(
        [TOPICS_QUERY_KEY, "detail", user?.id ?? null, updated.id],
        updated,
      );
      await queryClient.invalidateQueries({ queryKey: [TOPICS_QUERY_KEY] });
      toast.success("Topic updated");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update topic");
    },
  });
}

export function useToggleFavoriteTopic() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, favorite }: { id: string; favorite: boolean }) => {
      const { createClient } = await import("@/lib/supabase/client");
      const { data, error } = await createClient()
        .from("topics")
        .update({ favorite })
        .eq("user_id", user!.id)
        .eq("id", id)
        .select("id, user_id, area_id, name, favorite, metadata, created_at, updated_at")
        .single();
      if (error) throw error;
      return data as Topic;
    },
    onMutate: async ({ id, favorite }) => {
      await queryClient.cancelQueries({ queryKey: [TOPICS_QUERY_KEY] });
      queryClient.setQueriesData<Topic[]>({ queryKey: [TOPICS_QUERY_KEY, "list"] }, (current) => {
        if (!Array.isArray(current)) return current;
        return current.map((t) => (t.id === id ? { ...t, favorite } : t));
      });
      queryClient.setQueryData<Topic>(
        [TOPICS_QUERY_KEY, "detail", user?.id ?? null, id],
        (current) => (current ? { ...current, favorite } : current),
      );
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: [TOPICS_QUERY_KEY] });
      toast.error(error.message || "Failed to update favorite");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [TOPICS_QUERY_KEY] });
    },
  });
}

export function useDeleteTopic() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { createClient } = await import("@/lib/supabase/client");
      const { error } = await createClient()
        .from("topics")
        .delete()
        .eq("user_id", user!.id)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [TOPICS_QUERY_KEY] });
      toast.success("Topic deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete topic");
    },
  });
}
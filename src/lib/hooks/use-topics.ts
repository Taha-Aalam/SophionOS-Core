"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/auth-provider";
import { noteService } from "@/lib/services/note.service";
import { topicService, type TopicWithCounts } from "@/lib/services/topic.service";
import type { CreateTopicInput, UpdateTopicInput } from "@/lib/types/domain.types";

export const TOPICS_QUERY_KEY = "topics";

function invalidateTopicGraph(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([queryClient.invalidateQueries({ queryKey: [TOPICS_QUERY_KEY] })]);
}

export function useTopics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [TOPICS_QUERY_KEY, "list", user?.id ?? null],
    queryFn: async () => {
      const topics = await topicService.list(user!.id);
      return topicService.enrichWithCounts(topics);
    },
    enabled: !!user,
  });
}

export function useTopic(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [TOPICS_QUERY_KEY, "detail", user?.id ?? null, id],
    queryFn: async () => {
      const topic = await topicService.getByIdentifier(user!.id, id);
      const counts = await topicService.enrichWithCounts([topic]);
      return counts[0];
    },
    enabled: !!user && !!id,
  });
}

export function useActiveTopics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [TOPICS_QUERY_KEY, "active", user?.id ?? null],
    queryFn: async () => {
      const topics = await topicService.getActive(user!.id);
      return topicService.enrichWithCounts(topics);
    },
    enabled: !!user,
  });
}

export function useInactiveTopics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [TOPICS_QUERY_KEY, "inactive", user?.id ?? null],
    queryFn: async () => {
      const topics = await topicService.getInactive(user!.id);
      return topicService.enrichWithCounts(topics);
    },
    enabled: !!user,
  });
}

export function useFavoriteTopics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [TOPICS_QUERY_KEY, "favorite", user?.id ?? null],
    queryFn: async () => {
      const topics = await topicService.getFavorite(user!.id);
      return topicService.enrichWithCounts(topics);
    },
    enabled: !!user,
  });
}

export function useTopicsByArea() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [TOPICS_QUERY_KEY, "byArea", user?.id ?? null],
    queryFn: async () => {
      const topics = await topicService.list(user!.id);
      const enriched = await topicService.enrichWithCounts(topics);
      return topicService.groupByArea(enriched);
    },
    enabled: !!user,
  });
}

export function useCreateTopic() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (input: CreateTopicInput) => topicService.create(user!.id, input),
    onSuccess: async () => {
      await invalidateTopicGraph(queryClient);
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
    mutationFn: ({ id, input }: { id: string; input: UpdateTopicInput }) =>
      topicService.update(user!.id, id, input),
    onSuccess: async (updated: TopicWithCounts) => {
      queryClient.setQueryData(
        [TOPICS_QUERY_KEY, "detail", user?.id ?? null, updated.id],
        updated,
      );
      await invalidateTopicGraph(queryClient);
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
      return topicService.update(user!.id, id, { favorite });
    },
    onMutate: async ({ id, favorite }) => {
      await queryClient.cancelQueries({ queryKey: [TOPICS_QUERY_KEY] });
      queryClient.setQueriesData<TopicWithCounts[]>(
        { queryKey: [TOPICS_QUERY_KEY, "list"] },
        (current) => {
          if (!Array.isArray(current)) return current;
          return current.map((t) => (t.id === id ? { ...t, favorite } : t));
        },
      );
      queryClient.setQueryData<TopicWithCounts>(
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
    mutationFn: (id: string) => topicService.delete(user!.id, id),
    onSuccess: async () => {
      await invalidateTopicGraph(queryClient);
      toast.success("Topic deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete topic");
    },
  });
}

export function useArchiveTopic() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => topicService.archive(user!.id, id),
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: [TOPICS_QUERY_KEY] });
      toast.success("Topic archived");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to archive topic");
    },
  });
}

export function useRestoreTopic() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: (id: string) => topicService.restore(user!.id, id),
    onSuccess: async () => {
      await invalidateTopicGraph(queryClient);
      toast.success("Topic restored");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to restore topic");
    },
  });
}

export function useArchivedTopics() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [TOPICS_QUERY_KEY, "archived", user?.id ?? null],
    queryFn: async () => topicService.listArchived(user!.id),
    enabled: !!user,
  });
}

export function useNotesForTopic(topicId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [TOPICS_QUERY_KEY, "notes", user?.id ?? null, topicId],
    queryFn: () => noteService.listByTopic(user!.id, topicId),
    enabled: !!user && !!topicId,
    refetchOnMount: true,
  });
}

export function useResourcesForTopic(topicId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [TOPICS_QUERY_KEY, "resources", user?.id ?? null, topicId],
    queryFn: () => topicService.getResourcesForTopic(user!.id, topicId),
    enabled: !!user && !!topicId,
  });
}
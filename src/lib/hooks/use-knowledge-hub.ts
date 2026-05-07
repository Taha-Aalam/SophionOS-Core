"use client";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/components/providers/auth-provider";
import { knowledgeService } from "@/lib/services/knowledge.service";

export const KNOWLEDGE_SEARCH_KEY = "knowledge-search";

export function useKnowledgeSearch(query: string) {
  const { user } = useAuth();
  const trimmed = query.trim();

  return useQuery({
    queryKey: [KNOWLEDGE_SEARCH_KEY, user?.id ?? null, trimmed],
    queryFn: () => knowledgeService.search(user!.id, trimmed),
    enabled: !!user && trimmed.length >= 2,
    placeholderData: {
      notes: [],
      resources: [],
      topics: [],
      counts: { notes: 0, resources: 0, topics: 0 },
    },
  });
}

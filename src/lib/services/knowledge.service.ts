import { createClient } from "../supabase/client";
import type { Note, Resource } from "../types/domain.types";
import { topicService, type TopicWithCounts } from "./topic.service";

// Deliberately omits `content` (large TipTap JSON/text): search results render
// name + metadata only via NoteRow, and clicking through re-fetches the full
// note on its detail page. Pulling content here only bloats the search payload.
const NOTE_SELECT =
  "id, user_id, area_id, project_id, topic_id, name, slug, type, status, favorite, pin, is_archived, metadata, created_at, updated_at";
const RESOURCE_SELECT =
  "id, user_id, area_id, project_id, topic_id, name, url, type, status, favorite, is_archived, metadata, created_at, updated_at";
const TOPIC_SELECT =
  "id, user_id, area_id, name, favorite, inactive, metadata, created_at, updated_at";

export interface KnowledgeSearchResults {
  notes: Note[];
  resources: Resource[];
  topics: TopicWithCounts[];
  counts: { notes: number; resources: number; topics: number };
}

export const knowledgeService = {
  async search(userId: string, query: string): Promise<KnowledgeSearchResults> {
    const q = query.trim();
    if (!q) {
      return {
        notes: [],
        resources: [],
        topics: [],
        counts: { notes: 0, resources: 0, topics: 0 },
      };
    }

    const p = `%${q}%`;

    const [nr, rr, tr] = await Promise.all([
      createClient()
        .from("notes")
        .select(NOTE_SELECT)
        .eq("user_id", userId)
        .eq("is_archived", false)
        .ilike("name", p)
        .order("updated_at", { ascending: false })
        .limit(20),
      createClient()
        .from("resources")
        .select(RESOURCE_SELECT)
        .eq("user_id", userId)
        .eq("is_archived", false)
        .or(`name.ilike.${p},url.ilike.${p}`)
        .order("updated_at", { ascending: false })
        .limit(20),
      createClient()
        .from("topics")
        .select(TOPIC_SELECT)
        .eq("user_id", userId)
        .ilike("name", p)
        .order("name")
        .limit(20),
    ]);

    const notes = (nr.data ?? []) as Note[];
    const resources = (rr.data ?? []) as Resource[];
    const topics = await topicService.enrichWithCounts(
      (tr.data ?? []) as TopicWithCounts[],
    );

    return {
      notes,
      resources,
      topics,
      counts: { notes: notes.length, resources: resources.length, topics: topics.length },
    };
  },
};

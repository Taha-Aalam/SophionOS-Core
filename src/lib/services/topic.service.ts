import { createClient } from "../supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { CreateTopicInput, Topic, UpdateTopicInput } from "../types/domain.types";
import { createTopicSchema, updateTopicSchema } from "../validators/topic.schema";
import { DatabaseError, NotFoundError } from "../api/error-handler";
import { generateSlug } from "../utils";
import { LIST_SAFETY_CAP } from "../utils/constants";

type ServiceOptions = { supabase?: SupabaseClient };

const TOPIC_SELECT =
  "id, user_id, area_id, name, slug, favorite, inactive, is_archived, metadata, created_at, updated_at";

export interface TopicWithCounts extends Topic {
  notesCount: number;
  resourcesCount: number;
  linkedAreaIds: string[];
}

export interface GroupedTopics {
  areaId: string;
  areaName: string;
  topics: TopicWithCounts[];
}

export const topicService = {
  async list(userId: string, options?: ServiceOptions): Promise<TopicWithCounts[]> {
    const sb = options?.supabase ?? createClient();
    const { data, error } = await sb
      .from("topics")
      .select(TOPIC_SELECT)
      .eq("user_id", userId)
      .eq("is_archived", false)
      .order("name")
      .limit(LIST_SAFETY_CAP);

    if (error) {
      throw new DatabaseError(error.message);
    }

    const topics = (data || []) as TopicWithCounts[];
    return this.enrichWithCounts(topics, options);
  },

  async getById(userId: string, id: string, options?: ServiceOptions): Promise<TopicWithCounts> {
    const sb = options?.supabase ?? createClient();
    const { data, error } = await sb
      .from("topics")
      .select(TOPIC_SELECT)
      .eq("user_id", userId)
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError("Topic", id);
      }
      throw new DatabaseError(error.message);
    }

    const topic = data as TopicWithCounts;
    const enriched = await this.enrichWithCounts([topic], options);
    return enriched[0];
  },

  async getByIdentifier(userId: string, identifier: string, options?: ServiceOptions): Promise<TopicWithCounts> {
    const sb = options?.supabase ?? createClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    if (!isUuid) {
      const { data, error } = await sb
        .from("topics")
        .select(TOPIC_SELECT)
        .eq("user_id", userId)
        .eq("slug", identifier)
        .maybeSingle();

      if (!error && data) {
        const enriched = await this.enrichWithCounts([data as TopicWithCounts], options);
        return enriched[0];
      }
    }

    return this.getById(userId, identifier, options);
  },

  async create(userId: string, input: CreateTopicInput, options?: ServiceOptions): Promise<TopicWithCounts> {
    const sb = options?.supabase ?? createClient();
    const validated = createTopicSchema.parse(input);

    const { data: topic, error } = await sb
      .from("topics")
      .insert({ name: validated.name, slug: generateSlug(validated.name), favorite: validated.favorite, user_id: userId })
      .select(TOPIC_SELECT)
      .single();

    if (error) {
      throw new DatabaseError(error.message);
    }

    if (validated.area_ids?.length) {
      const junctionRows = validated.area_ids.map((area_id) => ({
        topic_id: topic.id,
        area_id,
      }));
      const { error: junctionError } = await sb
        .from("topic_areas")
        .insert(junctionRows);
      if (junctionError) {
        throw new DatabaseError(junctionError.message);
      }
    }

    const enriched: TopicWithCounts = {
      ...topic,
      area_id: topic.area_id ?? null,
      notesCount: 0,
      resourcesCount: 0,
      linkedAreaIds: validated.area_ids ?? [],
    };

    if (validated.note_ids?.length) {
      await this.linkNotes(enriched.id, validated.note_ids, options);
    }
    if (validated.resource_ids?.length) {
      await this.linkResources(enriched.id, validated.resource_ids, options);
    }

    return enriched;
  },

  async update(userId: string, id: string, input: UpdateTopicInput, options?: ServiceOptions): Promise<TopicWithCounts> {
    const sb = options?.supabase ?? createClient();
    const validated = updateTopicSchema.parse(input);

    const topicPatch = {
      ...(validated.name !== undefined && { name: validated.name, slug: generateSlug(validated.name) }),
      ...(validated.favorite !== undefined && { favorite: validated.favorite }),
    };

    // Only PATCH the topic row when a topic column actually changes. An empty
    // PATCH body matches 0 rows, so .single() returns 406/PGRST116 even though
    // the topic exists — link-only updates (note_ids/area_ids) hit this.
    const query = sb.from("topics");
    const { data: topic, error } =
      Object.keys(topicPatch).length > 0
        ? await query.update(topicPatch).eq("user_id", userId).eq("id", id).select(TOPIC_SELECT).single()
        : await query.select(TOPIC_SELECT).eq("user_id", userId).eq("id", id).single();

    if (error) {
      if (error.code === "PGRST116") {
        throw new NotFoundError("Topic", id);
      }
      throw new DatabaseError(error.message);
    }

    if (validated.area_ids !== undefined) {
      await sb
        .from("topic_areas")
        .delete()
        .eq("topic_id", id);

      if (validated.area_ids.length > 0) {
        const junctionRows = validated.area_ids.map((area_id) => ({
          topic_id: id,
          area_id,
        }));
        const { error: junctionError } = await sb
          .from("topic_areas")
          .insert(junctionRows);
        if (junctionError) {
          throw new DatabaseError(junctionError.message);
        }
      }
    }

    const enriched: TopicWithCounts = {
      ...topic,
      area_id: topic.area_id ?? null,
      notesCount: 0,
      resourcesCount: 0,
      linkedAreaIds: validated.area_ids ?? [],
    };

    if (validated.note_ids?.length) {
      await this.linkNotes(id, validated.note_ids, options);
    }
    if (validated.resource_ids?.length) {
      await this.linkResources(id, validated.resource_ids, options);
    }

    return enriched;
  },

  async delete(userId: string, id: string, options?: ServiceOptions): Promise<void> {
    const sb = options?.supabase ?? createClient();
    const { error } = await sb
      .from("topics")
      .delete()
      .eq("user_id", userId)
      .eq("id", id);

    if (error) {
      throw new DatabaseError(error.message);
    }
  },

  async archive(userId: string, id: string, options?: ServiceOptions): Promise<void> {
    const sb = options?.supabase ?? createClient();
    const { error } = await sb
      .from("topics")
      .update({ is_archived: true })
      .eq("user_id", userId)
      .eq("id", id);
    if (error) throw new DatabaseError(error.message);
  },

  async restore(userId: string, id: string, options?: ServiceOptions): Promise<void> {
    const sb = options?.supabase ?? createClient();
    const { error } = await sb
      .from("topics")
      .update({ is_archived: false })
      .eq("user_id", userId)
      .eq("id", id);
    if (error) throw new DatabaseError(error.message);
  },

  async listArchived(userId: string, options?: ServiceOptions): Promise<TopicWithCounts[]> {
    const sb = options?.supabase ?? createClient();
    const { data, error } = await sb
      .from("topics")
      .select(TOPIC_SELECT)
      .eq("user_id", userId)
      .eq("is_archived", true)
      .order("name")
      .limit(LIST_SAFETY_CAP);
    if (error) throw new DatabaseError(error.message);
    return this.enrichWithCounts((data || []) as TopicWithCounts[], options);
  },

  async getActive(userId: string, options?: ServiceOptions): Promise<TopicWithCounts[]> {
    const sb = options?.supabase ?? createClient();
    const { data, error } = await sb
      .from("topics")
      .select(TOPIC_SELECT)
      .eq("user_id", userId)
      .eq("inactive", false)
      .order("name")
      .limit(LIST_SAFETY_CAP);

    if (error) {
      throw new DatabaseError(error.message);
    }

    const topics = (data || []) as TopicWithCounts[];
    return this.enrichWithCounts(topics, options);
  },

  async getInactive(userId: string, options?: ServiceOptions): Promise<TopicWithCounts[]> {
    const sb = options?.supabase ?? createClient();
    const { data, error } = await sb
      .from("topics")
      .select(TOPIC_SELECT)
      .eq("user_id", userId)
      .eq("inactive", true)
      .order("name")
      .limit(LIST_SAFETY_CAP);

    if (error) {
      throw new DatabaseError(error.message);
    }

    const topics = (data || []) as TopicWithCounts[];
    return this.enrichWithCounts(topics, options);
  },

  async getFavorite(userId: string, options?: ServiceOptions): Promise<TopicWithCounts[]> {
    const sb = options?.supabase ?? createClient();
    const { data, error } = await sb
      .from("topics")
      .select(TOPIC_SELECT)
      .eq("user_id", userId)
      .eq("favorite", true)
      .order("name")
      .limit(LIST_SAFETY_CAP);

    if (error) {
      throw new DatabaseError(error.message);
    }

    const topics = (data || []) as TopicWithCounts[];
    return this.enrichWithCounts(topics, options);
  },

  async getGroupedByArea(userId: string, options?: ServiceOptions): Promise<GroupedTopics[]> {
    const sb = options?.supabase ?? createClient();
    const { data: topicAreas, error: taError } = await sb
      .from("topic_areas")
      .select("topic_id, area_id, areas(name)")
      .filter("topics.user_id", "eq", userId);

    if (taError) {
      throw new DatabaseError(taError.message);
    }

    const { data: topics, error: tError } = await sb
      .from("topics")
      .select(TOPIC_SELECT)
      .eq("user_id", userId)
      .order("name")
      .limit(LIST_SAFETY_CAP);

    if (tError) {
      throw new DatabaseError(tError.message);
    }

    const topicMap = new Map<string, TopicWithCounts>();
    for (const t of (topics || [])) {
      topicMap.set(t.id, t as TopicWithCounts);
    }

    const grouped = new Map<string, { areaName: string; topics: TopicWithCounts[] }>();

    for (const ta of topicAreas || []) {
      const areaId = ta.area_id as string;
      const areaName = ((ta.areas as { name: string }[] | null)?.[0]?.name) ?? "Unknown";
      if (!grouped.has(areaId)) {
        grouped.set(areaId, { areaName, topics: [] });
      }
      const topic = topicMap.get(ta.topic_id as string);
      if (topic && !grouped.get(areaId)!.topics.find((t) => t.id === topic.id)) {
        grouped.get(areaId)!.topics.push(topic);
      }
    }

    return Array.from(grouped.entries()).map(([areaId, { areaName, topics }]) => ({
      areaId,
      areaName,
      topics,
    }));
  },

  async getLinkedAreaIds(topicId: string, options?: ServiceOptions): Promise<string[]> {
    const sb = options?.supabase ?? createClient();
    const { data, error } = await sb
      .from("topic_areas")
      .select("area_id")
      .eq("topic_id", topicId);

    if (error) {
      throw new DatabaseError(error.message);
    }

    return (data || []).map((row) => row.area_id as string);
  },

  async linkNotes(topicId: string, noteIds: string[], options?: ServiceOptions): Promise<void> {
    if (noteIds.length === 0) return;
    const sb = options?.supabase ?? createClient();
    const { error } = await sb
      .from("notes")
      .update({ topic_id: topicId })
      .in("id", noteIds);
    if (error) throw new DatabaseError(error.message);
  },

  async linkResources(topicId: string, resourceIds: string[], options?: ServiceOptions): Promise<void> {
    if (resourceIds.length === 0) return;
    const sb = options?.supabase ?? createClient();
    const { error } = await sb
      .from("resources")
      .update({ topic_id: topicId })
      .in("id", resourceIds);
    if (error) throw new DatabaseError(error.message);
  },

  async enrichWithCounts(topics: TopicWithCounts[], options?: ServiceOptions): Promise<TopicWithCounts[]> {
    if (topics.length === 0) return [];

    const perfLabel =
      process.env.NODE_ENV !== "production"
        ? `[perf] topic.enrichWithCounts (${topics.length} topics)`
        : null;
    if (perfLabel) console.time(perfLabel);

    // Batch all enrichment into 3 queries total (was 3×N — one Promise.all per
    // topic). Note/resource counts are tallied client-side from a single
    // topic_id-only fetch per table; linked areas from one topic_areas fetch.
    const topicIds = topics.map((t) => t.id);
    const client = options?.supabase ?? createClient();

    const [notesRes, resourcesRes, areaLinksRes] = await Promise.all([
      client.from("notes").select("topic_id").in("topic_id", topicIds).eq("is_archived", false),
      client.from("resources").select("topic_id").in("topic_id", topicIds).eq("is_archived", false),
      client.from("topic_areas").select("topic_id, area_id").in("topic_id", topicIds),
    ]);

    const noteCounts = new Map<string, number>();
    for (const row of notesRes.data ?? []) {
      const id = row.topic_id as string;
      noteCounts.set(id, (noteCounts.get(id) ?? 0) + 1);
    }

    const resourceCounts = new Map<string, number>();
    for (const row of resourcesRes.data ?? []) {
      const id = row.topic_id as string;
      resourceCounts.set(id, (resourceCounts.get(id) ?? 0) + 1);
    }

    const areaIdsByTopic = new Map<string, string[]>();
    for (const row of areaLinksRes.data ?? []) {
      const id = row.topic_id as string;
      const current = areaIdsByTopic.get(id) ?? [];
      current.push(row.area_id as string);
      areaIdsByTopic.set(id, current);
    }

    const enriched = topics.map((topic) => ({
      ...topic,
      notesCount: noteCounts.get(topic.id) ?? 0,
      resourcesCount: resourceCounts.get(topic.id) ?? 0,
      linkedAreaIds: areaIdsByTopic.get(topic.id) ?? [],
    }));

    if (perfLabel) console.timeEnd(perfLabel);
    return enriched;
  },

  groupByArea(topics: TopicWithCounts[]): GroupedTopics[] {
    const grouped = new Map<string, { areaName: string; topics: TopicWithCounts[] }>();
    for (const topic of topics) {
      const areaIds = topic.linkedAreaIds ?? [];
      if (areaIds.length === 0) {
        const unknown = grouped.get("__none__") ?? { areaName: "No Area", topics: [] };
        unknown.topics.push(topic);
        grouped.set("__none__", unknown);
      } else {
        for (const areaId of areaIds) {
          const entry = grouped.get(areaId) ?? { areaName: areaId, topics: [] };
          if (!entry.topics.find((t) => t.id === topic.id)) {
            entry.topics.push(topic);
          }
          grouped.set(areaId, entry);
        }
      }
    }
    return Array.from(grouped.entries())
      .filter(([key]) => key !== "__none__")
      .sort(([, a], [, b]) => a.areaName.localeCompare(b.areaName))
      .map(([areaId, { areaName, topics }]) => ({ areaId, areaName, topics }));
  },
};

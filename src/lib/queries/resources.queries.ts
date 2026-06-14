import type { SupabaseClient } from "@supabase/supabase-js";

const RESOURCE_SELECT =
  "id, user_id, area_id, project_id, topic_id, name, url, type, status, favorite, is_archived, metadata, created_at, updated_at";

type ResourceLike = {
  area_id: string | null;
  id: string;
};

function dedupe(ids: Array<string | null | undefined>): string[] {
  return Array.from(new Set(ids.filter((value): value is string => Boolean(value))));
}

async function hydrateAreaLinks(
  supabase: SupabaseClient,
  resources: ResourceLike[],
): Promise<Array<ResourceLike & { linkedAreaIds: string[] }>> {
  if (resources.length === 0) {
    return [];
  }

  const resourceIds = resources.map((resource) => resource.id);
  const { data } = await supabase
    .from("resource_areas")
    .select("resource_id, area_id")
    .in("resource_id", resourceIds);

  const areaIdsByResourceId = new Map<string, string[]>();
  for (const row of data ?? []) {
    const current = areaIdsByResourceId.get(row.resource_id) ?? [];
    current.push(row.area_id);
    areaIdsByResourceId.set(row.resource_id, current);
  }

  return resources.map((resource) => ({
    ...resource,
    linkedAreaIds: dedupe([resource.area_id, ...(areaIdsByResourceId.get(resource.id) ?? [])]),
  }));
}

async function hydrateGoalLinks(
  supabase: SupabaseClient,
  resourceIds: string[],
): Promise<Map<string, string[]>> {
  if (resourceIds.length === 0) return new Map();

  const { data } = await supabase
    .from("goal_resources")
    .select("resource_id, goal_id")
    .in("resource_id", resourceIds);

  const map = new Map<string, string[]>();
  for (const row of data ?? []) {
    const current = map.get(row.resource_id) ?? [];
    current.push(row.goal_id);
    map.set(row.resource_id, current);
  }
  return map;
}

async function hydrateTaskLinks(
  supabase: SupabaseClient,
  resourceIds: string[],
): Promise<Map<string, string[]>> {
  if (resourceIds.length === 0) return new Map();

  const { data } = await supabase
    .from("task_resources")
    .select("resource_id, task_id")
    .in("resource_id", resourceIds);

  const map = new Map<string, string[]>();
  for (const row of data ?? []) {
    const current = map.get(row.resource_id) ?? [];
    current.push(row.task_id);
    map.set(row.resource_id, current);
  }
  return map;
}

export async function serverFetchResources(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase
    .from("resources")
    .select(RESOURCE_SELECT)
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  // Surface the error instead of swallowing it into an empty array. A
  // transient failure here (e.g. an auth token rotating mid-render or a
  // pooled-connection hiccup) would otherwise dehydrate an empty *success*
  // state, which the client trusts permanently (refetchOnMount is off), so
  // the page sticks on "no resources" until enough hard refreshes happen to
  // land a successful fetch. Throwing leaves the prefetched query in an error
  // state — React Query does not dehydrate errored queries, so the client
  // mounts with no cached data and fetches it itself on mount, recovering
  // automatically.
  if (error) {
    throw error;
  }

  const resources = (data ?? []) as ResourceLike[];
  const resourceIds = resources.map((r) => r.id);

  const [hydratedAreas, goalIdsMap, taskIdsMap] = await Promise.all([
    hydrateAreaLinks(supabase, resources),
    hydrateGoalLinks(supabase, resourceIds),
    hydrateTaskLinks(supabase, resourceIds),
  ]);

  return resources.map((resource, index) => ({
    ...resource,
    linkedAreaIds: hydratedAreas[index]?.linkedAreaIds ?? dedupe([resource.area_id]),
    linkedGoalIds: goalIdsMap.get(resource.id) ?? [],
    linkedTaskIds: taskIdsMap.get(resource.id) ?? [],
  }));
}

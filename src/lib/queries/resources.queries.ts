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

export async function serverFetchResources(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data } = await supabase
    .from("resources")
    .select(RESOURCE_SELECT)
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false });

  const resources = (data ?? []) as ResourceLike[];
  const hydrated = await hydrateAreaLinks(supabase, resources);

  return resources.map((resource, index) => ({
    ...resource,
    linkedAreaIds: hydrated[index]?.linkedAreaIds ?? dedupe([resource.area_id]),
  }));
}

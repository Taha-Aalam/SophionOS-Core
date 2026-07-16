import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { DatabaseError } from "@/lib/api/error-handler";
import { getAiAccessSettings } from "@/lib/api/ai-access-service";
import { listApiKeys } from "@/lib/api/api-key-service";

export type PrivacyEntityCounts = {
  areas: number;
  goals: number;
  projects: number;
  tasks: number;
  notes: number;
  resources: number;
  topics: number;
  contacts: number;
  connected_ai_clients: number;
};

const COUNT_TABLES: Array<{ key: keyof PrivacyEntityCounts; table: string }> = [
  { key: "areas", table: "areas" },
  { key: "goals", table: "goals" },
  { key: "projects", table: "projects" },
  { key: "tasks", table: "tasks" },
  { key: "notes", table: "notes" },
  { key: "resources", table: "resources" },
  { key: "topics", table: "topics" },
  { key: "contacts", table: "contacts" },
];

/**
 * User-scoped counts only — always filters by userId.
 */
export async function buildPrivacySummary(
  userId: string,
  supabase?: SupabaseClient,
): Promise<{
  counts: PrivacyEntityCounts;
  ai_access: Awaited<ReturnType<typeof getAiAccessSettings>>;
  retention_note: string;
}> {
  const sb = supabase ?? createAdminClient();
  const counts: PrivacyEntityCounts = {
    areas: 0,
    goals: 0,
    projects: 0,
    tasks: 0,
    notes: 0,
    resources: 0,
    topics: 0,
    contacts: 0,
    connected_ai_clients: 0,
  };

  for (const { key, table } of COUNT_TABLES) {
    const { count, error } = await sb
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (error) {
      throw new DatabaseError(`privacy summary failed on ${table}: ${error.message}`);
    }
    counts[key] = count ?? 0;
  }

  const keys = await listApiKeys(userId);
  counts.connected_ai_clients = keys.length;

  const ai_access = await getAiAccessSettings(userId);

  return {
    counts,
    ai_access,
    retention_note:
      "Product data is retained until you delete it or complete account deletion. Backups may persist for a provider-defined window after deletion. Billing/legal records may be retained where required.",
  };
}

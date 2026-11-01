import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_AREAS } from "@/lib/onboarding/default-areas";
import { createClient } from "@/lib/supabase/client";
import { generateSlug } from "@/lib/utils";

type ServiceOptions = { supabase?: SupabaseClient };

/** Seed payload for the seed_default_areas RPC — the owner is derived from
 * the JWT inside the RPC, so unlike AreaInsert it carries no user_id. */
interface SeedArea {
  name: string;
  description: string;
  icon: string;
  color: string;
  type: string;
  slug: string;
}

export async function seedDefaultAreas(
  options?: ServiceOptions,
): Promise<void> {
  const supabase = options?.supabase ?? createClient();

  const areasToInsert: SeedArea[] = DEFAULT_AREAS.map((area) => ({
    name: area.name,
    description: area.description,
    icon: area.icon,
    color: area.color,
    type: area.type,
    slug: generateSlug(area.name),
  }));

  // Exactly-once seed, enforced at the database: seed_default_areas() checks
  // the account's areas_seeded_at marker, inserts the rows, and stamps the
  // marker in ONE transaction — rows and marker land together or not at all.
  // The old per-login client upsert resurrected deliberately-deleted starter
  // areas and failed outright for users at the entity cap (the cap trigger
  // fired before Postgres resolved the (user_id, slug) conflict).
  const { error } = await supabase.rpc("seed_default_areas", {
    p_areas: areasToInsert,
  });

  if (error) {
    throw new Error(`Failed to seed default areas: ${error.message}`);
  }
}

// Auto-provision a Pro subscription on first run. The user id is derived
// server-side from the Clerk JWT inside the SECURITY DEFINER RPC, so this
// takes no user argument and the caller cannot pick a tier. Idempotent via
// ON CONFLICT in the RPC.
export async function provisionSubscription(
  options?: ServiceOptions,
): Promise<void> {
  const supabase = options?.supabase ?? createClient();

  const { error } = await supabase.rpc("provision_subscription");

  if (error) {
    throw new Error(`Failed to provision subscription: ${error.message}`);
  }
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_AREAS } from "@/lib/onboarding/default-areas";
import { createClient } from "@/lib/supabase/client";
import { AreaInsert } from "@/lib/types/domain.types";
import { generateSlug } from "@/lib/utils";

type ServiceOptions = { supabase?: SupabaseClient };

export async function seedDefaultAreas(
  userId: string,
  options?: ServiceOptions,
): Promise<void> {
  const supabase = options?.supabase ?? createClient();

  const areasToInsert: AreaInsert[] = DEFAULT_AREAS.map((area) => ({
    user_id: userId,
    name: area.name,
    description: area.description,
    icon: area.icon,
    color: area.color,
    type: area.type,
    slug: generateSlug(area.name),
    archive: false,
  }));

  // Idempotent: upsert on (user_id, slug). If a row already exists for that
  // pair, skip insert (ignoreDuplicates). Avoids the select-then-insert race
  // and React StrictMode double-effect invocations.
  const { error } = await supabase
    .from("areas")
    .upsert(areasToInsert, {
      onConflict: "user_id,slug",
      ignoreDuplicates: true,
    });

  if (error) {
    throw new Error(`Failed to seed default areas: ${error.message}`);
  }
}

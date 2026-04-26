import { DEFAULT_AREAS } from "@/lib/onboarding/default-areas";
import { createClient } from "@/lib/supabase/client";
import { AreaInsert } from "@/lib/types/domain.types";
import { generateSlug } from "@/lib/utils";

export async function seedDefaultAreas(userId: string): Promise<void> {
  const supabase = createClient();

  const { data: existingAreas } = await supabase
    .from("areas")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (existingAreas && existingAreas.length > 0) {
    return;
  }

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

  const { error } = await supabase.from("areas").insert(areasToInsert);

  if (error) {
    throw new Error(`Failed to seed default areas: ${error.message}`);
  }
}

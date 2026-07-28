import type { SupabaseClient } from "@supabase/supabase-js";
import type { BriefKind, DeliveryChannel, DeliveryStatus } from "./types";

export async function hasTerminalDelivery(
  supabase: SupabaseClient,
  input: {
    userId: string;
    kind: BriefKind;
    localDate: string;
    channel?: DeliveryChannel;
  },
): Promise<boolean> {
  const channel = input.channel ?? "email";
  const { data, error } = await supabase
    .from("notification_deliveries")
    .select("id")
    .eq("user_id", input.userId)
    .eq("kind", input.kind)
    .eq("local_date", input.localDate)
    .eq("channel", channel)
    .in("status", ["sent", "skipped"])
    .limit(1);
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

export async function recordDelivery(
  supabase: SupabaseClient,
  input: {
    userId: string;
    kind: BriefKind;
    localDate: string;
    channel?: DeliveryChannel;
    status: DeliveryStatus;
    error?: string | null;
    payload?: Record<string, unknown> | null;
  },
): Promise<void> {
  const { error } = await supabase.from("notification_deliveries").insert({
    user_id: input.userId,
    kind: input.kind,
    local_date: input.localDate,
    channel: input.channel ?? "email",
    status: input.status,
    error: input.error ?? null,
    payload: input.payload ?? null,
  });
  if (error) throw error;
}

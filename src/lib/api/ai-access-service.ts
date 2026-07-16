import { createAdminClient } from "../supabase/admin";
import { DatabaseError } from "./error-handler";
import {
  AI_ACCESS_SETTINGS_KEY,
  DEFAULT_AI_ACCESS_SETTINGS,
  type AiAccessSettings,
} from "./ai-access-policy";
import { revokeAllApiKeysForUser } from "./api-key-service";

function normalizeSettings(raw: unknown): AiAccessSettings {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_AI_ACCESS_SETTINGS };
  }
  const o = raw as Record<string, unknown>;
  return {
    ai_access_enabled:
      typeof o.ai_access_enabled === "boolean"
        ? o.ai_access_enabled
        : DEFAULT_AI_ACCESS_SETTINGS.ai_access_enabled,
    ai_write_access_enabled:
      typeof o.ai_write_access_enabled === "boolean"
        ? o.ai_write_access_enabled
        : DEFAULT_AI_ACCESS_SETTINGS.ai_write_access_enabled,
    privacy_notice_version:
      typeof o.privacy_notice_version === "string"
        ? o.privacy_notice_version
        : o.privacy_notice_version === null
          ? null
          : DEFAULT_AI_ACCESS_SETTINGS.privacy_notice_version,
    privacy_notice_accepted_at:
      typeof o.privacy_notice_accepted_at === "string"
        ? o.privacy_notice_accepted_at
        : o.privacy_notice_accepted_at === null
          ? null
          : DEFAULT_AI_ACCESS_SETTINGS.privacy_notice_accepted_at,
  };
}

/**
 * Loads AI access flags for a user (admin client — used on API-key auth path
 * where there is no Clerk JWT for RLS).
 */
export async function getAiAccessSettings(
  userId: string,
): Promise<AiAccessSettings> {
  const { data, error } = await createAdminClient()
    .from("user_settings")
    .select("value")
    .eq("user_id", userId)
    .eq("key", AI_ACCESS_SETTINGS_KEY)
    .maybeSingle();

  if (error) {
    throw new DatabaseError(error.message);
  }
  if (!data) {
    return { ...DEFAULT_AI_ACCESS_SETTINGS };
  }
  return normalizeSettings(data.value);
}

export async function setAiAccessSettings(
  userId: string,
  patch: Partial<AiAccessSettings>,
): Promise<AiAccessSettings> {
  const current = await getAiAccessSettings(userId);
  const next: AiAccessSettings = {
    ...current,
    ...patch,
  };

  const { error } = await createAdminClient()
    .from("user_settings")
    .upsert(
      {
        user_id: userId,
        key: AI_ACCESS_SETTINGS_KEY,
        value: next,
      },
      { onConflict: "user_id,key" },
    );

  if (error) {
    throw new DatabaseError(error.message);
  }
  return next;
}

export async function recordAuditEvent(input: {
  clerkUserId: string;
  actorType?: string;
  apiKeyId?: string | null;
  eventType: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  targetCount?: number | null;
  clientName?: string | null;
  clientType?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { error } = await createAdminClient().from("audit_events").insert({
    clerk_user_id: input.clerkUserId,
    actor_type: input.actorType ?? "user",
    api_key_id: input.apiKeyId ?? null,
    event_type: input.eventType,
    action: input.action,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    target_count: input.targetCount ?? null,
    client_name: input.clientName ?? null,
    client_type: input.clientType ?? null,
    metadata: input.metadata ?? {},
  });

  // Audit must not block the primary control path if the table is missing in
  // a stale local DB — log-worthy but non-fatal for disable-all.
  if (error) {
    console.error("[audit_events] insert failed:", error.message);
  }
}

/**
 * Disable all AI/API-key access: flag off + revoke every active key + audit.
 */
export async function disableAllAiAccess(userId: string): Promise<{
  settings: AiAccessSettings;
  revokedCount: number;
}> {
  const settings = await setAiAccessSettings(userId, {
    ai_access_enabled: false,
  });
  const revokedCount = await revokeAllApiKeysForUser(
    userId,
    "disable_all_ai_access",
  );
  await recordAuditEvent({
    clerkUserId: userId,
    actorType: "user",
    eventType: "ai_access",
    action: "disable_all",
    targetCount: revokedCount,
    metadata: { revoked_count: revokedCount },
  });
  return { settings, revokedCount };
}

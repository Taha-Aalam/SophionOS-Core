/**
 * Account deletion planner and lifecycle helpers.
 * Final purge uses admin client scoped strictly by clerk_user_id / user_id.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { DatabaseError } from "@/lib/api/error-handler";
import { setAiAccessSettings } from "@/lib/api/ai-access-service";
import { revokeAllApiKeysForUser } from "@/lib/api/api-key-service";
import { recordAuditEvent } from "@/lib/audit/audit-service";

export const DELETION_GRACE_DAYS = 14;

/** Dependency-safe purge order for application product data (not billing). */
export const ACCOUNT_DELETION_TABLE_ORDER = [
  // Junction / child-first tables (best-effort; missing tables ignored)
  "note_notebooks",
  "note_topics",
  "note_areas",
  "note_goals",
  "note_projects",
  "note_tasks",
  "task_areas",
  "task_goals",
  "task_projects",
  "project_areas",
  "project_goals",
  "goal_areas",
  "contact_areas",
  "contact_goals",
  "contact_projects",
  "contact_tasks",
  "contact_logs",
  "resource_areas",
  "resource_goals",
  "resource_projects",
  "resource_tasks",
  // Primary entities
  "tasks",
  "notes",
  "resources",
  "topics",
  "contacts",
  "projects",
  "goals",
  "areas",
  // User-owned config
  "user_settings",
  "integrations",
  "api_keys",
  "data_export_jobs",
  "audit_events",
] as const;

export type DeletionStatus =
  | "scheduled"
  | "cancelled"
  | "processing"
  | "completed"
  | "failed";

export interface AccountDeletionRequest {
  id: string;
  clerk_user_id: string;
  requested_at: string;
  scheduled_for: string;
  cancelled_at: string | null;
  completed_at: string | null;
  status: DeletionStatus;
  failure_code: string | null;
}

export function planAccountDeletionTables(): readonly string[] {
  return ACCOUNT_DELETION_TABLE_ORDER;
}

export function computeScheduledFor(
  from: Date = new Date(),
  graceDays = DELETION_GRACE_DAYS,
): string {
  const d = new Date(from.getTime());
  d.setUTCDate(d.getUTCDate() + graceDays);
  return d.toISOString();
}

/**
 * Immediate side effects of requesting deletion: disable AI + revoke keys.
 */
export async function applyImmediateDeletionSideEffects(
  userId: string,
): Promise<{ revokedCount: number }> {
  await setAiAccessSettings(userId, { ai_access_enabled: false });
  const revokedCount = await revokeAllApiKeysForUser(
    userId,
    "account_deletion_requested",
  );
  await recordAuditEvent({
    clerkUserId: userId,
    actorType: "user",
    eventType: "privacy",
    action: "deletion_requested_side_effects",
    targetCount: revokedCount,
    metadata: { revoked_count: revokedCount },
  });
  return { revokedCount };
}

export async function requestAccountDeletion(
  userId: string,
  confirmation: string,
): Promise<AccountDeletionRequest> {
  if (confirmation.trim().toUpperCase() !== "DELETE") {
    throw new Error("CONFIRMATION_REQUIRED");
  }

  const admin = createAdminClient();
  const scheduled_for = computeScheduledFor();

  // Cancel any prior open request by replacing (unique on clerk_user_id).
  const { data: existing } = await admin
    .from("account_deletion_requests")
    .select("id, status")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (existing && existing.status === "scheduled") {
    const { data, error } = await admin
      .from("account_deletion_requests")
      .update({
        requested_at: new Date().toISOString(),
        scheduled_for,
        cancelled_at: null,
        completed_at: null,
        status: "scheduled",
        failure_code: null,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new DatabaseError(error.message);
    await applyImmediateDeletionSideEffects(userId);
    return data as AccountDeletionRequest;
  }

  const { data, error } = await admin
    .from("account_deletion_requests")
    .insert({
      clerk_user_id: userId,
      scheduled_for,
      status: "scheduled",
    })
    .select("*")
    .single();

  if (error) throw new DatabaseError(error.message);
  await applyImmediateDeletionSideEffects(userId);
  await recordAuditEvent({
    clerkUserId: userId,
    actorType: "user",
    eventType: "privacy",
    action: "deletion_scheduled",
    metadata: { scheduled_for },
  });
  return data as AccountDeletionRequest;
}

export async function cancelAccountDeletion(
  userId: string,
): Promise<AccountDeletionRequest | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("account_deletion_requests")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
    })
    .eq("clerk_user_id", userId)
    .eq("status", "scheduled")
    .select("*")
    .maybeSingle();

  if (error) throw new DatabaseError(error.message);
  if (data) {
    await setAiAccessSettings(userId, { ai_access_enabled: true });
    await recordAuditEvent({
      clerkUserId: userId,
      actorType: "user",
      eventType: "privacy",
      action: "deletion_cancelled",
    });
  }
  return (data as AccountDeletionRequest) ?? null;
}

export async function getAccountDeletionRequest(
  userId: string,
): Promise<AccountDeletionRequest | null> {
  const { data, error } = await createAdminClient()
    .from("account_deletion_requests")
    .select("*")
    .eq("clerk_user_id", userId)
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new DatabaseError(error.message);
  return (data as AccountDeletionRequest) ?? null;
}

/** Whether the grace period has elapsed for a scheduled deletion. */
export function isAccountDeletionDue(
  scheduledFor: string,
  now: Date = new Date(),
): boolean {
  return new Date(scheduledFor).getTime() <= now.getTime();
}

/**
 * If the user has a scheduled deletion and scheduled_for <= now, run the final
 * purge. Makes “after grace period, data is purged” true when the user next
 * hits privacy APIs (or cron can call the same helper).
 */
export async function processDueAccountDeletion(
  userId: string,
  now: Date = new Date(),
): Promise<{
  processed: boolean;
  result?: { cleared: string[]; failed: string[] };
}> {
  const row = await getAccountDeletionRequest(userId);
  if (!row || row.status !== "scheduled") {
    return { processed: false };
  }
  if (!isAccountDeletionDue(row.scheduled_for, now)) {
    return { processed: false };
  }
  const result = await finalizeAccountDeletion(userId);
  return { processed: true, result };
}

/**
 * Final purge of application data for userId. Billing tables intentionally skipped.
 * Every product-table delete is scoped by user_id (or clerk_user_id for audit).
 * Returns tables successfully cleared.
 */
export async function finalizeAccountDeletion(
  userId: string,
): Promise<{ cleared: string[]; failed: string[] }> {
  const admin = createAdminClient();
  await admin
    .from("account_deletion_requests")
    .update({ status: "processing" })
    .eq("clerk_user_id", userId)
    .eq("status", "scheduled");

  const cleared: string[] = [];
  const failed: string[] = [];

  for (const table of ACCOUNT_DELETION_TABLE_ORDER) {
    try {
      // audit_events uses clerk_user_id (deletion request row is updated after the loop)
      if (table === "audit_events") {
        const { error } = await admin
          .from(table)
          .delete()
          .eq("clerk_user_id", userId);
        if (error) failed.push(table);
        else cleared.push(table);
        continue;
      }
      const { error } = await admin.from(table).delete().eq("user_id", userId);
      if (error) {
        // Table may not exist in every env — treat undefined relation as skip
        if (
          error.message.includes("does not exist") ||
          error.code === "42P01"
        ) {
          continue;
        }
        failed.push(table);
      } else {
        cleared.push(table);
      }
    } catch {
      failed.push(table);
    }
  }

  await recordAuditEvent({
    clerkUserId: userId,
    actorType: "system",
    eventType: "privacy",
    action: "deletion_finalized",
    metadata: { cleared_count: cleared.length, failed_count: failed.length },
  });

  await admin
    .from("account_deletion_requests")
    .update({
      status: failed.length ? "failed" : "completed",
      completed_at: new Date().toISOString(),
      failure_code: failed.length ? "PARTIAL_PURGE" : null,
    })
    .eq("clerk_user_id", userId);

  return { cleared, failed };
}

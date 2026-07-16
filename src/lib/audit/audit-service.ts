import { createHash, randomUUID } from "crypto";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AuthResult } from "@/lib/api/api-auth";
import { redactAuditMetadata, summarizeUserAgent } from "./audit-redaction";
import type { AuditEventInput, AuditEventRecord } from "./audit-types";

export function createRequestId(): string {
  return randomUUID();
}

export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex").slice(0, 32);
}

/**
 * Best-effort audit insert. Never throws to callers (fail-open for product writes).
 */
export async function recordAuditEvent(
  input: AuditEventInput,
): Promise<void> {
  try {
    const metadata = redactAuditMetadata(input.metadata ?? {});
    const { error } = await createAdminClient().from("audit_events").insert({
      clerk_user_id: input.clerkUserId,
      actor_type: input.actorType ?? "user",
      api_key_id: input.apiKeyId ?? null,
      event_type: input.eventType,
      action: input.action,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      target_count: input.targetCount ?? null,
      request_id: input.requestId ?? null,
      client_name: input.clientName ?? null,
      client_type: input.clientType ?? null,
      ip_hash: input.ipHash ?? null,
      user_agent_summary: input.userAgentSummary ?? null,
      metadata,
    });
    if (error) {
      console.error("[audit] insert failed:", error.message);
    }
  } catch (err) {
    console.error(
      "[audit] insert exception:",
      err instanceof Error ? err.message : "unknown",
    );
  }
}

export function actorFromAuth(authResult: AuthResult): {
  actorType: "user" | "api_key";
  apiKeyId: string | null;
  clientName: string | null;
  clientType: string | null;
} {
  if (authResult.type === "api_key") {
    return {
      actorType: "api_key",
      apiKeyId: authResult.keyId ?? null,
      clientName: authResult.clientName ?? null,
      clientType: authResult.clientType ?? null,
    };
  }
  return {
    actorType: "user",
    apiKeyId: null,
    clientName: null,
    clientType: null,
  };
}

/** Record API-key (or session) mutating request attribution. */
export async function recordApiMutationAudit(opts: {
  authResult: AuthResult;
  request: NextRequest;
  action: string;
  result: "authorized" | "denied" | "success" | "failure";
  entityType?: string | null;
  entityId?: string | null;
  targetCount?: number | null;
  errorCode?: string | null;
  requestId?: string | null;
}): Promise<void> {
  const actor = actorFromAuth(opts.authResult);
  const path = new URL(opts.request.url).pathname;
  await recordAuditEvent({
    clerkUserId: opts.authResult.userId,
    actorType: actor.actorType,
    apiKeyId: actor.apiKeyId,
    eventType:
      opts.authResult.type === "api_key" ? "mcp_api_write" : "mcp_api_write",
    action: opts.action,
    entityType: opts.entityType,
    entityId: opts.entityId,
    targetCount: opts.targetCount,
    requestId: opts.requestId ?? opts.request.headers.get("x-request-id"),
    clientName: actor.clientName,
    clientType: actor.clientType,
    ipHash: hashIp(
      opts.request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        opts.request.headers.get("x-real-ip"),
    ),
    userAgentSummary: summarizeUserAgent(
      opts.request.headers.get("user-agent"),
    ),
    metadata: {
      route: path,
      method: opts.request.method,
      result: opts.result,
      errorCode: opts.errorCode ?? undefined,
      authType: opts.authResult.type,
      accessMode: opts.authResult.accessMode,
    },
  });
}

export interface ListAuditEventsQuery {
  page?: number;
  pageSize?: number;
  keyId?: string | null;
  eventType?: string | null;
  since?: string | null;
}

export async function listAuditEventsForUser(
  userId: string,
  query: ListAuditEventsQuery = {},
): Promise<{ events: AuditEventRecord[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = createAdminClient()
    .from("audit_events")
    .select(
      "id, clerk_user_id, actor_type, api_key_id, event_type, action, entity_type, entity_id, target_count, request_id, client_name, client_type, ip_hash, user_agent_summary, metadata, occurred_at",
      { count: "exact" },
    )
    .eq("clerk_user_id", userId)
    .order("occurred_at", { ascending: false })
    .range(from, to);

  if (query.keyId) {
    q = q.eq("api_key_id", query.keyId);
  }
  if (query.eventType) {
    q = q.eq("event_type", query.eventType);
  }
  if (query.since) {
    q = q.gte("occurred_at", query.since);
  }

  const { data, error, count } = await q;
  if (error) {
    throw new Error(error.message);
  }

  return {
    events: (data as AuditEventRecord[]) ?? [],
    total: count ?? 0,
    page,
    pageSize,
  };
}

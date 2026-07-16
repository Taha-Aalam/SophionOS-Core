export type AuditActorType = "user" | "api_key" | "system" | "support";

export type AuditEventFamily =
  | "credentials"
  | "ai_access"
  | "mcp_api_read"
  | "mcp_api_write"
  | "privacy"
  | "security"
  | "admin";

export interface AuditEventInput {
  clerkUserId: string;
  actorType?: AuditActorType;
  apiKeyId?: string | null;
  eventType: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  targetCount?: number | null;
  requestId?: string | null;
  clientName?: string | null;
  clientType?: string | null;
  ipHash?: string | null;
  userAgentSummary?: string | null;
  metadata?: Record<string, unknown>;
}

export interface AuditEventRecord {
  id: string;
  clerk_user_id: string;
  actor_type: string;
  api_key_id: string | null;
  event_type: string;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  target_count: number | null;
  request_id: string | null;
  client_name: string | null;
  client_type: string | null;
  ip_hash: string | null;
  user_agent_summary: string | null;
  metadata: Record<string, unknown>;
  occurred_at: string;
}

/** Fields never allowed in audit metadata or logs. */
export const AUDIT_BANNED_METADATA_KEYS = [
  "key_hash",
  "raw_key",
  "key",
  "secret",
  "password",
  "authorization",
  "Authorization",
  "token",
  "access_token",
  "refresh_token",
  "clerk_token",
  "body",
  "requestBody",
  "responseBody",
  "note_body",
  "content",
  "description",
  "email",
  "phone",
  "query",
  "searchQuery",
  "ip",
  "ipAddress",
] as const;

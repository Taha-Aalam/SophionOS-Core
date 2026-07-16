import { NextRequest } from "next/server";
import {
  generateApiKey,
  listApiKeys,
  toPublicApiKeyRecord,
} from "@/lib/api/api-key-service";
import { requireAuth, requireClerkSession } from "@/lib/api/api-auth";
import { requirePaidTier } from "@/lib/api/subscription";
import { success, created, error } from "@/lib/api/api-response";
import { validateBody } from "@/lib/api/api-validator";
import { rateLimit } from "@/lib/api/rate-limiter";
import { AppError } from "@/lib/api/error-handler";
import { createApiKeySchema } from "@/lib/validators/ai-access.schema";
import { recordAuditEvent } from "@/lib/api/ai-access-service";

export async function GET(request: NextRequest) {
  try {
    // Listing is allowed for session or API key (no privilege escalation).
    const { userId } = await requireAuth(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    // listApiKeys never returns key_hash or raw key material.
    const keys = await listApiKeys(userId);
    return success(keys.map(toPublicApiKeyRecord));
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

export async function POST(request: NextRequest) {
  try {
    // Minting keys is dashboard-only — API keys cannot create write_enabled peers.
    const { userId } = await requireClerkSession(request);
    // Minting an API key is a Pro capability — a free user can authenticate
    // (manages settings under a Clerk session) but cannot create keys.
    await requirePaidTier(userId);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    if (!request.headers.get("content-type")?.includes("application/json")) {
      return error(new AppError("Unsupported Media Type", 415, "UNSUPPORTED_MEDIA_TYPE"));
    }

    const body = await validateBody(request, createApiKeySchema);
    const clientType = body.client_type ?? body.clientType ?? "unknown";
    const { key, record } = await generateApiKey(userId, {
      name: body.name,
      clientType,
      clientName: body.client_name ?? body.clientName ?? null,
      accessMode: body.access_mode ?? body.accessMode,
      scopes: body.scopes,
      expiresAt: body.expires_at ?? body.expiresAt ?? null,
    });

    await recordAuditEvent({
      clerkUserId: userId,
      actorType: "user",
      apiKeyId: record.id,
      eventType: "credentials",
      action: "api_key_created",
      entityType: "api_key",
      entityId: record.id,
      clientName: record.client_name,
      clientType: record.client_type,
      metadata: {
        access_mode: record.access_mode,
        key_prefix: record.key_prefix,
      },
    });

    // The raw `key` is returned exactly once here and never persisted in plain
    // text. `record` carries only safe metadata (no key_hash).
    return created({ key, record: toPublicApiKeyRecord(record) });
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

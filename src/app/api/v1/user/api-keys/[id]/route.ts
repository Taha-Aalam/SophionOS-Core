import { NextRequest } from "next/server";
import {
  revokeApiKey,
  updateApiKey,
  toPublicApiKeyRecord,
} from "@/lib/api/api-key-service";
import { requireClerkSession } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { validateBody } from "@/lib/api/api-validator";
import { rateLimit } from "@/lib/api/rate-limiter";
import { AppError } from "@/lib/api/error-handler";
import { updateApiKeySchema } from "@/lib/validators/ai-access.schema";
import { recordAuditEvent } from "@/lib/api/ai-access-service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Dashboard session only — a read_only API key must not upgrade itself.
    const { userId } = await requireClerkSession(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    if (!request.headers.get("content-type")?.includes("application/json")) {
      return error(new AppError("Unsupported Media Type", 415, "UNSUPPORTED_MEDIA_TYPE"));
    }

    const { id } = await params;
    const body = await validateBody(request, updateApiKeySchema);
    const record = await updateApiKey(userId, id, {
      name: body.name,
      accessMode: body.access_mode ?? body.accessMode,
      clientName: body.client_name ?? body.clientName,
      scopes: body.scopes,
      expiresAt: body.expires_at ?? body.expiresAt,
    });

    await recordAuditEvent({
      clerkUserId: userId,
      actorType: "user",
      apiKeyId: id,
      eventType: "credentials",
      action: "api_key_updated",
      entityType: "api_key",
      entityId: id,
      metadata: {
        access_mode: record.access_mode,
      },
    });

    return success(toPublicApiKeyRecord(record));
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // Dashboard session only — API keys cannot revoke (or manage) credentials.
    const { userId } = await requireClerkSession(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const { id } = await params;
    // revokeApiKey is scoped by userId and throws NotFoundError otherwise.
    await revokeApiKey(userId, id, "user_revoked");

    await recordAuditEvent({
      clerkUserId: userId,
      actorType: "user",
      apiKeyId: id,
      eventType: "credentials",
      action: "api_key_revoked",
      entityType: "api_key",
      entityId: id,
    });

    return success({ id, revoked: true });
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

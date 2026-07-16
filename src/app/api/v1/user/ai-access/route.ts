import { NextRequest } from "next/server";
import { requireAuth, requireClerkSession } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { validateBody } from "@/lib/api/api-validator";
import { rateLimit } from "@/lib/api/rate-limiter";
import { AppError } from "@/lib/api/error-handler";
import {
  getAiAccessSettings,
  setAiAccessSettings,
  recordAuditEvent,
} from "@/lib/api/ai-access-service";
import { listApiKeys, toPublicApiKeyRecord } from "@/lib/api/api-key-service";
import { patchAiAccessSchema } from "@/lib/validators/ai-access.schema";

export async function GET(request: NextRequest) {
  try {
    // Read settings/list is fine for session or API key (no escalation).
    const { userId } = await requireAuth(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const settings = await getAiAccessSettings(userId);
    const keys = await listApiKeys(userId);
    return success({
      ...settings,
      keys: keys.map(toPublicApiKeyRecord),
    });
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Changing AI flags is dashboard-only — API keys cannot enable writes for themselves.
    const { userId } = await requireClerkSession(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    if (!request.headers.get("content-type")?.includes("application/json")) {
      return error(new AppError("Unsupported Media Type", 415, "UNSUPPORTED_MEDIA_TYPE"));
    }

    const body = await validateBody(request, patchAiAccessSchema);
    if (
      body.ai_access_enabled === undefined &&
      body.ai_write_access_enabled === undefined &&
      body.privacy_notice_version === undefined &&
      body.privacy_notice_accepted_at === undefined
    ) {
      return error(new AppError("No fields to update", 400, "VALIDATION_ERROR"));
    }

    const settings = await setAiAccessSettings(userId, body);

    await recordAuditEvent({
      clerkUserId: userId,
      actorType: "user",
      eventType: "ai_access",
      action: "settings_updated",
      metadata: { ...body },
    });

    return success(settings);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

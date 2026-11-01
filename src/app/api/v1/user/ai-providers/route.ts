import { NextRequest } from "next/server";
import { requireClerkSession } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { validateBody } from "@/lib/api/api-validator";
import { rateLimit } from "@/lib/api/rate-limiter";
import { AppError } from "@/lib/api/error-handler";
import { createClient } from "@/lib/supabase/server";
import { providerCredentialsService } from "@/lib/services/provider-credentials.service";
import { recordAuditEvent } from "@/lib/api/ai-access-service";
import { PROVIDER_IDS, type ProviderId } from "@/lib/ai/provider-registry";
import { upsertProviderCredentialSchema } from "@/lib/validators/ai-providers.schema";

// Management of the user's LLM provider keys is Clerk-session-only by design:
// an API-key/MCP caller must never be able to read or swap the credentials the
// server-side gateway uses. requireClerkSession rejects api_key auth.

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireClerkSession(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    // Metadata only — never encrypted_secret or raw key material.
    const items = await providerCredentialsService.list(userId, {
      supabase: await createClient(),
    });
    return success(items);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await requireClerkSession(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const input = await validateBody(request, upsertProviderCredentialSchema);
    const meta = await providerCredentialsService.upsert(userId, input, {
      supabase: await createClient(),
    });

    await recordAuditEvent({
      clerkUserId: userId,
      actorType: "clerk",
      eventType: "provider_key_added",
      action: "connect",
      entityType: "provider_credential",
      entityId: input.provider,
      metadata: { provider: input.provider },
    });
    return success(meta);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await requireClerkSession(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const provider = request.nextUrl.searchParams.get("provider");
    if (!provider || !PROVIDER_IDS.includes(provider as ProviderId)) {
      return error(new AppError("Unknown provider", 400, "UNSUPPORTED_PROVIDER"));
    }

    await providerCredentialsService.remove(userId, provider as ProviderId, {
      supabase: await createClient(),
    });
    await recordAuditEvent({
      clerkUserId: userId,
      actorType: "clerk",
      eventType: "provider_key_removed",
      action: "disconnect",
      entityType: "provider_credential",
      entityId: provider,
      metadata: { provider },
    });
    return success({ provider });
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

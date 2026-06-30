import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { generateApiKey, listApiKeys } from "@/lib/api/api-key-service";
import { requireAuth } from "@/lib/api/api-auth";
import { success, created, error } from "@/lib/api/api-response";
import { validateBody } from "@/lib/api/api-validator";
import { rateLimit } from "@/lib/api/rate-limiter";
import { AppError } from "@/lib/api/error-handler";

const createApiKeySchema = z.object({
  name: z.string().min(1).max(120),
});

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    // listApiKeys never returns key_hash.
    const keys = await listApiKeys(userId);
    return success(keys);
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    if (!request.headers.get("content-type")?.includes("application/json")) {
      return error(new AppError("Unsupported Media Type", 415, "UNSUPPORTED_MEDIA_TYPE"));
    }

    const body = await validateBody(request, createApiKeySchema);
    const { key, record } = await generateApiKey(userId, body.name);

    // The raw `key` is returned exactly once here and never persisted in plain
    // text. `record` carries only safe metadata (no key_hash).
    return created({ key, record });
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

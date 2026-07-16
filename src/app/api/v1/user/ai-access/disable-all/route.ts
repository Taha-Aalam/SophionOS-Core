import { NextRequest } from "next/server";
import { requireClerkSession } from "@/lib/api/api-auth";
import { success, error } from "@/lib/api/api-response";
import { rateLimit } from "@/lib/api/rate-limiter";
import { AppError } from "@/lib/api/error-handler";
import { disableAllAiAccess } from "@/lib/api/ai-access-service";

/**
 * Emergency control: disable AI/API access and revoke every active API key.
 * Clerk session (dashboard) continues to work. API keys cannot call this.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireClerkSession(request);
    const rl = await rateLimit(request, userId);
    if (!rl.success) return error(new AppError("Too many requests", 429, "RATE_LIMITED"));

    const { settings, revokedCount } = await disableAllAiAccess(userId);
    return success({
      ...settings,
      revoked_count: revokedCount,
    });
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

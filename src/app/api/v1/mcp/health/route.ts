import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/api-auth";
import { requirePaidTier } from "@/lib/api/subscription";
import { success, error } from "@/lib/api/api-response";
import { AppError } from "@/lib/api/error-handler";

/**
 * MCP startup health/authorization probe.
 *
 * The MCP server hits THIS endpoint on startup (not `/user/settings`) so that
 * the paid-tier wall is enforced at connect time: `requireAuth` then
 * `requirePaidTier`, so a free-tier key gets a 403 `TIER_REQUIRED` and the
 * server refuses to start with a clear "Pro required" message. A valid
 * Pro/lifetime/max key gets `{ ok: true, tier_ok: true }`.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);
    await requirePaidTier(userId);
    return success({ ok: true, tier_ok: true });
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

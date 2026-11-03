import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/api-auth";
import { requirePaidTier } from "@/lib/api/subscription";
import { success, error } from "@/lib/api/api-response";
import { withApiLogging } from "@/lib/api/api-log";


/**
 * MCP startup health/authorization probe.
 *
 * The MCP server hits THIS endpoint on startup (not `/user/settings`) so that
 * the paid-tier wall is enforced at connect time: `requireAuth` then
 * `requirePaidTier`, so a free-tier key gets a 403 `TIER_REQUIRED` and the
 * server refuses to start with a clear "Pro required" message. A valid
 * Pro/lifetime/max key gets `{ ok: true, tier_ok: true }`.
 */
async function handleGet(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);
    await requirePaidTier(userId);
    return success({ ok: true, tier_ok: true });
  } catch (err) {
    return error(err);
  }
}

export const GET = withApiLogging("/api/v1/mcp/health", handleGet);

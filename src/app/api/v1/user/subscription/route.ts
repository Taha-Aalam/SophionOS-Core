import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/api-auth";
import {
  getTier,
  isPaidTier,
  getEntityCount,
  getEntityCountsPerType,
  ENTITY_LIMITS,
} from "@/lib/api/subscription";
import { success, error } from "@/lib/api/api-response";
import { AppError } from "@/lib/api/error-handler";

/**
 * Returns the caller's tier + paid flag for the dashboard to gate UI.
 *
 * Lives under `/user/*` and uses `requireAuth` (NOT `authorizeApiRequest`) on
 * purpose: a Free-tier user must be able to read their own tier — that's how
 * the dashboard knows to show the upgrade CTA. Gating this with the paid wall
 * would make a free user unable to discover they're free.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);
    const [tier, isPaid, entityCount, entityCounts] = await Promise.all([
      getTier(userId),
      isPaidTier(userId),
      getEntityCount(userId),
      getEntityCountsPerType(userId),
    ]);
    return success({
      tier,
      isPaid,
      entityCount,
      entityCounts,
      entityLimit: ENTITY_LIMITS[tier],
    });
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

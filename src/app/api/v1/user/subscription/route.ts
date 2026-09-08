import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api/api-auth";
import {
  getTier,
  isPaidTier,
  getEntityCount,
  getEntityCountsPerType,
  ENTITY_LIMITS,
} from "@/lib/api/subscription";
import { isCohortMember } from "@/lib/api/cohort-membership";
import { resolveUserEmail } from "@/lib/notifications/resolve-email";
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
    const [tier, isPaid, entityCount, entityCounts, email] = await Promise.all([
      getTier(userId),
      isPaidTier(userId),
      getEntityCount(userId),
      getEntityCountsPerType(userId),
      // resolveUserEmail throws without CLERK_SECRET_KEY; treat that like any
      // other lookup failure so the route never breaks on the cohort check.
      resolveUserEmail(userId).catch(() => null),
    ]);
    // Founding Cohort membership (paid on the marketing site). isCohortMember
    // already fails closed, so a landing-site outage cannot fail this route.
    const cohortMember = await isCohortMember(email);
    return success({
      tier,
      isPaid,
      cohortMember,
      entityCount,
      entityCounts,
      entityLimit: ENTITY_LIMITS[tier],
    });
  } catch (err) {
    return err instanceof AppError ? error(err) : error(new AppError("Internal server error"));
  }
}

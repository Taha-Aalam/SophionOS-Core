import { isCohortMember } from "@/lib/api/cohort-membership";
import { getTier } from "@/lib/api/subscription";
import {
  resolveUserEmail,
  type ResolvedUserProfile,
} from "@/lib/notifications/resolve-email";

export interface SubscriptionSummary {
  tier: string;
  isPaid: boolean;
  cohortMember: boolean;
}

// Per-request-layout cache: the dashboard layout renders on EVERY client-side
// navigation. Without this, each navigation re-calls Clerk and the marketing
// site, stalling route transitions by up to the cohort timeout.
const SUMMARY_TTL_MS = 60_000;
const summaryCache = new Map<string, { at: number; value: SubscriptionSummary }>();

/**
 * Tier + Founding Cohort membership for the signed-in user, for server-component
 * seeding (dashboard layout → topbar first paint). Fails closed: any lookup
 * error yields false so the UI falls back to client-side resolution.
 * Reuses the caller's Clerk profile (email) to avoid a second backend call;
 * the cohort lookup is awaited, so callers that must not block should race it.
 */
export async function getSubscriptionSummary(
  userId: string,
  options?: { profile?: ResolvedUserProfile | null },
): Promise<SubscriptionSummary> {
  const cached = summaryCache.get(userId);
  if (cached && Date.now() - cached.at < SUMMARY_TTL_MS) {
    return cached.value;
  }

  const email = options?.profile
    ? options.profile.email
    : await resolveUserEmail(userId).catch(() => null);
  const [tier, cohortMember] = await Promise.all([
    getTier(userId),
    isCohortMember(email),
  ]);
  const value: SubscriptionSummary = {
    tier,
    isPaid: tier === "pro" || tier === "lifetime" || tier === "max",
    cohortMember,
  };
  summaryCache.set(userId, { at: Date.now(), value });
  return value;
}

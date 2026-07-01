import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "../supabase/admin";
import { AppError } from "./error-handler";

/**
 * Subscription tier resolution for the API / MCP access tier wall.
 *
 * Tiers: free | pro | lifetime | max. A caller with no subscription row (or a
 * non-active row) is treated as `free`. `lifetime` and `max` are entitlement-
 * equivalent to `pro` for access checks; lifetime never expires.
 *
 * Reads are cached per userId (same approach as the rate limiter) so the gate
 * doesn't hit `subscriptions` on every request. The default client is the admin
 * (service-role) client — tier is server-authority data the browser RLS policy
 * only exposes for SELECT — but `options.supabase` is injectable for tests.
 */
export type Tier = "free" | "pro" | "lifetime" | "max";

const PAID_TIERS: ReadonlySet<Tier> = new Set<Tier>(["pro", "lifetime", "max"]);
const VALID_TIERS: ReadonlySet<string> = new Set<Tier>([
  "free",
  "pro",
  "lifetime",
  "max",
]);
const DEFAULT_TIER: Tier = "free";

interface ServiceOptions {
  supabase?: SupabaseClient;
}

const tierCache = new Map<string, { tier: Tier; cachedAt: number }>();
const TIER_CACHE_MS = 60_000;

/**
 * Resolve a user's tier. Returns `free` for a missing row, a non-active row,
 * an unrecognized tier value, or any lookup failure (fail-closed to the most
 * restrictive tier so a DB blip can't silently grant paid access).
 */
export async function getTier(
  userId: string,
  options?: ServiceOptions,
): Promise<Tier> {
  const cached = tierCache.get(userId);
  if (cached && Date.now() - cached.cachedAt < TIER_CACHE_MS) {
    return cached.tier;
  }

  let tier: Tier = DEFAULT_TIER;
  try {
    const supabase = options?.supabase ?? createAdminClient();
    const { data } = await supabase
      .from("subscriptions")
      .select("tier, status")
      .eq("user_id", userId)
      .maybeSingle();
    if (
      data &&
      data.status === "active" &&
      typeof data.tier === "string" &&
      VALID_TIERS.has(data.tier)
    ) {
      tier = data.tier as Tier;
    }
  } catch {
    tier = DEFAULT_TIER;
  }

  tierCache.set(userId, { tier, cachedAt: Date.now() });
  return tier;
}

/** True for pro | lifetime | max; false for free (or missing/failed lookup). */
export async function isPaidTier(
  userId: string,
  options?: ServiceOptions,
): Promise<boolean> {
  const tier = await getTier(userId, options);
  return PAID_TIERS.has(tier);
}

/**
 * Gate guard for the API / MCP tier wall. Throws a 403 AppError (code
 * `TIER_REQUIRED`) unless the caller is on a paid tier (pro|lifetime|max).
 * The message IS the publicMessage — for a 4xx AppError, `publicMessage`
 * returns `message` verbatim — so it must be safe to surface to the caller.
 */
export async function requirePaidTier(
  userId: string,
  options?: ServiceOptions,
): Promise<void> {
  if (!(await isPaidTier(userId, options))) {
    throw new AppError(
      "This feature requires a Pro subscription.",
      403,
      "TIER_REQUIRED",
    );
  }
}

/** Test/seam helper: drop the per-user tier cache. */
export function clearTierCache(): void {
  tierCache.clear();
}

import type { NextRequest } from "next/server";
import { createAdminClient } from "../supabase/admin";

/**
 * Per-tier request limits per WINDOW_MS. A caller with no subscription row is
 * treated as `free`.
 */
const TIER_LIMITS: Record<string, number> = {
  free: 100,
  pro: 500,
  premium: 1000,
};
const DEFAULT_TIER = "free";
const WINDOW_MS = 60_000; // 1 minute

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
}

interface Counter {
  count: number;
  resetAt: number;
}

// Module-level counter store keyed by resolved userId (never IP — API-key
// callers share IPs). NOTE: this is per-instance in-memory state; production
// should swap to Vercel KV / Upstash so limits hold across serverless instances.
const counters = new Map<string, Counter>();

// Cache of userId -> tier to avoid a subscriptions read on every request.
const tierCache = new Map<string, { tier: string; cachedAt: number }>();
const TIER_CACHE_MS = 60_000;

async function resolveTier(userId: string): Promise<string> {
  const cached = tierCache.get(userId);
  if (cached && Date.now() - cached.cachedAt < TIER_CACHE_MS) {
    return cached.tier;
  }

  let tier = DEFAULT_TIER;
  try {
    const { data } = await createAdminClient()
      .from("subscriptions")
      .select("tier, status")
      .eq("user_id", userId)
      .maybeSingle();
    if (data && data.status === "active" && typeof data.tier === "string" && data.tier in TIER_LIMITS) {
      tier = data.tier;
    }
  } catch {
    // On any lookup failure, fall back to the free tier rather than blocking.
    tier = DEFAULT_TIER;
  }

  tierCache.set(userId, { tier, cachedAt: Date.now() });
  return tier;
}

/**
 * Tier-driven fixed-window rate limit. `identifier` MUST be the resolved
 * userId. Returns `{ success, limit, remaining }`; callers return 429 with a
 * `Retry-After` header when `success` is false.
 */
export async function rateLimit(
  _request: NextRequest,
  identifier: string,
): Promise<RateLimitResult> {
  const tier = await resolveTier(identifier);
  const limit = TIER_LIMITS[tier] ?? TIER_LIMITS[DEFAULT_TIER];

  const now = Date.now();
  const existing = counters.get(identifier);

  if (!existing || now >= existing.resetAt) {
    counters.set(identifier, { count: 1, resetAt: now + WINDOW_MS });
    return { success: true, limit, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return { success: false, limit, remaining: 0 };
  }

  existing.count += 1;
  return { success: true, limit, remaining: limit - existing.count };
}

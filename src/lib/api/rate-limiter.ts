import type { NextRequest } from "next/server";
import { createAdminClient } from "../supabase/admin";

/**
 * Per-tier request limits per WINDOW_MS. A caller with no subscription row is
 * treated as `free`. Keys match product tiers (free|pro|lifetime|max).
 */
const TIER_LIMITS: Record<string, number> = {
  free: 100,
  pro: 500,
  lifetime: 500,
  max: 1000,
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

// Process-local fallback when the shared store is unavailable (tests, local
// without migration). Production uses Postgres via the admin client.
const memoryCounters = new Map<string, Counter>();

const tierCache = new Map<string, { tier: string; cachedAt: number }>();
const TIER_CACHE_MS = 60_000;

function shouldUseMemoryStore(): boolean {
  return (
    process.env.RATE_LIMIT_STORE === "memory" ||
    process.env.NODE_ENV === "test" ||
    process.env.VITEST === "true"
  );
}

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
    if (
      data &&
      data.status === "active" &&
      typeof data.tier === "string" &&
      data.tier in TIER_LIMITS
    ) {
      tier = data.tier;
    }
  } catch {
    // Fail closed for entitlements: free is the most restrictive rate tier.
    tier = DEFAULT_TIER;
  }

  tierCache.set(userId, { tier, cachedAt: Date.now() });
  return tier;
}

function memoryRateLimit(identifier: string, limit: number): RateLimitResult {
  const now = Date.now();
  const existing = memoryCounters.get(identifier);

  if (!existing || now >= existing.resetAt) {
    memoryCounters.set(identifier, { count: 1, resetAt: now + WINDOW_MS });
    return { success: true, limit, remaining: limit - 1 };
  }

  if (existing.count >= limit) {
    return { success: false, limit, remaining: 0 };
  }

  existing.count += 1;
  return { success: true, limit, remaining: limit - existing.count };
}

/**
 * Shared fixed-window counter in Postgres (SECURITY DEFINER RPC). Returns null
 * when the store is unavailable so callers can fall back to memory.
 */
async function sharedRateLimit(
  identifier: string,
  limit: number,
): Promise<RateLimitResult | null> {
  try {
    const { data, error } = await createAdminClient().rpc("check_api_rate_limit", {
      p_user_id: identifier,
      p_limit: limit,
      p_window_ms: WINDOW_MS,
    });
    if (error || data == null) return null;

    const row = data as { success?: boolean; limit?: number; remaining?: number };
    if (typeof row.success !== "boolean") return null;
    return {
      success: row.success,
      limit: typeof row.limit === "number" ? row.limit : limit,
      remaining: typeof row.remaining === "number" ? row.remaining : 0,
    };
  } catch {
    return null;
  }
}

/**
 * Tier-driven fixed-window rate limit. `identifier` MUST be the resolved
 * userId. Returns `{ success, limit, remaining }`; callers return 429 with a
 * `Retry-After` header when `success` is false.
 *
 * Uses Postgres across instances when available; falls back to in-memory in
 * tests or if the shared store errors (fail-open to memory free-tier-ish
 * counters is better than no API — production should keep the migration applied).
 */
export async function rateLimit(
  _request: NextRequest,
  identifier: string,
): Promise<RateLimitResult> {
  const tier = await resolveTier(identifier);
  const limit = TIER_LIMITS[tier] ?? TIER_LIMITS[DEFAULT_TIER];

  if (shouldUseMemoryStore()) {
    return memoryRateLimit(identifier, limit);
  }

  const shared = await sharedRateLimit(identifier, limit);
  if (shared) return shared;

  // Shared store unavailable — degrade to process-local counters.
  return memoryRateLimit(identifier, limit);
}

/** Test helper: clear process-local state. */
export function clearRateLimitState(): void {
  memoryCounters.clear();
  tierCache.clear();
}

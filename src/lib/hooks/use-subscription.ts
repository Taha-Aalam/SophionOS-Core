"use client";

import { useEffect, useState } from "react";

export interface SubscriptionSummary {
  tier: string;
  isPaid: boolean;
  cohortMember: boolean;
}

/**
 * Reads GET /api/v1/user/subscription (tier, paid flag, Founding Cohort
 * membership). Fails closed to null data — consumers must treat null as
 * "unknown" and hide member/tier UI, never assume it.
 */
export function useSubscription() {
  const [data, setData] = useState<SubscriptionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/v1/user/subscription");
        const json = res.ok ? await res.json() : null;
        const next = json?.data as Partial<SubscriptionSummary> | undefined;
        if (!cancelled) {
          setData(
            next
              ? {
                  tier: next.tier ?? "free",
                  isPaid: next.isPaid === true,
                  cohortMember: next.cohortMember === true,
                }
              : null,
          );
        }
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading };
}

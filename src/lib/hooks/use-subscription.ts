"use client";

import { useEffect, useState } from "react";

export interface SubscriptionSummary {
  tier: string;
  isPaid: boolean;
  cohortMember: boolean;
}

// Session-shared state so every consumer mount sees the same subscription
// without refetching: one in-flight request (single-flight), the last
// successful value reused as initial state on later mounts, and a failed
// request retried by the next mount instead of poisoning the cache. Without
// this, each mount refetched from scratch and a slow/failed response dropped
// consumers back to "unknown" (null) — the cohort badge visibly disappeared
// and reappeared across navigations.
const TTL_MS = 60_000; // matches the server-side summary cache (SUMMARY_TTL_MS)
let inFlight: Promise<SubscriptionSummary | null> | null = null;
let lastKnown: SubscriptionSummary | null = null;
let lastKnownAt = 0;

async function fetchSubscription(): Promise<SubscriptionSummary | null> {
  try {
    const res = await fetch("/api/v1/user/subscription");
    const json = res.ok ? await res.json() : null;
    const next = json?.data as Partial<SubscriptionSummary> | undefined;
    if (!next) return null;
    return {
      tier: next.tier ?? "free",
      isPaid: next.isPaid === true,
      cohortMember: next.cohortMember === true,
    };
  } catch {
    return null;
  }
}

function requestSubscription(): Promise<SubscriptionSummary | null> {
  if (inFlight) return inFlight;
  if (lastKnown && Date.now() - lastKnownAt < TTL_MS) {
    return Promise.resolve(lastKnown);
  }
  inFlight = fetchSubscription().then((value) => {
    inFlight = null;
    if (value) {
      lastKnown = value;
      lastKnownAt = Date.now();
    }
    return value;
  });
  return inFlight;
}

/**
 * Reads GET /api/v1/user/subscription (tier, paid flag, Founding Cohort
 * membership). Fails closed to null data — consumers must treat null as
 * "unknown" and hide member/tier UI, never assume it. A failed fetch never
 * wipes a value a previous mount already displayed.
 */
export function useSubscription() {
  const [data, setData] = useState<SubscriptionSummary | null>(lastKnown);

  useEffect(() => {
    let cancelled = false;
    void requestSubscription().then((value) => {
      if (!cancelled) setData(value ?? lastKnown);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data };
}

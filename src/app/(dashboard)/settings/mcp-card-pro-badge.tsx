"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";

interface SubscriptionInfo {
  tier: "free" | "pro" | "lifetime" | "max";
  isPaid: boolean;
}

/**
 * Renders a "Pro" badge on the settings landing MCP card for Free-tier users,
 * signalling that MCP/API access is a paid feature before they click in. Reads
 * GET /api/v1/user/subscription (a /user/* route, open to free callers). Renders
 * nothing while loading or for paid tiers — fail-closed (show badge) on error.
 */
export function McpCardProBadge() {
  const [isPaid, setIsPaid] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/v1/user/subscription");
        const json = res.ok ? await res.json() : null;
        const data = json?.data as SubscriptionInfo | undefined;
        if (!cancelled) setIsPaid(data?.isPaid ?? false);
      } catch {
        if (!cancelled) setIsPaid(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (isPaid === null || isPaid) return null;
  return <Badge>Pro</Badge>;
}

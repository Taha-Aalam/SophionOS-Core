"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";

interface SubscriptionInfo {
  cohortMember?: boolean;
}

/**
 * Renders a "Cohort Member" badge for users who bought a Founding Cohort seat
 * on the marketing site with the email they log in with. Reads GET
 * /api/v1/user/subscription (cohortMember flag, resolved server-side against
 * the marketing site's membership API). Renders nothing while loading or for
 * non-members — fail-closed.
 */
export function CohortMemberBadge() {
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/v1/user/subscription");
        const json = res.ok ? await res.json() : null;
        const data = json?.data as SubscriptionInfo | undefined;
        if (!cancelled) setIsMember(data?.cohortMember === true);
      } catch {
        if (!cancelled) setIsMember(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isMember) return null;
  return <Badge>Cohort Member</Badge>;
}

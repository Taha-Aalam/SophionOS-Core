"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/lib/hooks/use-subscription";
import type { SubscriptionSummary } from "@/lib/api/subscription-summary";

/**
 * "Cohort Member" chip for users who bought a Founding Cohort seat on the
 * marketing site with the email they log in with. Membership is resolved
 * server-side (dashboard layout seed / subscription route) against the
 * marketing site's membership API. Renders nothing while unknown or for
 * non-members — fail-closed.
 *
 * `seed` is the server-resolved subscription so the chip paints in the FIRST
 * render with no pop-in; without it the hook's client fetch decides.
 *
 * `variant="pill"` is the topbar-profile form (tiny uppercase chip shown to
 * the right of the name in the topbar trigger).
 */
export function CohortMemberBadge({
  className,
  seed,
  variant = "plain",
}: {
  className?: string;
  seed?: SubscriptionSummary | null;
  variant?: "plain" | "pill";
}) {
  const { data } = useSubscription();
  const isMember = (seed ?? data)?.cohortMember === true;
  if (!isMember) return null;

  if (variant === "pill") {
    return (
      <span
        className={cn(
          "inline-flex h-4 items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-1.5 text-[10px] font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400",
          className,
        )}
      >
        Cohort
      </span>
    );
  }

  return (
    <Badge className={className} variant="secondary">
      Cohort Member
    </Badge>
  );
}

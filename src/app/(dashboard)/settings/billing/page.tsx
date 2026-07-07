"use client";

import { useEffect, useState } from "react";
import { Check, Crown, Rocket, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SettingsDetailHeader } from "@/components/settings/settings-detail-header";
import { ErrorState } from "@/components/views/error-state";
import { Skeleton } from "@/components/ui/skeleton";

async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const message = json?.error?.message ?? `Request failed (${res.status})`;
    throw new Error(message);
  }
  return json?.data as T;
}

interface SubscriptionInfo {
  tier: "free" | "pro" | "lifetime" | "max";
  isPaid: boolean;
  entityCounts?: Record<string, number>;
  entityLimits?: Record<string, number>;
}

const TIER_FEATURES: Record<string, string[]> = {
  free: [
    "Core dashboard access",
    "Unlimited areas, goals, projects",
    "Basic task management",
    "Note capture and organization",
    "Community support",
  ],
  pro: [
    "Everything in Free",
    "MCP server access",
    "API key management (up to 5 keys)",
    "Advanced analytics",
    "Priority support",
    "Early access to new features",
  ],
  lifetime: [
    "Everything in Pro",
    "One-time payment, lifetime access",
    "Unlimited API keys",
    "Lifetime Pro features",
  ],
  max: [
    "Everything in Lifetime",
    "Highest entity limits",
    "Dedicated support channel",
    "Custom integrations",
  ],
};

const TIER_LABELS: Record<string, { name: string; icon: React.ReactNode; color: string }> = {
  free: { name: "Free", icon: <X className="size-4" />, color: "text-muted-foreground" },
  pro: { name: "Pro", icon: <Crown className="size-4 text-amber-500" />, color: "text-amber-600 dark:text-amber-400" },
  lifetime: { name: "Lifetime", icon: <Sparkles className="size-4 text-purple-500" />, color: "text-purple-600 dark:text-purple-400" },
  max: { name: "Max", icon: <Rocket className="size-4 text-rose-500" />, color: "text-rose-600 dark:text-rose-400" },
};

export default function BillingPage() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiFetch<SubscriptionInfo>("/api/v1/user/subscription");
        if (!cancelled) setSubscription(data);
      } catch {
        if (!cancelled) setError("Failed to load billing information.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [retryKey]);

  if (loading) {
    return (
      <div className="reveal-stagger flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
        <SettingsDetailHeader
          title="Billing"
          description="View your current plan and usage."
        />
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reveal-stagger flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
        <SettingsDetailHeader
          title="Billing"
          description="View your current plan and usage."
        />
        <ErrorState message={error} onRetry={() => { setError(null); setLoading(true); setRetryKey((k) => k + 1); }} />
      </div>
    );
  }

  const tier = subscription?.tier ?? "free";
  const info = TIER_LABELS[tier] ?? TIER_LABELS.free;

  return (
    <div className="content-fade-in reveal-stagger flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <SettingsDetailHeader
        title="Billing"
        description="View your current plan and usage. Checkout is coming soon. For now, you can explore Pro features and upgrade when payment processing goes live."
      />

      {/* Current plan */}
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2">
            {info.icon}
            <CardTitle className={`text-2xl ${info.color}`}>
              {info.name}
            </CardTitle>
          </div>
          <CardDescription>
            {tier === "free"
              ? "Full dashboard access with core features. Upgrade for MCP, API, and advanced capabilities."
              : tier === "pro"
                ? "Unlock MCP server, API access, and advanced analytics."
                : tier === "lifetime"
                  ? "One-time payment, lifetime Pro features and unlimited API keys."
                  : "The ultimate tier with highest limits and dedicated support."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {TIER_FEATURES[tier]?.map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm">
                <Check className="size-4 text-green-500" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upgrade CTA for Free tier */}
      {!subscription?.isPaid && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="space-y-3">
            <CardTitle className="text-base">Upgrade to Pro</CardTitle>
            <CardDescription>
              MCP server access, API keys, and advanced analytics are waiting.
              Checkout is coming soon — this button will go live when ready.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled>
              Checkout coming soon
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Payment processing is not yet live. You can still explore Pro features
              on the MCP page.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Entity usage (if available) */}
      {subscription?.entityCounts && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usage</CardTitle>
            <CardDescription>
              Your current entity counts and limits.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              {Object.entries(subscription.entityCounts).map(([entity, count]) => (
                <div
                  key={entity}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="capitalize">{entity.replace(/_/g, " ")}</span>
                  <span>
                    {count} / {subscription.entityLimits?.[entity] ?? "∞"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

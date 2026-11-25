"use client";
import { useI18n } from "@/components/providers/i18n-provider";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";

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

const TIER_LABELS: Record<string, { name: string }> = {
  free: { name: "Free" },
  pro: { name: "Pro" },
  lifetime: { name: "Lifetime" },
  max: { name: "Max" },
};

export function BillingContent() {
  const { t } = useI18n();
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
        if (!cancelled) setError(t("billingContent.failedToLoadBillingInformation"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [retryKey, t]);

  if (loading) {
    return (
      <div className="reveal-stagger flex flex-col gap-6 p-6 content-column-grid mx-auto w-full">
        <SettingsDetailHeader
          title={t("settings.billing.title")}
          description={t("billingContent.viewYourCurrentPlanAndUsage")}
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
      <div className="reveal-stagger flex flex-col gap-6 p-6 content-column-grid mx-auto w-full">
        <SettingsDetailHeader
          title={t("settings.billing.title")}
          description={t("billingContent.viewYourCurrentPlanAndUsage2")}
        />
        <ErrorState message={error} onRetry={() => { setError(null); setLoading(true); setRetryKey((k) => k + 1); }} />
      </div>
    );
  }

  const tier = subscription?.tier ?? "free";
  const info = TIER_LABELS[tier] ?? TIER_LABELS.free;

  return (
    <div className="content-fade-in reveal-stagger flex flex-col gap-6 p-6 content-column-grid mx-auto w-full">
      <SettingsDetailHeader
        title={t("settings.billing.title")}
        description={t("billingContent.viewYourCurrentPlanAndUsageCheckoutIsComin")}
      />

      {/* Current plan */}
      <Card>
        <CardHeader className="space-y-3">
          <CardTitle className="text-2xl">{info.name}</CardTitle>
          <CardDescription>
            {tier === "free"
              ? t("billingContent.fullDashboardAccessWithCoreFeaturesUpgrade")
              : tier === "pro"
                ? t("billingContent.proAddsMcpServerAccessApiAccessAndAdvanced")
                : tier === "lifetime"
                  ? t("billingContent.onetimePaymentLifetimeProFeaturesAndUnlimi")
                  : t("billingContent.highestEntityLimitsWithADedicatedSupportCh")}
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
            <CardTitle className="text-base">{t("billingContent.upgradeToPro")}</CardTitle>
            <CardDescription>
              {t("billingContent.mcpServerAccessApiKeysAndAdvancedAnalytics")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled>
              {t("billingContent.checkoutComingSoon")}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {t("billingContent.paymentProcessingIsNotYetLiveYouCanStillEx")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Entity usage (if available) */}
      {subscription?.entityCounts && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("billingContent.usage")}</CardTitle>
            <CardDescription>
              {t("billingContent.yourCurrentEntityCountsAndLimits")}
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

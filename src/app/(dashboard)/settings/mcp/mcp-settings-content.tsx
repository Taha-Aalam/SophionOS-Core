"use client";
import { useI18n } from "@/components/providers/i18n-provider";

import { useEffect, useState } from "react";
import { ExternalLink, Plug, Lock } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { McpClientMatrix } from "@/components/settings/mcp-client-matrix";

interface SubscriptionInfo {
  tier: "free" | "pro" | "lifetime" | "max";
  isPaid: boolean;
}

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

export function McpSettingsContent() {
  const { t } = useI18n();
  const [baseUrl, setBaseUrl] = useState("https://app.sophionos.com");
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [subLoading, setSubLoading] = useState(true);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window !== "undefined") setBaseUrl(window.location.origin);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiFetch<SubscriptionInfo>("/api/v1/user/subscription");
        if (!cancelled) setSubscription(data);
      } catch {
        if (!cancelled) setSubscription({ tier: "free", isPaid: false });
      } finally {
        if (!cancelled) setSubLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isPaid = subLoading ? true : (subscription?.isPaid ?? false);

  return (
    <div className="flex flex-col gap-6">
      {!isPaid && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="size-5 text-primary" />
              <CardTitle className="text-base">
                {t("mcpSettingsContent.mcpApiAccessIsAProFeature")}
              </CardTitle>
              <Badge>Pro</Badge>
            </div>
            <CardDescription>
              {t("mcpSettingsContent.theSophionosMcpServerAndApiLetYourAiClient")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => {
                window.location.href = "/settings/billing";
              }}
            >
              {t("mcpSettingsContent.upgradeToPro")}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/30">
        <CardHeader className="space-y-2">
          <CardTitle className="text-base">
            {t("mcpSettingsContent.connectSophionosToYourAiClient")}
          </CardTitle>
          <CardDescription className="space-y-2 text-sm">
            <span className="block">
              {t("mcpSettingsContent.worksWithAnyMcpcompatibleAiClientYouChoose")}
            </span>
            <span className="block">
              {t("mcpSettingsContent.thisCreatesAnApiKeyForThatClient")}
            </span>
            <span className="block">
              <strong>{t("mcpSettingsContent.defaultAccessReadYourSophionosContext")}</strong> {t("mcpSettingsContent.itCanSeeRelevantProjectsTasksGoalsAndResea")}
            </span>
            <span className="block">
              {t("mcpSettingsContent.itCannotChangeAnythingUnlessYouEnableWrite")}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link href="/settings/ai-access" className={buttonVariants()}>
            {t("mcpSettingsContent.continueWithReadonlyAccess")}
          </Link>
          <Link
            href="/data-and-ai"
            className={buttonVariants({ variant: "outline" })}
          >
            {t("mcpSettingsContent.reviewWhatThisMeans")}
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plug className="size-5 text-primary" />
              <CardTitle className="text-base">{t("mcpSettingsContent.connectionStatus")}</CardTitle>
            </div>
            <Badge variant="secondary">{t("mcpSettingsContent.notConnectedYet")}</Badge>
          </div>
          <CardDescription>
            {t("mcpSettingsContent.createAReadonlyApiKeyInAiAccessThenAddItTo")}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">{t("settings.aiAccess.title")}</CardTitle>
          <CardDescription>
            {t("mcpSettingsContent.keysAuthenticateYourMcpServerManageClients")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/settings/ai-access" className="block">
            <Button variant="outline" className="w-full justify-between">
              {t("mcpSettingsContent.openAiAccess")}
              <ExternalLink className="size-3.5" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {isPaid && (
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">{t("mcpSettingsContent.connectYourAiClient")}</CardTitle>
            <CardDescription>
              {t("mcpSettingsContent.createAnApiKeyInAiAccessThenChooseAClientA")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <McpClientMatrix baseUrl={baseUrl} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

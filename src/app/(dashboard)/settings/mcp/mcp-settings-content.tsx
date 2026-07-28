"use client";

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
                MCP & API access is a Pro feature
              </CardTitle>
              <Badge>Pro</Badge>
            </div>
            <CardDescription>
              The SophionOS MCP server and API let your AI client read and write
              your SophionOS data. Upgrade to Pro to create an API key and connect
              your tools.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => {
                window.location.href = "/settings/billing";
              }}
            >
              Upgrade to Pro
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/30">
        <CardHeader className="space-y-2">
          <CardTitle className="text-base">
            Connect SophionOS to your AI client
          </CardTitle>
          <CardDescription className="space-y-2 text-sm">
            <span className="block">
              Works with any MCP-compatible AI client you choose.
            </span>
            <span className="block">
              This creates an API key for that client.
            </span>
            <span className="block">
              <strong>Default access: Read your SophionOS context.</strong> It can
              see relevant projects, tasks, goals, and research.
            </span>
            <span className="block">
              It cannot change anything unless you enable write access on the key
              and in AI Access settings.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link href="/settings/ai-access" className={buttonVariants()}>
            Continue with read-only access
          </Link>
          <Link
            href="/data-and-ai"
            className={buttonVariants({ variant: "outline" })}
          >
            Review what this means
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plug className="size-5 text-primary" />
              <CardTitle className="text-base">Connection status</CardTitle>
            </div>
            <Badge variant="secondary">Not connected yet</Badge>
          </div>
          <CardDescription>
            Create a read-only API key in AI Access, then add it to your AI client.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">AI Access</CardTitle>
          <CardDescription>
            Keys authenticate your MCP server. Manage clients, revoke access, or
            disable all AI access from the AI Access center.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/settings/ai-access" className="block">
            <Button variant="outline" className="w-full justify-between">
              Open AI Access
              <ExternalLink className="size-3.5" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {isPaid && (
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">Connect your AI client</CardTitle>
            <CardDescription>
              Create an API key in AI Access, then choose a client and copy the
              config below. MCP remains experimental — documented for evaluation,
              not certified for every host.
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

"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Plug, Lock } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

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

function buildClaudeDesktopConfig(apiKey: string, baseUrl: string): string {
  return JSON.stringify(
    {
      mcpServers: {
        sophionos: {
          command: "npx",
          args: ["-y", "@sophionos/mcp-server"],
          env: { SOPHIONOS_API_KEY: apiKey, SOPHIONOS_API_URL: baseUrl },
        },
      },
    },
    null,
    2,
  );
}

function buildClaudeCodeCommand(apiKey: string, baseUrl: string): string {
  return `claude mcp add sophionos --env SOPHIONOS_API_KEY=${apiKey} --env SOPHIONOS_API_URL=${baseUrl} -- npx -y @sophionos/mcp-server`;
}

export function McpSettingsContent() {
  const [copied, setCopied] = useState<string | null>(null);
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
    return () => { cancelled = true; };
  }, []);

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      setTimeout(() => setCopied((c) => (c === label ? null : c)), 1500);
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Could not copy. Copy manually instead.");
    }
  }

  const isPaid = subLoading ? true : (subscription?.isPaid ?? false);

  // Note: connection status is now static since key management moved to
  // /settings/api-keys. The MCP page focuses on config snippets and onboarding.

  return (
    <div className="flex flex-col gap-6">
      {/* Free-tier upgrade CTA */}
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
            <Button onClick={() => { window.location.href = "/settings/billing"; }}>
              Upgrade to Pro
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Progressive consent */}
      <Card className="border-primary/30">
        <CardHeader className="space-y-2">
          <CardTitle className="text-base">
            Connect SophionOS to Claude or Cursor
          </CardTitle>
          <CardDescription className="space-y-2 text-sm">
            <span className="block">
              This creates an API key for the AI client you choose.
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
          <Button asChild>
            <Link href="/settings/ai-access">Continue with read-only access</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/data-and-ai">Review what this means</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Connection status */}
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

      {/* Manage keys link */}
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

      {/* Setup snippets — Pro only */}
      {isPaid && (
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">Connect your AI client</CardTitle>
            <CardDescription>
              Create an API key in AI Access, then copy a config below into your
              MCP client.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Claude Desktop (claude_desktop_config.json)</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void copy(
                      "desktop",
                      buildClaudeDesktopConfig("sop_your_key_here", baseUrl),
                    )
                  }
                >
                  {copied === "desktop" ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  <span className="ml-1">Copy</span>
                </Button>
              </div>
              <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">
                {buildClaudeDesktopConfig("sop_your_key_here", baseUrl)}
              </pre>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Claude Code (terminal)</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void copy(
                      "code",
                      buildClaudeCodeCommand("sop_your_key_here", baseUrl),
                    )
                  }
                >
                  {copied === "code" ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                  <span className="ml-1">Copy</span>
                </Button>
              </div>
              <pre className="overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs">
                {buildClaudeCodeCommand("sop_your_key_here", baseUrl)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

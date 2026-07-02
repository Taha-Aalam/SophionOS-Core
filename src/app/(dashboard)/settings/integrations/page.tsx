"use client";

import { useEffect, useState } from "react";
import { Link2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

interface Integration {
  id: string;
  provider: string;
  provider_name: string;
  is_connected: boolean;
  created_at: string;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiFetch<Integration[]>("/api/v1/user/integrations");
        if (!cancelled) setIntegrations(data ?? []);
      } catch {
        // No integrations endpoint yet — show placeholder
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Placeholder: no integrations backend exists yet per the prompt.
  // This page consumes the existing /api/v1/user/integrations when ready.
  const placeholderIntegrations = [
    { provider: "slack", name: "Slack", comingSoon: true },
    { provider: "notion", name: "Notion", comingSoon: true },
    { provider: "google_calendar", name: "Google Calendar", comingSoon: true },
    { provider: "github", name: "GitHub", comingSoon: true },
  ];

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Integrations</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Connect third-party services to sync data and automate workflows.
          More providers coming soon.
        </p>
      </div>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">Available integrations</CardTitle>
          <CardDescription>
            {integrations.length > 0
              ? "Manage your connected services."
              : "No integrations are configured yet."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : integrations.length > 0 ? (
            <ul className="divide-y">
              {integrations.map((int) => (
                <li
                  key={int.id}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{int.provider_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {int.is_connected ? "Connected" : "Disconnected"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={int.is_connected ? "destructive" : "outline"}
                  >
                    {int.is_connected ? "Disconnect" : "Connect"}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="space-y-3">
              {placeholderIntegrations.map((p) => (
                <div
                  key={p.provider}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">Coming soon</p>
                  </div>
                  <Button size="sm" variant="ghost" disabled>
                    <Plus className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Custom integrations</CardTitle>
          <CardDescription>
            Build your own integration using the LifeOS API. Requires Pro tier
            for API key access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={() => window.open("https://docs.lifeos.app/api", "_blank", "noopener,noreferrer")}>
            <Link2 className="mr-1.5 size-4" />
            API Documentation
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

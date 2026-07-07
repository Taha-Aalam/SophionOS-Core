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
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await apiFetch<Integration[]>("/api/v1/user/integrations");
        if (!cancelled) setIntegrations(data ?? []);
      } catch {
        if (!cancelled) setError("Failed to load integrations.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [retryKey]);

  // Placeholder: no integrations backend exists yet per the prompt.
  // This page consumes the existing /api/v1/user/integrations when ready.
  const placeholderIntegrations = [
    { provider: "slack", name: "Slack", comingSoon: true },
    { provider: "notion", name: "Notion", comingSoon: true },
    { provider: "google_calendar", name: "Google Calendar", comingSoon: true },
    { provider: "github", name: "GitHub", comingSoon: true },
  ];

  return (
    <div className="content-fade-in reveal-stagger flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <SettingsDetailHeader
        title="Integrations"
        description="Connect third-party services to sync data and automate workflows. More providers coming soon."
      />

      {error && (
        <ErrorState
          message={error}
          onRetry={() => { setError(null); setLoading(true); setRetryKey((k) => k + 1); }}
        />
      )}

      {!error && (
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
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <Skeleton className="h-8 w-8 rounded" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
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
      )}

      {!error && (
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
      )}
    </div>
  );
}

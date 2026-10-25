"use client";

import { useState } from "react";
import { Loader2, PlugZap, RefreshCw, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AiProviderConnectDialog,
} from "@/components/settings/ai-provider-connect-dialog";
import {
  getProviderDefinition,
  PROVIDER_IDS,
} from "@/lib/ai/provider-registry";
import { useAiProviders } from "@/lib/hooks/use-ai-providers";

export function AiProvidersContent() {
  const { providers, loading, error, refresh, connect, disconnect } =
    useAiProviders();
  const [connectingProvider, setConnectingProvider] = useState<string | null>(
    null,
  );
  const [disconnectingProvider, setDisconnectingProvider] = useState<
    string | null
  >(null);
  const [busy, setBusy] = useState(false);

  async function handleDisconnect(provider: string, label: string) {
    setBusy(true);
    try {
      await disconnect(provider);
      toast.success(`${label} disconnected.`);
      setDisconnectingProvider(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to disconnect");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {PROVIDER_IDS.map((id) => (
          <Card key={id}>
            <CardHeader className="space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-9 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
        <div className="flex items-center gap-2 font-medium">
          <TriangleAlert className="size-4" aria-hidden="true" />
          Could not load your AI providers
        </div>
        <p className="mt-1 text-muted-foreground">{error}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => void refresh()}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Keys are validated with the provider, stored encrypted, and used
        server-side only — for example to write your brief summaries.
        SophionOS never sends your data to a provider unless a feature you
        enabled uses your key.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {PROVIDER_IDS.map((id) => {
          const def = getProviderDefinition(id);
          const connected = providers.find((p) => p.provider === id);
          return (
            <Card key={id} className="flex flex-col">
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base">{def.label}</CardTitle>
                  {connected ? (
                    <Badge
                      variant={connected.status === "invalid" ? "destructive" : "secondary"}
                    >
                      {connected.status === "invalid" ? "Key invalid" : "Connected"}
                    </Badge>
                  ) : (
                    <Badge variant="outline">Not connected</Badge>
                  )}
                </div>
                <CardDescription>
                  {connected
                    ? `Key ending in ${connected.hint ?? "••••"}${
                        connected.model ? ` · ${connected.model}` : ""
                      }`
                    : "Bring your own API key to power AI features."}{" "}
                  <a
                    href={def.keyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Get a key
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-auto flex gap-2">
                {connected ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDisconnectingProvider(id)}
                  >
                    Disconnect
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setConnectingProvider(id)}
                  >
                    <PlugZap className="size-4" aria-hidden="true" />
                    Connect
                  </Button>
                )}
                {connected?.status === "invalid" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setConnectingProvider(id)}
                  >
                    Reconnect
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AiProviderConnectDialog
        provider={
          connectingProvider ? getProviderDefinition(connectingProvider as never) : null
        }
        open={connectingProvider !== null}
        onOpenChange={(next) => {
          if (!next) setConnectingProvider(null);
        }}
        onConnect={connect}
      />

      {disconnectingProvider ? (
        <DisconnectConfirm
          label={getProviderDefinition(disconnectingProvider as never).label}
          busy={busy}
          onCancel={() => setDisconnectingProvider(null)}
          onConfirm={() =>
            handleDisconnect(
              disconnectingProvider,
              getProviderDefinition(disconnectingProvider as never).label,
            )
          }
        />
      ) : null}
    </div>
  );
}

function DisconnectConfirm(input: {
  label: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div
      role="alertdialog"
      aria-label={`Disconnect ${input.label}`}
      className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-md items-center justify-between gap-3 rounded-lg border bg-background p-4 shadow-lg"
    >
      <p className="text-sm">
        Disconnect {input.label}? Features using this key fall back to standard
        behavior.
      </p>
      <div className="flex shrink-0 gap-2">
        <Button type="button" variant="outline" size="sm" onClick={input.onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={input.busy}
          onClick={input.onConfirm}
        >
          {input.busy ? <Loader2 className="size-4 animate-spin" /> : null}
          Disconnect
        </Button>
      </div>
    </div>
  );
}

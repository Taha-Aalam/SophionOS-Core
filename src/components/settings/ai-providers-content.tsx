"use client";
import { useI18n } from "@/components/providers/i18n-provider";

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
  const { t, tp } = useI18n();
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
      toast.success(t("aiProvidersContent.v0Disconnected", { v0: label }));
      setDisconnectingProvider(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("aiProvidersContent.failedToDisconnect"));
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
          {t("aiProvidersContent.couldNotLoadYourAiProviders")}
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
          {t("aiProvidersContent.retry")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("aiProvidersContent.keysAreValidatedWithTheProviderStoredEncry")}
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
                      {connected.status === "invalid" ? t("aiProvidersContent.keyInvalid") : "Connected"}
                    </Badge>
                  ) : (
                    <Badge variant="outline">{t("aiProvidersContent.notConnected")}</Badge>
                  )}
                </div>
                <CardDescription>
                  {connected
                    ? `Key ending in ${connected.hint ?? "••••"}${
                        connected.model ? ` · ${connected.model}` : ""
                      }`
                    : t("aiProvidersContent.bringYourOwnApiKeyToPowerAiFeatures")}{" "}
                  <a
                    href={def.keyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    {t("aiProvidersContent.getAKey")}
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
                    {t("aiProvidersContent.disconnect")}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setConnectingProvider(id)}
                  >
                    <PlugZap className="size-4" aria-hidden="true" />
                    {t("aiProvidersContent.connect")}
                  </Button>
                )}
                {connected?.status === "invalid" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setConnectingProvider(id)}
                  >
                    {t("aiProvidersContent.reconnect")}
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
  const { t, tp } = useI18n();
  return (
    <div
      role="alertdialog"
      aria-label={t("aiProvidersContent.disconnectV0", { v0: input.label })}
      className="fixed inset-inline-0 bottom-4 z-50 mx-auto flex w-[calc(100%-2rem)] max-w-md items-center justify-between gap-3 rounded-lg border bg-background p-4 shadow-lg"
    >
      <p className="text-sm">
        {t("aiProvidersContent.disconnect2")} {input.label}{t("aiProvidersContent.featuresUsingThisKeyFallBackToStandardBeha")}
      </p>
      <div className="flex shrink-0 gap-2">
        <Button type="button" variant="outline" size="sm" onClick={input.onCancel}>
          {t("action.cancel")}
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={input.busy}
          onClick={input.onConfirm}
        >
          {input.busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("aiProvidersContent.disconnect3")}
        </Button>
      </div>
    </div>
  );
}

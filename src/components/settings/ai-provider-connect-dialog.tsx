"use client";
import { useI18n } from "@/components/providers/i18n-provider";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProviderDefinition } from "@/lib/ai/provider-registry";
import type { ConnectProviderPayload } from "@/lib/hooks/use-ai-providers";

export interface AiProviderConnectDialogProps {
  provider: ProviderDefinition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConnect: (payload: ConnectProviderPayload) => Promise<unknown>;
}

export function AiProviderConnectDialog({
  provider,
  open,
  onOpenChange,
  onConnect,
}: AiProviderConnectDialogProps) {
  const { t, tp } = useI18n();
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [connecting, setConnecting] = useState(false);

  if (!provider) return null;
  const def = provider;
  const isCustom = def.requiresBaseUrl;
  const effectiveModel = model ?? def.defaultModel;

  function reset() {
    setApiKey("");
    setBaseUrl("");
    setModel(null);
    setLabel("");
    setConnecting(false);
  }

  async function handleConnect() {
    if (!apiKey.trim()) {
      toast.error(t("aiProviderConnectDialog.pasteYourApiKeyFirst"));
      return;
    }
    if (isCustom && !baseUrl.trim()) {
      toast.error(t("aiProviderConnectDialog.enterTheProvidersOpenaicompatibleBaseUrl"));
      return;
    }
    if (isCustom && !effectiveModel?.trim()) {
      toast.error(t("aiProviderConnectDialog.enterTheModelYourProviderShouldUse"));
      return;
    }
    setConnecting(true);
    try {
      await onConnect({
        provider: def.id,
        apiKey: apiKey.trim(),
        baseUrl: isCustom ? baseUrl.trim() : undefined,
        model: effectiveModel?.trim() || undefined,
        label: label.trim() || undefined,
      });
      toast.success(t("aiProviderConnectDialog.v0Connected", { v0: def.label }));
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("aiProviderConnectDialog.failedToConnect"));
    } finally {
      setConnecting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("aiProviderConnectDialog.connect")} {provider.label}</DialogTitle>
          <DialogDescription>
            {t("aiProviderConnectDialog.yourKeyIsValidatedWithTheProviderStoredEnc")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="provider-api-key">{t("aiProviderConnectDialog.apiKey")}</Label>
            <Input
              id="provider-api-key"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={t("aiProviderConnectDialog.yourV0Key", { v0: provider.label })}
            />
            <p className="text-xs text-muted-foreground">
              {t("aiProviderConnectDialog.getOneAt")}{" "}
              <a
                href={provider.keyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                {provider.keyUrl.replace(/^https?:\/\//, "")}
              </a>
            </p>
          </div>

          {isCustom ? (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="provider-base-url">{t("aiProviderConnectDialog.baseUrl")}</Label>
                <Input
                  id="provider-base-url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={"https://openrouter.ai/api/v1"}
                />
                <p className="text-xs text-muted-foreground">
                  {t("aiProviderConnectDialog.openaicompatibleRootEgHttpsapigroqcomopena")}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="provider-model">{t("aiProviderConnectDialog.model")}</Label>
                <Input
                  id="provider-model"
                  value={effectiveModel ?? ""}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={t("aiProviderConnectDialog.modelIdYourProviderExposes")}
                />
              </div>
            </>
          ) : (
            provider.models.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="provider-model">{t("aiProviderConnectDialog.model2")}</Label>
                <select
                  id="provider-model"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  value={effectiveModel}
                  onChange={(e) => setModel(e.target.value)}
                >
                  {provider.models.map((id) => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </div>
            )
          )}

          <div className="space-y-1.5">
            <Label htmlFor="provider-label">{t("aiProviderConnectDialog.labelOptional")}</Label>
            <Input
              id="provider-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t("aiProviderConnectDialog.personalKey")}
              maxLength={100}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("action.cancel")}
          </Button>
          <Button type="button" disabled={connecting} onClick={() => void handleConnect()}>
            {connecting ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("aiProviderConnectDialog.connect2")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

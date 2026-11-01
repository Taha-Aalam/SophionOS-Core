"use client";

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
      toast.error("Paste your API key first.");
      return;
    }
    if (isCustom && !baseUrl.trim()) {
      toast.error("Enter the provider's OpenAI-compatible base URL.");
      return;
    }
    if (isCustom && !effectiveModel?.trim()) {
      toast.error("Enter the model your provider should use.");
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
      toast.success(`${def.label} connected.`);
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to connect");
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
          <DialogTitle>Connect {provider.label}</DialogTitle>
          <DialogDescription>
            Your key is validated with the provider, stored encrypted, and used
            server-side only. It is never shown again after saving.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="provider-api-key">API key</Label>
            <Input
              id="provider-api-key"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={`Your ${provider.label} key`}
            />
            <p className="text-xs text-muted-foreground">
              Get one at{" "}
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
                <Label htmlFor="provider-base-url">Base URL</Label>
                <Input
                  id="provider-base-url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://openrouter.ai/api/v1"
                />
                <p className="text-xs text-muted-foreground">
                  OpenAI-compatible root, e.g. https://api.groq.com/openai/v1
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="provider-model">Model</Label>
                <Input
                  id="provider-model"
                  value={effectiveModel ?? ""}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="model id your provider exposes"
                />
              </div>
            </>
          ) : (
            provider.models.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="provider-model">Model</Label>
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
            <Label htmlFor="provider-label">Label (optional)</Label>
            <Input
              id="provider-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Personal key"
              maxLength={100}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={connecting} onClick={() => void handleConnect()}>
            {connecting ? <Loader2 className="size-4 animate-spin" /> : null}
            Connect
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

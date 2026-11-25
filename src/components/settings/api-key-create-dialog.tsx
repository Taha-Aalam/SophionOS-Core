"use client";
import { useI18n } from "@/components/providers/i18n-provider";

import { useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
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

export interface ApiKeyCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (payload: {
    name: string;
    client_type: "mcp" | "automation" | "personal";
    client_name?: string;
    access_mode: "read_only" | "write_limited" | "write_enabled";
  }) => Promise<{ key: string }>;
}

export function ApiKeyCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: ApiKeyCreateDialogProps) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientType, setClientType] = useState<"mcp" | "automation" | "personal">(
    "mcp",
  );
  const [accessMode, setAccessMode] = useState<
    "read_only" | "write_limited" | "write_enabled"
  >("read_only");
  const [creating, setCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setName("");
    setClientName("");
    setClientType("mcp");
    setAccessMode("read_only");
    setRevealedKey(null);
    setCopied(false);
    setCreating(false);
  }

  async function handleCreate() {
    const label = name.trim();
    if (!label) {
      toast.error(t("apiKeyCreateDialog.giveTheKeyALabelForExampleCursorOnMacbookP"));
      return;
    }
    setCreating(true);
    try {
      const result = await onCreated({
        name: label,
        client_type: clientType,
        client_name: clientName.trim() || undefined,
        access_mode: accessMode,
      });
      setRevealedKey(result.key);
      toast.success(t("apiKeyCreateDialog.apiKeyCreatedCopyItNowItWontBeShownAgain"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("apiKeyCreateDialog.failedToCreateKey"));
    } finally {
      setCreating(false);
    }
  }

  async function copyKey() {
    if (!revealedKey) return;
    try {
      await navigator.clipboard.writeText(revealedKey);
      setCopied(true);
      toast.success(t("apiKeyCreateDialog.copiedToClipboard"));
    } catch {
      toast.error(t("apiKeyCreateDialog.couldNotCopySelectAndCopyManually"));
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
          <DialogTitle>
            {revealedKey ? t("apiKeyCreateDialog.copyYourApiKey") : t("apiKeyCreateDialog.createApiKey")}
          </DialogTitle>
          <DialogDescription>
            {revealedKey
              ? t("apiKeyCreateDialog.thisIsTheOnlyTimeTheFullKeyIsShownStoreItS")
              : t("apiKeyCreateDialog.createAKeyForATrustedToolMcpKeysDefaultToR")}
          </DialogDescription>
        </DialogHeader>

        {revealedKey ? (
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/40 p-3 font-mono text-xs break-all">
              {revealedKey}
            </div>
            <p className="text-sm text-muted-foreground">
              {t("apiKeyCreateDialog.doNotShareThisKeyAnyoneWithItCanAccessYour")}
            </p>
            <Button type="button" variant="secondary" onClick={() => void copyKey()}>
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              {copied ? "Copied" : t("apiKeyCreateDialog.copyKey")}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="key-label">{t("apiKeyCreateDialog.label")}</Label>
              <Input
                id="key-label"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("apiKeyCreateDialog.cursorOnMacbookPro")}
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client-name">{t("apiKeyCreateDialog.clientNameOptional")}</Label>
              <Input
                id="client-name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder={t("apiKeyCreateDialog.opencode")}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client-type">{t("apiKeyCreateDialog.clientType")}</Label>
              <select
                id="client-type"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={clientType}
                onChange={(e) =>
                  setClientType(e.target.value as "mcp" | "automation" | "personal")
                }
              >
                <option value="mcp">{t("apiKeyCreateDialog.mcpClient")}</option>
                <option value="automation">{t("apiKeyCreateDialog.automation")}</option>
                <option value="personal">{t("apiKeyCreateDialog.personalScript")}</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="access-mode">{t("apiKeyCreateDialog.accessMode")}</Label>
              <select
                id="access-mode"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={accessMode}
                onChange={(e) =>
                  setAccessMode(
                    e.target.value as
                      | "read_only"
                      | "write_limited"
                      | "write_enabled",
                  )
                }
              >
                <option value="read_only">{t("apiKeyCreateDialog.readonlyRecommended")}</option>
                <option value="write_limited">{t("apiKeyCreateDialog.canCreateupdateNoDelete")}</option>
                <option value="write_enabled">{t("apiKeyCreateDialog.fullWriteCreateupdatedelete")}</option>
              </select>
              <p className="text-xs text-muted-foreground">
                {t("apiKeyCreateDialog.readonlyCanQueryDataCreateupdateCannotArch")}
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {revealedKey ? (
            <Button
              type="button"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
            >
              {t("apiKeyCreateDialog.done")}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t("action.cancel")}
              </Button>
              <Button type="button" disabled={creating} onClick={() => void handleCreate()}>
                {creating ? <Loader2 className="size-4 animate-spin" /> : null}
                {t("apiKeyCreateDialog.createKey")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

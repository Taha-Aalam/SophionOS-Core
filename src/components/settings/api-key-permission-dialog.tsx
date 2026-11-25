"use client";
import { useI18n } from "@/components/providers/i18n-provider";

import { useEffect, useState } from "react";
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
import { Label } from "@/components/ui/label";

export interface ApiKeyPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keyId: string | null;
  keyName: string;
  currentMode: "read_only" | "write_limited" | "write_enabled" | string;
  onSave: (
    keyId: string,
    accessMode: "read_only" | "write_limited" | "write_enabled",
  ) => Promise<void>;
}

export function ApiKeyPermissionDialog({
  open,
  onOpenChange,
  keyId,
  keyName,
  currentMode,
  onSave,
}: ApiKeyPermissionDialogProps) {
  const { t } = useI18n();
  const [mode, setMode] = useState(currentMode);
  const [saving, setSaving] = useState(false);

  // Reset draft mode when the dialog opens for a key (intentional form sync).
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(currentMode);
  }, [open, currentMode]);

  async function handleSave() {
    if (!keyId) return;
    setSaving(true);
    try {
      await onSave(
        keyId,
        mode as "read_only" | "write_limited" | "write_enabled",
      );
      toast.success(t("apiKeyPermissionDialog.accessUpdated"));
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("apiKeyPermissionDialog.failedToUpdateAccess"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("apiKeyPermissionDialog.changeAccess")}</DialogTitle>
          <DialogDescription>
            {t("apiKeyPermissionDialog.chooseWhat")} <strong>{keyName}</strong> {t("apiKeyPermissionDialog.canDoThroughTheApi")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="perm-mode">{t("apiKeyPermissionDialog.accessMode")}</Label>
          <select
            id="perm-mode"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="read_only">{t("apiKeyPermissionDialog.readonlyQueryOnly")}</option>
            <option value="write_limited">
              {t("apiKeyPermissionDialog.canCreateupdateNoArchivedelete")}
            </option>
            <option value="write_enabled">
              {t("apiKeyPermissionDialog.fullWriteCreateUpdateAndDelete")}
            </option>
          </select>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("action.cancel")}
          </Button>
          <Button type="button" disabled={saving || !keyId} onClick={() => void handleSave()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("action.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

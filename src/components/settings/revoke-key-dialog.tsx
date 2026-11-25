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

export interface RevokeKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keyId: string | null;
  keyName: string;
  onConfirm: (keyId: string) => Promise<void>;
}

export function RevokeKeyDialog({
  open,
  onOpenChange,
  keyId,
  keyName,
  onConfirm,
}: RevokeKeyDialogProps) {
  const { t } = useI18n();
  const [working, setWorking] = useState(false);

  async function handleConfirm() {
    if (!keyId) return;
    setWorking(true);
    try {
      await onConfirm(keyId);
      toast.success(t("revokeKeyDialog.apiKeyRevokedNewRequestsWithThatKeyWillFai"));
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("revokeKeyDialog.failedToRevokeKey"));
    } finally {
      setWorking(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("revokeKeyDialog.revokeApiKey")}</DialogTitle>
          <DialogDescription>
            {t("revokeKeyDialog.revoke")} <strong>{keyName}</strong>{t("revokeKeyDialog.thisTakesEffectImmediatelyConnectedMcpClie")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("action.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={working || !keyId}
            onClick={() => void handleConfirm()}
          >
            {working ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("revokeKeyDialog.revokeKey")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

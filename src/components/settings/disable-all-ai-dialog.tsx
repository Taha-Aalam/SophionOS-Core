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

export interface DisableAllAiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<{ revoked_count?: number } | void>;
}

export function DisableAllAiDialog({
  open,
  onOpenChange,
  onConfirm,
}: DisableAllAiDialogProps) {
  const { t } = useI18n();
  const [working, setWorking] = useState(false);

  async function handleConfirm() {
    setWorking(true);
    try {
      const result = await onConfirm();
      const n = result?.revoked_count;
      toast.success(
        typeof n === "number"
          ? `AI access disabled. Revoked ${n} active key${n === 1 ? "" : "s"}.`
          : t("disableAllAiDialog.aiAccessDisabledAllActiveApiKeysWereRevoke"),
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("disableAllAiDialog.failedToDisableAiAccess"),
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("disableAllAiDialog.disableAllAiAccess")}</DialogTitle>
          <DialogDescription className="space-y-2">
            <span className="block">
              {t("disableAllAiDialog.thisTurnsOffExternalAiapiAccessForYourAcco")}{" "}
              <strong>{t("disableAllAiDialog.revokesEveryActiveApiKey")}</strong>{t("disableAllAiDialog.mcpClientsAndAutomationsWillStopWorkingOnT")}
            </span>
            <span className="block">
              {t("disableAllAiDialog.yourDashboardSignedinSessionStillWorksYouC")}
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("action.cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={working}
            onClick={() => void handleConfirm()}
          >
            {working ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("disableAllAiDialog.disableAllAiAccess2")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

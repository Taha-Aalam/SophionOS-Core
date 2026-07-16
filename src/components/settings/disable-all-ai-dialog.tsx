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
  const [working, setWorking] = useState(false);

  async function handleConfirm() {
    setWorking(true);
    try {
      const result = await onConfirm();
      const n = result?.revoked_count;
      toast.success(
        typeof n === "number"
          ? `AI access disabled. Revoked ${n} active key${n === 1 ? "" : "s"}.`
          : "AI access disabled. All active API keys were revoked.",
      );
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to disable AI access",
      );
    } finally {
      setWorking(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Disable all AI access?</DialogTitle>
          <DialogDescription className="space-y-2">
            <span className="block">
              This turns off external AI/API access for your account and{" "}
              <strong>revokes every active API key</strong>. MCP clients and
              automations will stop working on their next request.
            </span>
            <span className="block">
              Your dashboard (signed-in session) still works. You can re-enable AI
              access later and create new keys.
            </span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={working}
            onClick={() => void handleConfirm()}
          >
            {working ? <Loader2 className="size-4 animate-spin" /> : null}
            Disable all AI access
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

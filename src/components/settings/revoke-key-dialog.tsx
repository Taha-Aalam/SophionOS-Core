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
  const [working, setWorking] = useState(false);

  async function handleConfirm() {
    if (!keyId) return;
    setWorking(true);
    try {
      await onConfirm(keyId);
      toast.success("API key revoked. New requests with that key will fail immediately.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke key");
    } finally {
      setWorking(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Revoke API key?</DialogTitle>
          <DialogDescription>
            Revoke <strong>{keyName}</strong>? This takes effect immediately.
            Connected MCP clients will fail on their next request. This cannot be
            undone — create a new key if you need access again.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={working || !keyId}
            onClick={() => void handleConfirm()}
          >
            {working ? <Loader2 className="size-4 animate-spin" /> : null}
            Revoke key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

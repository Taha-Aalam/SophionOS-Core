"use client";

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
      toast.success("Access updated.");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update access");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change access</DialogTitle>
          <DialogDescription>
            Choose what <strong>{keyName}</strong> can do through the API.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="perm-mode">Access mode</Label>
          <select
            id="perm-mode"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option value="read_only">Read-only — query only</option>
            <option value="write_limited">
              Can create/update — no archive/delete
            </option>
            <option value="write_enabled">
              Full write — create, update, and delete
            </option>
          </select>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={saving || !keyId} onClick={() => void handleSave()}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

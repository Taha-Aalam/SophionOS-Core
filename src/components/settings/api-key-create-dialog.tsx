"use client";

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
      toast.error("Give the key a label, e.g. Cursor — MacBook Pro.");
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
      toast.success("API key created. Copy it now — it won’t be shown again.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  }

  async function copyKey() {
    if (!revealedKey) return;
    try {
      await navigator.clipboard.writeText(revealedKey);
      setCopied(true);
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Could not copy. Select and copy manually.");
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
            {revealedKey ? "Copy your API key" : "Create API key"}
          </DialogTitle>
          <DialogDescription>
            {revealedKey
              ? "This is the only time the full key is shown. Store it somewhere safe."
              : "Create a key for a trusted tool. MCP keys default to read-only."}
          </DialogDescription>
        </DialogHeader>

        {revealedKey ? (
          <div className="space-y-3">
            <div className="rounded-md border bg-muted/40 p-3 font-mono text-xs break-all">
              {revealedKey}
            </div>
            <p className="text-sm text-muted-foreground">
              Do not share this key. Anyone with it can access your SophionOS data
              according to its access mode. After you close this dialog, the full
              key cannot be recovered.
            </p>
            <Button type="button" variant="secondary" onClick={() => void copyKey()}>
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
              {copied ? "Copied" : "Copy key"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="key-label">Label</Label>
              <Input
                id="key-label"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Cursor — MacBook Pro"
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client-name">Client name (optional)</Label>
              <Input
                id="client-name"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="OpenCode"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client-type">Client type</Label>
              <select
                id="client-type"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={clientType}
                onChange={(e) =>
                  setClientType(e.target.value as "mcp" | "automation" | "personal")
                }
              >
                <option value="mcp">MCP client</option>
                <option value="automation">Automation</option>
                <option value="personal">Personal / script</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="access-mode">Access mode</Label>
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
                <option value="read_only">Read-only (recommended)</option>
                <option value="write_limited">Can create/update (no delete)</option>
                <option value="write_enabled">Full write (create/update/delete)</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Read-only can query data. Create/update cannot archive or delete.
                Full write can change and remove data via the API.
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
              Done
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="button" disabled={creating} onClick={() => void handleCreate()}>
                {creating ? <Loader2 className="size-4 animate-spin" /> : null}
                Create key
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

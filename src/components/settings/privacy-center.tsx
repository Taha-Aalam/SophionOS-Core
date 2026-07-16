"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download, Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(json?.error?.message ?? `Request failed (${res.status})`);
  }
  return json?.data as T;
}

type Summary = {
  counts: Record<string, number>;
  ai_access: {
    ai_access_enabled: boolean;
    ai_write_access_enabled: boolean;
  };
  retention_note: string;
  deletion_just_processed?: boolean;
  deletion_request: {
    status: string;
    scheduled_for: string;
    requested_at: string;
    grace_elapsed?: boolean;
    completed_at?: string | null;
  } | null;
};

export function PrivacyCenter() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [earlyConfirm, setEarlyConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch<Summary>("/api/v1/user/privacy-summary");
      setSummary(data);
      if (data.deletion_just_processed) {
        toast.success(
          "Grace period ended — your product data was purged for this account.",
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load privacy summary");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleExport() {
    setExporting(true);
    try {
      const data = await apiFetch<{
        id: string;
        data: unknown;
        note?: string;
      }>("/api/v1/user/data-export", { method: "POST", body: "{}" });
      const blob = new Blob([JSON.stringify(data.data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sophionos-export-${data.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(
        "Export downloaded. Do not share this file. Treat it like private data.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteRequest() {
    setDeleting(true);
    try {
      await apiFetch("/api/v1/user/account-deletion", {
        method: "POST",
        body: JSON.stringify({ confirmation: confirmText }),
      });
      toast.success("Deletion scheduled. AI access disabled; keys revoked.");
      setConfirmText("");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not schedule deletion");
    } finally {
      setDeleting(false);
    }
  }

  async function handleCancelDeletion() {
    setDeleting(true);
    try {
      await apiFetch("/api/v1/user/account-deletion/cancel", { method: "POST" });
      toast.success("Deletion cancelled.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setDeleting(false);
    }
  }

  /** Complete purge: after grace (force false) or early (force true). */
  async function handleFinalizeDeletion(force: boolean) {
    setDeleting(true);
    try {
      await apiFetch("/api/v1/user/account-deletion/finalize", {
        method: "POST",
        body: JSON.stringify({ force }),
      });
      toast.success(
        force
          ? "Early purge completed. Product data for this account was removed."
          : "Deletion completed. Product data for this account was purged.",
      );
      setEarlyConfirm("");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not complete deletion");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-6">
        <Loader2 className="size-4 animate-spin" /> Loading privacy data…
      </div>
    );
  }

  const counts = summary?.counts ?? {};

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your data at a glance</CardTitle>
          <CardDescription>
            Counts for your account only. No internal schema detail.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2 text-sm">
            {[
              ["areas", "Areas"],
              ["goals", "Goals"],
              ["projects", "Projects"],
              ["tasks", "Tasks"],
              ["notes", "Notes"],
              ["resources", "Resources"],
              ["topics", "Topics"],
              ["contacts", "Contacts"],
              ["connected_ai_clients", "Connected AI clients / keys"],
            ].map(([key, label]) => (
              <li key={key} className="flex justify-between border-b py-1">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{counts[key] ?? 0}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How AI access works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            SophionOS does not train models on your private content and does not
            send data to an AI model by default. When you connect a client, it
            uses the API key you authorize.
          </p>
          <p>
            Global AI access:{" "}
            <strong>
              {summary?.ai_access.ai_access_enabled ? "ON" : "OFF"}
            </strong>
            {" · "}
            API key writes:{" "}
            <strong>
              {summary?.ai_access.ai_write_access_enabled
                ? "allowed"
                : "blocked"}
            </strong>
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/settings/ai-access">Manage AI Access</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="size-4" /> Download your data
          </CardTitle>
          <CardDescription>
            Export primary entities, settings, and safe API key metadata (never
            secrets). For large accounts this may take a moment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            type="button"
            disabled={exporting}
            onClick={() => void handleExport()}
          >
            {exporting ? <Loader2 className="size-4 animate-spin" /> : null}
            Request export
          </Button>
          <p className="text-xs text-muted-foreground">
            Do not share the download. Treat export files as private.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trash2 className="size-4" /> Delete your account and data
          </CardTitle>
          <CardDescription>
            Two-stage deletion with a grace period. API keys are revoked
            immediately when you request deletion.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {summary?.deletion_request?.status === "completed" ? (
            <div className="rounded-md border p-3 text-sm space-y-1">
              <p className="font-medium">Deletion completed</p>
              <p className="text-muted-foreground">
                Product data for this account was purged
                {summary.deletion_request.completed_at
                  ? ` on ${new Date(summary.deletion_request.completed_at).toLocaleString()}`
                  : ""}
                . Billing/legal records may remain. Sign out if you still have a
                session.
              </p>
            </div>
          ) : summary?.deletion_request?.status === "scheduled" ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm space-y-3">
              <p className="flex items-center gap-2 font-medium">
                <ShieldAlert className="size-4" />
                Deletion scheduled for{" "}
                {new Date(summary.deletion_request.scheduled_for).toLocaleString()}
              </p>
              <p className="text-muted-foreground">
                {summary.deletion_request.grace_elapsed
                  ? "Grace period has ended. Complete deletion to purge product data now (also runs automatically when you open this page after the due date)."
                  : "During the grace period you can cancel. After the due date, opening this page runs the purge automatically, or you can complete it here. Early purge requires typing PURGE NOW."}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={deleting}
                  onClick={() => void handleCancelDeletion()}
                >
                  Cancel deletion
                </Button>
                {summary.deletion_request.grace_elapsed ? (
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={deleting}
                    onClick={() => void handleFinalizeDeletion(false)}
                  >
                    {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
                    Complete deletion now
                  </Button>
                ) : null}
              </div>
              {!summary.deletion_request.grace_elapsed ? (
                <div className="space-y-2 border-t pt-3">
                  <Label htmlFor="early-purge">
                    Early purge (type PURGE NOW) — skips remaining grace
                  </Label>
                  <Input
                    id="early-purge"
                    value={earlyConfirm}
                    onChange={(e) => setEarlyConfirm(e.target.value)}
                    placeholder="PURGE NOW"
                    autoComplete="off"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={
                      deleting ||
                      earlyConfirm.trim().toUpperCase() !== "PURGE NOW"
                    }
                    onClick={() => void handleFinalizeDeletion(true)}
                  >
                    {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
                    Purge product data now
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                <li>API keys revoked and AI access disabled immediately.</li>
                <li>
                  You may cancel during the grace period from this page.
                </li>
                <li>
                  After the grace period, opening Privacy &amp; data (or
                  Complete deletion) purges product data for your user id.
                </li>
                <li>Billing/legal records may be retained as required.</li>
                <li>Backups may retain data for a provider-defined window.</li>
              </ul>
              <div className="space-y-1.5 max-w-sm">
                <Label htmlFor="del-confirm">Type DELETE to confirm</Label>
                <Input
                  id="del-confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  autoComplete="off"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                disabled={deleting || confirmText.trim().toUpperCase() !== "DELETE"}
                onClick={() => void handleDeleteRequest()}
              >
                {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
                Schedule account deletion
              </Button>
            </>
          )}
          <p className="text-xs text-muted-foreground">{summary?.retention_note}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Policies & contact</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex flex-wrap gap-3">
            <Link className="text-primary underline-offset-4 hover:underline" href="/privacy">
              Privacy
            </Link>
            <Link className="text-primary underline-offset-4 hover:underline" href="/security">
              Security overview
            </Link>
            <Link className="text-primary underline-offset-4 hover:underline" href="/subprocessors">
              Subprocessors
            </Link>
            <Link className="text-primary underline-offset-4 hover:underline" href="/data-and-ai">
              Data &amp; AI / MCP
            </Link>
            <Link
              className="text-primary underline-offset-4 hover:underline"
              href="/responsible-disclosure"
            >
              Responsible disclosure
            </Link>
          </div>
          <Separator />
          <p className="text-muted-foreground">
            Support must never ask for raw API keys, passwords, or session
            tokens. Prefer screenshots and redacted examples.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

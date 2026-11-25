"use client";
import { useI18n } from "@/components/providers/i18n-provider";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download, Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
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
  const { t } = useI18n();
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
          t("privacyCenter.gracePeriodEndedYourProductDataWasPurgedFo"),
        );
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("privacyCenter.failedToLoadPrivacySummary"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  /* eslint-disable react-hooks/set-state-in-effect -- mount fetch */
  useEffect(() => {
    void refresh();
  }, [refresh]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
        t("privacyCenter.exportDownloadedDoNotShareThisFileTreatItL"),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("privacyCenter.exportFailed"));
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
      toast.success(t("privacyCenter.deletionScheduledAiAccessDisabledKeysRevok"));
      setConfirmText("");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("privacyCenter.couldNotScheduleDeletion"));
    } finally {
      setDeleting(false);
    }
  }

  async function handleCancelDeletion() {
    setDeleting(true);
    try {
      await apiFetch("/api/v1/user/account-deletion/cancel", { method: "POST" });
      toast.success(t("privacyCenter.deletionCancelled"));
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("privacyCenter.cancelFailed"));
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
          ? t("privacyCenter.earlyPurgeCompletedProductDataForThisAccou")
          : t("privacyCenter.deletionCompletedProductDataForThisAccount"),
      );
      setEarlyConfirm("");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("privacyCenter.couldNotCompleteDeletion"));
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-6">
        <Loader2 className="size-4 animate-spin" /> {t("privacyCenter.loadingPrivacyData")}
      </div>
    );
  }

  const counts = summary?.counts ?? {};

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("privacyCenter.yourDataAtAGlance")}</CardTitle>
          <CardDescription>
            {t("privacyCenter.countsForYourAccountOnlyNoInternalSchemaDe")}
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
              ["connected_ai_clients", t("privacyCenter.connectedAiClientsKeys")],
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
          <CardTitle className="text-base">{t("privacyCenter.howAiAccessWorks")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            {t("privacyCenter.sophionosDoesNotTrainModelsOnYourPrivateCo")}
          </p>
          <p>
            {t("privacyCenter.globalAiAccess")}{" "}
            <strong>
              {summary?.ai_access.ai_access_enabled ? "ON" : "OFF"}
            </strong>
            {" · "}
            {t("privacyCenter.apiKeyWrites")}{" "}
            <strong>
              {summary?.ai_access.ai_write_access_enabled
                ? "allowed"
                : "blocked"}
            </strong>
          </p>
          <Link
            href="/settings/ai-access"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            {t("privacyCenter.manageAiAccess")}
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="size-4" /> {t("privacyCenter.downloadYourData")}
          </CardTitle>
          <CardDescription>
            {t("privacyCenter.exportPrimaryEntitiesSettingsAndSafeApiKey")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            type="button"
            disabled={exporting}
            onClick={() => void handleExport()}
          >
            {exporting ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("privacyCenter.requestExport")}
          </Button>
          <p className="text-xs text-muted-foreground">
            {t("privacyCenter.doNotShareTheDownloadTreatExportFilesAsPri")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Trash2 className="size-4" /> {t("privacyCenter.deleteYourAccountAndData")}
          </CardTitle>
          <CardDescription>
            {t("privacyCenter.twostageDeletionWithAGracePeriodApiKeysAre")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {summary?.deletion_request?.status === "completed" ? (
            <div className="rounded-md border p-3 text-sm space-y-1">
              <p className="font-medium">{t("privacyCenter.deletionCompleted")}</p>
              <p className="text-muted-foreground">
                {t("privacyCenter.productDataForThisAccountWasPurged")}
                {summary.deletion_request.completed_at
                  ? ` on ${new Date(summary.deletion_request.completed_at).toLocaleString()}`
                  : ""}
                {t("privacyCenter.billinglegalRecordsMayRemainSignOutIfYouSt")}
              </p>
            </div>
          ) : summary?.deletion_request?.status === "scheduled" ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm space-y-3">
              <p className="flex items-center gap-2 font-medium">
                <ShieldAlert className="size-4" />
                {t("privacyCenter.deletionScheduledFor")}{" "}
                {new Date(summary.deletion_request.scheduled_for).toLocaleString()}
              </p>
              <p className="text-muted-foreground">
                {summary.deletion_request.grace_elapsed
                  ? t("privacyCenter.gracePeriodHasEndedCompleteDeletionToPurge")
                  : t("privacyCenter.duringTheGracePeriodYouCanCancelAfterTheDu")}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={deleting}
                  onClick={() => void handleCancelDeletion()}
                >
                  {t("privacyCenter.cancelDeletion")}
                </Button>
                {summary.deletion_request.grace_elapsed ? (
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={deleting}
                    onClick={() => void handleFinalizeDeletion(false)}
                  >
                    {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
                    {t("privacyCenter.completeDeletionNow")}
                  </Button>
                ) : null}
              </div>
              {!summary.deletion_request.grace_elapsed ? (
                <div className="space-y-2 border-t pt-3">
                  <Label htmlFor="early-purge">
                    {t("privacyCenter.earlyPurgeTypePurgeNowSkipsRemainingGrace")}
                  </Label>
                  <Input
                    id="early-purge"
                    value={earlyConfirm}
                    onChange={(e) => setEarlyConfirm(e.target.value)}
                    placeholder={t("privacyCenter.purgeNow")}
                    autoComplete="off"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    disabled={
                      deleting ||
                      earlyConfirm.trim().toUpperCase() !== t("privacyCenter.purgeNow")
                    }
                    onClick={() => void handleFinalizeDeletion(true)}
                  >
                    {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
                    {t("privacyCenter.purgeProductDataNow")}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                <li>{t("privacyCenter.apiKeysRevokedAndAiAccessDisabledImmediate")}</li>
                <li>
                  {t("privacyCenter.youMayCancelDuringTheGracePeriodFromThisPa")}
                </li>
                <li>
                  {t("privacyCenter.afterTheGracePeriodOpeningPrivacyAmpDataOr")}
                </li>
                <li>{t("privacyCenter.billinglegalRecordsMayBeRetainedAsRequired")}</li>
                <li>{t("privacyCenter.backupsMayRetainDataForAProviderdefinedWin")}</li>
              </ul>
              <div className="space-y-1.5 max-w-sm">
                <Label htmlFor="del-confirm">{t("privacyCenter.typeDeleteToConfirm")}</Label>
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
                {t("privacyCenter.scheduleAccountDeletion")}
              </Button>
            </>
          )}
          <p className="text-xs text-muted-foreground">{summary?.retention_note}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("privacyCenter.policiesContact")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <div className="flex flex-wrap gap-3">
            <Link className="text-primary underline-offset-4 hover:underline" href="/privacy">
              {t("legal.privacy")}
            </Link>
            <Link className="text-primary underline-offset-4 hover:underline" href="/security">
              {t("privacyCenter.securityOverview")}
            </Link>
            <Link className="text-primary underline-offset-4 hover:underline" href="/subprocessors">
              {t("legal.subprocessors")}
            </Link>
            <Link className="text-primary underline-offset-4 hover:underline" href="/data-and-ai">
              {t("privacyCenter.dataAmpAiMcp")}
            </Link>
            <Link
              className="text-primary underline-offset-4 hover:underline"
              href="/responsible-disclosure"
            >
              {t("privacyCenter.responsibleDisclosure")}
            </Link>
          </div>
          <Separator />
          <p className="text-muted-foreground">
            {t("privacyCenter.supportMustNeverAskForRawApiKeysPasswordsO")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

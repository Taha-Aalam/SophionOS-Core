"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Copy, Download, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { clearCapturedErrors, getCapturedErrors } from "@/lib/bug-report/capture";
import {
  MIN_DESCRIPTION_LENGTH,
  OPEN_BUG_REPORT_EVENT,
  SECURITY_POLICY_URL,
} from "@/lib/bug-report/config";
import { APP_VERSION, BUILD_SHA } from "@/lib/bug-report/version";
import { buildBugReport, buildLogExport, type BuiltReport } from "@/lib/bug-report/report";
import { BUG_REPORT_STRINGS as S } from "@/lib/bug-report/strings";

/** Collect the environment facts and build the report. Client-only. */
function makeReport(description: string, pathname: string): BuiltReport {
  return buildBugReport({
    description,
    pathname,
    appVersion: APP_VERSION,
    uiLocale: document.documentElement.lang || navigator.language || "unknown",
    userAgent: navigator.userAgent,
    ...(BUILD_SHA ? { buildSha: BUILD_SHA } : {}),
  });
}

async function copyBody(body: string, successMessage: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(body);
    toast.success(successMessage);
  } catch {
    toast.error(S.copyFailedToast);
  }
}

function downloadLog(): void {
  const json = buildLogExport(getCapturedErrors(), new Date().toISOString());
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `sophionos-log-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success(S.downloadedToast);
}

/**
 * The bug-report dialog. Mounted once in the dashboard layout; opened by the
 * sidebar menu item or by any component dispatching OPEN_BUG_REPORT_EVENT.
 * Doors stay disabled until the description reaches MIN_DESCRIPTION_LENGTH.
 * Nothing is sent anywhere until a door is clicked.
 */
export function BugReportDialog() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");

  useEffect(() => {
    const openDialog = () => setOpen(true);
    window.addEventListener(OPEN_BUG_REPORT_EVENT, openDialog);
    return () => window.removeEventListener(OPEN_BUG_REPORT_EVENT, openDialog);
  }, []);

  const trimmed = description.trim();
  const doorsEnabled = trimmed.length >= MIN_DESCRIPTION_LENGTH;

  const handleGithub = useCallback(() => {
    const report = makeReport(trimmed, pathname);
    if (report.url) {
      window.open(report.url, "_blank", "noopener,noreferrer");
    } else {
      void copyBody(report.body, S.repoUnconfiguredToast);
    }
    setOpen(false);
    setDescription("");
  }, [trimmed, pathname]);

  const handleCopy = useCallback(() => {
    void copyBody(makeReport(trimmed, pathname).body, S.copiedToast);
  }, [trimmed, pathname]);

  const handleClear = useCallback(() => {
    clearCapturedErrors();
    toast.success(S.clearedToast);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{S.dialogTitle}</DialogTitle>
          <DialogDescription>{S.dialogDescription}</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <label htmlFor="bug-report-description" className="text-sm font-medium">
            {S.descriptionLabel}
          </label>
          <Textarea
            id="bug-report-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={S.descriptionPlaceholder}
            rows={4}
            aria-describedby="bug-report-description-hint"
          />
          <p id="bug-report-description-hint" className="text-xs text-muted-foreground">
            {S.descriptionHint}
          </p>
        </div>
        <div className="space-y-2">
          <Button
            className="w-full justify-start gap-2"
            disabled={!doorsEnabled}
            onClick={handleGithub}
          >
            <ExternalLink className="size-4" />
            {S.doorGithub}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            disabled={!doorsEnabled}
            onClick={handleCopy}
          >
            <Copy className="size-4" />
            {S.doorCopy}
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            disabled={!doorsEnabled}
            onClick={downloadLog}
          >
            <Download className="size-4" />
            {S.doorDownload}
          </Button>
        </div>
        <div className="flex items-center justify-between gap-2 border-t pt-3">
          <Button variant="ghost" size="sm" className="gap-2" onClick={handleClear}>
            <Trash2 className="size-3.5" />
            {S.clearErrors}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {S.securityNotice}{" "}
          <a
            href={SECURITY_POLICY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-3 hover:text-foreground"
          >
            {S.securityLinkLabel}
          </a>
          .
        </p>
      </DialogContent>
    </Dialog>
  );
}

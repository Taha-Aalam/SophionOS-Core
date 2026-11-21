/**
 * UI strings for the bug-report dialog. The repo has no i18n mechanism, so
 * all user-facing strings live here as constants (English source). Report
 * payload headings are separate, fixed English literals in report.ts — the
 * issue tracker's audience, not the reporter's UI language.
 */

export const BUG_REPORT_STRINGS = {
  menuItem: "Report a bug",
  dialogTitle: "Report a bug",
  dialogDescription:
    "Describe what happened. The report includes the app version, this page's path and the last captured error — never your content.",
  descriptionLabel: "What went wrong?",
  descriptionPlaceholder: "What did you do, and what happened instead? (at least 10 characters)",
  descriptionHint: "At least 10 characters are needed before you can file the report.",
  doorGithub: "Open GitHub issue",
  doorGithubDesc: "Pre-filled with the last error and environment. Public.",
  doorCopy: "Copy report",
  doorCopyDesc: "Copy the markdown report to your clipboard.",
  doorDownload: "Download full log",
  doorDownloadDesc: "Save the scrubbed error log as a JSON file.",
  clearErrors: "Clear captured errors",
  clearedToast: "Captured errors cleared",
  copiedToast: "Report copied to clipboard",
  copyFailedToast: "Could not copy — your browser blocked clipboard access",
  repoUnconfiguredToast: "GitHub repo not configured — report copied to clipboard instead",
  downloadedToast: "Log downloaded",
  securityNotice: "Security vulnerability? Do not file a public issue — follow",
  securityLinkLabel: "SECURITY.md",
  boundaryTitle: "Something went wrong",
  boundaryDescription: "This part of the app hit an unexpected error. It has been captured locally.",
  boundaryReport: "Report this",
  boundaryRetry: "Try again",
} as const;

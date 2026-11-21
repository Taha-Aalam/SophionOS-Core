/**
 * Config for the in-app bug report feature. Single source of truth for the
 * GitHub repo string, buffer limits and the cross-component open event.
 *
 * Nothing here phones home: v1 has no backend sink, no telemetry. A report
 * only exists when the user opens the dialog and picks a door.
 *
 * App version / build SHA live in ./version so this module stays free of the
 * package.json import (keeps it out of chunks that only need the event name).
 */

/** GitHub repo for the issue door. Empty string → copy-to-clipboard fallback. */
export const BUG_REPORT_GITHUB_REPO = "Taha-Aalam/SophionOS-Core";

/** Where the security policy lives (linked from the dialog, verified 200). */
export const SECURITY_POLICY_URL =
  "https://github.com/Taha-Aalam/SophionOS-Core/blob/master/SECURITY.md";

/** Window CustomEvent any component can dispatch to open the dialog. */
export const OPEN_BUG_REPORT_EVENT = "sophionos:open-bug-report";

/** localStorage key for the persisted tail of the capture buffer. */
export const BUG_REPORT_STORAGE_KEY = "sophionos:bug-report:errors";

/** Ring buffer capacity in memory. */
export const MAX_MEMORY_ENTRIES = 100;

/** How many of the most recent entries survive a reload via localStorage. */
export const MAX_STORAGE_ENTRIES = 50;

/** Entries older than this are dropped at report time. */
export const MAX_ENTRY_AGE_MS = 24 * 60 * 60 * 1000;

/** Trimmed description characters required before the GitHub door activates. */
export const MIN_DESCRIPTION_LENGTH = 10;

/** URL-encoded body budget for the GitHub issue door (~7000 chars). */
export const MAX_ENCODED_BODY_CHARS = 7000;

/** Stack lines included in the "Last error captured" block. */
export const MAX_STACK_LINES = 30;

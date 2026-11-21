/**
 * Pure report builder for the in-app bug report. No DOM, no window — every
 * input arrives via ReportInput so the whole markdown/URL pipeline is unit
 * testable. The dialog collects the inputs; this module only formats them.
 *
 * Payload headings are fixed English literals on purpose: the audience is the
 * public issue tracker, not the reporter's UI language.
 */

import { breadcrumbLabels } from "@/components/layout/navigation";

import {
  BUG_REPORT_GITHUB_REPO,
  MAX_ENCODED_BODY_CHARS,
  MAX_ENTRY_AGE_MS,
  MAX_STACK_LINES,
} from "./config";
import { getReportableErrors, type CapturedError } from "./capture";
import { scrubPathname } from "./scrub";

export interface ReportInput {
  /** The reporter's own words — passed through as typed (trimmed). */
  description: string;
  /** Current route pathname (already scrubbed by the caller). */
  pathname: string;
  appVersion: string;
  uiLocale: string;
  userAgent: string;
  /** Git SHA when the build exposes one; omit the line otherwise. */
  buildSha?: string;
  /** Injectable clock for tests. */
  now?: number;
  /** Injectable entries for tests; defaults to the live capture buffer. */
  entries?: CapturedError[];
}

export interface BuiltReport {
  title: string;
  body: string;
  /** Empty when no GitHub repo is configured (door falls back to clipboard). */
  url: string;
}

/**
 * Route → surface name. Derived from the real (dashboard) route tree via the
 * repo's existing breadcrumbLabels map (navigation.ts) — one source of truth,
 * so a new route added there is named here automatically.
 */
export function componentFromPathname(pathname: string): string {
  const segment = pathname.split("/").filter(Boolean)[0] ?? "";
  return breadcrumbLabels[segment] ?? "App";
}

function errorBlock(last: CapturedError | null): string {
  if (!last) return "_No error captured during this session._";
  const stackLines = last.stack ? last.stack.split("\n").slice(0, MAX_STACK_LINES).join("\n") : "";
  return `\`\`\`\n${last.message}${stackLines ? `\n${stackLines}` : ""}\n\`\`\``;
}

/** Assemble the markdown body (before the URL size cap). */
function buildBody(input: ReportInput, last: CapturedError | null, component: string): string {
  const page = scrubPathname(input.pathname);
  const errorPage = last ? scrubPathname(last.pathname) : "";
  return [
    "### Description",
    input.description.trim(),
    "",
    "### Environment",
    `- App version: ${input.appVersion}`,
    `- Component: ${component}`,
    `- Page: ${page}`,
    `- UI locale: ${input.uiLocale || "unknown"}`,
    `- User agent: ${input.userAgent}`,
    input.buildSha ? `- Build: ${input.buildSha}` : "",
    last ? `- Captured at: ${last.timestamp}` : "",
    errorPage && errorPage !== page ? `- Error page: ${errorPage}` : "",
    "",
    "### Last error captured",
    errorBlock(last),
  ]
    .filter(Boolean)
    .join("\n");
}

const TRUNCATION_MARKER =
  "\n\n_[truncated — the full log is available via the Download full log JSON export]_";

/** Head-preserve the body so its URL-encoded form fits the size cap. */
function capBody(body: string): string {
  if (encodeURIComponent(body).length <= MAX_ENCODED_BODY_CHARS) return body;
  // Ratio-based first cut, then shrink until the encoded form (marker
  // included) fits — encoding expands non-ASCII, so one pass can overshoot.
  let keep = Math.floor(body.length * (MAX_ENCODED_BODY_CHARS / encodeURIComponent(body).length));
  let capped = body.slice(0, keep) + TRUNCATION_MARKER;
  while (encodeURIComponent(capped).length > MAX_ENCODED_BODY_CHARS && keep > 0) {
    keep = Math.floor(keep * 0.9);
    capped = body.slice(0, keep) + TRUNCATION_MARKER;
  }
  return capped;
}

/** Build title, markdown body and the pre-filled GitHub issue URL. */
export function buildBugReport(input: ReportInput): BuiltReport {
  const now = input.now ?? Date.now();
  const fresh = (input.entries ?? getReportableErrors(now)).filter((e) => {
    const at = Date.parse(e.timestamp);
    return !Number.isNaN(at) && now - at <= MAX_ENTRY_AGE_MS;
  });
  const last = fresh.at(-1) ?? null;
  const component = componentFromPathname(input.pathname);
  const body = capBody(buildBody(input, last, component));
  const title = `[${component}] Bug report from in-app menu`;
  const url = BUG_REPORT_GITHUB_REPO
    ? `https://github.com/${BUG_REPORT_GITHUB_REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`
    : "";
  return { title, body, url };
}

/** The scrubbed buffer as a pretty-printed JSON export ("Download full log"). */
export function buildLogExport(entries: CapturedError[], generatedAt: string): string {
  return JSON.stringify(
    { generated_at: generatedAt, total_errors: entries.length, entries },
    null,
    2,
  );
}

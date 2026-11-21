/**
 * Client-side error capture for the in-app bug report.
 *
 * Ring buffer: last 100 entries in memory, last 50 persisted to localStorage.
 * Every string is scrubbed BEFORE storage (see scrub.ts). Nothing is ever
 * sent anywhere automatically — the buffer only feeds the report dialog.
 *
 * Sources: window error/unhandledrejection listeners (installed once by the
 * capture provider), the dashboard error boundary, manual captureError calls
 * from the API layer, and global-error.tsx (storage-only, outside the tree).
 */

import {
  BUG_REPORT_STORAGE_KEY,
  MAX_ENTRY_AGE_MS,
  MAX_MEMORY_ENTRIES,
  MAX_STORAGE_ENTRIES,
} from "./config";
import { scrubPathname, scrubText } from "./scrub";

export interface CapturedError {
  /** Scrubbed error message. */
  message: string;
  /** Scrubbed stack trace, when one exists. */
  stack?: string;
  category: "error" | "warning";
  /** Route pathname at capture time — scrubbed, never a full URL. */
  pathname: string;
  /** ISO 8601 capture timestamp. */
  timestamp: string;
}

let buffer: CapturedError[] = [];
let loaded = false;

/**
 * Noise we refuse to record: browser quirks and transient network blips are
 * not actionable bugs and would bury the real error in the report.
 */
const NOISE_PATTERNS: readonly RegExp[] = [
  /ResizeObserver loop/i,
  /\bAbortError\b/i,
  /The operation was aborted/i,
  /signal is aborted without reason/i,
  /Failed to fetch/i,
  /NetworkError when attempting to fetch resource/i,
  /Load failed/i,
  /The Internet connection appears to be offline/i,
  /Network request failed/i,
];

export function isNoise(message: string): boolean {
  return NOISE_PATTERNS.some((re) => re.test(message));
}

function currentPathname(): string {
  if (typeof window === "undefined") return "";
  return scrubPathname(window.location?.pathname ?? "");
}

function persist(): void {
  try {
    localStorage.setItem(
      BUG_REPORT_STORAGE_KEY,
      JSON.stringify(buffer.slice(-MAX_STORAGE_ENTRIES)),
    );
  } catch {
    // Storage full/unavailable — the in-memory buffer still works.
  }
}

function loadOnce(): void {
  if (loaded) return;
  loaded = true;
  try {
    const raw = localStorage.getItem(BUG_REPORT_STORAGE_KEY);
    if (!raw) return;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    // Stored entries were scrubbed at capture; re-scrub defensively so a
    // tampered/legacy payload can never leak into a report.
    buffer = parsed
      .filter((e): e is CapturedError => isEntryShape(e))
      .slice(-MAX_STORAGE_ENTRIES)
      .map((e) => ({
        ...e,
        message: scrubText(e.message),
        stack: e.stack ? scrubText(e.stack) : undefined,
        pathname: scrubPathname(e.pathname),
      }));
  } catch {
    // Corrupt payload — start empty rather than throw inside an error path.
  }
}

function isEntryShape(e: unknown): e is CapturedError {
  if (typeof e !== "object" || e === null) return false;
  const o = e as Record<string, unknown>;
  return (
    typeof o.message === "string" &&
    typeof o.pathname === "string" &&
    typeof o.timestamp === "string" &&
    (o.category === "error" || o.category === "warning") &&
    (o.stack === undefined || typeof o.stack === "string")
  );
}

/** Extract a message from anything throwable without touching other fields. */
function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Unknown error";
}

/**
 * Record an error. `context.pathname` overrides the current route (used when
 * the capture site knows better, e.g. a stored entry replayed at report time).
 * Never throws: an error reporter must not create new errors.
 */
export function captureError(
  error: unknown,
  context?: { pathname?: string; category?: "error" | "warning" },
): void {
  try {
    const message = scrubText(messageOf(error));
    if (!message || isNoise(message)) return;
    loadOnce();
    const stack = error instanceof Error && error.stack ? scrubText(error.stack) : undefined;
    const entry: CapturedError = {
      message,
      ...(stack !== undefined ? { stack } : {}),
      category: context?.category ?? "error",
      pathname: context?.pathname ? scrubPathname(context.pathname) : currentPathname(),
      timestamp: new Date().toISOString(),
    };
    buffer.push(entry);
    if (buffer.length > MAX_MEMORY_ENTRIES) buffer = buffer.slice(-MAX_MEMORY_ENTRIES);
    persist();
  } catch {
    // Swallow: capture must never break the app it observes.
  }
}

/**
 * Storage-only capture for global-error.tsx, which renders outside the app
 * tree (its module state may not survive). Appends straight to localStorage.
 */
export function captureErrorToStorage(error: unknown): void {
  try {
    const message = scrubText(messageOf(error));
    if (!message || isNoise(message)) return;
    const stack = error instanceof Error && error.stack ? scrubText(error.stack) : undefined;
    const entry: CapturedError = {
      message,
      ...(stack !== undefined ? { stack } : {}),
      category: "error",
      pathname: currentPathname(),
      timestamp: new Date().toISOString(),
    };
    let existing: CapturedError[] = [];
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(BUG_REPORT_STORAGE_KEY) ?? "[]");
      if (Array.isArray(parsed)) existing = parsed.filter(isEntryShape);
    } catch {
      // Corrupt payload — overwrite with just this entry.
    }
    existing.push(entry);
    localStorage.setItem(
      BUG_REPORT_STORAGE_KEY,
      JSON.stringify(existing.slice(-MAX_STORAGE_ENTRIES)),
    );
  } catch {
    // Storage unavailable — nothing we can safely do.
  }
}

/** All captured entries, oldest first (includes stale ones). */
export function getCapturedErrors(): CapturedError[] {
  loadOnce();
  return [...buffer];
}

/** Entries fresh enough to include in a report (≤24h old, parseable time). */
export function getReportableErrors(now: number = Date.now()): CapturedError[] {
  return getCapturedErrors().filter((e) => {
    const at = Date.parse(e.timestamp);
    return !Number.isNaN(at) && now - at <= MAX_ENTRY_AGE_MS;
  });
}

/** The most recent fresh error, or null. */
export function getLastError(now: number = Date.now()): CapturedError | null {
  const fresh = getReportableErrors(now);
  return fresh.length > 0 ? fresh[fresh.length - 1] : null;
}

/** Empty the buffer in memory and in storage ("Clear captured errors"). */
export function clearCapturedErrors(): void {
  buffer = [];
  loaded = true;
  try {
    localStorage.removeItem(BUG_REPORT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Test seam: reset module state without touching storage semantics. */
export function resetCaptureForTests(): void {
  buffer = [];
  loaded = false;
}

let listenersInstalled = false;

/**
 * Install the window error/unhandledrejection listeners. Idempotent; called
 * once from the client capture provider in the dashboard layout.
 */
export function installErrorListeners(): void {
  if (listenersInstalled || typeof window === "undefined") return;
  listenersInstalled = true;
  loadOnce();
  window.addEventListener("error", (event: ErrorEvent) => {
    captureError(event.error ?? event.message);
  });
  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    captureError(event.reason);
  });
}

/** Test seam: allow re-installation after reset. */
export function resetListenersForTests(): void {
  listenersInstalled = false;
}

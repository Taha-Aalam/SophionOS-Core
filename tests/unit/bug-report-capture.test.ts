// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";

import {
  captureError,
  captureErrorToStorage,
  clearCapturedErrors,
  getCapturedErrors,
  getReportableErrors,
  isNoise,
  resetCaptureForTests,
} from "@/lib/bug-report/capture";
import { BUG_REPORT_STORAGE_KEY, MAX_MEMORY_ENTRIES, MAX_STORAGE_ENTRIES } from "@/lib/bug-report/config";

beforeEach(() => {
  localStorage.clear();
  resetCaptureForTests();
  window.history.replaceState(null, "", "/dashboard");
});

describe("capture buffer", () => {
  it("records scrubbed entries with route and timestamp", () => {
    window.history.replaceState(null, "", "/notes/3f2b8c9a-1d4e-4f5a-9b6c-7d8e9f0a1b2c?token=SECRET-CANARY");
    captureError(new Error("boom token=SECRET-CANARY"));
    const [entry] = getCapturedErrors();
    expect(entry.message).toBe("boom [redacted]");
    expect(entry.pathname).toBe("/notes/[id]");
    expect(entry.category).toBe("error");
    expect(Date.parse(entry.timestamp)).not.toBeNaN();
    expect(JSON.stringify(entry)).not.toContain("SECRET-CANARY");
  });

  it("evicts oldest entries at memory capacity (100)", () => {
    for (let i = 0; i < MAX_MEMORY_ENTRIES + 5; i++) captureError(new Error(`err-${i}`));
    const all = getCapturedErrors();
    expect(all).toHaveLength(MAX_MEMORY_ENTRIES);
    expect(all[0].message).toBe("err-5");
    expect(all.at(-1)?.message).toBe(`err-${MAX_MEMORY_ENTRIES + 4}`);
  });

  it("persists only the last 50 entries to localStorage", () => {
    for (let i = 0; i < MAX_MEMORY_ENTRIES; i++) captureError(new Error(`err-${i}`));
    const stored = JSON.parse(localStorage.getItem(BUG_REPORT_STORAGE_KEY) ?? "[]");
    expect(stored).toHaveLength(MAX_STORAGE_ENTRIES);
    expect(stored[0].message).toBe(`err-${MAX_MEMORY_ENTRIES - MAX_STORAGE_ENTRIES}`);
  });

  it("round-trips persisted entries across a module reset (reload)", () => {
    captureError(new Error("survivor"));
    resetCaptureForTests();
    const all = getCapturedErrors();
    expect(all).toHaveLength(1);
    expect(all[0].message).toBe("survivor");
  });

  it("drops entries older than 24h at report time but keeps them in the buffer", () => {
    const now = Date.now();
    const stale = {
      message: "old",
      category: "error",
      pathname: "/tasks",
      timestamp: new Date(now - 25 * 60 * 60 * 1000).toISOString(),
    };
    const fresh = {
      message: "new",
      category: "error",
      pathname: "/tasks",
      timestamp: new Date(now - 60 * 1000).toISOString(),
    };
    localStorage.setItem(BUG_REPORT_STORAGE_KEY, JSON.stringify([stale, fresh]));
    expect(getCapturedErrors()).toHaveLength(2);
    const reportable = getReportableErrors(now);
    expect(reportable).toHaveLength(1);
    expect(reportable[0].message).toBe("new");
  });

  it("re-scrubs stored entries defensively on load", () => {
    localStorage.setItem(
      BUG_REPORT_STORAGE_KEY,
      JSON.stringify([
        {
          message: "leak token=SECRET-CANARY",
          category: "error",
          pathname: "/notes/x?token=SECRET-CANARY",
          timestamp: new Date().toISOString(),
        },
      ]),
    );
    const [entry] = getCapturedErrors();
    expect(entry.message).not.toContain("SECRET-CANARY");
    expect(entry.pathname).toBe("/notes/x");
  });

  it("clears memory and storage", () => {
    captureError(new Error("gone"));
    clearCapturedErrors();
    expect(getCapturedErrors()).toHaveLength(0);
    expect(localStorage.getItem(BUG_REPORT_STORAGE_KEY)).toBeNull();
  });

  it("captureErrorToStorage appends without module state (global-error path)", () => {
    captureErrorToStorage(new Error("root crash"));
    const stored = JSON.parse(localStorage.getItem(BUG_REPORT_STORAGE_KEY) ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].message).toBe("root crash");
    // A second call appends, not overwrites.
    captureErrorToStorage(new Error("second crash"));
    expect(JSON.parse(localStorage.getItem(BUG_REPORT_STORAGE_KEY) ?? "[]")).toHaveLength(2);
  });
});

describe("noise control", () => {
  it("drops ResizeObserver loop errors, AbortError and network blips", () => {
    captureError(new Error("ResizeObserver loop completed with undelivered notifications."));
    const abort = new Error("The operation was aborted");
    abort.name = "AbortError";
    captureError(abort);
    captureError(new TypeError("Failed to fetch"));
    captureError(new TypeError("Load failed"));
    captureError(new Error("The Internet connection appears to be offline."));
    expect(getCapturedErrors()).toHaveLength(0);
  });

  it("isNoise matches AbortError by name embedded in message", () => {
    expect(isNoise("AbortError: signal is aborted without reason")).toBe(true);
    expect(isNoise("Cannot read properties of null")).toBe(false);
  });

  it("keeps real errors that merely mention the network", () => {
    captureError(new Error("network diagram render crashed"));
    expect(getCapturedErrors()).toHaveLength(1);
  });
});

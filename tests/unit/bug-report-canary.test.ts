// @vitest-environment jsdom

/**
 * CANARY: a secret planted in the route (query string), the pathname-adjacent
 * message, and the stack must not survive anywhere in the report pipeline —
 * not the body, not the title, not the GitHub URL, not the JSON export.
 */

import { beforeEach, describe, expect, it } from "vitest";

import {
  captureError,
  getCapturedErrors,
  resetCaptureForTests,
} from "@/lib/bug-report/capture";
import { buildBugReport, buildLogExport } from "@/lib/bug-report/report";

const CANARY = "SECRET-CANARY";

beforeEach(() => {
  localStorage.clear();
  resetCaptureForTests();
});

describe("canary never leaves the device", () => {
  it("is absent from body, title and GitHub URL end to end", () => {
    // The route carries the canary in the query string; the message and the
    // stack carry it too, in URL and bare-token shapes.
    window.history.replaceState(null, "", `/notes/abc123?token=${CANARY}`);
    const error = new Error(`request to /notes/abc123?token=${CANARY} failed`);
    error.stack = [
      "Error: request failed",
      `    at fetchNote (https://app.test/notes/abc123?token=${CANARY}:1:1)`,
      `    at load (/notes/abc123?token=${CANARY}#frag)`,
    ].join("\n");
    captureError(error);

    // Move to a different page before filing, exercising the Error page line.
    window.history.replaceState(null, "", `/tasks?session=${CANARY}`);
    const report = buildBugReport({
      description: "Notes page broke when I opened a note.",
      pathname: window.location.pathname,
      appVersion: "0.2.11",
      uiLocale: "en",
      userAgent: "TestAgent/1.0",
      entries: getCapturedErrors(),
    });

    for (const artifact of [report.body, report.title, report.url]) {
      expect(artifact).not.toContain(CANARY);
      expect(artifact).not.toContain("token=");
    }
    // The URL-encoded forms must not hide it either.
    expect(decodeURIComponent(report.url)).not.toContain(CANARY);
    expect(report.url).not.toContain(encodeURIComponent(CANARY));

    // The JSON export door is equally clean.
    const json = buildLogExport(getCapturedErrors(), new Date().toISOString());
    expect(json).not.toContain(CANARY);
    expect(json).not.toContain("token=");

    // And what was persisted at capture time was already scrubbed.
    expect(localStorage.getItem("sophionos:bug-report:errors") ?? "").not.toContain(CANARY);

    // Sanity: the report still names the surface and the scrubbed route.
    expect(report.title).toBe("[Tasks] Bug report from in-app menu");
    expect(report.body).toContain("- Error page: /notes/abc123");
  });
});

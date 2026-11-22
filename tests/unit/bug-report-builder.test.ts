import { describe, expect, it } from "vitest";

import type { CapturedError } from "@/lib/bug-report/capture";
import { MAX_ENCODED_BODY_CHARS } from "@/lib/bug-report/config";
import { buildBugReport, buildLogExport, componentFromPathname } from "@/lib/bug-report/report";

const NOW = Date.parse("2026-11-20T12:00:00Z");

function entry(overrides: Partial<CapturedError> = {}): CapturedError {
  return {
    message: "Cannot read properties of undefined",
    stack: Array.from({ length: 40 }, (_, i) => `    at frame${i} (/x.tsx:${i}:1)`).join("\n"),
    category: "error",
    pathname: "/tasks",
    timestamp: new Date(NOW - 60_000).toISOString(),
    ...overrides,
  };
}

const baseInput = {
  description: "Clicked save and the page went blank.",
  pathname: "/tasks",
  appVersion: "0.2.11",
  uiLocale: "en",
  userAgent: "TestAgent/1.0",
  now: NOW,
};

describe("componentFromPathname — real (dashboard) routes", () => {
  const cases: Array<[string, string]> = [
    ["/dashboard", "Dashboard"],
    ["/dashboard/network", "Dashboard"],
    ["/areas", "Areas"],
    ["/areas/abc123/edit", "Areas"],
    ["/contacts/abc", "Contacts"],
    ["/goals", "Goals"],
    ["/inbox", "Inbox"],
    ["/knowledge", "Knowledge Hub"],
    ["/my-day", "My Day"],
    ["/notes/abc", "Notes"],
    ["/projects", "Projects"],
    ["/resources", "Resources"],
    ["/settings/privacy", "Settings"],
    ["/tasks", "Tasks"],
    ["/topics", "Topics"],
    ["/somewhere-unknown", "App"],
    ["/", "App"],
  ];
  it.each(cases)("maps %s → %s", (pathname, expected) => {
    expect(componentFromPathname(pathname)).toBe(expected);
  });
});

describe("buildBugReport", () => {
  it("produces the required section shape and title", () => {
    const { title, body } = buildBugReport({ ...baseInput, entries: [entry()] });
    expect(title).toBe("[Tasks] Bug report from in-app menu");
    expect(body).toContain("### Description");
    expect(body).toContain("Clicked save and the page went blank.");
    expect(body).toContain("### Environment");
    expect(body).toContain("- App version: 0.2.11");
    expect(body).toContain("- Component: Tasks");
    expect(body).toContain("- Page: /tasks");
    expect(body).toContain("- UI locale: en");
    expect(body).toContain("- User agent: TestAgent/1.0");
    expect(body).toContain(`- Captured at: ${entry().timestamp}`);
    expect(body).toContain("### Last error captured");
    expect(body).toContain("```");
    expect(body).toContain("Cannot read properties of undefined");
  });

  it("includes only the first 30 stack lines", () => {
    const { body } = buildBugReport({ ...baseInput, entries: [entry()] });
    expect(body).toContain("at frame29");
    expect(body).not.toContain("at frame30");
  });

  it("omits the Build line without a SHA and includes it with one", () => {
    expect(buildBugReport({ ...baseInput, entries: [] }).body).not.toContain("- Build:");
    expect(buildBugReport({ ...baseInput, buildSha: "abc1234", entries: [] }).body).toContain(
      "- Build: abc1234",
    );
  });

  it("adds Error page only when it differs from Page", () => {
    const same = buildBugReport({ ...baseInput, entries: [entry({ pathname: "/tasks" })] });
    expect(same.body).not.toContain("- Error page:");
    const different = buildBugReport({ ...baseInput, entries: [entry({ pathname: "/notes/x" })] });
    expect(different.body).toContain("- Error page: /notes/x");
  });

  it("renders the no-error-captured marker when the buffer is empty", () => {
    const { body } = buildBugReport({ ...baseInput, entries: [] });
    expect(body).toContain("_No error captured during this session._");
    expect(body).not.toContain("- Captured at:");
  });

  it("ignores entries older than 24h", () => {
    const stale = entry({ timestamp: new Date(NOW - 25 * 60 * 60 * 1000).toISOString() });
    const { body } = buildBugReport({ ...baseInput, entries: [stale] });
    expect(body).toContain("_No error captured during this session._");
  });

  it("builds a GitHub issue URL with encoded title and body", () => {
    const { url, title, body } = buildBugReport({ ...baseInput, entries: [] });
    expect(url.startsWith("https://github.com/Taha-Aalam/SophionOS-Core/issues/new?")).toBe(true);
    expect(url).toContain(`title=${encodeURIComponent(title)}`);
    expect(url).toContain(`body=${encodeURIComponent(body)}`);
  });

  it("truncates head-preserved when the encoded body exceeds the cap", () => {
    const long = entry({ stack: "x".repeat(20_000) });
    const { body, url } = buildBugReport({ ...baseInput, entries: [long] });
    expect(encodeURIComponent(body).length).toBeLessThanOrEqual(MAX_ENCODED_BODY_CHARS);
    expect(body).toContain("### Description");
    expect(body).toContain("truncated");
    expect(body).toContain("JSON");
    expect(url).toContain(`body=${encodeURIComponent(body)}`);
  });

  it("caps correctly even when the body is mostly multi-byte characters", () => {
    const long = entry({ stack: "é".repeat(10_000) });
    const { body } = buildBugReport({ ...baseInput, entries: [long] });
    expect(encodeURIComponent(body).length).toBeLessThanOrEqual(MAX_ENCODED_BODY_CHARS);
    expect(body).toContain("truncated");
  });
});

describe("buildLogExport", () => {
  it("exports the scrubbed buffer as pretty JSON", () => {
    const json = buildLogExport([entry()], new Date(NOW).toISOString());
    const parsed = JSON.parse(json);
    expect(parsed.total_errors).toBe(1);
    expect(parsed.entries[0].message).toBe("Cannot read properties of undefined");
    expect(parsed.generated_at).toBe(new Date(NOW).toISOString());
  });
});

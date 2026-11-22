import { describe, expect, it } from "vitest";

import { scrubPathname, scrubText } from "@/lib/bug-report/scrub";

describe("scrubText", () => {
  it("reduces absolute URLs to pathname — query and hash never survive", () => {
    const out = scrubText(
      "GET https://app.sophionos.com/notes/abc?token=SECRET-CANARY#frag failed",
    );
    expect(out).toContain("/notes/abc");
    expect(out).not.toContain("SECRET-CANARY");
    expect(out).not.toContain("token=");
    expect(out).not.toContain("#frag");
    expect(out).not.toContain("app.sophionos.com");
  });

  it("strips query/hash from relative path-like tokens", () => {
    const out = scrubText("failed at /notes/abc?token=SECRET-CANARY#section");
    expect(out).toBe("failed at /notes/abc");
  });

  it("masks UUIDs", () => {
    const out = scrubText("entity 3f2b8c9a-1d4e-4f5a-9b6c-7d8e9f0a1b2c missing");
    expect(out).toBe("entity [id] missing");
  });

  it("masks hex runs of 32+ chars", () => {
    const hex = "a".repeat(40);
    expect(scrubText(`key ${hex} leaked`)).toBe("key [redacted] leaked");
  });

  it("masks base64 runs of 32+ chars", () => {
    const b64 = "QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVowMTIzNDU2Nzg5";
    expect(scrubText(`blob ${b64}`)).toBe("blob [redacted]");
  });

  it("masks JWTs even when shorter than 32 chars per segment", () => {
    const out = scrubText("auth eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJl rejected");
    expect(out).not.toContain("eyJ");
    expect(out).toContain("[jwt]");
  });

  it("masks email addresses", () => {
    expect(scrubText("owner jane.doe@example.com not found")).toBe("owner [email] not found");
  });

  it("masks the segment after share/invite/token path prefixes", () => {
    expect(scrubText("open /share/s3cr3t-link-id/view")).toBe("open /share/[redacted]/view");
    expect(scrubText("open /invite/abc123xyz")).toBe("open /invite/[redacted]");
    expect(scrubText("open /token/tok_998877")).toBe("open /token/[redacted]");
  });

  it("masks secret key=value pairs including the key itself", () => {
    const out = scrubText("bad request token=SECRET-CANARY&x=1");
    expect(out).not.toContain("token=");
    expect(out).not.toContain("SECRET-CANARY");
    expect(scrubText("password=hunter2 rejected")).not.toContain("password=");
    expect(scrubText("api_key=abc123 rejected")).not.toContain("api_key=");
  });

  it("preserves plain messages and short path segments", () => {
    expect(scrubText("Cannot read properties of undefined")).toBe(
      "Cannot read properties of undefined",
    );
    expect(scrubText("at render (/settings/page.tsx:12:5)")).toContain("/settings/page.tsx");
  });

  it("reduces non-http schemes and protocol-relative URLs too", () => {
    for (const input of [
      "wss://x.test/socket?token=SECRET-CANARY",
      "ftp://x.test/f?token=SECRET-CANARY",
      "open //x.test/p?token=SECRET-CANARY",
    ]) {
      const out = scrubText(input);
      expect(out).not.toContain("SECRET-CANARY");
      expect(out).not.toContain("token=");
      expect(out).not.toContain("x.test");
    }
  });

  it("reduces mailto: entirely — address and query never survive", () => {
    const out = scrubText("send mailto:jane@x.com?subject=private-notes failed");
    expect(out).not.toContain("jane@x.com");
    expect(out).not.toContain("private-notes");
  });

  it("treats backslash as a path delimiter (WHATWG URL semantics)", () => {
    const out = scrubText("at load (/notes/abc\\?token=SECRET-CANARY)");
    expect(out).not.toContain("SECRET-CANARY");
    expect(out).not.toContain("token=");
  });
});

describe("scrubPathname", () => {
  it("keeps the pathname and drops query and hash unconditionally", () => {
    expect(scrubPathname("/notes/abc?token=SECRET-CANARY#h")).toBe("/notes/abc");
    expect(scrubPathname("/tasks")).toBe("/tasks");
  });

  it("masks UUID segments in routes", () => {
    expect(scrubPathname("/notes/3f2b8c9a-1d4e-4f5a-9b6c-7d8e9f0a1b2c")).toBe("/notes/[id]");
  });

  it("masks share/invite token segments", () => {
    expect(scrubPathname("/share/super-secret-id")).toBe("/share/[redacted]");
  });

  it("tolerates a full URL passed by mistake — still pathname only", () => {
    const out = scrubPathname("https://x.test/notes/abc?token=SECRET-CANARY");
    expect(out).not.toContain("SECRET-CANARY");
    expect(out).not.toContain("token=");
    expect(out).not.toContain("x.test");
  });

  it("returns empty string for empty input", () => {
    expect(scrubPathname("")).toBe("");
  });
});

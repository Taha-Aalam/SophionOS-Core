import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Pins the BODY of the four policy pages that carry no binding counterpart:
 * /security, /subprocessors, /data-and-ai, /responsible-disclosure.
 *
 * Ported from sophionos-cloud (PR #94), where the wording was reviewed and
 * corrected, so both repos assert the same contract.
 *
 * These assertions are about product truth, not formatting:
 *  - the version/effective stamp is 2.1 / October 19, 2026 on all four;
 *  - the legacy tier names never appear (the operator ruled them out of every
 *    policy page);
 *  - each page says the specific things it is supposed to say, so a future
 *    rewrite cannot quietly drop the DPDP Rule 6 table, the field-level
 *    encryption claim, the vendor list, the responsibility split, or the
 *    disclosure scope.
 */

const SRC = new URL("../../src", import.meta.url).pathname;

const raw = (slug: string) =>
  readFileSync(join(SRC, "app", "(trust)", slug, "page.tsx"), "utf8");

/** The page source is prettier-wrapped at 80 columns, so prose assertions
 *  have to run against whitespace-normalised text. */
const prose = (slug: string) => raw(slug).replace(/\s+/g, " ");

const SECURITY = () => prose("security");
const SUBPROCESSORS = () => prose("subprocessors");
const DATA_AND_AI = () => prose("data-and-ai");
const DISCLOSURE = () => prose("responsible-disclosure");

const ALL = [
  ["security", SECURITY],
  ["subprocessors", SUBPROCESSORS],
  ["data-and-ai", DATA_AND_AI],
  ["responsible-disclosure", DISCLOSURE],
] as const;

describe("policy page scaffolding", () => {
  it("wraps every page in TrustPage and stamps it 2.1 / October 19, 2026", () => {
    for (const [slug, source] of ALL) {
      expect(source(), slug).toContain("<TrustPage");
      expect(source(), slug).toContain("<PolicyMeta");
      expect(source(), slug).toContain('version="2.1"');
      expect(source(), slug).toContain('effective="October 19, 2026"');
    }
  });

  it("never names the legacy tier on any of the four pages", () => {
    for (const [slug, source] of ALL) {
      expect(source(), slug).not.toMatch(/lifetime/i);
      expect(source(), slug).not.toMatch(/\bmax\b/i);
    }
  });
});

describe("security page body", () => {
  it("states the DPDP Rule 6 minimum safeguards", () => {
    const source = SECURITY();
    expect(source).toContain("Rule 6");
    expect(source).toContain("minimum safeguards");
    expect(source).toContain("DPDP Rules, 2025");
  });

  it("states the field-level encryption claim plainly", () => {
    const source = SECURITY();
    expect(source).toContain("AES-256-GCM");
    expect(source).toContain("always on for every Cloud account");
  });

  it("keeps the end-to-end encryption disclaimer", () => {
    const source = SECURITY();
    expect(source).toContain("end-to-end");
    expect(source).toContain("What we do not claim");
  });
});

describe("subprocessors page body", () => {
  it("names every vendor the Cloud service actually uses", () => {
    const source = SUBPROCESSORS();
    for (const vendor of [
      "Clerk",
      "Supabase",
      "Vercel",
      "Dodo Payments",
      "Resend",
    ]) {
      expect(source, vendor).toContain(vendor);
    }
  });

  it("keeps the four-column vendor table", () => {
    const source = SUBPROCESSORS();
    for (const column of ["Vendor", "Purpose", "Data involved", "Location"]) {
      expect(source, column).toContain(`<th>${column}</th>`);
    }
  });
});

describe("data-and-ai page body", () => {
  it("splits responsibility between SophionOS and the connected client", () => {
    const source = DATA_AND_AI();
    expect(source).toContain("Who is responsible for what");
    expect(source).toContain("Prompt injection");
    expect(source).toContain("cannot");
  });
});

describe("responsible-disclosure page body", () => {
  it("keeps the safe harbour, the scope, and the out-of-scope list", () => {
    const source = DISCLOSURE();
    expect(source).toContain("Safe harbor");
    expect(source).toContain("In scope");
    expect(source).toContain("Out of scope");
  });

  it("routes security reports to the security address", () => {
    // Security things go to security@; everything else goes to founders@.
    // The disclosure page is the one security contact point in the app, and
    // it must match the address SECURITY.md publishes.
    const source = DISCLOSURE();
    expect(source).toContain("security@sophionos.com");
    expect(source).not.toContain("founders@sophionos.com");
  });
});

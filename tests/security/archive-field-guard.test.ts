import { describe, expect, it } from "vitest";
import { assertApiKeyArchiveFieldAllowed } from "@/lib/api/authorize-scope";
import type { AuthResult } from "@/lib/api/api-auth";

/**
 * Regression: audit sophionos-core-20261117-r1 finding F7
 * (archive-write-scope-bypass-via-entity-patch-update-schema, low).
 *
 * Unit contract for the body-aware guard that closes the generic-PATCH
 * archive bypass; the route-level behavior is pinned by the differential
 * harness is_archived cell.
 */

function auth(type: "api_key" | "clerk", accessMode?: string): AuthResult {
  return { type, userId: "u1", keyId: "k1", accessMode, clientType: "automation" } as AuthResult;
}

describe("assertApiKeyArchiveFieldAllowed (audit F7)", () => {
  it("denies write_limited keys mutating archive state through PATCH bodies", () => {
    expect(() =>
      assertApiKeyArchiveFieldAllowed(auth("api_key", "write_limited"), { is_archived: true }),
    ).toThrow(/cannot archive or restore/i);
    expect(() =>
      assertApiKeyArchiveFieldAllowed(auth("api_key", "write_limited"), { is_archived: false, name: "keep" }),
    ).toThrow(/cannot archive or restore/i);
  });

  it("denies read_only keys the same way (no archive:write in the preset)", () => {
    expect(() =>
      assertApiKeyArchiveFieldAllowed(auth("api_key", "read_only"), { is_archived: true }),
    ).toThrow();
  });

  it("allows write_enabled keys (the preset grants archive:write)", () => {
    expect(() =>
      assertApiKeyArchiveFieldAllowed(auth("api_key", "write_enabled"), { is_archived: true }),
    ).not.toThrow();
  });

  it("allows write_limited keys updating other fields (no archive flag in the body)", () => {
    expect(() =>
      assertApiKeyArchiveFieldAllowed(auth("api_key", "write_limited"), { name: "rename only" }),
    ).not.toThrow();
  });

  it("is a no-op for Clerk sessions (dashboard authority)", () => {
    expect(() =>
      assertApiKeyArchiveFieldAllowed(auth("clerk"), { is_archived: true }),
    ).not.toThrow();
  });

  it("tolerates null and non-object bodies", () => {
    expect(() => assertApiKeyArchiveFieldAllowed(auth("api_key", "write_limited"), null)).not.toThrow();
    expect(() => assertApiKeyArchiveFieldAllowed(auth("api_key", "write_limited"), "text")).not.toThrow();
  });
});

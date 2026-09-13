import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { enforceApiKeyRoutePermission } from "@/lib/api/authorize-scope";
import {
  isPermanentDeletePath,
  lookupRoutePermission,
  normalizeApiV1Path,
} from "@/lib/api/route-permissions";
import { scopesForAccessMode } from "@/lib/api/api-scopes";

function req(path: string, method: string) {
  return new NextRequest(`http://localhost${path}`, { method });
}

describe("route-permissions map", () => {
  it("normalizes UUIDs to :id", () => {
    expect(
      normalizeApiV1Path(
        "/api/v1/tasks/550e8400-e29b-41d4-a716-446655440000",
      ),
    ).toBe("tasks/:id");
  });

  it("normalizes percent-encoded UUIDs to :id", () => {
    expect(
      normalizeApiV1Path(
        "/api/v1/tasks/550e8400%2De29b%2D41d4%2Da716%2D446655440000",
      ),
    ).toBe("tasks/:id");
    expect(
      normalizeApiV1Path(
        "/api/v1/notes/550e8400%2de29b%2d41d4%2da716%2d446655440000/archive",
      ),
    ).toBe("notes/:id/archive");
  });

  it("keeps malformed-encoded segments raw (no throw)", () => {
    expect(() =>
      normalizeApiV1Path("/api/v1/tasks/550e8400%2De29b%2D%zz"),
    ).not.toThrow();
  });

  it("looks up tasks and permanent delete paths", () => {
    expect(lookupRoutePermission("/api/v1/tasks")).toMatchObject({
      readScope: "tasks:read",
    });
    expect(
      isPermanentDeletePath(
        "/api/v1/tasks/550e8400-e29b-41d4-a716-446655440000",
        "DELETE",
      ),
    ).toBe(true);
    expect(isPermanentDeletePath("/api/v1/tasks/bulk/delete", "DELETE")).toBe(
      true,
    );
  });

  it("treats any entity-id DELETE as a permanent delete path", () => {
    // slug-shaped and encoded ids must not dodge the dashboard-only block
    expect(
      isPermanentDeletePath("/api/v1/notes/my-note-slug", "DELETE"),
    ).toBe(true);
    expect(
      isPermanentDeletePath(
        "/api/v1/tasks/550e8400%2De29b%2D41d4%2Da716%2D446655440000",
        "DELETE",
      ),
    ).toBe(true);
    // non-destructive methods and two-segment statics stay false
    expect(isPermanentDeletePath("/api/v1/notes/my-note-slug", "GET")).toBe(
      false,
    );
    expect(
      isPermanentDeletePath("/api/v1/notes/notebooks", "DELETE"),
    ).toBe(true); // no DELETE handler exists; fail-closed is intended
  });
});

describe("enforceApiKeyRoutePermission", () => {
  const base = {
    userId: "u1",
    type: "api_key" as const,
    keyId: "k1",
    clientType: "mcp",
    clientName: "Claude",
  };

  it("allows clerk sessions without throwing", () => {
    expect(() =>
      enforceApiKeyRoutePermission(
        { userId: "u1", type: "clerk" },
        req("/api/v1/tasks", "DELETE"),
      ),
    ).not.toThrow();
  });

  it("blocks permanent delete for API keys", () => {
    expect(() =>
      enforceApiKeyRoutePermission(
        { ...base, accessMode: "write_enabled" },
        req(
          "/api/v1/tasks/550e8400-e29b-41d4-a716-446655440000",
          "DELETE",
        ),
      ),
    ).toThrow(
      expect.objectContaining({ code: "PERMANENT_DELETE_DISABLED" }),
    );
  });

  it("blocks permanent delete via percent-encoded UUID for API keys", () => {
    // vuln-0002 regression: the encoded id must hit the same map entry
    // (notes/:id, isDestructive) as its decoded form.
    expect(() =>
      enforceApiKeyRoutePermission(
        { ...base, accessMode: "write_enabled" },
        req(
          "/api/v1/notes/a0a9222e%2D8cc3%2D4d54%2Da5a7%2De09000fd1892",
          "DELETE",
        ),
      ),
    ).toThrow(
      expect.objectContaining({ code: "PERMANENT_DELETE_DISABLED" }),
    );
  });

  it("enforces write scopes on percent-encoded UUID paths (vuln-0002 regression)", () => {
    // write_limited lacks goals:write; before the decode fix the %2D-encoded
    // id skipped the map entirely and the write went through.
    expect(() =>
      enforceApiKeyRoutePermission(
        { ...base, accessMode: "write_limited" },
        req(
          "/api/v1/goals/9c068746%2Dfccc%2D4d2a%2Dab31%2D28bbab236035",
          "PATCH",
        ),
      ),
    ).toThrow(expect.objectContaining({ code: "SCOPE_DENIED" }));
    // Control: the same denial on the plain-UUID form (write_limited parity).
    expect(() =>
      enforceApiKeyRoutePermission(
        { ...base, accessMode: "write_limited" },
        req(
          "/api/v1/goals/9c068746-fccc-4d2a-ab31-28bbab236035",
          "PATCH",
        ),
      ),
    ).toThrow(expect.objectContaining({ code: "SCOPE_DENIED" }));
    // write_enabled still passes scope on the same encoded path.
    expect(() =>
      enforceApiKeyRoutePermission(
        { ...base, accessMode: "write_enabled" },
        req(
          "/api/v1/goals/9c068746%2Dfccc%2D4d2a%2Dab31%2D28bbab236035",
          "PATCH",
        ),
      ),
    ).not.toThrow();
  });

  it("blocks archive for write_limited keys", () => {
    expect(() =>
      enforceApiKeyRoutePermission(
        { ...base, accessMode: "write_limited" },
        req(
          "/api/v1/tasks/550e8400-e29b-41d4-a716-446655440000/archive",
          "POST",
        ),
      ),
    ).toThrow(expect.objectContaining({ code: "SCOPE_DENIED" }));
  });

  it("blocks bulk for keys without bulk:write", () => {
    expect(() =>
      enforceApiKeyRoutePermission(
        { ...base, accessMode: "write_enabled" },
        req("/api/v1/tasks/bulk/complete", "POST"),
      ),
    ).toThrow(expect.objectContaining({ code: "SCOPE_DENIED" }));
  });

  it("read_only scopes exclude write scopes", () => {
    const scopes = scopesForAccessMode("read_only");
    expect(scopes).toContain("tasks:read");
    expect(scopes).not.toContain("tasks:write");
    expect(scopes).not.toContain("bulk:write");
  });
});

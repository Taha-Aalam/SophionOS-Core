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

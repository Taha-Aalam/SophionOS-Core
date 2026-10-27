import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";

// Regression tests for audit finding
// `src/app/api/v1/user.requireAuth-skips-api-key-write-policy`: mutating
// /api/v1/user/* handlers accepted any valid API key — including the
// default read_only preset — because requireAuth never consults the
// per-key write policy or the fail-closed scope map (user/* has no
// ROUTE_PERMISSIONS entry). Every mutating user route must sit behind
// requireClerkSession, like api-keys/ai-access/account-deletion already
// do. The scenario mirrors the audit's artifact: a read_only key with
// ai_write_access_enabled=false and the operator kill switch on must get
// a rejection from each migrated handler.

process.env.SOPHION_DISABLE_API_KEY_WRITES = "1";

const apiKeyPrincipal = {
  userId: "11111111-1111-4111-8111-111111111111",
  type: "api_key" as const,
  keyId: "key-1",
  accessMode: "read_only",
  clientType: "mcp",
  clientName: "probe",
};

// The api-key principal is produced by the REAL auth chain: a sop_ bearer
// validates against the mocked api-key service, requireAuth attaches the
// AI-access flags from the mocked settings, and requireClerkSession (the
// control under test) must reject the principal.
vi.mock("@/lib/api/api-key-service", () => ({
  validateApiKey: vi.fn(async (key: string) =>
    key.startsWith("sop_")
      ? {
          userId: apiKeyPrincipal.userId,
          keyId: "key-1",
          accessMode: "read_only",
          clientType: "mcp",
          clientName: "probe",
        }
      : null,
  ),
}));

vi.mock("@/lib/api/ai-access-service", () => ({
  getAiAccessSettings: vi.fn(async () => ({
    ai_access_enabled: true,
    ai_write_access_enabled: false,
  })),
}));

vi.mock("@/lib/api/rate-limiter", () => ({
  rateLimit: vi.fn(async () => ({ success: true })),
}));

// Permissive data client: every chain resolves successfully, so on the
// unfixed base the handlers complete with 2xx instead of erroring first.
function permissiveClient() {
  function builder(table: string) {
    const api: Record<string, unknown> = {};
    api.select = () => api;
    api.eq = () => api;
    api.order = () => api;
    api.insert = () => api;
    api.update = () => api;
    api.delete = () => api;
    api.single = () => Promise.resolve({ data: { id: "row-1" }, error: null });
    api.maybeSingle = () => Promise.resolve({ data: { id: "row-1" }, error: null });
    api.then = (
      resolve: (v: { data: unknown[]; error: null }) => unknown,
      reject?: (e: unknown) => unknown,
    ) => Promise.resolve({ data: [], error: null }).then(resolve, reject);
    return api;
  }
  return { from: (table: string) => builder(table) };
}

vi.mock("@/lib/supabase/server", () => ({
  createDataClient: vi.fn(async () => permissiveClient()),
}));

vi.mock("@/lib/services/user-settings.service", () => ({
  userSettingsService: {
    getSettings: vi.fn(async () => ({})),
    setNoteDefaults: vi.fn(async () => ({})),
    setPreferences: vi.fn(async () => ({})),
    setNotifications: vi.fn(async () => ({})),
    setOnboarding: vi.fn(async () => ({})),
  },
}));

import { PATCH as settingsPatch } from "@/app/api/v1/user/settings/route";
import { POST as integrationsPost } from "@/app/api/v1/user/integrations/route";
import { DELETE as integrationsDelete } from "@/app/api/v1/user/integrations/[id]/route";

function jsonRequest(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost:3000${url}`, {
    method,
    headers: {
      "content-type": "application/json",
      authorization: "Bearer sop_dummy_key_not_validated_in_this_test",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://127.0.0.1:54321";
});

describe("mutating /api/v1/user/* handlers reject API-key principals", () => {
  it("PATCH /user/settings requires a Clerk session", async () => {
    const res = await settingsPatch(
      jsonRequest("/api/v1/user/settings", "PATCH", { preferences: { theme: "dark" } }),
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error?: { code?: string } };
    expect(body?.error?.code).toBe("SESSION_REQUIRED");
  });

  it("POST /user/integrations requires a Clerk session", async () => {
    const res = await integrationsPost(
      jsonRequest("/api/v1/user/integrations", "POST", {
        type: "github",
        external_id: "12345",
      }),
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error?: { code?: string } };
    expect(body?.error?.code).toBe("SESSION_REQUIRED");
  });

  it("DELETE /user/integrations/[id] requires a Clerk session", async () => {
    const res = await integrationsDelete(
      jsonRequest("/api/v1/user/integrations/integ-1", "DELETE"),
      { params: Promise.resolve({ id: "integ-1" }) },
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error?: { code?: string } };
    expect(body?.error?.code).toBe("SESSION_REQUIRED");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Regression tests for audit finding
// `…privacy-summary/route.ts:requireAuth-lazy-purge-api-key-reachable`
// (finding 12, low): the lazy account-deletion purge is an irreversible,
// session-only authority — both sibling paths to the same state change
// (finalize, cancel) are Clerk-session-only — but GET /user/privacy-summary
// ran processDueAccountDeletion unconditionally for ANY authenticated
// principal, so a read_only third-party-held API key could complete the
// purge inside the grace window. Also covers the missing scheduled-deletion
// guards: key minting (POST /user/api-keys) and AI-access re-enable
// (PATCH /user/ai-access) must be rejected while a deletion is scheduled.

const clerkPrincipal = { userId: "user-1", type: "clerk" as const };
const apiKeyPrincipal = {
  userId: "user-1",
  type: "api_key" as const,
  keyId: "key-1",
  accessMode: "read_only",
};

let currentPrincipal: Record<string, unknown> = clerkPrincipal;

// F12 tests route behavior (purge gating + scheduled-deletion guards), not
// the session gate itself — requireAuth/requireClerkSession are stubbed to
// hand the routes a controlled principal.
vi.mock("@/lib/api/api-auth", () => ({
  requireAuth: vi.fn(async () => currentPrincipal),
  requireClerkSession: vi.fn(async () => clerkPrincipal),
  assertClerkSession: vi.fn(),
}));

vi.mock("@/lib/api/rate-limiter", () => ({
  rateLimit: vi.fn(async () => ({ success: true })),
}));

const { processDueAccountDeletion, deletionState } = vi.hoisted(() => ({
  processDueAccountDeletion: vi.fn(async () => ({ processed: true })),
  deletionState: { row: null as Record<string, unknown> | null },
}));

// The scheduled-deletion guard reads the REAL getAccountDeletionRequest;
// mocking the admin client lets the real helper run against a controlled
// account_deletion_requests row.
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => {
    function builder() {
      const api: Record<string, unknown> = {};
      api.select = () => api;
      api.eq = () => api;
      api.order = () => api;
      api.limit = () => api;
      api.maybeSingle = () =>
        Promise.resolve({ data: deletionState.row, error: null });
      api.single = () => Promise.resolve({ data: deletionState.row, error: null });
      return api;
    }
    return { from: () => builder() };
  }),
}));

vi.mock("@/lib/privacy/account-deletion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/privacy/account-deletion")>();
  return {
    ...actual,
    processDueAccountDeletion,
  };
});

vi.mock("@/lib/privacy/privacy-summary", () => ({
  buildPrivacySummary: vi.fn(async () => ({ data_classes: [] })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createDataClient: vi.fn(async () => ({})),
}));

vi.mock("@/lib/api/api-key-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/api-key-service")>();
  return {
    ...actual,
    generateApiKey: vi.fn(async () => ({
      key: "sop_newly_minted",
      record: { id: "key-new" },
    })),
  };
});

vi.mock("@/lib/api/subscription", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/subscription")>();
  return {
    ...actual,
    requirePaidTier: vi.fn(async () => undefined),
  };
});

vi.mock("@/lib/api/ai-access-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/ai-access-service")>();
  return {
    ...actual,
    setAiAccessSettings: vi.fn(async () => ({
      ai_access_enabled: true,
      ai_write_access_enabled: true,
    })),
    recordAuditEvent: vi.fn(async () => undefined),
  };
});

vi.mock("@/lib/audit/audit-service", () => ({
  recordAuditEvent: vi.fn(async () => undefined),
}));

import { GET as privacySummaryGet } from "@/app/api/v1/user/privacy-summary/route";
import { POST as apiKeysPost } from "@/app/api/v1/user/api-keys/route";
import { PATCH as aiAccessPatch } from "@/app/api/v1/user/ai-access/route";

function jsonRequest(url: string, method: string, body?: unknown) {
  return new NextRequest(`http://localhost:3000${url}`, {
    method,
    headers: {
      "content-type": "application/json",
      authorization: "Bearer sop_dummy",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  processDueAccountDeletion.mockClear();
  deletionState.row = null;
  currentPrincipal = clerkPrincipal;
});

describe("the lazy deletion purge is Clerk-session-only", () => {
  it("an API-key principal gets 200 with the purge uncalled", async () => {
    currentPrincipal = apiKeyPrincipal;
    const res = await privacySummaryGet(jsonRequest("/api/v1/user/privacy-summary", "GET"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data?: { deletion_just_processed?: boolean } };
    expect(processDueAccountDeletion).not.toHaveBeenCalled();
    expect(body?.data?.deletion_just_processed).toBe(false);
  });

  it("a Clerk session still triggers the lazy purge (positive control)", async () => {
    const res = await privacySummaryGet(jsonRequest("/api/v1/user/privacy-summary", "GET"));
    expect(res.status).toBe(200);
    expect(processDueAccountDeletion).toHaveBeenCalledTimes(1);
  });
});

describe("scheduled-deletion guards on privilege-granting writes", () => {
  it("POST /user/api-keys is rejected while a deletion is scheduled", async () => {
    deletionState.row = {
      status: "scheduled",
      scheduled_for: "2099-01-01T00:00:00.000Z",
      requested_at: "2026-01-01T00:00:00.000Z",
    };
    const res = await apiKeysPost(
      jsonRequest("/api/v1/user/api-keys", "POST", {
        name: "probe",
        access_mode: "read_only",
      }),
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error?: { code?: string } };
    expect(body?.error?.code).toBe("ACCOUNT_DELETION_SCHEDULED");
  });

  it("PATCH /user/ai-access is rejected while a deletion is scheduled", async () => {
    deletionState.row = {
      status: "scheduled",
      scheduled_for: "2099-01-01T00:00:00.000Z",
      requested_at: "2026-01-01T00:00:00.000Z",
    };
    const res = await aiAccessPatch(
      jsonRequest("/api/v1/user/ai-access", "PATCH", { ai_access_enabled: true }),
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error?: { code?: string } };
    expect(body?.error?.code).toBe("ACCOUNT_DELETION_SCHEDULED");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { AppError } from "@/lib/api/error-handler";

vi.mock("@/lib/api/api-auth", () => {
  const clerk = vi.fn();
  const auth = vi.fn();
  return {
    requireAuth: auth,
    requireClerkSession: clerk,
    assertClerkSession: vi.fn(),
  };
});

vi.mock("@/lib/api/rate-limiter", () => ({
  rateLimit: vi.fn(async () => ({ success: true, limit: 100, remaining: 99 })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createDataClient: vi.fn(async () => ({})),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            limit: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
          }),
        }),
      }),
    }),
  })),
}));

vi.mock("@/lib/privacy/privacy-summary", () => ({
  buildPrivacySummary: vi.fn(async () => ({
    counts: {
      areas: 1,
      goals: 0,
      projects: 0,
      tasks: 2,
      notes: 0,
      resources: 0,
      topics: 0,
      contacts: 0,
      connected_ai_clients: 1,
    },
    ai_access: {
      ai_access_enabled: true,
      ai_write_access_enabled: false,
      privacy_notice_version: null,
      privacy_notice_accepted_at: null,
    },
    retention_note: "test",
  })),
}));

vi.mock("@/lib/privacy/account-deletion", () => ({
  getAccountDeletionRequest: vi.fn(async () => null),
  requestAccountDeletion: vi.fn(async () => ({
    id: "d1",
    clerk_user_id: "user_123",
    status: "scheduled",
    scheduled_for: "2026-07-30T00:00:00Z",
    requested_at: "2026-07-16T00:00:00Z",
    cancelled_at: null,
    completed_at: null,
    failure_code: null,
  })),
  cancelAccountDeletion: vi.fn(async () => null),
  finalizeAccountDeletion: vi.fn(async () => ({ cleared: ["tasks"], failed: [] })),
  processDueAccountDeletion: vi.fn(async () => ({ processed: false })),
  isAccountDeletionDue: vi.fn(() => false),
  DELETION_GRACE_DAYS: 14,
}));

vi.mock("@/lib/export/personal-data-export", () => ({
  exportPersonalDataForUser: vi.fn(async () => ({
    schema_version: 2,
    exported_at: "2026-07-16T00:00:00Z",
    user_id: "user_123",
    entities: {
      areas: [],
      goals: [],
      projects: [],
      tasks: [],
      notes: [],
      resources: [],
      topics: [],
      contacts: [],
    },
    settings: [],
    ai_access: {},
    api_keys_metadata: [],
    meta: { counts: {}, files: [] },
  })),
  createAndCompleteSyncExportJob: vi.fn(async (_u, payload) => ({
    id: "job1",
    status: "completed",
    payload,
  })),
  assertExportHasNoSecrets: vi.fn(),
}));

vi.mock("@/lib/audit/audit-service", () => ({
  listAuditEventsForUser: vi.fn(async () => ({
    events: [
      {
        id: "e1",
        clerk_user_id: "user_123",
        actor_type: "api_key",
        api_key_id: "k1",
        event_type: "mcp_api_write",
        action: "api_key_mutation",
        entity_type: null,
        entity_id: null,
        target_count: null,
        request_id: "r1",
        client_name: "Claude",
        client_type: "mcp",
        ip_hash: "abc",
        user_agent_summary: "test",
        metadata: { route: "/api/v1/tasks" },
        occurred_at: "2026-07-16T00:00:00Z",
      },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
  })),
  recordAuditEvent: vi.fn(async () => {}),
}));

import { requireAuth, requireClerkSession } from "@/lib/api/api-auth";
import { GET as privacySummary } from "@/app/api/v1/user/privacy-summary/route";
import { POST as dataExport } from "@/app/api/v1/user/data-export/route";
import { GET as aiActivity } from "@/app/api/v1/user/ai-activity/route";
import { POST as requestDeletion } from "@/app/api/v1/user/account-deletion/route";
import { exportPersonalDataForUser } from "@/lib/export/personal-data-export";
import { requestAccountDeletion } from "@/lib/privacy/account-deletion";
import { listAuditEventsForUser } from "@/lib/audit/audit-service";

const mockRequireAuth = vi.mocked(requireAuth);
const mockRequireClerk = vi.mocked(requireClerkSession);

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ userId: "user_123", type: "clerk" });
  mockRequireClerk.mockResolvedValue({ userId: "user_123", type: "clerk" });
});

describe("privacy routes", () => {
  it("GET privacy-summary returns user-scoped counts", async () => {
    const res = await privacySummary(
      new NextRequest("http://localhost/api/v1/user/privacy-summary"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.counts.tasks).toBe(2);
    expect(json.data.counts.connected_ai_clients).toBe(1);
  });

  it("POST data-export requires clerk session and returns payload without calling generate for api_key path", async () => {
    mockRequireClerk.mockRejectedValue(
      new AppError("session required", 403, "SESSION_REQUIRED"),
    );
    const res = await dataExport(
      new NextRequest("http://localhost/api/v1/user/data-export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
    );
    expect(res.status).toBe(403);
    expect(exportPersonalDataForUser).not.toHaveBeenCalled();
  });

  it("POST data-export succeeds for clerk and returns data", async () => {
    mockRequireClerk.mockResolvedValue({ userId: "user_123", type: "clerk" });
    const res = await dataExport(
      new NextRequest("http://localhost/api/v1/user/data-export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      }),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.id).toBe("job1");
    expect(json.data.data.user_id).toBe("user_123");
  });

  it("GET ai-activity lists only via user-scoped service", async () => {
    const res = await aiActivity(
      new NextRequest("http://localhost/api/v1/user/ai-activity?page=1"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.events).toHaveLength(1);
    expect(listAuditEventsForUser).toHaveBeenCalledWith(
      "user_123",
      expect.objectContaining({ page: 1 }),
    );
  });

  it("POST account-deletion schedules with confirmation", async () => {
    const res = await requestDeletion(
      new NextRequest("http://localhost/api/v1/user/account-deletion", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE" }),
      }),
    );
    expect(res.status).toBe(201);
    expect(requestAccountDeletion).toHaveBeenCalledWith("user_123", "DELETE");
  });
});

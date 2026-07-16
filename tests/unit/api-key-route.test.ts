import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api/api-key-service", () => ({
  listApiKeys: vi.fn(),
  generateApiKey: vi.fn(),
  revokeApiKey: vi.fn(),
  toPublicApiKeyRecord: (r: Record<string, unknown>) => ({
    ...r,
    status: r.revoked_at ? "revoked" : "active",
  }),
}));

vi.mock("@/lib/api/ai-access-service", () => ({
  recordAuditEvent: vi.fn(async () => {}),
  getAiAccessSettings: vi.fn(async () => ({
    ai_access_enabled: true,
    ai_write_access_enabled: false,
    privacy_notice_version: null,
    privacy_notice_accepted_at: null,
  })),
}));

vi.mock("@/lib/api/api-auth", () => {
  const authFn = vi.fn();
  return {
    requireAuth: authFn,
    authorizeApiRequest: authFn,
    requireClerkSession: authFn,
    assertClerkSession: vi.fn(),
  };
});

vi.mock("@/lib/api/subscription", () => ({
  requirePaidTier: vi.fn(async () => {}),
  isPaidTier: vi.fn(async () => true),
  getTier: vi.fn(async () => "pro"),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({})),
}));

vi.mock("@/lib/api/rate-limiter", () => ({
  rateLimit: vi.fn(async () => ({ success: true, limit: 100, remaining: 99 })),
}));

vi.mock("@/lib/services/user-settings.service", () => ({
  userSettingsService: {
    getNoteDefaults: vi.fn(),
    setNoteDefaults: vi.fn(),
    getPreferences: vi.fn(),
    setPreferences: vi.fn(),
    getNotifications: vi.fn(),
    setNotifications: vi.fn(),
    getOnboardingState: vi.fn(),
    setOnboardingState: vi.fn(),
  },
}));

import { listApiKeys, generateApiKey, revokeApiKey } from "@/lib/api/api-key-service";
import { requireAuth } from "@/lib/api/api-auth";
import { GET as listKeys, POST as createKey } from "@/app/api/v1/user/api-keys/route";
import { DELETE as revokeKey } from "@/app/api/v1/user/api-keys/[id]/route";

const mockRequireAuth = vi.mocked(requireAuth);
const mockListApiKeys = vi.mocked(listApiKeys);
const mockGenerateApiKey = vi.mocked(generateApiKey);
const mockRevokeApiKey = vi.mocked(revokeApiKey);

function makeJsonRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/v1/user/api-keys", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ userId: "user_123", type: "clerk" });
});

describe("POST /api/v1/user/api-keys", () => {
  it("creates a key without expiry (201)", async () => {
    mockGenerateApiKey.mockResolvedValue({
      key: "sop_rawsecretkey",
      record: {
        id: "k1",
        user_id: "user_123",
        name: "CLI",
        key_prefix: "sop_raws…tkey",
        client_type: "unknown",
        client_name: null,
        access_mode: "read_only",
        scopes: [],
        last_used_at: null,
        last_used_user_agent: null,
        expires_at: null,
        created_at: "2026-07-01T00:00:00Z",
        revoked_at: null,
        revoke_reason: null,
      },
    } as never);

    const res = await createKey(makeJsonRequest({ name: "CLI" }));
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.data.key).toBe("sop_rawsecretkey");
    expect(json.data.record.expires_at).toBeNull();
  });

  it("creates a key with an explicit expires_at value (201)", async () => {
    mockGenerateApiKey.mockResolvedValue({
      key: "sop_expirykey",
      record: {
        id: "k2",
        user_id: "user_123",
        name: "Claude Desktop",
        key_prefix: "sop_expi…ykey",
        client_type: "unknown",
        client_name: null,
        access_mode: "read_only",
        scopes: [],
        last_used_at: null,
        last_used_user_agent: null,
        expires_at: "2026-10-01T00:00:00.000Z",
        created_at: "2026-07-01T00:00:00Z",
        revoked_at: null,
        revoke_reason: null,
      },
    } as never);

    const res = await createKey(
      makeJsonRequest({
        name: "Claude Desktop",
        expires_at: "2026-10-01T00:00:00.000Z",
      }),
    );
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.data.record.expires_at).toBe("2026-10-01T00:00:00.000Z");
  });

  it("creates a key with expires_at: null (no expiry) explicitly", async () => {
    mockGenerateApiKey.mockResolvedValue({
      key: "sop_nullkey",
      record: {
        id: "k3",
        user_id: "user_123",
        name: "Long-lived",
        key_prefix: "sop_null…lkey",
        client_type: "unknown",
        client_name: null,
        access_mode: "read_only",
        scopes: [],
        last_used_at: null,
        last_used_user_agent: null,
        expires_at: null,
        created_at: "2026-07-01T00:00:00Z",
        revoked_at: null,
        revoke_reason: null,
      },
    } as never);

    const res = await createKey(makeJsonRequest({ name: "Long-lived", expires_at: null }));
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.data.record.expires_at).toBeNull();
  });

  it("rejects an invalid expires_at format (400)", async () => {
    const res = await createKey(makeJsonRequest({ name: "Bad", expires_at: "not-a-date" }));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/v1/user/api-keys", () => {
  it("lists the user's API keys without key_hash (200)", async () => {
    mockListApiKeys.mockResolvedValue([
      {
        id: "k1",
        user_id: "user_123",
        name: "CLI",
        key_prefix: "sop_xxxx…yyyy",
        client_type: "unknown",
        client_name: null,
        access_mode: "read_only",
        scopes: [],
        last_used_at: null,
        last_used_user_agent: null,
        expires_at: null,
        created_at: "2026-06-30T00:00:00Z",
        revoked_at: null,
        revoke_reason: null,
      },
    ] as never);

    const res = await listKeys(new NextRequest("http://localhost/api/v1/user/api-keys"));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0]).not.toHaveProperty("key_hash");
  });
});

describe("DELETE /api/v1/user/api-keys/[id]", () => {
  it("revokes a key scoped to the user (200)", async () => {
    mockRevokeApiKey.mockResolvedValue(undefined as never);

    const res = await revokeKey(
      new NextRequest("http://localhost/api/v1/user/api-keys/k1", { method: "DELETE" }),
      { params: Promise.resolve({ id: "k1" }) },
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toMatchObject({ id: "k1", revoked: true });
    expect(mockRevokeApiKey).toHaveBeenCalledWith("user_123", "k1", "user_revoked");
  });
});

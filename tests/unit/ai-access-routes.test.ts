import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { NotFoundError } from "@/lib/api/error-handler";

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
}));

vi.mock("@/lib/api/rate-limiter", () => ({
  rateLimit: vi.fn(async () => ({ success: true, limit: 100, remaining: 99 })),
}));

vi.mock("@/lib/api/api-key-service", () => ({
  listApiKeys: vi.fn(),
  generateApiKey: vi.fn(),
  revokeApiKey: vi.fn(),
  updateApiKey: vi.fn(),
  toPublicApiKeyRecord: (r: Record<string, unknown>) => ({
    ...r,
    status: r.revoked_at ? "revoked" : "active",
  }),
  revokeAllApiKeysForUser: vi.fn(),
}));

vi.mock("@/lib/api/ai-access-service", () => ({
  getAiAccessSettings: vi.fn(),
  setAiAccessSettings: vi.fn(),
  disableAllAiAccess: vi.fn(),
  recordAuditEvent: vi.fn(async () => {}),
}));

import { requireAuth } from "@/lib/api/api-auth";
import {
  listApiKeys,
  generateApiKey,
  revokeApiKey,
  updateApiKey,
} from "@/lib/api/api-key-service";
import {
  getAiAccessSettings,
  setAiAccessSettings,
  disableAllAiAccess,
} from "@/lib/api/ai-access-service";
import { GET as getAiAccess, PATCH as patchAiAccess } from "@/app/api/v1/user/ai-access/route";
import { POST as disableAll } from "@/app/api/v1/user/ai-access/disable-all/route";
import { GET as listKeys, POST as createKey } from "@/app/api/v1/user/api-keys/route";
import {
  DELETE as revokeKey,
  PATCH as patchKey,
} from "@/app/api/v1/user/api-keys/[id]/route";

const mockRequireAuth = vi.mocked(requireAuth);
const mockList = vi.mocked(listApiKeys);
const mockGenerate = vi.mocked(generateApiKey);
const mockRevoke = vi.mocked(revokeApiKey);
const mockUpdate = vi.mocked(updateApiKey);
const mockGetSettings = vi.mocked(getAiAccessSettings);
const mockSetSettings = vi.mocked(setAiAccessSettings);
const mockDisableAll = vi.mocked(disableAllAiAccess);

function jsonRequest(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const sampleKey = {
  id: "k1",
  user_id: "user_123",
  name: "Claude Desktop — MacBook",
  key_prefix: "sop_ABCD…wxyz",
  client_type: "mcp",
  client_name: "Claude Desktop",
  access_mode: "read_only",
  scopes: [] as string[],
  last_used_at: null,
  last_used_user_agent: null,
  expires_at: null,
  created_at: "2026-07-01T00:00:00Z",
  revoked_at: null,
  revoke_reason: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ userId: "user_123", type: "clerk" });
  mockGetSettings.mockResolvedValue({
    ai_access_enabled: true,
    ai_write_access_enabled: false,
    privacy_notice_version: null,
    privacy_notice_accepted_at: null,
  });
});

describe("GET /api/v1/user/ai-access", () => {
  it("returns settings and keys without raw secrets or hashes", async () => {
    mockList.mockResolvedValue([sampleKey] as never);

    const res = await getAiAccess(
      new NextRequest("http://localhost/api/v1/user/ai-access"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.ai_access_enabled).toBe(true);
    expect(json.data.keys).toHaveLength(1);
    expect(json.data.keys[0].access_mode).toBe("read_only");
    expect(json.data.keys[0]).not.toHaveProperty("key_hash");
    expect(JSON.stringify(json)).not.toContain("key_hash");
    expect(JSON.stringify(json)).not.toMatch(/sop_[A-Za-z0-9]{20,}/);
  });
});

describe("PATCH /api/v1/user/ai-access", () => {
  it("updates write flag", async () => {
    mockSetSettings.mockResolvedValue({
      ai_access_enabled: true,
      ai_write_access_enabled: true,
      privacy_notice_version: null,
      privacy_notice_accepted_at: null,
    });

    const res = await patchAiAccess(
      jsonRequest("http://localhost/api/v1/user/ai-access", "PATCH", {
        ai_write_access_enabled: true,
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.ai_write_access_enabled).toBe(true);
  });
});

describe("POST /api/v1/user/ai-access/disable-all", () => {
  it("disables access and reports revoked count", async () => {
    mockDisableAll.mockResolvedValue({
      settings: {
        ai_access_enabled: false,
        ai_write_access_enabled: false,
        privacy_notice_version: null,
        privacy_notice_accepted_at: null,
      },
      revokedCount: 2,
    });

    const res = await disableAll(
      new NextRequest("http://localhost/api/v1/user/ai-access/disable-all", {
        method: "POST",
      }),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.ai_access_enabled).toBe(false);
    expect(json.data.revoked_count).toBe(2);
    expect(mockDisableAll).toHaveBeenCalledWith("user_123");
  });
});

describe("POST /api/v1/user/api-keys (MCP default read_only)", () => {
  it("creates MCP key as read_only and returns raw key once only in create response", async () => {
    mockGenerate.mockResolvedValue({
      key: "sop_onceOnlySecretValueForCreateResponse",
      record: { ...sampleKey, access_mode: "read_only", client_type: "mcp" },
    } as never);

    const res = await createKey(
      jsonRequest("http://localhost/api/v1/user/api-keys", "POST", {
        name: "Claude Desktop — MacBook",
        client_type: "mcp",
      }),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.data.key).toMatch(/^sop_/);
    expect(json.data.record.access_mode).toBe("read_only");
    expect(json.data.record).not.toHaveProperty("key_hash");
    expect(mockGenerate).toHaveBeenCalledWith(
      "user_123",
      expect.objectContaining({
        name: "Claude Desktop — MacBook",
        clientType: "mcp",
      }),
    );
  });
});

describe("GET list never includes raw key", () => {
  it("list payload has no raw key field", async () => {
    mockList.mockResolvedValue([sampleKey] as never);
    const res = await listKeys(
      new NextRequest("http://localhost/api/v1/user/api-keys"),
    );
    const json = await res.json();
    expect(json.data[0]).not.toHaveProperty("key");
    expect(json.data[0]).not.toHaveProperty("key_hash");
  });
});

describe("cross-user isolation on revoke", () => {
  it("propagates NotFoundError when key is not owned by caller", async () => {
    mockRevoke.mockRejectedValue(new NotFoundError("ApiKey", "k-other"));
    const res = await revokeKey(
      new NextRequest("http://localhost/api/v1/user/api-keys/k-other", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "k-other" }) },
    );
    expect(res.status).toBe(404);
    expect(mockRevoke).toHaveBeenCalledWith("user_123", "k-other", "user_revoked");
  });
});

describe("PATCH /api/v1/user/api-keys/:id", () => {
  it("updates access mode for owned key", async () => {
    mockUpdate.mockResolvedValue({
      ...sampleKey,
      access_mode: "write_limited",
    } as never);

    const res = await patchKey(
      jsonRequest("http://localhost/api/v1/user/api-keys/k1", "PATCH", {
        access_mode: "write_limited",
      }),
      { params: Promise.resolve({ id: "k1" }) },
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.access_mode).toBe("write_limited");
  });
});

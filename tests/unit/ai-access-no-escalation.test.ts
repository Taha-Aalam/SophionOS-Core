/**
 * Privilege-escalation tests: real requireClerkSession / assertClerkSession
 * must reject API-key callers on credential and AI-access mutations.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockValidateApiKey = vi.fn();
vi.mock("@/lib/api/api-key-service", () => ({
  validateApiKey: (key: string) => mockValidateApiKey(key),
  listApiKeys: vi.fn(async () => []),
  generateApiKey: vi.fn(),
  revokeApiKey: vi.fn(),
  updateApiKey: vi.fn(),
  toPublicApiKeyRecord: (r: unknown) => r,
  revokeAllApiKeysForUser: vi.fn(),
}));

const mockGetAiAccessSettings = vi.fn();
vi.mock("@/lib/api/ai-access-service", () => ({
  getAiAccessSettings: (userId: string) => mockGetAiAccessSettings(userId),
  setAiAccessSettings: vi.fn(),
  disableAllAiAccess: vi.fn(),
  recordAuditEvent: vi.fn(async () => {}),
}));

vi.mock("@/lib/api/subscription", () => ({
  requirePaidTier: vi.fn(async () => {}),
}));

vi.mock("@/lib/api/rate-limiter", () => ({
  rateLimit: vi.fn(async () => ({ success: true, limit: 100, remaining: 99 })),
}));

import { assertClerkSession, requireClerkSession } from "@/lib/api/api-auth";
import { DEFAULT_AI_ACCESS_SETTINGS } from "@/lib/api/ai-access-policy";
import { POST as createKey } from "@/app/api/v1/user/api-keys/route";
import {
  PATCH as patchKey,
  DELETE as revokeKey,
} from "@/app/api/v1/user/api-keys/[id]/route";
import { PATCH as patchAiAccess } from "@/app/api/v1/user/ai-access/route";
import { POST as disableAll } from "@/app/api/v1/user/ai-access/disable-all/route";
import {
  generateApiKey,
  updateApiKey,
  revokeApiKey,
} from "@/lib/api/api-key-service";
import {
  setAiAccessSettings,
  disableAllAiAccess,
} from "@/lib/api/ai-access-service";

const mockGenerate = vi.mocked(generateApiKey);
const mockUpdate = vi.mocked(updateApiKey);
const mockRevoke = vi.mocked(revokeApiKey);
const mockSetSettings = vi.mocked(setAiAccessSettings);
const mockDisableAll = vi.mocked(disableAllAiAccess);

function apiKeyRequest(
  url: string,
  method: string,
  body?: unknown,
): NextRequest {
  return new NextRequest(url, {
    method,
    headers: {
      authorization: "Bearer sop_read_only_attacker_key",
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

describe("API key cannot escalate privileges (real requireClerkSession path)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ userId: null });
    mockValidateApiKey.mockResolvedValue({
      userId: "user_victim",
      keyId: "k_readonly",
      accessMode: "read_only",
      clientType: "mcp",
      clientName: "Attacker Client",
    });
    mockGetAiAccessSettings.mockResolvedValue({
      ...DEFAULT_AI_ACCESS_SETTINGS,
      ai_access_enabled: true,
      // Writes off — even if someone bypassed SESSION_REQUIRED, write path should fail;
      // the critical control under test is SESSION_REQUIRED on management routes.
      ai_write_access_enabled: false,
    });
  });

  it("assertClerkSession rejects api_key auth results", () => {
    expect(() =>
      assertClerkSession({
        userId: "user_victim",
        type: "api_key",
        keyId: "k1",
        accessMode: "read_only",
      }),
    ).toThrow(
      expect.objectContaining({
        statusCode: 403,
        code: "SESSION_REQUIRED",
      }),
    );
  });

  it("requireClerkSession rejects API-key bearers", async () => {
    await expect(
      requireClerkSession(
        apiKeyRequest("http://localhost/api/v1/user/api-keys", "POST", {
          name: "x",
        }),
      ),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "SESSION_REQUIRED",
    });
  });

  it("POST /user/api-keys returns 403 for read_only API key (cannot mint write_enabled)", async () => {
    const res = await createKey(
      apiKeyRequest("http://localhost/api/v1/user/api-keys", "POST", {
        name: "Escalated",
        client_type: "mcp",
        access_mode: "write_enabled",
      }),
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("SESSION_REQUIRED");
    expect(mockGenerate).not.toHaveBeenCalled();
  });

  it("PATCH /user/api-keys/:id returns 403 for API key (cannot self-upgrade access_mode)", async () => {
    const res = await patchKey(
      apiKeyRequest("http://localhost/api/v1/user/api-keys/k_readonly", "PATCH", {
        access_mode: "write_enabled",
      }),
      { params: Promise.resolve({ id: "k_readonly" }) },
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("SESSION_REQUIRED");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("DELETE /user/api-keys/:id returns 403 for API key", async () => {
    const res = await revokeKey(
      apiKeyRequest("http://localhost/api/v1/user/api-keys/k_other", "DELETE"),
      { params: Promise.resolve({ id: "k_other" }) },
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("SESSION_REQUIRED");
    expect(mockRevoke).not.toHaveBeenCalled();
  });

  it("PATCH /user/ai-access returns 403 for API key (cannot enable ai_write_access)", async () => {
    const res = await patchAiAccess(
      apiKeyRequest("http://localhost/api/v1/user/ai-access", "PATCH", {
        ai_write_access_enabled: true,
        ai_access_enabled: true,
      }),
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("SESSION_REQUIRED");
    expect(mockSetSettings).not.toHaveBeenCalled();
  });

  it("POST /user/ai-access/disable-all returns 403 for API key", async () => {
    const res = await disableAll(
      apiKeyRequest(
        "http://localhost/api/v1/user/ai-access/disable-all",
        "POST",
      ),
    );
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error.code).toBe("SESSION_REQUIRED");
    expect(mockDisableAll).not.toHaveBeenCalled();
  });
});

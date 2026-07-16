import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { AppError } from "@/lib/api/error-handler";

const mockAuth = vi.fn();
vi.mock("@clerk/nextjs/server", () => ({
  auth: () => mockAuth(),
}));

const mockValidateApiKey = vi.fn();
vi.mock("@/lib/api/api-key-service", () => ({
  validateApiKey: (key: string) => mockValidateApiKey(key),
}));

const mockGetAiAccessSettings = vi.fn();
vi.mock("@/lib/api/ai-access-service", () => ({
  getAiAccessSettings: (userId: string) => mockGetAiAccessSettings(userId),
}));

vi.mock("@/lib/api/subscription", () => ({
  requirePaidTier: vi.fn(async () => {}),
}));

vi.mock("@/lib/audit/audit-service", () => ({
  createRequestId: () => "req_test",
  recordApiMutationAudit: vi.fn(async () => {}),
  recordAuditEvent: vi.fn(async () => {}),
}));

import {
  authenticateRequest,
  requireAuth,
  requireClerkSession,
  authorizeApiRequest,
  assertClerkSession,
} from "@/lib/api/api-auth";
import { DEFAULT_AI_ACCESS_SETTINGS } from "@/lib/api/ai-access-policy";

function req(method = "GET", headers: Record<string, string> = {}): NextRequest {
  return new NextRequest("http://localhost/api/v1/areas", { method, headers });
}

describe("API-key AI access enforcement (shipped api-auth)", () => {
  beforeEach(() => {
    mockAuth.mockReset();
    mockValidateApiKey.mockReset();
    mockGetAiAccessSettings.mockReset();
    mockGetAiAccessSettings.mockResolvedValue({
      ...DEFAULT_AI_ACCESS_SETTINGS,
      ai_access_enabled: true,
      ai_write_access_enabled: true,
    });
  });

  it("authenticateRequest returns access mode from validateApiKey", async () => {
    mockValidateApiKey.mockResolvedValue({
      userId: "user_key",
      keyId: "k1",
      accessMode: "read_only",
      clientType: "mcp",
      clientName: "Claude",
    });
    const result = await authenticateRequest(
      req("GET", { authorization: "Bearer sop_abc" }),
    );
    expect(result).toMatchObject({
      userId: "user_key",
      type: "api_key",
      keyId: "k1",
      accessMode: "read_only",
    });
  });

  it("requireAuth rejects API keys when AI access is disabled (403)", async () => {
    mockValidateApiKey.mockResolvedValue({
      userId: "user_key",
      keyId: "k1",
      accessMode: "write_enabled",
      clientType: "mcp",
      clientName: null,
    });
    mockGetAiAccessSettings.mockResolvedValue({
      ...DEFAULT_AI_ACCESS_SETTINGS,
      ai_access_enabled: false,
    });

    await expect(
      requireAuth(req("GET", { authorization: "Bearer sop_x" })),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "AI_ACCESS_DISABLED",
    });
  });

  it("requireAuth still allows Clerk session when AI access is disabled", async () => {
    mockValidateApiKey.mockResolvedValue(null);
    mockAuth.mockResolvedValue({ userId: "user_clerk" });
    mockGetAiAccessSettings.mockResolvedValue({
      ...DEFAULT_AI_ACCESS_SETTINGS,
      ai_access_enabled: false,
    });

    const result = await requireAuth(req("GET"));
    expect(result).toEqual({ userId: "user_clerk", type: "clerk" });
    // Settings lookup not required for clerk on requireAuth path after type check
  });

  it("authorizeApiRequest denies POST for read_only API keys", async () => {
    mockValidateApiKey.mockResolvedValue({
      userId: "user_key",
      keyId: "k1",
      accessMode: "read_only",
      clientType: "mcp",
      clientName: null,
    });
    mockGetAiAccessSettings.mockResolvedValue({
      ...DEFAULT_AI_ACCESS_SETTINGS,
      ai_access_enabled: true,
      ai_write_access_enabled: true,
    });

    await expect(
      authorizeApiRequest(req("POST", { authorization: "Bearer sop_x" })),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "KEY_ACCESS_MODE_DENIED",
    });
  });

  it("authorizeApiRequest denies writes when ai_write_access_enabled is false", async () => {
    mockValidateApiKey.mockResolvedValue({
      userId: "user_key",
      keyId: "k1",
      accessMode: "write_enabled",
      clientType: "personal",
      clientName: null,
    });
    mockGetAiAccessSettings.mockResolvedValue({
      ...DEFAULT_AI_ACCESS_SETTINGS,
      ai_access_enabled: true,
      ai_write_access_enabled: false,
    });

    await expect(
      authorizeApiRequest(req("POST", { authorization: "Bearer sop_x" })),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "AI_WRITE_DISABLED",
    });
  });

  it("authorizeApiRequest allows GET for read_only keys", async () => {
    mockValidateApiKey.mockResolvedValue({
      userId: "user_key",
      keyId: "k1",
      accessMode: "read_only",
      clientType: "mcp",
      clientName: null,
    });

    const result = await authorizeApiRequest(
      req("GET", { authorization: "Bearer sop_x" }),
    );
    expect(result.type).toBe("api_key");
    expect(result.userId).toBe("user_key");
  });

  it("authorizeApiRequest does not apply key write mode to Clerk sessions", async () => {
    mockValidateApiKey.mockResolvedValue(null);
    mockAuth.mockResolvedValue({ userId: "user_clerk" });

    const result = await authorizeApiRequest(req("POST"));
    expect(result).toMatchObject({ userId: "user_clerk", type: "clerk" });
  });

  it("requireClerkSession rejects API-key callers with SESSION_REQUIRED", async () => {
    mockValidateApiKey.mockResolvedValue({
      userId: "user_key",
      keyId: "k1",
      accessMode: "write_enabled",
      clientType: "mcp",
      clientName: null,
    });
    await expect(
      requireClerkSession(req("POST", { authorization: "Bearer sop_x" })),
    ).rejects.toMatchObject({
      statusCode: 403,
      code: "SESSION_REQUIRED",
    });
  });

  it("requireClerkSession allows Clerk sessions", async () => {
    mockValidateApiKey.mockResolvedValue(null);
    mockAuth.mockResolvedValue({ userId: "user_clerk" });
    const result = await requireClerkSession(req("POST"));
    expect(result).toEqual({ userId: "user_clerk", type: "clerk" });
  });

  it("assertClerkSession allows clerk and rejects api_key", () => {
    expect(() =>
      assertClerkSession({ userId: "u", type: "clerk" }),
    ).not.toThrow();
    expect(() =>
      assertClerkSession({ userId: "u", type: "api_key", accessMode: "read_only" }),
    ).toThrow(expect.objectContaining({ code: "SESSION_REQUIRED" }));
  });
});

describe("AppError codes for trust controls", () => {
  it("exposes public messages for AI_ACCESS_DISABLED", () => {
    const err = new AppError("disabled", 403, "AI_ACCESS_DISABLED");
    expect(err.publicMessage).toBe("disabled");
    expect(err.code).toBe("AI_ACCESS_DISABLED");
  });
});

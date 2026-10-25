import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/api/api-auth", () => ({
  requireClerkSession: vi.fn(),
}));

vi.mock("@/lib/api/rate-limiter", () => ({
  rateLimit: vi.fn(async () => ({ success: true, limit: 100, remaining: 99 })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({})),
}));

vi.mock("@/lib/services/provider-credentials.service", () => ({
  providerCredentialsService: {
    list: vi.fn(),
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock("@/lib/api/ai-access-service", () => ({
  recordAuditEvent: vi.fn(async () => {}),
}));

import { AppError, AuthError } from "@/lib/api/error-handler";
import { requireClerkSession } from "@/lib/api/api-auth";
import { recordAuditEvent } from "@/lib/api/ai-access-service";
import { providerCredentialsService } from "@/lib/services/provider-credentials.service";
import { DELETE, GET, PUT } from "@/app/api/v1/user/ai-providers/route";

const mockSession = vi.mocked(requireClerkSession);
const mockList = vi.mocked(providerCredentialsService.list);
const mockUpsert = vi.mocked(providerCredentialsService.upsert);
const mockRemove = vi.mocked(providerCredentialsService.remove);
const mockAudit = vi.mocked(recordAuditEvent);

function jsonRequest(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

const meta = {
  provider: "openrouter",
  authMethod: "api_key",
  hint: "-key",
  label: null,
  baseUrl: null,
  model: "deepseek/deepseek-chat-v3-0324:free",
  status: "active",
  lastValidatedAt: "2026-10-25T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSession.mockResolvedValue({ userId: "user_1", type: "clerk" });
});

describe("GET /api/v1/user/ai-providers", () => {
  it("returns 401 without a Clerk session", async () => {
    mockSession.mockRejectedValue(new AuthError("Authentication required"));
    const res = await GET(jsonRequest("http://localhost/api/v1/user/ai-providers", "GET"));
    expect(res.status).toBe(401);
  });

  it("returns 401 for API-key auth (management is Clerk-session-only)", async () => {
    // requireClerkSession throws for api_key-authenticated callers.
    mockSession.mockRejectedValue(new AuthError("Clerk session required"));
    const res = await GET(jsonRequest("http://localhost/api/v1/user/ai-providers", "GET"));
    expect(res.status).toBe(401);
  });

  it("returns credential metadata for the session user", async () => {
    mockList.mockResolvedValue([meta]);
    const res = await GET(jsonRequest("http://localhost/api/v1/user/ai-providers", "GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data[0].provider).toBe("openrouter");
    expect(body.data[0]).not.toHaveProperty("encryptedSecret");
    expect(mockList).toHaveBeenCalledWith("user_1", expect.anything());
  });

  it("returns 429 when rate limited", async () => {
    const { rateLimit } = await import("@/lib/api/rate-limiter");
    vi.mocked(rateLimit).mockResolvedValueOnce({
      success: false,
      limit: 100,
      remaining: 0,
    });
    const res = await GET(jsonRequest("http://localhost/api/v1/user/ai-providers", "GET"));
    expect(res.status).toBe(429);
  });
});

describe("PUT /api/v1/user/ai-providers", () => {
  const validBody = {
    provider: "openrouter",
    apiKey: "sk-or-new-key",
    model: "deepseek/deepseek-chat-v3-0324:free",
  };

  it("upserts and audits, returning metadata", async () => {
    mockUpsert.mockResolvedValue(meta);
    const res = await PUT(
      jsonRequest("http://localhost/api/v1/user/ai-providers", "PUT", validBody),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.provider).toBe("openrouter");
    expect(mockUpsert).toHaveBeenCalledWith("user_1", validBody, expect.anything());
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        clerkUserId: "user_1",
        eventType: "provider_key_added",
      }),
    );
  });

  it("rejects an unknown provider with 400", async () => {
    const res = await PUT(
      jsonRequest("http://localhost/api/v1/user/ai-providers", "PUT", {
        ...validBody,
        provider: "made-up",
      }),
    );
    expect(res.status).toBe(400);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("rejects a custom provider without a base URL", async () => {
    const res = await PUT(
      jsonRequest("http://localhost/api/v1/user/ai-providers", "PUT", {
        provider: "custom",
        apiKey: "k",
      }),
    );
    expect(res.status).toBe(400);
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it("maps the service's invalid-key rejection to a 400", async () => {
    mockUpsert.mockRejectedValue(
      new AppError("The provider rejected this API key", 400, "INVALID_PROVIDER_KEY"),
    );
    const res = await PUT(
      jsonRequest("http://localhost/api/v1/user/ai-providers", "PUT", validBody),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toContain("rejected");
  });
});

describe("DELETE /api/v1/user/ai-providers", () => {
  it("requires a provider query parameter", async () => {
    const res = await DELETE(
      jsonRequest("http://localhost/api/v1/user/ai-providers", "DELETE"),
    );
    expect(res.status).toBe(400);
    expect(mockRemove).not.toHaveBeenCalled();
  });

  it("rejects an unknown provider value", async () => {
    const res = await DELETE(
      jsonRequest("http://localhost/api/v1/user/ai-providers?provider=nope", "DELETE"),
    );
    expect(res.status).toBe(400);
  });

  it("removes the credential and audits it", async () => {
    mockRemove.mockResolvedValue(undefined);
    const res = await DELETE(
      jsonRequest("http://localhost/api/v1/user/ai-providers?provider=openrouter", "DELETE"),
    );
    expect(res.status).toBe(200);
    expect(mockRemove).toHaveBeenCalledWith(
      "user_1",
      "openrouter",
      expect.anything(),
    );
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        clerkUserId: "user_1",
        eventType: "provider_key_removed",
      }),
    );
  });
});

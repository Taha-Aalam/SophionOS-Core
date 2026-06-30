import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { AuthError } from "@/lib/api/error-handler";

// --- Mocks -----------------------------------------------------------------
vi.mock("@/lib/services/user-settings.service", () => ({
  userSettingsService: {
    getNoteDefaults: vi.fn(),
    setNoteDefaults: vi.fn(),
  },
}));

vi.mock("@/lib/api/api-key-service", () => ({
  listApiKeys: vi.fn(),
  generateApiKey: vi.fn(),
  revokeApiKey: vi.fn(),
}));

vi.mock("@/lib/api/api-auth", () => ({
  requireAuth: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({})),
}));

vi.mock("@/lib/api/rate-limiter", () => ({
  rateLimit: vi.fn(async () => ({ success: true, limit: 100, remaining: 99 })),
}));

import { userSettingsService } from "@/lib/services/user-settings.service";
import { listApiKeys, generateApiKey, revokeApiKey } from "@/lib/api/api-key-service";
import { requireAuth } from "@/lib/api/api-auth";
import { GET as getSettings, PATCH as patchSettings } from "../user/settings/route";
import { GET as listKeys, POST as createKey } from "../user/api-keys/route";
import { DELETE as revokeKey } from "../user/api-keys/[id]/route";

const mockRequireAuth = vi.mocked(requireAuth);
const mockGetNoteDefaults = vi.mocked(userSettingsService.getNoteDefaults);
const mockSetNoteDefaults = vi.mocked(userSettingsService.setNoteDefaults);
const mockListApiKeys = vi.mocked(listApiKeys);
const mockGenerateApiKey = vi.mocked(generateApiKey);
const mockRevokeApiKey = vi.mocked(revokeApiKey);

function jsonRequest(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAuth.mockResolvedValue({ userId: "user_123", type: "clerk" });
});

describe("GET /api/v1/user/settings", () => {
  it("returns the user's note defaults (200)", async () => {
    mockGetNoteDefaults.mockResolvedValue({ default_status: "inbox" } as never);

    const res = await getSettings(new NextRequest("http://localhost/api/v1/user/settings"));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.note_defaults).toMatchObject({ default_status: "inbox" });
  });

  it("returns 401 when requireAuth throws AuthError", async () => {
    mockRequireAuth.mockRejectedValue(new AuthError("Authentication required"));

    const res = await getSettings(new NextRequest("http://localhost/api/v1/user/settings"));
    expect(res.status).toBe(401);

    const json = await res.json();
    expect(json.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("PATCH /api/v1/user/settings", () => {
  it("updates note defaults and returns them (200)", async () => {
    mockSetNoteDefaults.mockResolvedValue(undefined as never);
    mockGetNoteDefaults.mockResolvedValue({ default_status: "active" } as never);

    const res = await patchSettings(
      jsonRequest("http://localhost/api/v1/user/settings", "PATCH", {
        note_defaults: { default_status: "active" },
      }),
    );
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data.note_defaults).toMatchObject({ default_status: "active" });
    expect(mockSetNoteDefaults).toHaveBeenCalledWith(
      "user_123",
      { default_status: "active" },
      expect.anything(),
    );
  });
});

describe("GET /api/v1/user/api-keys", () => {
  it("lists the user's API keys without key_hash (200)", async () => {
    mockListApiKeys.mockResolvedValue([
      { id: "k1", user_id: "user_123", name: "CLI", last_used_at: null, expires_at: null, created_at: "2026-06-30T00:00:00Z", revoked_at: null },
    ] as never);

    const res = await listKeys(new NextRequest("http://localhost/api/v1/user/api-keys"));
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toHaveLength(1);
    expect(json.data[0]).not.toHaveProperty("key_hash");
  });
});

describe("POST /api/v1/user/api-keys", () => {
  it("creates a key and returns the raw key once, never the hash (201)", async () => {
    mockGenerateApiKey.mockResolvedValue({
      key: "lif_rawsecretkey",
      record: {
        id: "k2",
        user_id: "user_123",
        name: "Automation",
        last_used_at: null,
        expires_at: null,
        created_at: "2026-06-30T00:00:00Z",
        revoked_at: null,
      },
    } as never);

    const res = await createKey(
      jsonRequest("http://localhost/api/v1/user/api-keys", "POST", { name: "Automation" }),
    );
    expect(res.status).toBe(201);

    const json = await res.json();
    expect(json.data.key).toBe("lif_rawsecretkey");
    expect(json.data.record).not.toHaveProperty("key_hash");
    expect(JSON.stringify(json)).not.toContain("key_hash");
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
    expect(mockRevokeApiKey).toHaveBeenCalledWith("user_123", "k1");
  });
});

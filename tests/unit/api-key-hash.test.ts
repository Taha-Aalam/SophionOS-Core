import { createHash } from "crypto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { hashApiKey, validateApiKey } from "@/lib/api/api-key-service";

describe("hashApiKey", () => {
  it("returns stable sha256 hex for the raw key", () => {
    const raw = "sop_testkeyvalue";
    const expected = createHash("sha256").update(raw).digest("hex");
    expect(hashApiKey(raw)).toBe(expected);
    expect(hashApiKey(raw)).toBe(hashApiKey(raw));
    expect(hashApiKey(raw)).not.toBe(raw);
  });
});

const mockFrom = vi.fn();
const mockAdmin = { from: mockFrom };

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockAdmin,
}));

describe("validateApiKey", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function chainResult(result: { data: unknown; error: unknown }) {
    const maybeSingle = vi.fn(async () => result);
    const eq = vi.fn(() => ({ maybeSingle }));
    const select = vi.fn(() => ({ eq }));
    const update = vi.fn(() => ({
      eq: vi.fn(async () => ({ error: null })),
    }));
    mockFrom.mockImplementation((table: string) => {
      if (table === "api_keys") {
        return { select, update };
      }
      return {};
    });
    return { select, eq, maybeSingle, update };
  }

  it("rejects non-sop prefix without hitting the database", async () => {
    const result = await validateApiKey("not_a_valid_prefix");
    expect(result).toBeNull();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("rejects revoked keys", async () => {
    chainResult({
      data: {
        id: "k1",
        user_id: "user_1",
        expires_at: null,
        revoked_at: "2026-01-01T00:00:00Z",
      },
      error: null,
    });
    await expect(validateApiKey("sop_abc123validformatkey")).resolves.toBeNull();
  });

  it("rejects expired keys", async () => {
    chainResult({
      data: {
        id: "k1",
        user_id: "user_1",
        expires_at: "2020-01-01T00:00:00Z",
        revoked_at: null,
      },
      error: null,
    });
    await expect(validateApiKey("sop_abc123validformatkey")).resolves.toBeNull();
  });

  it("accepts valid keys and looks up by hash", async () => {
    const raw = "sop_abc123validformatkey";
    const { eq } = chainResult({
      data: {
        id: "k1",
        user_id: "user_1",
        expires_at: null,
        revoked_at: null,
      },
      error: null,
    });

    const result = await validateApiKey(raw);
    expect(result).toEqual({ userId: "user_1", keyId: "k1" });
    expect(eq).toHaveBeenCalledWith("key_hash", hashApiKey(raw));
  });
});

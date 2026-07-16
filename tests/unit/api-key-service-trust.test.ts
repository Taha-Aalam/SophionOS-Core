import { createHash } from "crypto";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  hashApiKey,
  validateApiKey,
  generateApiKey,
  listApiKeys,
  revokeApiKey,
  revokeAllApiKeysForUser,
  toPublicApiKeyRecord,
  MAX_ACTIVE_API_KEYS,
} from "@/lib/api/api-key-service";

const mockFrom = vi.fn();
const mockAdmin = { from: mockFrom };

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockAdmin,
}));

describe("api-key-service trust controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setupSelectChain(result: { data: unknown; error: unknown }) {
    const maybeSingle = vi.fn(async () => result);
    const eq = vi.fn(() => ({ maybeSingle, is: vi.fn(() => ({ maybeSingle })), select: vi.fn() }));
    const select = vi.fn(() => ({ eq, is: vi.fn(() => ({ eq })), order: vi.fn() }));
    const update = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          is: vi.fn(() => ({
            select: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: { id: "k1" }, error: null })),
            })),
          })),
        })),
        select: vi.fn(async () => ({ data: [{ id: "k1" }, { id: "k2" }], error: null })),
      })),
    }));
    const insert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(async () => ({
          data: {
            id: "new1",
            user_id: "user_1",
            name: "MCP",
            key_prefix: "sop_xxxx…yyyy",
            client_type: "mcp",
            client_name: null,
            access_mode: "read_only",
            scopes: [],
            last_used_at: null,
            last_used_user_agent: null,
            expires_at: null,
            created_at: "2026-07-16T00:00:00Z",
            revoked_at: null,
            revoke_reason: null,
          },
          error: null,
        })),
      })),
    }));
    const headSelect = vi.fn(() => ({
      eq: vi.fn(() => ({
        is: vi.fn(async () => ({ count: 0, error: null })),
      })),
    }));

    mockFrom.mockImplementation((table: string) => {
      if (table !== "api_keys") return {};
      return {
        select: (cols: string, opts?: { count?: string; head?: boolean }) => {
          if (opts?.head) return headSelect();
          return select(cols);
        },
        update,
        insert,
      };
    });

    return { select, eq, maybeSingle, update, insert };
  }

  it("hashApiKey never equals the raw secret", () => {
    const raw = "sop_supersecret";
    expect(hashApiKey(raw)).toBe(
      createHash("sha256").update(raw).digest("hex"),
    );
    expect(hashApiKey(raw)).not.toBe(raw);
  });

  it("validateApiKey rejects revoked and expired keys", async () => {
    setupSelectChain({
      data: {
        id: "k1",
        user_id: "user_1",
        expires_at: null,
        revoked_at: "2026-01-01T00:00:00Z",
        access_mode: "read_only",
        client_type: "mcp",
        client_name: null,
      },
      error: null,
    });
    await expect(validateApiKey("sop_abc123validformatkey")).resolves.toBeNull();

    setupSelectChain({
      data: {
        id: "k1",
        user_id: "user_1",
        expires_at: "2020-01-01T00:00:00Z",
        revoked_at: null,
        access_mode: "read_only",
        client_type: "mcp",
        client_name: null,
      },
      error: null,
    });
    await expect(validateApiKey("sop_abc123validformatkey")).resolves.toBeNull();
  });

  it("validateApiKey returns accessMode for valid keys and looks up by hash", async () => {
    const raw = "sop_abc123validformatkey";
    const { eq } = setupSelectChain({
      data: {
        id: "k1",
        user_id: "user_1",
        expires_at: null,
        revoked_at: null,
        access_mode: "read_only",
        client_type: "mcp",
        client_name: "Claude",
      },
      error: null,
    });

    const result = await validateApiKey(raw);
    expect(result).toEqual({
      userId: "user_1",
      keyId: "k1",
      accessMode: "read_only",
      clientType: "mcp",
      clientName: "Claude",
    });
    expect(eq).toHaveBeenCalledWith("key_hash", hashApiKey(raw));
  });

  it("generateApiKey defaults MCP keys to read_only and returns raw only once", async () => {
    setupSelectChain({ data: null, error: null });
    const { key, record } = await generateApiKey("user_1", {
      name: "Claude Desktop",
      clientType: "mcp",
    });
    expect(key.startsWith("sop_")).toBe(true);
    expect(record.access_mode).toBe("read_only");
    expect(record).not.toHaveProperty("key_hash");
    expect(toPublicApiKeyRecord(record)).not.toHaveProperty("key_hash");
    expect(MAX_ACTIVE_API_KEYS).toBe(5);
  });

  it("listApiKeys select list excludes key_hash column from SAFE projection", async () => {
    const result = {
      data: [
        {
          id: "k1",
          user_id: "user_a",
          name: "A",
          key_prefix: "sop_aa…zz",
          client_type: "mcp",
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
      ],
      error: null,
    };
    // Chain: select().eq().order() then optional .is() reassignment
    const chain: Record<string, unknown> = {};
    chain.order = vi.fn(() => chain);
    chain.is = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.then = undefined;
    // listApiKeys awaits the final query object — make it thenable
    Object.assign(chain, {
      then: (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve),
    });
    const select = vi.fn(() => chain);
    mockFrom.mockReturnValue({ select });

    const keys = await listApiKeys("user_a");
    expect(select).toHaveBeenCalled();
    const cols = String(select.mock.calls[0][0]);
    expect(cols).not.toContain("key_hash");
    expect(keys[0]).not.toHaveProperty("key_hash");
    expect(JSON.stringify(keys)).not.toContain("key_hash");
  });

  it("revokeApiKey is scoped by user_id (isolation)", async () => {
    const maybeSingle = vi.fn(async () => ({ data: null, error: null }));
    const select = vi.fn(() => ({ maybeSingle }));
    const is = vi.fn(() => ({ select }));
    const eqUser = vi.fn(() => ({ is }));
    const eqId = vi.fn(() => ({ eq: eqUser }));
    const update = vi.fn(() => ({ eq: eqId }));
    mockFrom.mockReturnValue({ update });

    await expect(revokeApiKey("user_a", "key_b")).rejects.toMatchObject({
      statusCode: 404,
    });
    expect(eqId).toHaveBeenCalledWith("id", "key_b");
    expect(eqUser).toHaveBeenCalledWith("user_id", "user_a");
  });

  it("revokeAllApiKeysForUser returns revoked count", async () => {
    const select = vi.fn(async () => ({
      data: [{ id: "1" }, { id: "2" }, { id: "3" }],
      error: null,
    }));
    const is = vi.fn(() => ({ select }));
    const eq = vi.fn(() => ({ is }));
    const update = vi.fn(() => ({ eq }));
    mockFrom.mockReturnValue({ update });

    const n = await revokeAllApiKeysForUser("user_1", "disable_all_ai_access");
    expect(n).toBe(3);
  });
});

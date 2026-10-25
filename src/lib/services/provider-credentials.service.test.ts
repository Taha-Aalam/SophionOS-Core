import { beforeEach, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secret-box";
import { providerCredentialsService } from "./provider-credentials.service";

const ENV_VAR = "PROVIDER_KEY_ENCRYPTION_SECRET";

beforeEach(() => {
  process.env[ENV_VAR] = "test-secret-0123456789abcdef0123456789";
});

type Op = { op: string; args: unknown[] };

/** Minimal thenable query-builder fake: every awaited chain resolves to `result`. */
function fakeSupabase(result: { data: unknown; error: unknown }, log: Op[] = []) {
  const record = (op: string, args: unknown[]) => {
    log.push({ op, args });
    return chain;
  };
  const chain = {
    from: (table: string) => record("from", [table]),
    select: (columns: string) => record("select", [columns]),
    upsert: (values: unknown, opts?: unknown) => {
      log.push({ op: "upsert", args: [values, opts] });
      return chain;
    },
    delete: () => record("delete", []),
    update: (values: unknown) => record("update", [values]),
    eq: (column: string, value: unknown) => record("eq", [column, value]),
    limit: (n: number) => record("limit", [n]),
    single: () => record("single", []),
    maybeSingle: () => record("maybeSingle", []),
    then: (
      resolve?: (value: { data: unknown; error: unknown }) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(resolve, reject),
  };
  return chain as unknown as SupabaseClient;
}

const okFetch = () => async () => new Response(null, { status: 200 });
const rejectFetch = () => async () => new Response(null, { status: 401 });

describe("providerCredentialsService.upsert", () => {
  it("stores an encrypted secret with a hint and returns metadata only", async () => {
    const log: Op[] = [];
    const row = {
      provider: "openrouter",
      auth_method: "api_key",
      encrypted_secret: "stored-ciphertext",
      hint: "-key",
      label: null,
      base_url: null,
      model: "deepseek/deepseek-chat-v3-0324:free",
      status: "active",
      last_validated_at: "2026-10-25T00:00:00.000Z",
    };
    const sb = fakeSupabase({ data: row, error: null }, log);

    const meta = await providerCredentialsService.upsert(
      "user_1",
      {
        provider: "openrouter",
        apiKey: "sk-or-real-key",
        model: "deepseek/deepseek-chat-v3-0324:free",
      },
      { supabase: sb, fetchImpl: okFetch() },
    );

    const upsertOp = log.find((op) => op.op === "upsert");
    expect(upsertOp).toBeDefined();
    const values = upsertOp?.args[0] as Record<string, unknown>;
    expect(values).toMatchObject({
      user_id: "user_1",
      provider: "openrouter",
      hint: "-key",
    });
    expect(decryptSecret(String(values.encrypted_secret))).toBe(
      "sk-or-real-key",
    );
    expect(meta).toMatchObject({
      provider: "openrouter",
      hint: "-key",
      status: "active",
      lastValidatedAt: "2026-10-25T00:00:00.000Z",
    });
    expect(meta).not.toHaveProperty("encryptedSecret");
    expect(JSON.stringify(meta)).not.toContain("stored-ciphertext");
  });

  it("rejects a key the provider explicitly rejects (401)", async () => {
    const sb = fakeSupabase({ data: null, error: null });
    await expect(
      providerCredentialsService.upsert(
        "user_1",
        { provider: "openrouter", apiKey: "bad-key" },
        { supabase: sb, fetchImpl: rejectFetch() },
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("saves without a validation timestamp when the provider is unreachable", async () => {
    const log: Op[] = [];
    const row = {
      provider: "openai",
      auth_method: "api_key",
      encrypted_secret: "ct",
      hint: "key1",
      label: null,
      base_url: null,
      model: null,
      status: "active",
      last_validated_at: null,
    };
    const sb = fakeSupabase({ data: row, error: null }, log);
    const unreachable = async () => {
      throw new TypeError("fetch failed");
    };

    const meta = await providerCredentialsService.upsert(
      "user_1",
      { provider: "openai", apiKey: "sk-key1" },
      { supabase: sb, fetchImpl: unreachable },
    );

    expect(meta.lastValidatedAt).toBeNull();
  });

  it("requires a base URL for the custom provider", async () => {
    const sb = fakeSupabase({ data: null, error: null });
    await expect(
      providerCredentialsService.upsert(
        "user_1",
        { provider: "custom", apiKey: "k" },
        { supabase: sb, fetchImpl: okFetch() },
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it("rejects providers outside the registry", async () => {
    const sb = fakeSupabase({ data: null, error: null });
    await expect(
      providerCredentialsService.upsert(
        "user_1",
        { provider: "made-up" as "openai", apiKey: "k" },
        { supabase: sb, fetchImpl: okFetch() },
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe("providerCredentialsService.list", () => {
  it("returns metadata rows without secret material", async () => {
    const row = {
      provider: "anthropic",
      auth_method: "api_key",
      encrypted_secret: "ct",
      hint: "ant-",
      label: "work",
      base_url: null,
      model: "claude-sonnet-4-5",
      status: "invalid",
      last_validated_at: null,
    };
    const sb = fakeSupabase({ data: [row], error: null });

    const items = await providerCredentialsService.list("user_1", {
      supabase: sb,
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      provider: "anthropic",
      hint: "ant-",
      label: "work",
      status: "invalid",
    });
    expect(JSON.stringify(items)).not.toContain("ct");
  });

  it("maps database errors to DatabaseError", async () => {
    const sb = fakeSupabase({ data: null, error: { message: "boom" } });
    await expect(
      providerCredentialsService.list("user_1", { supabase: sb }),
    ).rejects.toMatchObject({ name: "DatabaseError" });
  });
});

describe("providerCredentialsService.remove", () => {
  it("deletes the user's row for that provider", async () => {
    const log: Op[] = [];
    const sb = fakeSupabase({ data: null, error: null }, log);

    await providerCredentialsService.remove("user_1", "openrouter", {
      supabase: sb,
    });

    expect(log.map((op) => op.op)).toEqual(["from", "delete", "eq", "eq"]);
    expect(log.find((op) => op.op === "from")?.args[0]).toBe(
      "provider_credentials",
    );
  });
});

describe("providerCredentialsService.getActiveCredential", () => {
  it("returns the decrypted credential for the requested provider", async () => {
    const row = {
      provider: "openrouter",
      encrypted_secret: encryptSecret("sk-or-real-key"),
      base_url: null,
      model: "deepseek/deepseek-chat-v3-0324:free",
    };
    const sb = fakeSupabase({ data: row, error: null });

    const cred = await providerCredentialsService.getActiveCredential(
      "user_1",
      { supabase: sb, provider: "openrouter" },
    );

    expect(cred).toMatchObject({
      provider: "openrouter",
      apiKey: "sk-or-real-key",
      model: "deepseek/deepseek-chat-v3-0324:free",
    });
  });

  it("returns null when the user has no active credential", async () => {
    const sb = fakeSupabase({ data: null, error: null });
    const cred = await providerCredentialsService.getActiveCredential("user_1", {
      supabase: sb,
    });
    expect(cred).toBeNull();
  });
});

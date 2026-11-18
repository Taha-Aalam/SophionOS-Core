import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Regression: audit sophionos-core-20261117-r1 finding F2
 * (src/lib/ai/provider-baseurl-unrestricted-server-fetch, medium).
 *
 * A tenant-supplied BYOAK provider baseUrl was validated only for URL
 * parseability and then fetched server-side — credentialed GET/POST to
 * loopback/private/link-local destinations, fetch-default redirects, and no
 * pinning between the validated and stored URL for fixed providers. The fix
 * adds https+public-host schema validation and a DNS-resolving fetch guard
 * shared by the save-time probe and the adapter sinks.
 */

const lookupMock = vi.hoisted(() =>
  vi.fn(async (_host: string, _options?: { all: boolean }) => [
    { address: "93.184.216.34", family: 4 },
  ]),
);

vi.mock("node:dns/promises", () => ({
  lookup: lookupMock,
}));

import { upsertProviderCredentialSchema } from "@/lib/validators/ai-providers.schema";
import { providerCredentialsService } from "@/lib/services/provider-credentials.service";
import { assertFetchableProviderUrl, isPrivateHostname } from "@/lib/ai/fetch-guard";

process.env.PROVIDER_KEY_ENCRYPTION_SECRET ??= "0".repeat(32);

const PUBLIC_HTTPS = "https://api.example.com/v1";

const BAD_URLS = [
  "http://127.0.0.1:8080/x",
  "http://169.254.169.254/latest/meta-data",
  "ftp://internal-host/x",
  "https://localhost/v1",
  "https://10.0.0.5/v1",
];

function makeUpsertStub() {
  const calls: Array<{ table: string; op: string; payload?: unknown; init?: RequestInit; url?: string }> = [];
  const supabase = {
    from(table: string) {
      return {
        upsert(values: unknown, _opts?: unknown) {
          calls.push({ table, op: "upsert", payload: values });
          return {
            select() {
              return {
                single() {
                  return Promise.resolve({
                    data: {
                      provider: "custom",
                      auth_method: "api_key",
                      hint: "1234",
                      label: null,
                      base_url: PUBLIC_HTTPS,
                      model: null,
                      status: "active",
                      last_validated_at: new Date().toISOString(),
                    },
                    error: null,
                  });
                },
              };
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;
  return { calls, supabase };
}

describe("BYOAK baseUrl schema rejects non-public targets (audit F2)", () => {
  it("rejects loopback, link-local, non-https, and private-range URLs", () => {
    for (const url of BAD_URLS) {
      const result = upsertProviderCredentialSchema.safeParse({
        provider: "custom",
        apiKey: "kkkkkkkk",
        baseUrl: url,
      });
      expect(result.success, `${url} must be rejected`).toBe(false);
    }
  });

  it("still accepts a public https URL", () => {
    const result = upsertProviderCredentialSchema.safeParse({
      provider: "custom",
      apiKey: "kkkkkkkk",
      baseUrl: PUBLIC_HTTPS,
    });
    expect(result.success).toBe(true);
  });
});

describe("assertFetchableProviderUrl (shared fetch guard)", () => {
  beforeEach(() => {
    lookupMock.mockReset();
    lookupMock.mockImplementation(async (_host: string, _options?: { all: boolean }) => [
      { address: "93.184.216.34", family: 4 },
    ]);
  });

  it("rejects non-https and literal private targets", async () => {
    await expect(assertFetchableProviderUrl("http://api.example.com/v1")).rejects.toMatchObject({
      code: "BASE_URL_INSECURE",
    });
    await expect(assertFetchableProviderUrl("https://127.0.0.1/v1")).rejects.toMatchObject({
      code: "BASE_URL_PRIVATE",
    });
    await expect(assertFetchableProviderUrl("https://169.254.169.254/latest/meta-data")).rejects.toMatchObject({
      code: "BASE_URL_PRIVATE",
    });
  });

  it("rejects hostnames that resolve into private ranges (DNS-level check)", async () => {
    lookupMock.mockImplementation(async (_host: string, _options?: { all: boolean }) => [
      { address: "10.1.2.3", family: 4 },
    ]);
    await expect(assertFetchableProviderUrl("https://rebind.example/v1")).rejects.toMatchObject({
      code: "BASE_URL_PRIVATE",
    });
    expect(lookupMock).toHaveBeenCalledWith("rebind.example", expect.objectContaining({ all: true }));
  });

  it("rejects unresolvable hostnames", async () => {
    lookupMock.mockImplementation(async () => {
      throw new Error("ENOTFOUND");
    });
    await expect(assertFetchableProviderUrl("https://missing.example/v1")).rejects.toMatchObject({
      code: "BASE_URL_UNRESOLVED",
    });
  });

  it("accepts a public https URL and returns the parsed URL", async () => {
    const url = await assertFetchableProviderUrl(`${PUBLIC_HTTPS}/models`);
    expect(url.protocol).toBe("https:");
    expect(url.hostname).toBe("api.example.com");
  });

  it("isPrivateHostname covers the audit's literal list", () => {
    for (const host of ["localhost", "127.0.0.1", "10.0.0.5", "169.254.169.254", "192.168.1.4", "172.16.0.9", "0.0.0.0"]) {
      expect(isPrivateHostname(host), host).toBe(true);
    }
    for (const host of ["api.example.com", "8.8.8.8"]) {
      expect(isPrivateHostname(host), host).toBe(false);
    }
  });
});

describe("provider credential service enforces the same boundaries", () => {
  beforeEach(() => {
    lookupMock.mockReset();
    lookupMock.mockImplementation(async (_host: string, _options?: { all: boolean }) => [
      { address: "93.184.216.34", family: 4 },
    ]);
  });

  it("rejects a user-supplied baseUrl for fixed providers (validated URL is pinned to the registry)", async () => {
    const stub = makeUpsertStub();
    await expect(
      providerCredentialsService.upsert(
        "user-a",
        { provider: "openai", apiKey: "sk-openai-test-1234", baseUrl: PUBLIC_HTTPS } as never,
        { supabase: stub.supabase, fetchImpl: (async () => new Response("[]", { status: 200 })) as never },
      ),
    ).rejects.toMatchObject({ code: "BASE_URL_NOT_ALLOWED" });
    expect(stub.calls).toEqual([]);
  });

  it("rejects a custom provider whose baseUrl targets a private address before any fetch", async () => {
    const stub = makeUpsertStub();
    const fetchSpy = vi.fn(async () => new Response("[]", { status: 200 }));
    await expect(
      providerCredentialsService.upsert(
        "user-a",
        { provider: "custom", apiKey: "kkkkkkkk", baseUrl: "https://127.0.0.1:8080" } as never,
        { supabase: stub.supabase, fetchImpl: fetchSpy as never },
      ),
    ).rejects.toMatchObject({ code: "BASE_URL_PRIVATE" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("probes {baseUrl}/models with redirect: manual for a public custom provider and stores it", async () => {
    const stub = makeUpsertStub();
    const seen: Array<{ url: string; redirect: string }> = [];
    const fetchImpl = (async (url: unknown, init?: RequestInit) => {
      seen.push({ url: String(url), redirect: init?.redirect ?? "unset" });
      return new Response("[]", { status: 200 });
    }) as never;

    const meta = await providerCredentialsService.upsert(
      "user-a",
      { provider: "custom", apiKey: "kkkkkkkk", baseUrl: PUBLIC_HTTPS } as never,
      { supabase: stub.supabase, fetchImpl },
    );

    expect(seen).toEqual([{ url: `${PUBLIC_HTTPS}/models`, redirect: "manual" }]);
    expect(meta.status).toBe("active");
    expect(stub.calls[0]?.payload).toMatchObject({ base_url: PUBLIC_HTTPS });
  });
});

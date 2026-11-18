import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Regression: audit sophionos-core-20261117-r1 findings F2 (part B) and F5.
 *
 * The adapters fetched `${baseUrl}/...` with the decrypted key and
 * fetch-default redirect following, and readJson buffered the entire provider
 * response with no size bound (10 MB observed against a 700-token request;
 * error bodies likewise). The guard must reject private destinations before
 * any fetch, redirects must never be followed, and responses must be bounded.
 */

const lookupMock = vi.hoisted(() =>
  vi.fn(async (_host: string, _options?: { all: boolean }) => [
    { address: "93.184.216.34", family: 4 },
  ]),
);

vi.mock("node:dns/promises", () => ({
  lookup: lookupMock,
}));

import { complete } from "@/lib/ai/adapters/openai";
import { MAX_PROVIDER_RESPONSE_BYTES } from "@/lib/ai/adapters/types";

const BASE = "https://api.example.com/v1";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("provider adapter fetch guard and response bound (audit F2b/F5)", () => {
  beforeEach(() => {
    lookupMock.mockReset();
    lookupMock.mockImplementation(async (_host: string, _options?: { all: boolean }) => [
      { address: "93.184.216.34", family: 4 },
    ]);
  });

  it("buffers NO MORE than the byte budget: an oversized provider response throws ProviderError", async () => {
    const big = "A".repeat(MAX_PROVIDER_RESPONSE_BYTES + 1);
    const fetchImpl = (async () =>
      jsonResponse({ choices: [{ message: { content: big } }], usage: {} })) as never;

    await expect(
      complete(
        { apiKey: "k", baseUrl: BASE, model: "m", system: "s", prompt: "p", maxTokens: 700, timeoutMs: 5000 },
        fetchImpl,
      ),
    ).rejects.toMatchObject({ name: "ProviderError" });
  });

  it("a response within the budget still parses normally", async () => {
    const fetchImpl = (async () =>
      jsonResponse({ choices: [{ message: { content: "ok" } }], usage: {} })) as never;

    const result = await complete(
      { apiKey: "k", baseUrl: BASE, model: "m", system: "s", prompt: "p", maxTokens: 700, timeoutMs: 5000 },
      fetchImpl,
    );
    expect(result.text).toBe("ok");
  });

  it("sinks are guard-checked and never follow redirects (redirect: manual)", async () => {
    const seen: Array<{ url: string; redirect: string }> = [];
    const fetchImpl = (async (url: unknown, init?: RequestInit) => {
      seen.push({ url: String(url), redirect: init?.redirect ?? "unset" });
      return jsonResponse({ choices: [{ message: { content: "ok" } }], usage: {} });
    }) as never;

    await complete(
      { apiKey: "k", baseUrl: BASE, model: "m", system: "s", prompt: "p", maxTokens: 700, timeoutMs: 5000 },
      fetchImpl,
    );

    expect(seen).toEqual([{ url: `${BASE}/chat/completions`, redirect: "manual" }]);
  });

  it("rejects a literal private baseUrl before any fetch", async () => {
    const fetchSpy = vi.fn(async () => jsonResponse({ choices: [{ message: { content: "ok" } }], usage: {} }));

    await expect(
      complete(
        { apiKey: "k", baseUrl: "https://127.0.0.1:9/evil", model: "m", system: "s", prompt: "p", maxTokens: 700, timeoutMs: 5000 },
        fetchSpy as never,
      ),
    ).rejects.toMatchObject({ name: "ProviderError" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a baseUrl whose DNS resolves into a private range before any fetch", async () => {
    lookupMock.mockImplementation(async (_host: string, _options?: { all: boolean }) => [
      { address: "10.1.2.3", family: 4 },
    ]);
    const fetchSpy = vi.fn(async () => jsonResponse({ choices: [{ message: { content: "ok" } }], usage: {} }));

    await expect(
      complete(
        { apiKey: "k", baseUrl: "https://rebind.example/v1", model: "m", system: "s", prompt: "p", maxTokens: 700, timeoutMs: 5000 },
        fetchSpy as never,
      ),
    ).rejects.toMatchObject({ name: "ProviderError" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

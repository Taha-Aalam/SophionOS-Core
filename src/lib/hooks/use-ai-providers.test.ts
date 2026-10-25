// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useAiProviders } from "./use-ai-providers";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

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

function jsonResponse(
  data: unknown,
  ok = true,
  status = 200,
  message = "Request failed",
): Response {
  return {
    ok,
    status,
    text: async () =>
      JSON.stringify(ok ? { data } : { error: { code: "ERR", message } }),
  } as Response;
}

describe("useAiProviders", () => {
  it("loads connected providers on mount", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse([meta]));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useAiProviders());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.providers).toHaveLength(1);
    expect(result.current.providers[0]?.provider).toBe("openrouter");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/v1/user/ai-providers");
  });

  it("surfaces a load error without wiping state silently", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(jsonResponse(null, false, 500, "boom")),
    );
    const { result } = renderHook(() => useAiProviders());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe("boom");
  });

  it("connects a provider and refreshes the list", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse(meta))
      .mockResolvedValueOnce(jsonResponse([meta]));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useAiProviders());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.connect({
        provider: "openrouter",
        apiKey: "sk-or-new-key",
        model: "deepseek/deepseek-chat-v3-0324:free",
      });
    });

    const putCall = fetchMock.mock.calls[1];
    expect(putCall?.[0]).toBe("/api/v1/user/ai-providers");
    expect((putCall?.[1] as RequestInit).method).toBe("PUT");
    expect(result.current.providers).toHaveLength(1);
  });

  it("propagates connect failures (e.g. provider rejected the key)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(
        jsonResponse(null, false, 400, "The provider rejected this API key"),
      );
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useAiProviders());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await expect(
      act(async () => {
        await result.current.connect({
          provider: "openrouter",
          apiKey: "bad-key",
        });
      }),
    ).rejects.toThrow("rejected");
  });

  it("disconnects a provider and refreshes the list", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([meta]))
      .mockResolvedValueOnce(jsonResponse({ provider: "openrouter" }))
      .mockResolvedValueOnce(jsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useAiProviders());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.disconnect("openrouter");
    });

    const deleteCall = fetchMock.mock.calls[1];
    expect(deleteCall?.[0]).toBe(
      "/api/v1/user/ai-providers?provider=openrouter",
    );
    expect((deleteCall?.[1] as RequestInit).method).toBe("DELETE");
    expect(result.current.providers).toHaveLength(0);
  });
});

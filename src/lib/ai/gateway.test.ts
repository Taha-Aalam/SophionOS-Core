import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/services/provider-credentials.service", () => ({
  providerCredentialsService: {
    getActiveCredential: vi.fn(),
    markCredentialInvalid: vi.fn(async () => {}),
  },
}));

import {
  GatewayDisabledError,
  NoCredentialError,
  generateCompletion,
} from "./gateway";
import { ProviderAuthError, ProviderError } from "./adapters/types";
import { providerCredentialsService } from "@/lib/services/provider-credentials.service";

const mockGetCred = vi.mocked(
  providerCredentialsService.getActiveCredential,
);
const mockMarkInvalid = vi.mocked(
  providerCredentialsService.markCredentialInvalid,
);

const credential = {
  provider: "openrouter" as const,
  apiKey: "sk-or-real",
  baseUrl: null,
  model: "deepseek/deepseek-chat-v3-0324:free",
};

function okFetch(text = "Brief text.") {
  return vi.fn(async (_url: string | URL, init?: RequestInit) =>
    new Response(
      JSON.stringify({
        choices: [{ message: { content: text } }],
        usage: { prompt_tokens: 10, completion_tokens: 4 },
      }),
      { status: 200 },
    ),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.SOPHION_DISABLE_BYOAK_LLM;
  process.env.PROVIDER_KEY_ENCRYPTION_SECRET =
    "test-secret-0123456789abcdef0123456789";
});

afterEach(() => {
  delete process.env.SOPHION_DISABLE_BYOAK_LLM;
  vi.unstubAllGlobals();
});

const baseInput = {
  userId: "user_1",
  purpose: "brief_narration" as const,
  system: "sys",
  prompt: "usr",
};

describe("generateCompletion", () => {
  it("throws GatewayDisabledError and never fetches when the kill switch is on", async () => {
    process.env.SOPHION_DISABLE_BYOAK_LLM = "1";
    const fetchMock = okFetch();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      generateCompletion(baseInput, { supabase: {} as never, fetchImpl: fetchMock as never }),
    ).rejects.toBeInstanceOf(GatewayDisabledError);
    expect(mockGetCred).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws NoCredentialError when the user has no active credential", async () => {
    mockGetCred.mockResolvedValueOnce(null);
    await expect(
      generateCompletion(baseInput, { supabase: {} as never, fetchImpl: okFetch() as never }),
    ).rejects.toBeInstanceOf(NoCredentialError);
  });

  it("resolves the credential, calls the adapter, and returns text/usage", async () => {
    mockGetCred.mockResolvedValueOnce(credential);
    const fetchMock = okFetch("Narration!");
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateCompletion(baseInput, {
      supabase: {} as never,
    });

    expect(mockGetCred).toHaveBeenCalledWith("user_1", {
      supabase: expect.anything(),
      provider: undefined,
    });
    expect(result).toEqual({
      text: "Narration!",
      provider: "openrouter",
      model: "deepseek/deepseek-chat-v3-0324:free",
      usage: { inputTokens: 10, outputTokens: 4 },
    });
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.max_tokens).toBe(700); // default
  });

  it("lets input.model override the credential's model", async () => {
    mockGetCred.mockResolvedValueOnce(credential);
    const fetchMock = okFetch();
    vi.stubGlobal("fetch", fetchMock);

    await generateCompletion(
      { ...baseInput, model: "google/gemini-2.0-flash-exp:free" },
      { supabase: {} as never },
    );

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.model).toBe("google/gemini-2.0-flash-exp:free");
  });

  it("caps maxTokens at the hard limit", async () => {
    mockGetCred.mockResolvedValueOnce(credential);
    const fetchMock = okFetch();
    vi.stubGlobal("fetch", fetchMock);

    await generateCompletion(
      { ...baseInput, maxTokens: 99_999 },
      { supabase: {} as never },
    );

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.max_tokens).toBe(2000);
  });

  it("marks the credential invalid when the provider rejects the key, then rethrows", async () => {
    mockGetCred.mockResolvedValueOnce(credential);
    const authFail = vi.fn(async () =>
      new Response(JSON.stringify({ error: { message: "bad key" } }), {
        status: 401,
      }),
    );
    vi.stubGlobal("fetch", authFail);

    await expect(
      generateCompletion(baseInput, { supabase: {} as never }),
    ).rejects.toBeInstanceOf(ProviderAuthError);

    expect(mockMarkInvalid).toHaveBeenCalledWith(
      "user_1",
      "openrouter",
      expect.anything(),
    );
  });

  it("propagates non-auth provider failures without touching the credential", async () => {
    mockGetCred.mockResolvedValueOnce(credential);
    const rateFail = vi.fn(async () => new Response("429", { status: 429 }));
    vi.stubGlobal("fetch", rateFail);

    await expect(
      generateCompletion(baseInput, { supabase: {} as never }),
    ).rejects.toBeInstanceOf(ProviderError);
    expect(mockMarkInvalid).not.toHaveBeenCalled();
  });
});

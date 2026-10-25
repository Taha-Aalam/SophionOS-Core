import { describe, expect, it } from "vitest";
import { complete } from "./google";
import { ProviderAuthError, ProviderError } from "./types";

const input = {
  apiKey: "AIza-test",
  baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  model: "gemini-2.5-flash",
  system: "You write briefs.",
  prompt: "Summarize the day.",
  maxTokens: 700,
  timeoutMs: 5_000,
};

function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

describe("google adapter (Gemini generateContent)", () => {
  it("POSTs to models/{model}:generateContent with the x-goog-api-key header and documented body", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;
    const fetchImpl = async (url: string | URL, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedInit = init;
      return okResponse({
        candidates: [
          { content: { parts: [{ text: "Here is your day." }] } },
        ],
        usageMetadata: { promptTokenCount: 15, candidatesTokenCount: 9 },
      });
    };

    const result = await complete(input, fetchImpl);

    expect(capturedUrl).toBe(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    );
    const headers = capturedInit?.headers as Record<string, string>;
    expect(headers["x-goog-api-key"]).toBe("AIza-test");
    const body = JSON.parse(String(capturedInit?.body));
    expect(body).toEqual({
      systemInstruction: { parts: [{ text: "You write briefs." }] },
      contents: [{ role: "user", parts: [{ text: "Summarize the day." }] }],
      generationConfig: { maxOutputTokens: 700 },
    });
    expect(result).toEqual({
      text: "Here is your day.",
      model: "gemini-2.5-flash",
      usage: { inputTokens: 15, outputTokens: 9 },
    });
  });

  it("joins multi-part candidate text", async () => {
    const fetchImpl = async () =>
      okResponse({
        candidates: [
          { content: { parts: [{ text: "A" }, { text: "B" }] } },
        ],
        usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 2 },
      });
    const result = await complete(input, fetchImpl);
    expect(result.text).toBe("AB");
  });

  it("maps 400 API_KEY_INVALID to ProviderAuthError (Google signals bad keys with 400)", async () => {
    const fetchImpl = async () =>
      new Response(
        JSON.stringify({
          error: { code: 400, message: "API key not valid. Please pass a valid API key.", status: "INVALID_ARGUMENT" },
        }),
        { status: 400 },
      );
    await expect(complete(input, fetchImpl)).rejects.toBeInstanceOf(
      ProviderAuthError,
    );
  });

  it("maps 429/5xx and empty candidates to ProviderError", async () => {
    const rateFetch = async () => new Response("resource exhausted", { status: 429 });
    await expect(complete(input, rateFetch)).rejects.toBeInstanceOf(ProviderError);

    const emptyFetch = async () => okResponse({ candidates: [] });
    await expect(complete(input, emptyFetch)).rejects.toBeInstanceOf(ProviderError);
  });
});

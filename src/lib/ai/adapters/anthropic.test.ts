import { describe, expect, it } from "vitest";
import { complete } from "./anthropic";
import { ProviderAuthError, ProviderError } from "./types";

const input = {
  apiKey: "sk-ant-test",
  model: "claude-sonnet-4-5",
  system: "You write briefs.",
  prompt: "Summarize the day.",
  maxTokens: 700,
  timeoutMs: 5_000,
};

function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

describe("anthropic adapter", () => {
  it("POSTs to /v1/messages with x-api-key, version header, top-level system and required max_tokens", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;
    const fetchImpl = async (url: string | URL, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedInit = init;
      return okResponse({
        content: [{ type: "text", text: "Good morning." }],
        usage: { input_tokens: 20, output_tokens: 8 },
      });
    };

    const result = await complete(
      { ...input, baseUrl: "https://api.anthropic.com/v1" },
      fetchImpl,
    );

    expect(capturedUrl).toBe("https://api.anthropic.com/v1/messages");
    const headers = capturedInit?.headers as Record<string, string>;
    expect(headers["x-api-key"]).toBe("sk-ant-test");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    const body = JSON.parse(String(capturedInit?.body));
    expect(body).toEqual({
      model: "claude-sonnet-4-5",
      max_tokens: 700,
      system: "You write briefs.",
      messages: [{ role: "user", content: "Summarize the day." }],
    });
    expect(result).toEqual({
      text: "Good morning.",
      model: "claude-sonnet-4-5",
      usage: { inputTokens: 20, outputTokens: 8 },
    });
  });

  it("joins multiple text blocks in the response", async () => {
    const fetchImpl = async () =>
      okResponse({
        content: [
          { type: "text", text: "Part one." },
          { type: "text", text: " Part two." },
        ],
        usage: { input_tokens: 1, output_tokens: 2 },
      });
    const result = await complete(
      { ...input, baseUrl: "https://api.anthropic.com/v1" },
      fetchImpl,
    );
    expect(result.text).toBe("Part one. Part two.");
  });

  it("maps 401 to ProviderAuthError and other errors to ProviderError", async () => {
    const authFetch = async () =>
      new Response(
        JSON.stringify({
          type: "error",
          error: { type: "authentication_error", message: "invalid x-api-key" },
        }),
        { status: 401 },
      );
    await expect(
      complete({ ...input, baseUrl: "https://api.anthropic.com/v1" }, authFetch),
    ).rejects.toBeInstanceOf(ProviderAuthError);

    const rateFetch = async () => new Response("overloaded", { status: 529 });
    await expect(
      complete({ ...input, baseUrl: "https://api.anthropic.com/v1" }, rateFetch),
    ).rejects.toBeInstanceOf(ProviderError);
  });

  it("maps a success payload without text blocks to ProviderError", async () => {
    const fetchImpl = async () => okResponse({ content: [] });
    await expect(
      complete({ ...input, baseUrl: "https://api.anthropic.com/v1" }, fetchImpl),
    ).rejects.toBeInstanceOf(ProviderError);
  });
});

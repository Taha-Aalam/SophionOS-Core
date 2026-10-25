import { describe, expect, it } from "vitest";
import {
  complete,
} from "./openai";
import { ProviderAuthError, ProviderError } from "./types";

const input = {
  apiKey: "sk-or-test",
  baseUrl: "https://openrouter.ai/api/v1",
  model: "deepseek/deepseek-chat-v3-0324:free",
  system: "You write briefs.",
  prompt: "Summarize the day.",
  maxTokens: 700,
  timeoutMs: 5_000,
};

function okResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

describe("openai adapter (serves openai/openrouter/xai/custom)", () => {
  it("POSTs to {baseUrl}/chat/completions with Bearer auth and the documented body", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;
    const fetchImpl = async (url: string | URL, init?: RequestInit) => {
      capturedUrl = String(url);
      capturedInit = init;
      return okResponse({
        choices: [{ message: { role: "assistant", content: "Hello!" } }],
        usage: { prompt_tokens: 12, completion_tokens: 5 },
      });
    };

    const result = await complete(input, fetchImpl);

    expect(capturedUrl).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(capturedInit?.method).toBe("POST");
    const headers = capturedInit?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer sk-or-test");
    const body = JSON.parse(String(capturedInit?.body));
    expect(body).toEqual({
      model: "deepseek/deepseek-chat-v3-0324:free",
      messages: [
        { role: "system", content: "You write briefs." },
        { role: "user", content: "Summarize the day." },
      ],
      max_tokens: 700,
    });
    expect(result).toEqual({
      text: "Hello!",
      model: "deepseek/deepseek-chat-v3-0324:free",
      usage: { inputTokens: 12, outputTokens: 5 },
    });
  });

  it("defaults the baseUrl to OpenAI when omitted", async () => {
    let capturedUrl = "";
    const fetchImpl = async (url: string | URL) => {
      capturedUrl = String(url);
      return okResponse({
        choices: [{ message: { content: "hi" } }],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      });
    };
    await complete({ ...input, baseUrl: undefined }, fetchImpl);
    expect(capturedUrl).toBe("https://api.openai.com/v1/chat/completions");
  });

  it("maps 401/403 to ProviderAuthError", async () => {
    const fetchImpl = async () =>
      new Response(JSON.stringify({ error: { code: 401, message: "bad key" } }), {
        status: 401,
      });
    await expect(complete(input, fetchImpl)).rejects.toBeInstanceOf(
      ProviderAuthError,
    );
  });

  it("maps 429 and 5xx to ProviderError", async () => {
    const fetchImpl = async () => new Response("rate limited", { status: 429 });
    await expect(complete(input, fetchImpl)).rejects.toBeInstanceOf(
      ProviderError,
    );
  });

  it("maps malformed success payloads to ProviderError", async () => {
    const fetchImpl = async () => okResponse({ choices: [] });
    await expect(complete(input, fetchImpl)).rejects.toBeInstanceOf(
      ProviderError,
    );
  });

  it("wraps network/abort failures as ProviderError", async () => {
    const fetchImpl = async () => {
      throw new DOMException("timed out", "TimeoutError");
    };
    await expect(complete(input, fetchImpl)).rejects.toBeInstanceOf(
      ProviderError,
    );
  });
});

// Anthropic Messages API adapter.
//
// Request contract verified against the official reference
// (https://platform.claude.com/docs/en/api/messages): POST {baseUrl}/messages,
// x-api-key + anthropic-version headers, top-level `system` parameter,
// messages with user/assistant roles, `max_tokens` body parameter.
// UNVERIFIED this session: the response schema section of that page was
// truncated — the parser expects the long-stable shape (content blocks with
// type "text", usage.input_tokens/output_tokens); the contract test pins it.
import {
  ProviderError,
  assertOkOrThrow,
  readJson,
  wrapTransportError,
  type AdapterInput,
  type AdapterResult,
} from "./types";

const ANTHROPIC_DEFAULT_BASE_URL = "https://api.anthropic.com/v1";

interface MessagesResponse {
  content?: Array<{ type?: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
}

export async function complete(
  input: AdapterInput,
  fetchImpl: typeof fetch = fetch,
): Promise<AdapterResult> {
  const baseUrl = (input.baseUrl ?? ANTHROPIC_DEFAULT_BASE_URL).replace(
    /\/$/,
    "",
  );
  try {
    const response = await fetchImpl(`${baseUrl}/messages`, {
      method: "POST",
      headers: {
        "x-api-key": input.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.model,
        max_tokens: input.maxTokens,
        system: input.system,
        messages: [{ role: "user", content: input.prompt }],
      }),
      signal: AbortSignal.timeout(input.timeoutMs),
    });
    await assertOkOrThrow("anthropic", response);

    const json = (await readJson(response)) as MessagesResponse;
    const text = (json.content ?? [])
      .filter((block) => block.type === "text" && typeof block.text === "string")
      .map((block) => block.text)
      .join("");
    if (!text) {
      throw new ProviderError("anthropic", "Malformed response: no text content blocks");
    }
    return {
      text,
      model: input.model,
      usage: {
        inputTokens: json.usage?.input_tokens ?? 0,
        outputTokens: json.usage?.output_tokens ?? 0,
      },
    };
  } catch (err) {
    throw wrapTransportError("anthropic", err);
  }
}

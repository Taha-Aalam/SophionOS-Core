// OpenAI-compatible chat completions adapter. Serves the `openai` adapter
// family: OpenAI itself, OpenRouter, xAI, and user-configured custom
// endpoints — all share this wire format at their own baseUrl.
//
// Contract verified against OpenRouter's official API reference
// (https://openrouter.ai/docs/api-reference/chat-completion): POST
// {baseUrl}/chat/completions, Bearer auth, response choices[].message.content,
// usage.prompt_tokens/completion_tokens, 401 for invalid keys. `max_tokens` is
// documented there as deprecated in favor of max_completion_tokens, but it
// remains the only token-limit field supported across every OpenAI-compatible
// backend we serve (xAI, Groq, Ollama) — revisit if the curated model catalog
// moves to reasoning models that require the new field.
import {
  ProviderError,
  assertOkOrThrow,
  readJson,
  wrapTransportError,
  type AdapterInput,
  type AdapterResult,
} from "./types";

export const OPENAI_DEFAULT_BASE_URL = "https://api.openai.com/v1";

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export async function complete(
  input: AdapterInput,
  fetchImpl: typeof fetch = fetch,
): Promise<AdapterResult> {
  const baseUrl = (input.baseUrl ?? OPENAI_DEFAULT_BASE_URL).replace(
    /\/$/,
    "",
  );
  try {
    const response = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.model,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.prompt },
        ],
        max_tokens: input.maxTokens,
      }),
      signal: AbortSignal.timeout(input.timeoutMs),
    });
    await assertOkOrThrow("openai", response);

    const json = (await readJson(response)) as ChatCompletionResponse;
    const text = json.choices?.[0]?.message?.content;
    if (typeof text !== "string") {
      throw new ProviderError(
        "openai",
        "Malformed response: missing choices[0].message.content",
      );
    }
    return {
      text,
      model: input.model,
      usage: {
        inputTokens: json.usage?.prompt_tokens ?? 0,
        outputTokens: json.usage?.completion_tokens ?? 0,
      },
    };
  } catch (err) {
    throw wrapTransportError("openai", err);
  }
}

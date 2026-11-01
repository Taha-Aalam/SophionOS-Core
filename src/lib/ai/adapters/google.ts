// Google Gemini generateContent adapter.
//
// Contract verified against the official docs:
// - Endpoint: POST {base}/models/{model}:generateContent with the
//   x-goog-api-key header (https://ai.google.dev/gemini-api/docs/api-key)
// - Body/fields: contents[].parts[].text, systemInstruction,
//   generationConfig.maxOutputTokens, response candidates[].content.parts[].text
//   and usageMetadata.promptTokenCount/candidatesTokenCount
//   (https://ai.google.dev/api/generate-content)
// - Bad keys surface as HTTP 400 "API key not valid" — mapped to
//   ProviderAuthError alongside the usual 401/403.
import {
  ProviderAuthError,
  ProviderError,
  assertOkOrThrow,
  readJson,
  wrapTransportError,
  type AdapterInput,
  type AdapterResult,
} from "./types";

const GOOGLE_DEFAULT_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta";

interface GenerateContentResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
  };
}

export async function complete(
  input: AdapterInput,
  fetchImpl: typeof fetch = fetch,
): Promise<AdapterResult> {
  const baseUrl = (input.baseUrl ?? GOOGLE_DEFAULT_BASE_URL).replace(/\/$/, "");
  try {
    const response = await fetchImpl(
      `${baseUrl}/models/${encodeURIComponent(input.model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "x-goog-api-key": input.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: input.system }] },
          contents: [{ role: "user", parts: [{ text: input.prompt }] }],
          generationConfig: { maxOutputTokens: input.maxTokens },
        }),
        signal: AbortSignal.timeout(input.timeoutMs),
      },
    );

    // Google returns 400 INVALID_ARGUMENT with "API key not valid" for bad
    // keys — treat that as an auth failure, not a generic provider error.
    if (response.status === 400) {
      const body = (await response
        .clone()
        .json()
        .catch(() => null)) as { error?: { message?: string } } | null;
      if (body?.error?.message && /api key/i.test(body.error.message)) {
        throw new ProviderAuthError("google", body.error.message);
      }
    }

    await assertOkOrThrow("google", response);

    const json = (await readJson(response)) as GenerateContentResponse;
    const text = (json.candidates?.[0]?.content?.parts ?? [])
      .map((part) => part.text ?? "")
      .join("");
    if (!text) {
      throw new ProviderError("google", "Malformed response: no candidate text parts");
    }
    return {
      text,
      model: input.model,
      usage: {
        inputTokens: json.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: json.usageMetadata?.candidatesTokenCount ?? 0,
      },
    };
  } catch (err) {
    throw wrapTransportError("google", err);
  }
}

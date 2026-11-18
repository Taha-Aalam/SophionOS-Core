// Shared contract for all provider adapters: pure request builders/parsers
// with an injectable fetch — no SDKs, no global state, no retries (callers
// own retry policy; the briefs pipeline prefers falling back over retrying).

export interface AdapterInput {
  apiKey: string;
  baseUrl?: string;
  model: string;
  system: string;
  prompt: string;
  maxTokens: number;
  timeoutMs: number;
}

export interface AdapterResult {
  text: string;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

export class ProviderAuthError extends Error {
  constructor(
    public provider: string,
    message: string,
  ) {
    super(`[${provider}] ${message}`);
    this.name = "ProviderAuthError";
  }
}

export class ProviderError extends Error {
  constructor(
    public provider: string,
    message: string,
  ) {
    super(`[${provider}] ${message}`);
    this.name = "ProviderError";
  }
}

/**
 * Audit F5: provider responses are read from tenant-chosen endpoints, so the
 * read is bounded regardless of the (request-side) max_tokens cap. Bodies
 * beyond this budget raise a typed ProviderError instead of buffering.
 */
export const MAX_PROVIDER_RESPONSE_BYTES = 2 * 1024 * 1024;

async function readBounded(
  provider: string,
  response: Response,
): Promise<unknown> {
  const declared = Number(response.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_PROVIDER_RESPONSE_BYTES) {
    throw new ProviderError(provider, `Response too large: ${declared} bytes`);
  }
  const reader = response.body?.getReader();
  if (!reader) {
    try {
      return await response.json();
    } catch {
      throw new Error("malformed JSON response");
    }
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_PROVIDER_RESPONSE_BYTES) {
      void reader.cancel().catch(() => {});
      throw new ProviderError(
        provider,
        `Response exceeded ${MAX_PROVIDER_RESPONSE_BYTES} bytes`,
      );
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(body));
  } catch {
    throw new Error("malformed JSON response");
  }
}

/** Maps a non-OK provider response to the typed error set. */
export async function assertOkOrThrow(
  provider: string,
  response: Response,
): Promise<void> {
  if (response.ok) return;
  let detail = `HTTP ${response.status}`;
  try {
    const body = (await readBounded(provider, response).catch(() => null)) as {
      error?: { message?: string };
    } | null;
    if (body?.error?.message) detail = `${detail}: ${body.error.message}`;
  } catch {
    // body not JSON — the status line is enough
  }
  if (response.status === 401 || response.status === 403) {
    throw new ProviderAuthError(provider, detail);
  }
  throw new ProviderError(provider, detail);
}

/** Wraps transport-level failures (network, abort/timeout) as ProviderError. */
export function wrapTransportError(provider: string, err: unknown): Error {
  if (err instanceof ProviderAuthError || err instanceof ProviderError) {
    return err;
  }
  const message = err instanceof Error ? err.message : "request failed";
  return new ProviderError(provider, `Request failed: ${message}`);
}

export async function readJson(response: Response, provider: string): Promise<unknown> {
  return readBounded(provider, response);
}

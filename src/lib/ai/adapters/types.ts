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

/** Maps a non-OK provider response to the typed error set. */
export async function assertOkOrThrow(
  provider: string,
  response: Response,
): Promise<void> {
  if (response.ok) return;
  let detail = `HTTP ${response.status}`;
  try {
    const body = (await response.json()) as { error?: { message?: string } };
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

export async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new Error("malformed JSON response");
  }
}

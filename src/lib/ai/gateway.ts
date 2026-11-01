import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getProviderDefinition,
  type ProviderId,
} from "@/lib/ai/provider-registry";
import { providerCredentialsService } from "@/lib/services/provider-credentials.service";
import {
  complete as anthropicComplete,
} from "@/lib/ai/adapters/anthropic";
import { complete as googleComplete } from "@/lib/ai/adapters/google";
import { complete as openaiComplete } from "@/lib/ai/adapters/openai";
import {
  ProviderAuthError,
  type AdapterInput,
  type AdapterResult,
} from "@/lib/ai/adapters/types";

// Server-side gateway: the ONLY sanctioned way to spend a user's connected
// provider key. Called from trusted server contexts (today: the briefs
// pipeline); never exposed as a prompt-proxying HTTP route.
//
// Guarantees:
// - Kill switch: SOPHION_DISABLE_BYOAK_LLM disables every call.
// - Typed errors: callers branch on error classes, never raw provider text.
// - Auth failures flip the credential to status='invalid' (visible in
//   settings) without deleting it.
// - Key material exists only in-memory between credential resolution and the
//   adapter call; logs carry outcome metadata only — never keys or prompts.

export class GatewayDisabledError extends Error {
  constructor() {
    super("BYOAK LLM egress is disabled");
    this.name = "GatewayDisabledError";
  }
}

export class NoCredentialError extends Error {
  constructor() {
    super("No active provider credential for user");
    this.name = "NoCredentialError";
  }
}

export interface CompletionInput {
  userId: string;
  /** Call-site tag for logs/metrics only, e.g. "brief_narration". */
  purpose: string;
  system: string;
  prompt: string;
  maxTokens?: number;
  timeoutMs?: number;
  /** Target a specific connected provider; otherwise the user's single active one. */
  provider?: ProviderId;
  /** Overrides the credential's stored model for this call. */
  model?: string;
}

export interface CompletionResult {
  text: string;
  provider: ProviderId;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

export interface GatewayOptions {
  /** Admin client in production; injected in tests. */
  supabase?: SupabaseClient;
  fetchImpl?: typeof fetch;
}

const DEFAULT_MAX_TOKENS = 700;
const MAX_TOKENS_CAP = 2000;
const DEFAULT_TIMEOUT_MS = 20_000;

const ADAPTERS = {
  anthropic: anthropicComplete,
  openai: openaiComplete,
  google: googleComplete,
} as const;

export async function generateCompletion(
  input: CompletionInput,
  options: GatewayOptions = {},
): Promise<CompletionResult> {
  if (process.env.SOPHION_DISABLE_BYOAK_LLM) {
    throw new GatewayDisabledError();
  }

  const supabase = options.supabase ?? createAdminClient();
  const credential = await providerCredentialsService.getActiveCredential(
    input.userId,
    { supabase, provider: input.provider },
  );
  if (!credential) {
    throw new NoCredentialError();
  }

  const def = getProviderDefinition(credential.provider);
  const model = input.model ?? credential.model ?? def.defaultModel;
  const adapterInput: AdapterInput = {
    apiKey: credential.apiKey,
    baseUrl: credential.baseUrl ?? def.baseUrl ?? undefined,
    model,
    system: input.system,
    prompt: input.prompt,
    maxTokens: Math.min(input.maxTokens ?? DEFAULT_MAX_TOKENS, MAX_TOKENS_CAP),
    timeoutMs: input.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  };

  const startedAt = Date.now();
  try {
    const result: AdapterResult = await ADAPTERS[def.adapter](
      adapterInput,
      options.fetchImpl,
    );
    logOutcome(input, credential.provider, model, startedAt, "ok");
    return {
      text: result.text,
      provider: credential.provider,
      model: result.model,
      usage: result.usage,
    };
  } catch (err) {
    logOutcome(
      input,
      credential.provider,
      model,
      startedAt,
      err instanceof Error ? err.name : "unknown_error",
    );
    if (err instanceof ProviderAuthError) {
      // Best-effort: a failed status flip must not mask the provider error.
      try {
        await providerCredentialsService.markCredentialInvalid(
          input.userId,
          credential.provider,
          { supabase },
        );
      } catch {
        // ignored deliberately
      }
    }
    throw err;
  }
}

function logOutcome(
  input: CompletionInput,
  provider: ProviderId,
  model: string,
  startedAt: number,
  outcome: string,
): void {
  console.info(
    `[llm-gateway] purpose=${input.purpose} provider=${provider} model=${model} ms=${Date.now() - startedAt} outcome=${outcome}`,
  );
}

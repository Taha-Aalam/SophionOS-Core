import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getProviderDefinition,
  PROVIDER_IDS,
  type ProviderId,
} from "@/lib/ai/provider-registry";
import { decryptSecret, encryptSecret } from "@/lib/crypto/secret-box";
import { AppError, DatabaseError } from "@/lib/api/error-handler";

// Server-only service for the user's connected LLM provider credentials.
// Raw key material exists in exactly two places: the caller's request and the
// encrypted payload it becomes. Every read path returns metadata only —
// decryption happens exclusively in getActiveCredential, which is consumed by
// the server-side gateway (never by routes that answer to the browser).

export interface ProviderCredentialInput {
  provider: ProviderId;
  apiKey: string;
  baseUrl?: string | null;
  model?: string | null;
  label?: string | null;
}

export interface ProviderCredentialMeta {
  provider: ProviderId;
  authMethod: "api_key";
  hint: string | null;
  label: string | null;
  baseUrl: string | null;
  model: string | null;
  status: "active" | "invalid";
  lastValidatedAt: string | null;
}

export interface ActiveCredential {
  provider: ProviderId;
  apiKey: string;
  baseUrl: string | null;
  model: string | null;
}

interface ServiceOptions {
  /** Caller-supplied client: Clerk-session client in routes, admin in cron paths. */
  supabase: SupabaseClient;
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

interface CredentialRow {
  provider: string;
  auth_method: string;
  encrypted_secret?: string;
  hint: string | null;
  label: string | null;
  base_url: string | null;
  model: string | null;
  status: string;
  last_validated_at: string | null;
}

function toMeta(row: CredentialRow): ProviderCredentialMeta {
  return {
    provider: row.provider as ProviderId,
    authMethod: "api_key",
    hint: row.hint,
    label: row.label,
    baseUrl: row.base_url,
    model: row.model,
    status: row.status === "invalid" ? "invalid" : "active",
    lastValidatedAt: row.last_validated_at,
  };
}

type ValidationResult = "valid" | "invalid" | "unreachable";

async function validateApiKey(
  input: ProviderCredentialInput,
  fetchImpl: typeof fetch,
): Promise<ValidationResult> {
  const def = getProviderDefinition(input.provider);
  const baseUrl = input.baseUrl ?? def.baseUrl ?? undefined;
  try {
    // Cheap models-list GET — never a billed completion.
    const response = await fetchImpl(def.validation.url(baseUrl), {
      method: "GET",
      headers: def.validation.headers(input.apiKey),
      signal: AbortSignal.timeout(5_000),
    });
    if (response.status === 401 || response.status === 403) return "invalid";
    // Rate limits and provider 5xx are not proof of a bad key.
    if (!response.ok) return "unreachable";
    return "valid";
  } catch {
    return "unreachable";
  }
}

export const providerCredentialsService = {
  async upsert(
    userId: string,
    input: ProviderCredentialInput,
    options: ServiceOptions,
  ): Promise<ProviderCredentialMeta> {
    if (!PROVIDER_IDS.includes(input.provider)) {
      throw new AppError("Unsupported provider", 400, "UNSUPPORTED_PROVIDER");
    }
    const def = getProviderDefinition(input.provider);
    if (def.requiresBaseUrl && !input.baseUrl?.trim()) {
      throw new AppError(
        "A base URL is required for custom providers",
        400,
        "BASE_URL_REQUIRED",
      );
    }
    if (!input.apiKey.trim()) {
      throw new AppError("An API key is required", 400, "API_KEY_REQUIRED");
    }

    const validation = await validateApiKey(input, options.fetchImpl ?? fetch);
    if (validation === "invalid") {
      throw new AppError(
        "The provider rejected this API key",
        400,
        "INVALID_PROVIDER_KEY",
      );
    }

    const now = new Date().toISOString();
    const values = {
      user_id: userId,
      provider: input.provider,
      auth_method: "api_key",
      encrypted_secret: encryptSecret(input.apiKey),
      hint: input.apiKey.slice(-4),
      label: input.label ?? null,
      base_url: input.baseUrl ?? null,
      model: input.model ?? null,
      status: "active",
      last_validated_at: validation === "valid" ? now : null,
      updated_at: now,
    };

    const { data, error } = await options.supabase
      .from("provider_credentials")
      .upsert(values, { onConflict: "user_id,provider" })
      .select()
      .single();

    if (error) throw new DatabaseError(error.message);
    return toMeta(data as CredentialRow);
  },

  async list(
    userId: string,
    options: Pick<ServiceOptions, "supabase">,
  ): Promise<ProviderCredentialMeta[]> {
    const { data, error } = await options.supabase
      .from("provider_credentials")
      .select(
        "provider, auth_method, hint, label, base_url, model, status, last_validated_at",
      )
      .eq("user_id", userId);

    if (error) throw new DatabaseError(error.message);
    return (data ?? []).map((row) => toMeta(row as CredentialRow));
  },

  async remove(
    userId: string,
    provider: ProviderId,
    options: Pick<ServiceOptions, "supabase">,
  ): Promise<void> {
    const { error } = await options.supabase
      .from("provider_credentials")
      .delete()
      .eq("user_id", userId)
      .eq("provider", provider);

    if (error) throw new DatabaseError(error.message);
  },

  /** Flips the credential to invalid after a provider auth failure (gateway). */
  async markCredentialInvalid(
    userId: string,
    provider: ProviderId,
    options: Pick<ServiceOptions, "supabase">,
  ): Promise<void> {
    const { error } = await options.supabase
      .from("provider_credentials")
      .update({ status: "invalid", updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("provider", provider);

    if (error) throw new DatabaseError(error.message);
  },

  /** Gateway-internal: the ONLY method that returns decrypted key material. */
  async getActiveCredential(
    userId: string,
    options: Pick<ServiceOptions, "supabase"> & { provider?: ProviderId },
  ): Promise<ActiveCredential | null> {
    let query = options.supabase
      .from("provider_credentials")
      .select("provider, encrypted_secret, base_url, model")
      .eq("user_id", userId)
      .eq("status", "active");

    if (options.provider) {
      query = query.eq("provider", options.provider);
    }

    const { data, error } = await query.limit(1).maybeSingle();

    if (error) throw new DatabaseError(error.message);
    if (!data) return null;
    const row = data as CredentialRow;
    return {
      provider: row.provider as ProviderId,
      apiKey: decryptSecret(row.encrypted_secret ?? ""),
      baseUrl: row.base_url,
      model: row.model,
    };
  },
};

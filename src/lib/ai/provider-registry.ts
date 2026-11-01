// Static catalog of LLM providers users can connect in v1 (API keys only).
//
// The registry is data + pure functions — no network calls, no secrets. It
// drives the settings UI (labels, key URLs, model pickers), save-time key
// validation (Task 2), and the gateway's adapter dispatch (Task 5): every
// provider maps to one of three adapter families, with OpenAI-compatible
// providers sharing the `openai` adapter at their own baseUrl.
//
// `validation` builds the cheap authenticated request used to verify a key at
// save time (a models-list GET — no tokens billed).

export type ProviderId =
  | "anthropic"
  | "openai"
  | "google"
  | "xai"
  | "openrouter"
  | "custom";

export type AdapterKind = "anthropic" | "openai" | "google";

export interface ValidationRequest {
  url: (baseUrl?: string) => string;
  headers: (apiKey: string) => Record<string, string>;
}

export interface ProviderDefinition {
  id: ProviderId;
  label: string;
  /** Where the user creates/finding their API key (settings UI link). */
  keyUrl: string;
  /** Known key prefixes — used for soft hints, never hard validation. */
  keyPrefixes: readonly string[];
  adapter: AdapterKind;
  /** Fixed API root; null when the user must supply one (`custom`). */
  baseUrl: string | null;
  requiresBaseUrl: boolean;
  /** Curated model ids; `custom` stays empty (user provides the model). */
  models: readonly string[];
  defaultModel: string;
  validation: ValidationRequest;
}

export const PROVIDER_IDS = [
  "anthropic",
  "openai",
  "google",
  "xai",
  "openrouter",
  "custom",
] as const satisfies readonly ProviderId[];

export const PROVIDER_REGISTRY: Record<ProviderId, ProviderDefinition> = {
  anthropic: {
    id: "anthropic",
    label: "Anthropic (Claude)",
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyPrefixes: ["sk-ant-"],
    adapter: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    requiresBaseUrl: false,
    models: ["claude-sonnet-4-5", "claude-haiku-4-5"],
    defaultModel: "claude-sonnet-4-5",
    validation: {
      url: () => "https://api.anthropic.com/v1/models",
      headers: (apiKey) => ({
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      }),
    },
  },
  openai: {
    id: "openai",
    label: "OpenAI (GPT)",
    keyUrl: "https://platform.openai.com/api-keys",
    keyPrefixes: ["sk-"],
    adapter: "openai",
    baseUrl: "https://api.openai.com/v1",
    requiresBaseUrl: false,
    models: ["gpt-4.1-mini", "gpt-4.1", "gpt-4o-mini"],
    defaultModel: "gpt-4.1-mini",
    validation: {
      url: () => "https://api.openai.com/v1/models",
      headers: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
    },
  },
  google: {
    id: "google",
    label: "Google (Gemini)",
    keyUrl: "https://aistudio.google.com/apikey",
    keyPrefixes: ["AIza"],
    adapter: "google",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    requiresBaseUrl: false,
    models: ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro"],
    defaultModel: "gemini-2.5-flash",
    validation: {
      url: () => "https://generativelanguage.googleapis.com/v1beta/models",
      headers: (apiKey) => ({ "x-goog-api-key": apiKey }),
    },
  },
  xai: {
    id: "xai",
    label: "xAI (Grok)",
    keyUrl: "https://console.x.ai",
    keyPrefixes: ["xai-"],
    adapter: "openai",
    baseUrl: "https://api.x.ai/v1",
    requiresBaseUrl: false,
    models: ["grok-3-mini", "grok-4", "grok-3"],
    defaultModel: "grok-3-mini",
    validation: {
      url: () => "https://api.x.ai/v1/models",
      headers: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
    },
  },
  openrouter: {
    id: "openrouter",
    label: "OpenRouter",
    keyUrl: "https://openrouter.ai/keys",
    keyPrefixes: ["sk-or-"],
    adapter: "openai",
    baseUrl: "https://openrouter.ai/api/v1",
    requiresBaseUrl: false,
    models: [
      "deepseek/deepseek-chat-v3-0324:free",
      "google/gemini-2.0-flash-exp:free",
      "meta-llama/llama-3.3-70b-instruct:free",
    ],
    defaultModel: "deepseek/deepseek-chat-v3-0324:free",
    validation: {
      url: () => "https://openrouter.ai/api/v1/models",
      headers: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
    },
  },
  custom: {
    id: "custom",
    label: "Custom (OpenAI-compatible)",
    keyUrl: "https://openrouter.ai/docs",
    keyPrefixes: [],
    adapter: "openai",
    baseUrl: null,
    requiresBaseUrl: true,
    models: [],
    defaultModel: "",
    validation: {
      url: (baseUrl) => `${(baseUrl ?? "").replace(/\/$/, "")}/models`,
      headers: (apiKey) => ({ Authorization: `Bearer ${apiKey}` }),
    },
  },
};

export function getProviderDefinition(id: ProviderId): ProviderDefinition {
  return PROVIDER_REGISTRY[id];
}

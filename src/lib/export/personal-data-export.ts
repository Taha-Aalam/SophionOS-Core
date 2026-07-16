/**
 * Personal data export — pure shaping + optional Supabase fetch.
 * Never includes raw API key secrets or key_hash values.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { DatabaseError } from "@/lib/api/error-handler";
import { createAdminClient } from "@/lib/supabase/admin";
import { listApiKeys, toPublicApiKeyRecord } from "@/lib/api/api-key-service";
import { getAiAccessSettings } from "@/lib/api/ai-access-service";

export const PERSONAL_EXPORT_SCHEMA_VERSION = 2 as const;

export type PersonalExportEntityBucket = {
  areas: unknown[];
  goals: unknown[];
  projects: unknown[];
  tasks: unknown[];
  notes: unknown[];
  resources: unknown[];
  topics: unknown[];
  contacts: unknown[];
};

export type PersonalDataExport = {
  schema_version: typeof PERSONAL_EXPORT_SCHEMA_VERSION;
  exported_at: string;
  user_id: string;
  entities: PersonalExportEntityBucket;
  settings: unknown;
  ai_access: unknown;
  api_keys_metadata: unknown[];
  meta: {
    counts: Record<keyof PersonalExportEntityBucket, number>;
    files: string[];
  };
};

const ENTITY_TABLES: Array<{
  key: keyof PersonalExportEntityBucket;
  table: string;
}> = [
  { key: "areas", table: "areas" },
  { key: "goals", table: "goals" },
  { key: "projects", table: "projects" },
  { key: "tasks", table: "tasks" },
  { key: "notes", table: "notes" },
  { key: "resources", table: "resources" },
  { key: "topics", table: "topics" },
  { key: "contacts", table: "contacts" },
];

const SENSITIVE_KEYS = new Set([
  "key_hash",
  "raw_key",
  "key",
  "secret",
  "password",
  "access_token",
  "refresh_token",
  "authorization",
]);

/**
 * Builds a portable JSON export document from already-fetched entity arrays.
 * Filters out any accidental key material fields from api-key-like rows.
 */
export function buildPersonalDataExport(
  userId: string,
  entities: PersonalExportEntityBucket,
  exportedAtOrExtras?:
    | string
    | {
        settings?: unknown;
        ai_access?: unknown;
        api_keys_metadata?: unknown[];
        exportedAt?: string;
      },
): PersonalDataExport {
  if (!userId || typeof userId !== "string") {
    throw new Error("userId is required for personal data export");
  }

  const extras =
    typeof exportedAtOrExtras === "string"
      ? { exportedAt: exportedAtOrExtras }
      : exportedAtOrExtras ?? {};

  const sanitized = {} as PersonalExportEntityBucket;
  for (const { key } of ENTITY_TABLES) {
    const rows = entities[key] ?? [];
    sanitized[key] = rows.map(stripSensitiveFields);
  }

  const counts = {} as Record<keyof PersonalExportEntityBucket, number>;
  for (const { key } of ENTITY_TABLES) {
    counts[key] = sanitized[key].length;
  }

  const apiKeysMeta = (extras.api_keys_metadata ?? []).map(stripSensitiveFields);

  return {
    schema_version: PERSONAL_EXPORT_SCHEMA_VERSION,
    exported_at: extras.exportedAt ?? new Date().toISOString(),
    user_id: userId,
    entities: sanitized,
    settings: stripSensitiveFields(extras.settings ?? null),
    ai_access: stripSensitiveFields(extras.ai_access ?? null),
    api_keys_metadata: apiKeysMeta,
    meta: {
      counts,
      files: [
        "manifest.json",
        "areas.json",
        "goals.json",
        "projects.json",
        "tasks.json",
        "notes.json",
        "resources.json",
        "topics.json",
        "contacts.json",
        "settings.json",
        "ai-access.json",
        "api-keys-metadata.json",
      ],
    },
  };
}

export function stripSensitiveFields(row: unknown): unknown {
  if (row === null || row === undefined) return row;
  if (Array.isArray(row)) return row.map(stripSensitiveFields);
  if (typeof row !== "object") return row;
  const copy: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(k) || k.toLowerCase() === "key_hash") continue;
    // Never export a field that looks like a raw sop_ secret
    if (typeof v === "string" && /^sop_[1-9A-HJ-NP-Za-km-z]{20,}$/.test(v)) {
      continue;
    }
    copy[k] = typeof v === "object" ? stripSensitiveFields(v) : v;
  }
  return copy;
}

export function assertExportHasNoSecrets(payload: unknown): void {
  const json = JSON.stringify(payload);
  if (json.includes("key_hash")) {
    throw new Error("Export must not contain key_hash");
  }
  if (/\bsop_[1-9A-HJ-NP-Za-km-z]{20,}\b/.test(json)) {
    throw new Error("Export must not contain raw API keys");
  }
}

/**
 * Loads all primary entities for `userId` via the provided client.
 */
export async function exportPersonalDataForUser(
  userId: string,
  supabase: SupabaseClient,
): Promise<PersonalDataExport> {
  const entities = emptyBucket();

  for (const { key, table } of ENTITY_TABLES) {
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .eq("user_id", userId);
    if (error) {
      throw new DatabaseError(`export failed reading ${table}: ${error.message}`);
    }
    entities[key] = data ?? [];
  }

  // Best-effort extras — missing tables/env/clients must not block core entity export.
  let settingsRows: unknown[] = [];
  let apiKeysMeta: unknown[] = [];
  let ai_access: unknown = null;
  try {
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      const admin = createAdminClient();
      const { data } = await admin
        .from("user_settings")
        .select("key, value, updated_at")
        .eq("user_id", userId);
      settingsRows = data ?? [];
      try {
        const keys = await listApiKeys(userId);
        apiKeysMeta = keys.map(toPublicApiKeyRecord);
      } catch {
        /* optional */
      }
      try {
        ai_access = await getAiAccessSettings(userId);
      } catch {
        /* optional */
      }
    }
  } catch {
    /* optional in unit tests / misconfigured envs */
  }

  const payload = buildPersonalDataExport(userId, entities, {
    settings: settingsRows,
    ai_access,
    api_keys_metadata: apiKeysMeta,
  });
  assertExportHasNoSecrets(payload);
  return payload;
}

function emptyBucket(): PersonalExportEntityBucket {
  return {
    areas: [],
    goals: [],
    projects: [],
    tasks: [],
    notes: [],
    resources: [],
    topics: [],
    contacts: [],
  };
}

/** Sync export job record (interim without object storage). */
export async function createAndCompleteSyncExportJob(
  userId: string,
  payload: PersonalDataExport,
): Promise<{ id: string; status: string; payload: PersonalDataExport }> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const expires = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from("data_export_jobs")
    .insert({
      user_id: userId,
      status: "completed",
      requested_at: now,
      completed_at: now,
      expires_at: expires,
      error_code: null,
      // Inline JSON for beta sync path (no private bucket required).
      result_json: payload,
    })
    .select("id, status")
    .single();

  if (error) {
    // If table missing, still return ephemeral job for API consumers
    if (error.message.includes("does not exist") || error.code === "42P01") {
      return {
        id: `ephemeral_${Date.now()}`,
        status: "completed",
        payload,
      };
    }
    throw new DatabaseError(error.message);
  }

  return {
    id: data.id as string,
    status: data.status as string,
    payload,
  };
}

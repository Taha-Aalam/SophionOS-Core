/**
 * Personal data export — pure shaping + optional Supabase fetch.
 * Never includes raw API key secrets or key_hash values.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { DatabaseError } from "@/lib/api/error-handler";

export const PERSONAL_EXPORT_SCHEMA_VERSION = 1 as const;

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
  meta: {
    /** Counts only; safe for logs */
    counts: Record<keyof PersonalExportEntityBucket, number>;
  };
};

const ENTITY_TABLES: Array<{ key: keyof PersonalExportEntityBucket; table: string }> = [
  { key: "areas", table: "areas" },
  { key: "goals", table: "goals" },
  { key: "projects", table: "projects" },
  { key: "tasks", table: "tasks" },
  { key: "notes", table: "notes" },
  { key: "resources", table: "resources" },
  { key: "topics", table: "topics" },
  { key: "contacts", table: "contacts" },
];

/**
 * Builds a portable JSON export document from already-fetched entity arrays.
 * Filters out any accidental key material fields from api-key-like rows.
 */
export function buildPersonalDataExport(
  userId: string,
  entities: PersonalExportEntityBucket,
  exportedAt: string = new Date().toISOString(),
): PersonalDataExport {
  if (!userId || typeof userId !== "string") {
    throw new Error("userId is required for personal data export");
  }

  const sanitized = {} as PersonalExportEntityBucket;
  for (const { key } of ENTITY_TABLES) {
    const rows = entities[key] ?? [];
    sanitized[key] = rows.map(stripSensitiveFields);
  }

  const counts = {} as Record<keyof PersonalExportEntityBucket, number>;
  for (const { key } of ENTITY_TABLES) {
    counts[key] = sanitized[key].length;
  }

  return {
    schema_version: PERSONAL_EXPORT_SCHEMA_VERSION,
    exported_at: exportedAt,
    user_id: userId,
    entities: sanitized,
    meta: { counts },
  };
}

function stripSensitiveFields(row: unknown): unknown {
  if (!row || typeof row !== "object" || Array.isArray(row)) return row;
  const copy = { ...(row as Record<string, unknown>) };
  delete copy.key_hash;
  delete copy.raw_key;
  delete copy.secret;
  delete copy.password;
  return copy;
}

/**
 * Loads all primary entities for `userId` via the provided client.
 * Callers must pass a client that is already scoped (RLS user JWT or
 * admin + filter). This function always `.eq("user_id", userId)`.
 */
export async function exportPersonalDataForUser(
  userId: string,
  supabase: SupabaseClient,
): Promise<PersonalDataExport> {
  const entities = emptyBucket();

  for (const { key, table } of ENTITY_TABLES) {
    const { data, error } = await supabase.from(table).select("*").eq("user_id", userId);
    if (error) {
      throw new DatabaseError(`export failed reading ${table}: ${error.message}`);
    }
    entities[key] = data ?? [];
  }

  return buildPersonalDataExport(userId, entities);
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

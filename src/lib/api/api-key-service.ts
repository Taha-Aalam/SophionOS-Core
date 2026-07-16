import { createHash, randomBytes } from "crypto";
import { createAdminClient } from "../supabase/admin";
import { DatabaseError, NotFoundError, ValidationError } from "./error-handler";
import {
  defaultAccessModeForClientType,
  deriveKeyPrefix,
  type ApiKeyAccessMode,
  type ApiKeyClientType,
} from "./ai-access-policy";

const KEY_PREFIX = "sop_";
const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const RAW_KEY_LENGTH = 48;
/** Beta limit on concurrent active keys per user. */
export const MAX_ACTIVE_API_KEYS = 5;

const SAFE_SELECT =
  "id, user_id, name, key_prefix, client_type, client_name, access_mode, scopes, last_used_at, last_used_user_agent, expires_at, created_at, revoked_at, revoke_reason";

/** SHA-256 hex digest used for API key storage and lookup. */
export function hashApiKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function sha256Hex(value: string): string {
  return hashApiKey(value);
}

function randomBase58(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += BASE58_ALPHABET[bytes[i] % BASE58_ALPHABET.length];
  }
  return out;
}

export interface ApiKeyRecord {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string | null;
  client_type: ApiKeyClientType | string;
  client_name: string | null;
  access_mode: ApiKeyAccessMode | string;
  scopes: string[];
  last_used_at: string | null;
  last_used_user_agent: string | null;
  expires_at: string | null;
  created_at: string;
  revoked_at: string | null;
  revoke_reason: string | null;
}

export type ApiKeyStatus = "active" | "revoked" | "expired";

export function apiKeyStatus(record: Pick<ApiKeyRecord, "revoked_at" | "expires_at">): ApiKeyStatus {
  if (record.revoked_at) return "revoked";
  if (record.expires_at && new Date(record.expires_at).getTime() < Date.now()) {
    return "expired";
  }
  return "active";
}

/** List/detail DTO — never includes key_hash or raw key. */
export function toPublicApiKeyRecord(
  record: ApiKeyRecord,
): ApiKeyRecord & { status: ApiKeyStatus } {
  return {
    ...record,
    scopes: record.scopes ?? [],
    status: apiKeyStatus(record),
  };
}

export interface GenerateApiKeyInput {
  name: string;
  clientType?: ApiKeyClientType;
  clientName?: string | null;
  accessMode?: ApiKeyAccessMode;
  scopes?: string[];
  expiresAt?: string | null;
}

/**
 * Generates a new API key for a user. Returns the RAW key (the only time it is
 * ever visible) plus the stored record. Only the sha256 hash is persisted.
 */
export async function generateApiKey(
  userId: string,
  nameOrInput: string | GenerateApiKeyInput,
  expiresAtLegacy?: string | null,
): Promise<{ key: string; record: ApiKeyRecord }> {
  const input: GenerateApiKeyInput =
    typeof nameOrInput === "string"
      ? { name: nameOrInput, expiresAt: expiresAtLegacy }
      : nameOrInput;

  const name = input.name?.trim();
  if (!name || name.length < 1 || name.length > 80) {
    throw new ValidationError("name is required (1–80 characters)");
  }

  const clientType: ApiKeyClientType = input.clientType ?? "unknown";
  const accessMode: ApiKeyAccessMode =
    input.accessMode ?? defaultAccessModeForClientType(clientType);
  const scopes = input.scopes ?? [];

  const admin = createAdminClient();

  const { count, error: countError } = await admin
    .from("api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("revoked_at", null);

  if (countError) {
    throw new DatabaseError(countError.message);
  }
  if ((count ?? 0) >= MAX_ACTIVE_API_KEYS) {
    throw new ValidationError(
      `You can have at most ${MAX_ACTIVE_API_KEYS} active API keys. Revoke one before creating another.`,
    );
  }

  const rawKey = `${KEY_PREFIX}${randomBase58(RAW_KEY_LENGTH)}`;
  const keyHash = sha256Hex(rawKey);
  const keyPrefix = deriveKeyPrefix(rawKey);

  const { data, error } = await admin
    .from("api_keys")
    .insert({
      user_id: userId,
      name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      client_type: clientType,
      client_name: input.clientName ?? null,
      access_mode: accessMode,
      scopes,
      expires_at: input.expiresAt ?? null,
    })
    .select(SAFE_SELECT)
    .single();

  if (error) {
    throw new DatabaseError(error.message);
  }

  return { key: rawKey, record: normalizeRecord(data) };
}

function normalizeRecord(data: unknown): ApiKeyRecord {
  const row = data as Record<string, unknown>;
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    name: String(row.name),
    key_prefix: (row.key_prefix as string | null) ?? null,
    client_type: (row.client_type as string) ?? "unknown",
    client_name: (row.client_name as string | null) ?? null,
    access_mode: (row.access_mode as string) ?? "read_only",
    scopes: Array.isArray(row.scopes) ? (row.scopes as string[]) : [],
    last_used_at: (row.last_used_at as string | null) ?? null,
    last_used_user_agent: (row.last_used_user_agent as string | null) ?? null,
    expires_at: (row.expires_at as string | null) ?? null,
    created_at: String(row.created_at),
    revoked_at: (row.revoked_at as string | null) ?? null,
    revoke_reason: (row.revoke_reason as string | null) ?? null,
  };
}

export interface ValidatedApiKey {
  userId: string;
  keyId: string;
  accessMode: ApiKeyAccessMode | string;
  clientType: string;
  clientName: string | null;
}

/**
 * Validates a raw API key. Returns identity + access mode if the key exists,
 * is not revoked, and is not expired; otherwise null. Updates `last_used_at`.
 * Uses the admin client because an API-key request carries no Clerk JWT.
 *
 * Never logs the raw key or Authorization header.
 */
export async function validateApiKey(
  key: string,
): Promise<ValidatedApiKey | null> {
  if (!key.startsWith(KEY_PREFIX)) {
    return null;
  }

  const keyHash = sha256Hex(key);
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("api_keys")
    .select(
      "id, user_id, expires_at, revoked_at, access_mode, client_type, client_name",
    )
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error) {
    throw new DatabaseError(error.message);
  }
  if (!data) {
    return null;
  }
  if (data.revoked_at) {
    return null;
  }
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return null;
  }

  // Best-effort touch; a failed update must not block a valid request.
  await admin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return {
    userId: data.user_id as string,
    keyId: data.id as string,
    accessMode: (data.access_mode as string) ?? "read_only",
    clientType: (data.client_type as string) ?? "unknown",
    clientName: (data.client_name as string | null) ?? null,
  };
}

/**
 * Lists a user's API keys (active by default). Never returns the key_hash.
 */
export async function listApiKeys(
  userId: string,
  options?: { includeRevoked?: boolean },
): Promise<ApiKeyRecord[]> {
  let query = createAdminClient()
    .from("api_keys")
    .select(SAFE_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!options?.includeRevoked) {
    query = query.is("revoked_at", null);
  }

  const { data, error } = await query;

  if (error) {
    throw new DatabaseError(error.message);
  }
  return ((data as unknown[]) ?? []).map(normalizeRecord);
}

export interface UpdateApiKeyInput {
  name?: string;
  accessMode?: ApiKeyAccessMode;
  clientName?: string | null;
  scopes?: string[];
  expiresAt?: string | null;
}

/**
 * Updates mutable trust fields on a key owned by the user.
 */
export async function updateApiKey(
  userId: string,
  keyId: string,
  patch: UpdateApiKeyInput,
): Promise<ApiKeyRecord> {
  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (!name || name.length > 80) {
      throw new ValidationError("name must be 1–80 characters");
    }
    update.name = name;
  }
  if (patch.accessMode !== undefined) update.access_mode = patch.accessMode;
  if (patch.clientName !== undefined) update.client_name = patch.clientName;
  if (patch.scopes !== undefined) update.scopes = patch.scopes;
  if (patch.expiresAt !== undefined) update.expires_at = patch.expiresAt;

  if (Object.keys(update).length === 0) {
    throw new ValidationError("No fields to update");
  }

  const { data, error } = await createAdminClient()
    .from("api_keys")
    .update(update)
    .eq("id", keyId)
    .eq("user_id", userId)
    .is("revoked_at", null)
    .select(SAFE_SELECT)
    .maybeSingle();

  if (error) {
    throw new DatabaseError(error.message);
  }
  if (!data) {
    throw new NotFoundError("ApiKey", keyId);
  }
  return normalizeRecord(data);
}

/**
 * Revokes a key by id, scoped to its owner. Throws NotFoundError if the key
 * does not exist or is not owned by the user.
 */
export async function revokeApiKey(
  userId: string,
  keyId: string,
  reason?: string,
): Promise<void> {
  const { data, error } = await createAdminClient()
    .from("api_keys")
    .update({
      revoked_at: new Date().toISOString(),
      revoke_reason: reason ?? "user_revoked",
    })
    .eq("id", keyId)
    .eq("user_id", userId)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new DatabaseError(error.message);
  }
  if (!data) {
    throw new NotFoundError("ApiKey", keyId);
  }
}

/**
 * Revokes all active keys for a user. Returns how many rows were revoked.
 */
export async function revokeAllApiKeysForUser(
  userId: string,
  reason = "disable_all_ai_access",
): Promise<number> {
  const { data, error } = await createAdminClient()
    .from("api_keys")
    .update({
      revoked_at: new Date().toISOString(),
      revoke_reason: reason,
    })
    .eq("user_id", userId)
    .is("revoked_at", null)
    .select("id");

  if (error) {
    throw new DatabaseError(error.message);
  }
  return data?.length ?? 0;
}

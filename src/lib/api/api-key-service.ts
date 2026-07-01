import { createHash, randomBytes } from "crypto";
import { createAdminClient } from "../supabase/admin";
import { DatabaseError, NotFoundError } from "./error-handler";

const KEY_PREFIX = "lif_";
const BASE58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const RAW_KEY_LENGTH = 48;

function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function randomBase58(length: number): string {
  // Rejection-free mapping: read a byte per char and mod into the alphabet.
  // 58 does not divide 256 evenly so there is a tiny modulo bias, acceptable
  // for a 48-char key (282 bits of entropy before bias).
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
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

/**
 * Generates a new API key for a user. Returns the RAW key (the only time it is
 * ever visible) plus the stored record. Only the sha256 hash is persisted.
 */
export async function generateApiKey(
  userId: string,
  name: string,
): Promise<{ key: string; record: ApiKeyRecord }> {
  const rawKey = `${KEY_PREFIX}${randomBase58(RAW_KEY_LENGTH)}`;
  const keyHash = sha256Hex(rawKey);

  const { data, error } = await createAdminClient()
    .from("api_keys")
    .insert({ user_id: userId, name, key_hash: keyHash })
    .select("id, user_id, name, last_used_at, expires_at, created_at, revoked_at")
    .single();

  if (error) {
    throw new DatabaseError(error.message);
  }

  return { key: rawKey, record: data as ApiKeyRecord };
}

/**
 * Validates a raw API key. Returns `{ userId, keyId }` if the key exists, is
 * not revoked, and is not expired; otherwise null. Updates `last_used_at`.
 * Uses the admin client because an API-key request carries no Clerk JWT — the
 * key hash is the auth context.
 */
export async function validateApiKey(
  key: string,
): Promise<{ userId: string; keyId: string } | null> {
  if (!key.startsWith(KEY_PREFIX)) {
    return null;
  }

  const keyHash = sha256Hex(key);
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("api_keys")
    .select("id, user_id, expires_at, revoked_at")
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

  return { userId: data.user_id, keyId: data.id };
}

/**
 * Lists a user's non-revoked API keys. Never returns the key_hash.
 */
export async function listApiKeys(userId: string): Promise<ApiKeyRecord[]> {
  const { data, error } = await createAdminClient()
    .from("api_keys")
    .select("id, user_id, name, last_used_at, expires_at, created_at, revoked_at")
    .eq("user_id", userId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new DatabaseError(error.message);
  }
  return (data as ApiKeyRecord[]) ?? [];
}

/**
 * Revokes a key by id, scoped to its owner. Throws NotFoundError if the key
 * does not exist or is not owned by the user.
 */
export async function revokeApiKey(userId: string, keyId: string): Promise<void> {
  const { data, error } = await createAdminClient()
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
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

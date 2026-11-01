import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

// AES-256-GCM authenticated encryption for provider API keys at rest.
//
// Payload format: `v1:<iv_base64>:<tag_base64>:<ciphertext_base64>`.
// The key is derived (sha256) from PROVIDER_KEY_ENCRYPTION_SECRET, which must
// be >= 32 chars. Fail closed: every call re-reads the env var and throws when
// it is missing or short — a misprovisioned secret must stop writes, not
// silently store plaintext.
//
// Node >= 26 rejects GCM tag lengths other than 128 bits unless the
// `authTagLength` option was set at cipher/decipher creation; we pin 16 bytes
// explicitly on both sides so encrypt/decrypt always agree.
// Source: https://nodejs.org/api/crypto.html#ciphergetauthtag
//         https://nodejs.org/api/crypto.html#deciphersetauthtagbuffer
const VERSION = "v1";
const IV_LENGTH = 12; // GCM standard 96-bit IV
const AUTH_TAG_LENGTH = 16;
const MIN_SECRET_LENGTH = 32;
const ALGORITHM = "aes-256-gcm";

function deriveKey(): Buffer {
  const secret = process.env.PROVIDER_KEY_ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error(
      "PROVIDER_KEY_ENCRYPTION_SECRET is not set — refusing to handle provider secrets",
    );
  }
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      "PROVIDER_KEY_ENCRYPTION_SECRET must be at least 32 characters",
    );
  }
  return createHash("sha256").update(secret, "utf8").digest();
}

export function encryptSecret(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptSecret(payload: string): string {
  const key = deriveKey(); // also enforces the env contract on read paths
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Malformed secret payload");
  }
  const iv = Buffer.from(parts[1] ?? "", "base64");
  const tag = Buffer.from(parts[2] ?? "", "base64");
  const ciphertext = Buffer.from(parts[3] ?? "", "base64");
  if (iv.length !== IV_LENGTH || tag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Malformed secret payload");
  }
  const decipher = createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(tag); // must precede final() for GCM
  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(), // throws when the tag or ciphertext was tampered with
  ]);
  return plaintext.toString("utf8");
}

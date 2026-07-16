import { AUDIT_BANNED_METADATA_KEYS } from "./audit-types";

const BANNED_SET = new Set<string>(
  AUDIT_BANNED_METADATA_KEYS.map((k) => k.toLowerCase()),
);

/** Matches raw API keys and long bearer-like secrets in string values. */
const SECRET_VALUE_RE =
  /\bsop_[1-9A-HJ-NP-Za-km-z]{16,}\b|Bearer\s+\S{20,}|sk_[a-zA-Z0-9_]{20,}/gi;

/**
 * Deep-redact banned keys and secret-shaped values from audit metadata.
 * Pure function — unit tested without DB.
 */
export function redactAuditMetadata(
  input: Record<string, unknown> | null | undefined,
  depth = 0,
): Record<string, unknown> {
  if (!input || typeof input !== "object" || depth > 6) {
    return {};
  }

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (BANNED_SET.has(key.toLowerCase())) {
      continue;
    }
    if (value === null || value === undefined) {
      out[key] = value;
      continue;
    }
    if (typeof value === "string") {
      out[key] = value.replace(SECRET_VALUE_RE, "[redacted]");
      continue;
    }
    if (typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
      continue;
    }
    if (Array.isArray(value)) {
      out[key] = value.slice(0, 50).map((item) => {
        if (item && typeof item === "object" && !Array.isArray(item)) {
          return redactAuditMetadata(item as Record<string, unknown>, depth + 1);
        }
        if (typeof item === "string") {
          return item.replace(SECRET_VALUE_RE, "[redacted]");
        }
        return item;
      });
      continue;
    }
    if (typeof value === "object") {
      out[key] = redactAuditMetadata(
        value as Record<string, unknown>,
        depth + 1,
      );
    }
  }
  return out;
}

export function summarizeUserAgent(ua: string | null | undefined): string | null {
  if (!ua) return null;
  return ua.slice(0, 120);
}

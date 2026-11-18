import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { AppError } from "@/lib/api/error-handler";

/**
 * Shared fetch-destination guard for tenant-supplied provider base URLs
 * (audit sophionos-core-20261117-r1 finding F2). The schema layer rejects
 * literal private hosts at parse time; this module re-checks at fetch time —
 * including DNS resolution, so a public-looking hostname that resolves into a
 * private/loopback/link-local range (DNS rebinding) is denied too.
 */

const PRIVATE_HOSTNAME_PATTERN =
  /^(localhost$|127\.|0\.|10\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i;

export function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  if (isIP(address) === 6) {
    const lower = address.toLowerCase();
    return lower === "::" || lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80");
  }
  return false;
}

export function isPrivateHostname(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (PRIVATE_HOSTNAME_PATTERN.test(host)) return true;
  if (isIP(host) !== 0) return isPrivateAddress(host);
  return false;
}

/**
 * Validate that a URL is a public https endpoint: https scheme only, literal
 * private hostnames denied, and DNS resolution denied when every address is
 * private/loopback/link-local. Returns the parsed URL so callers fetch exactly
 * what was validated.
 */
export async function assertFetchableProviderUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new AppError("Provider base URL is not a valid URL", 400, "BASE_URL_INVALID");
  }
  if (url.protocol !== "https:") {
    throw new AppError("Provider base URL must use https", 400, "BASE_URL_INSECURE");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (isIP(host) !== 0) {
    if (isPrivateAddress(host)) {
      throw new AppError("Provider base URL must not target a private address", 400, "BASE_URL_PRIVATE");
    }
    return url;
  }
  if (isPrivateHostname(host)) {
    throw new AppError("Provider base URL must not target a private address", 400, "BASE_URL_PRIVATE");
  }
  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(host, { all: true });
  } catch {
    throw new AppError("Provider base URL does not resolve", 400, "BASE_URL_UNRESOLVED");
  }
  if (addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new AppError("Provider base URL must not target a private address", 400, "BASE_URL_PRIVATE");
  }
  return url;
}

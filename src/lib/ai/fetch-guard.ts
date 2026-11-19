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

/**
 * Decode the embedded IPv4 of IPv4-mapped (::ffff:0:0/96) and NAT64
 * (64:ff9b::/96) IPv6 addresses. isIP() classifies these as IPv6, so without
 * this normalization the embedded private/link-local/metadata IPv4 would
 * bypass the range check (delivery-review finding on audit F2). Handles both
 * dotted-quad tails (::ffff:127.0.0.1) and WHATWG-normalized hex forms
 * ([::ffff:7f00:1]).
 */
function ipv6Groups(address: string): number[] | null {
  let addr = address.toLowerCase().replace(/^\[|\]$/g, "");
  const dotted = /(\d{1,3}(?:\.\d{1,3}){3})$/.exec(addr);
  if (dotted) {
    const octets = dotted[1].split(".").map(Number);
    if (octets.length !== 4 || octets.some((o) => o > 255)) return null;
    const hexTail = `${((octets[0] << 8) | octets[1]).toString(16)}:${((octets[2] << 8) | octets[3]).toString(16)}`;
    addr = addr.slice(0, dotted.index) + hexTail;
  }
  if (!addr.includes(":")) return null;
  let parts: number[];
  if (addr.includes("::")) {
    if (addr.split("::").length > 2) return null;
    const [left, right] = addr.split("::");
    const head = left ? left.split(":").map((x) => parseInt(x || "0", 16)) : [];
    const tail = right ? right.split(":").map((x) => parseInt(x || "0", 16)) : [];
    if (head.some(Number.isNaN) || tail.some(Number.isNaN)) return null;
    const fill = 8 - head.length - tail.length;
    if (fill < 0) return null;
    parts = [...head, ...Array<number>(fill).fill(0), ...tail];
  } else {
    parts = addr.split(":").map((x) => parseInt(x || "0", 16));
  }
  if (parts.length !== 8 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 0xffff)) return null;
  return parts;
}

function normalizeIp(address: string): string {
  const lower = address.toLowerCase();
  if (isIP(lower) !== 6) return lower;
  const groups = ipv6Groups(lower);
  if (!groups) return address;
  const isMapped = groups.slice(0, 5).every((n) => n === 0) && groups[5] === 0xffff;
  const isNat64 = groups[0] === 0x64 && groups[1] === 0xff9b && groups.slice(2, 6).every((n) => n === 0);
  if (isMapped || isNat64) {
    const hi = groups[6];
    const lo = groups[7];
    return `${(hi >> 8) & 0xff}.${hi & 0xff}.${(lo >> 8) & 0xff}.${lo & 0xff}`;
  }
  return lower;
}

export function isPrivateAddress(address: string): boolean {
  const addr = normalizeIp(address);
  if (isIP(addr) === 4) {
    const [a, b] = addr.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  if (isIP(addr) === 6) {
    const lower = addr.toLowerCase();
    return (
      lower === "::" ||
      lower === "::1" ||
      lower.startsWith("fc") ||
      lower.startsWith("fd") ||
      lower.startsWith("fe80")
    );
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

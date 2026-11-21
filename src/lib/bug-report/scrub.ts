/**
 * Scrub-at-capture: every string that enters the bug-report buffer passes
 * through here BEFORE anything is stored (memory or localStorage).
 *
 * Rules (see docs/bug-report.md):
 *  - URLs are reduced to pathname only; query strings and hashes never survive.
 *  - Token-shaped content is masked: UUIDs, hex/base64 runs of 32+ chars,
 *    JWTs, key=value secret pairs, and the segment after share/invite/token
 *    style path prefixes.
 *  - Email addresses are masked.
 *
 * If a data source cannot be scrubbed to safety, the caller must exclude the
 * source — never weaken a rule.
 */

/** Path prefixes whose next segment is a credential (share/invite links). */
const TOKEN_PATH_PREFIX =
  /(\/(?:share|shares|invite|invites|token|tokens|join|reset|verify|auth)\/)[^/\s?#"')\]]+/gi;

const EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;

const JWT = /\beyJ[a-zA-Z0-9_-]{5,}\.[a-zA-Z0-9_-]{5,}\.[a-zA-Z0-9_-]{2,}/g;

/** Hex or base64/base64url runs of 32+ chars — keys, hashes, opaque tokens. */
const LONG_TOKEN_RUN = /[A-Za-z0-9+/_=-]{32,}/g;

/**
 * key=value pairs whose key smells like a secret. The WHOLE pair is replaced
 * (key included) so even the substring "token=" never reaches a report.
 */
const SECRET_PAIR =
  /\b[\w-]*(?:token|secret|password|passwd|api[-_]?key|session|cookie|authorization|credential)[\w-]*=[^\s&"')\]]+/gi;

/**
 * Query/hash tails on relative path-like tokens (no scheme needed).
 * Backslash is a delimiter too: WHATWG URL parsing treats `\` as `/`, so a
 * stack line like /path\?token=x must not keep the tail.
 */
const RELATIVE_URL_TAIL = /(\/[^\s?#\\"')\]]*)[?#][^\s"')\]]*/g;

/** Absolute URLs (any scheme) → pathname only. Unparseable URLs are dropped. */
function reduceUrls(text: string): string {
  return (
    text
      // mailto: carries the address and a query of user-typed content —
      // reduce the whole thing, there is no safe pathname to keep.
      .replace(/\bmailto:[^\s"'<>)\]]+/gi, "mailto:[email]")
      // Any scheme (https, wss, ftp, custom): keep only the pathname.
      .replace(/\b[a-z][a-z0-9+.-]*:\/\/[^\s"'<>)\]]+/gi, (match) => {
        try {
          return new URL(match).pathname;
        } catch {
          // Not a URL we can safely reduce — exclude it rather than guess.
          return "[url]";
        }
      })
      // Protocol-relative //host/path?query — same treatment.
      .replace(/(^|[\s("'=])\/\/[^\s"'<>)\]]+/g, (match, lead: string) => {
        try {
          return lead + new URL(`https:${match.slice(lead.length)}`).pathname;
        } catch {
          return `${lead}[url]`;
        }
      })
  );
}

/** Mask token-shaped content in an already pathname-only string. */
function maskTokens(text: string): string {
  return text
    .replace(TOKEN_PATH_PREFIX, "$1[redacted]")
    .replace(SECRET_PAIR, "[redacted]")
    .replace(EMAIL, "[email]")
    .replace(UUID, "[id]")
    .replace(JWT, "[jwt]")
    .replace(LONG_TOKEN_RUN, "[redacted]");
}

/**
 * Scrub arbitrary text (error messages, stack lines). URLs lose query/hash,
 * relative paths lose query/hash, secrets and PII are masked.
 */
export function scrubText(text: string): string {
  if (!text) return text;
  return maskTokens(reduceUrls(text).replace(RELATIVE_URL_TAIL, "$1"));
}

/**
 * Scrub a route pathname. Query string and hash are stripped unconditionally
 * (callers should pass location.pathname, but a full URL is tolerated safely).
 */
export function scrubPathname(pathname: string): string {
  if (!pathname) return "";
  let pathOnly = pathname.split(/[?#]/, 1)[0];
  // A full URL passed by mistake: reduce to its pathname, never keep origin.
  // Backslashes normalised first — WHATWG URL treats them as slashes.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(pathOnly) || pathOnly.startsWith("//")) {
    try {
      const normalised = pathOnly.replace(/\\/g, "/");
      pathOnly = new URL(normalised.startsWith("//") ? `https:${normalised}` : normalised).pathname;
    } catch {
      return "";
    }
  }
  return maskTokens(pathOnly);
}

// Vendored replacement for the deprecated Clerk `createRouteMatcher` /
// `@clerk/shared` `createPathMatcher` engine, kept at behavioral parity with
// @clerk/shared@4.25.6. The spec is the golden table in
// tests/unit/proxy-path-matcher.test.ts, captured from the live Clerk engine
// before migration. Clerk plans to remove theirs in its next major release;
// src/proxy.ts owns these matchers.

/**
 * Thrown for invalid percent-encoding (e.g. '/login%zz'). Parity with Clerk's
 * MalformedURLError (statusCode 400): clerkMiddleware's control-flow handler
 * detects it via isMalformedURLError (a string check on `e.name`, so it works
 * across bundles) and answers 400. Our proxy throws the same-named error so
 * that handler converts it identically.
 */
export class MalformedURLError extends Error {
  readonly statusCode = 400;
  constructor(pathname: string, cause?: unknown) {
    super(`Malformed encoding in URL path: ${pathname}`, { cause });
    this.name = "MalformedURLError";
  }
}

/**
 * Normalizes a path before matching — parity with @clerk/shared normalizePath:
 * decodeURI (preserves reserved delimiters like %2F/%23/%3F; throws
 * MalformedURLError on invalid encoding) then collapse consecutive slashes so
 * '//api//x' cannot bypass an '/api' rule.
 */
export function normalizeRequestPath(pathname: string): string {
  try {
    pathname = decodeURI(pathname);
  } catch (e) {
    throw new MalformedURLError(pathname, e);
  }
  return pathname.replace(/\/\/+/g, "/");
}

/** Match a pathname against a set of route patterns (any match wins). */
export function createPathMatcher(patterns: readonly string[]): (pathname: string) => boolean {
  const compiled = patterns.map((pattern) => {
    // 'prefix(.*)' compiles (path-to-regexp) to: the prefix itself OR the
    // prefix followed by anything — including glued suffixes (/loginfoo).
    if (pattern.endsWith("(.*)")) {
      const prefix = pattern.slice(0, -"(.*)".length);
      return (pathname: string) => pathname.startsWith(prefix);
    }
    return (pathname: string) => pathname === pattern;
  });
  return (pathname: string) => {
    const normalized = normalizeRequestPath(pathname);
    return compiled.some((test) => test(normalized));
  };
}

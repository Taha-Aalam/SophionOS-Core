import { RELEASE_TAG } from "./release";

/**
 * Adds the release fingerprint to any JSON response body. `meta` is additive,
 * so existing consumers of `{ data }` / `{ error }` are unaffected.
 */
export function withReleaseMeta<T extends object>(
  body: T,
): T & { meta: { ver: string } } {
  return { ...body, meta: { ver: RELEASE_TAG } };
}

/** Value for the `X-Sophonios-Release` response header on error responses. */
export function releaseHeader(): string {
  return RELEASE_TAG;
}

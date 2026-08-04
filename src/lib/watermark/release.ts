/**
 * Passive fingerprint tags (AGPL clone detection).
 *
 * `RELEASE_TAG` is embedded in every API response envelope and error header.
 * `GENERATOR_TAG` is embedded in the HTML <meta name="generator"> tag.
 * They are deliberately different so a clone's API surface and HTML can be
 * cross-checked independently, and both are rotated per release.
 *
 * WARNING: these strings ARE the fingerprint. When bumping, update the
 * gitignored canaries.manifest.json BEFORE committing the new value.
 */
export const RELEASE_TAG = "sphn-0x2f9c";
export const GENERATOR_TAG = "sophonios-2026.3";

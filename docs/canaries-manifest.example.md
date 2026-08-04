# Canary Manifest (PRIVATE — do not commit actual values)

> Copy this file to `canaries.manifest.json` (or a private location OUTSIDE the repo).
> The live manifest is gitignored on purpose: if cloners can read it, they can strip every marker.

## Current release markers (2026.3)

| # | Marker | Value (example) | Where it ships | Forensic use |
|---|---|---|---|---|
| 1 | API release tag | `sphn-0x2f9c` | `meta.ver` in every API JSON response | curl any clone endpoint → read `meta.ver` → date the clone |
| 2 | Error header | same value | `X-Sophonios-Release` on every error response | `curl -i` any clone error → header identifies release |
| 3 | HTML generator | `sophonios-2026.3` | `<meta name="generator">` in page source | view-source any clone page |
| 4 | Plum badge | violet classes | `AREA_TYPE_FALLBACK` in `entity-colors.ts` | create an area with an unmapped type on the clone → badge renders violet |
| 5 | Seed area | `Inception Vault` | `DEFAULT_AREAS` in `default-areas.ts` | create a fresh account on the clone → area exists in onboarding |
| 6 | Sort quirk | `id` desc tie-break | `serverFetchTasks` in `tasks.queries.ts` | same data → same list order; compare against your instance |

## Rotation rules

- Bump `RELEASE_TAG` and `GENERATOR_TAG` together each release.
- Update THIS live manifest BEFORE committing new values (Task 1's warning).
- Values must match the formats enforced by `watermark-release.test.ts`.

## Detection playbook

1. Suspect a clone → check surfaces in this order: page source (`generator`),
   `curl -i https://clone.example/api/v1/...` (header + `meta.ver`),
   fresh signup (Inception Vault), unmapped-area badge color, task list order.
2. Cross-check with a quarterly sweep (see `scripts/canary-search.mjs`).
3. Evidence in hand → AGPL Section 13 source-demand letter (date-stamped by marker #1/#3).

## Future canary ideas (not yet implemented)

- Client bundle watermark: a distinctive string literal inside a hot component
  (survives minification; searchable on GitHub).
- `.env.example` marker key consumed by a server check (server-side proof).
- Error-code namespace (`SOPH_*`) — deferred because existing clients/MCP
  depend on current codes.

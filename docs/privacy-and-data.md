# Privacy and data

This document is for self-hosters and evaluators. It is **not** a substitute for
legal counsel or a complete GDPR DPIA.

## What SophionOS stores

In the database **you configure** (typically Supabase Postgres), SophionOS
stores personal context such as:

- Areas, goals, projects, tasks
- Notes, resources, topics, contacts and relationship links
- User settings / preferences
- API key **hashes** (not raw secrets), metadata (name, expiry, last used, revoked)
- Optional subscription/tier fields used by Cloud-style feature gates

Content is associated with your **Clerk user id** (`user_id` text / JWT `sub`).

## Identity: Clerk

Clerk processes authentication (email, OAuth, sessions, user profile fields
you configure in Clerk). SophionOS receives Clerk session JWTs and uses the
`sub` claim for authorization and RLS.

Self-hosters choose their own Clerk application and region options available
from Clerk.

## Database: Supabase / Postgres

Hosted Supabase (or self-hosted Postgres via Supabase stack) stores application
data. Operators control backups, regions, and access to service-role keys.

**RLS** is the primary row isolation boundary for browser/session access.

## AI and third-party clients

SophionOS core does not automatically call OpenAI/Anthropic/etc. for your notes.

When **you** enable API keys / MCP:

| Actor | What they see |
|-------|----------------|
| SophionOS API | Authenticated requests; returns your data |
| MCP client | Whatever tools you authorize it to call |
| Model provider | Whatever the **client** sends (prompts, tool results) |

SophionOS cannot control retention policies of external AI clients or model
hosts. Revoke keys to cut off API access.

## Telemetry

SophionOS does not ship third-party product analytics. Hosting platforms may
still collect operational request logs per their own defaults.

## Export

Authenticated users can export their data as JSON:

- **HTTP:** `GET /api/v1/user/export` (Clerk session or valid API key; rate limited)
- Payload is produced by `buildPersonalDataExport` / `exportPersonalDataForUser`
  and includes core entities for the authenticated `user_id` only.

Raw API key secrets are never exported (only key metadata without hashes if included).

## Breach notification

The procedure for a personal data breach is `docs/breach-response.md`: contain
first, then notify, and preserve the evidence before anything is rotated,
revoked or deleted. That runbook is written for the one-person operation
behind the managed service, and it is the procedure a self-hosted operator
should follow too — for a self-hosted deployment the operator is the Data
Fiduciary, not SophionOS.

The commitment it executes is: *in the event of a personal data breach, we
will notify affected users and relevant authorities without undue delay, in
accordance with applicable law.* For the managed service that means:

- **India (DPDP Act 2023, DPDP Rules 2025).** We intimate the Data Protection
  Board of India and each affected Data Principal without delay.
- **EU/UK (GDPR).** We notify the relevant supervisory authority within 72
  hours of becoming aware of a personal data breach (Article 33), and affected
  users without undue delay where the breach is likely to result in high risk
  to their rights (Article 34).
- **United States.** We apply the same 72-hour target.

The published text is the Privacy Policy, section 11
(`src/app/(trust)/privacy/page.tsx`); the full jurisdiction notices are
section 13 (European users), 14 (U.S. state residents) and 15 (users in
India). The open questions for counsel — which authority, which threshold,
which deadline — live in `docs/breach-response-counsel-questions.md`.

## Deletion (self-host / Community)

| Layer | Behavior |
|-------|----------|
| Entity delete in UI/API | Soft-archive or hard-delete per entity service (see app behavior) |
| In-app account deletion | Settings → Privacy & data schedules deletion (`/api/v1/user/account-deletion`); after grace, finalize purges app data for `user_id`. Clerk user removal may still need operator action depending on config. |
| Full operator wipe | Delete remaining rows/backups for `user_id` and remove the user in Clerk. No automatic erase of arbitrary third-party processors you add. |
| API keys | Revoke in Settings → AI Access; revoked keys fail validation immediately. Disable-all AI revokes every active key. |
| Operator responsibility | Drop backups, logs, and replicas per your retention policy |

Sophion Cloud (if you use the commercial service) may offer additional
account-deletion workflows operated by the provider—that is separate from this
repository.

## Logs

Prefer redacting secrets, raw API keys, and full note bodies in application
logs. Do not commit logs containing personal data.

## Disabling AI access

1. Settings → AI Access → disable AI access / disable-all (revokes keys).
2. Disconnect MCP clients.
3. Do not create or share new keys.

## Boundary: code vs operator

Open-source code defines **how** the app behaves. **You** (or Cloud) choose
processors, network exposure, backup encryption, and legal basis for processing.
Do not claim “data never leaves your device” unless your deployment truly never
uses network identity, hosted DB, or remote AI clients.

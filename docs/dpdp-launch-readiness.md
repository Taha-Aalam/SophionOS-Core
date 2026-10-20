# DPDP compliance: launch readiness

Status as of **2026-10-20**, on `feat/policies-sidebar-mode`. This repository
is the open-source core; the managed service is cloud-side, and whoever runs a
deployment runs it (`docs/self-hosting.md`).

This file exists because the compliance build has a small number of items that
engineering **cannot** close, and shipping without them would mean publishing
something that claims to be compliant and is not. Each blocker below names who
owns it and what "done" looks like.

## Open blockers — the app must not launch with these unresolved

### 1. Grievance officer — RESOLVED 2026-10-20

The published Privacy Policy, section 9, designates the officer: **Taha
Aalam**, a sole proprietor trading as SophionOS, reachable at
`privacy@sophionos.com` (monitored) and at a published postal address
(`src/app/(trust)/privacy/page.tsx`). The cloud-side `GRIEVANCE_OFFICER`
(`src/lib/legal/grievance.ts`, cloud-side) holds the same values with
`isPlaceholder: false`.

- **Owner:** Taha.
- **Done when:** met on 2026-10-20 — the name, the monitored mailbox and the
  postal address are published.
- **Why it was a blocker:** DPDP s.13 requires a designated grievance officer.
  A mailbox with no named officer behind it is not one.

### 2. The published policy pages are DRAFT

The published pages under `src/app/(trust)/` carry the versioned legal text —
Privacy Policy v2 and Terms v2, effective 19 October 2026. The Privacy Policy
and the Terms both render a **DRAFT — NOT YET IN FORCE** banner, and the
Privacy Policy's own metadata records it as still DRAFT pending counsel
sign-off. The cloud-side corpus the pages were ported from
(`legal/terms/v1.md`, `legal/privacy/v1.md`, `legal/marketing/v1.md` —
cloud-side, not in this repository) is marked `status: DRAFT` in front
matter, and the DRAFT banner on the cloud pages is generated in
`src/components/trust/legal-document-page.tsx` (cloud-side) — it cannot be
edited away by whoever revises a document.

- **Owner:** Taha + qualified Indian counsel.
- **Done when:** counsel has reviewed the published pages and the cloud-side
  corpus, and the DRAFT status is changed to something other than DRAFT. Note
  the practical consequence on the cloud side: the content hash is computed
  over the source bytes, so **editing the text after counsel review changes
  the hash** and therefore requires re-consent from every user on the strength
  of the new text. That is the correct behaviour, but plan the review as the
  LAST edit, not the first.
- **Not engineering's to do.** Writing the text was the engineering task;
  approving it is not.

## Found by an independent audit, since fixed

Three findings in the cloud-side compliance build were launch blockers there
and are now closed there. They are recorded here because this file gates
launch, and a doc that quietly drops a fixed blocker stops being a checklist
and starts being a report — and because **none of them is a control this
repository has**: the code they fix is cloud-side.

| Finding | Where it was fixed | What it means in this repository |
|---|---|---|
| **A.** Withdrawing the Terms locked the account out permanently (cloud #55) | The cloud-side consent gate (`src/lib/consent/gate-items.ts`) | There is no consent gate here: nothing to withdraw, nothing to strand. The published Terms carry no consent flow attached to them. |
| **B.** The service role could wipe the whole consent ledger | The cloud-side `consent_records` grants and the `consent_records_append_only` trigger | This repository keeps no consent ledger, so there is no ledger to truncate. What it does keep is `audit_events` — a record, not a ledger — and that audit trail is what a breach preserves (see `docs/breach-response.md`). |
| **C.** The published backup window was wrong (35 days published, 30 configured) | The cloud-side `RETENTION_DAYS` and `.github/workflows/cron-backup.yml` | This repository ships no backup job and no retention-policy module. The backup window is the operator's, and the operator checklist says to schedule Postgres backups and restore-test them (`docs/deployment.md`, `docs/self-hosting.md`). |

One finding in this tree is closed here:

### Fixed D. The historical Google OAuth secret was in git history

A real Google OAuth client secret was committed in `supabase/config.toml` and
was removed from the current tree (Google external auth disabled; placeholders
use `env(GOOGLE_*)`). The value may still exist in git history until a history
rewrite, which was not done without the owner's approval. See
`docs/ops/secret-history-remediation.md` and
`docs/audit/Owner-Actions-Required-For-Public-Alpha.md`. Note that app
authentication is Clerk, not Supabase Auth Google login — if the Google OAuth
client is unused, delete the credentials rather than rotating them.

## Decisions taken, and what they foreclose

| Decision | Value | Consequence |
|---|---|---|
| Grievance officer | Designated — Taha Aalam, `privacy@sophionos.com`, postal address published | Blocker 1 above |
| Age gate | 18+ eligibility in the published Terms; no age-gate flow in the product | The published Terms say we do not knowingly open accounts for anyone under 18, and the Privacy Policy §8 says the service is not directed to children. **There is no parental-consent flow and no minor accounts.** A business that later needs under-18 users must add guardian verification, age-banded policy text, and parent access/deletion rights — a new work item, not a config change. |
| Marketing channels | **Email only** | The only outbound channel this repository sends is email: the briefs job (`src/app/api/cron/briefs`, Resend). No promotional SMS, push, or social messages. Adding one is a new consent item and a new policy version on the cloud side. |
| Retention | Account-data purge after a 14-day grace; backups and logs operator-defined | `DELETION_GRACE_DAYS` in `src/lib/privacy/account-deletion.ts` is the number the account-deletion flow actually uses. There is no retention-policy module and no retention sweep here, so every other window — backups, logs, exports — is the operator's to set and publish (`docs/deployment.md`, `docs/self-hosting.md`). |

## Known gaps that are deliberate, not oversights

- **No in-app assistant exists in this repository.** A full-repo search finds
  no chatbot and no model-provider dependency: the app never sends a note to a
  model on its own. The consent-control layer any future assistant must
  implement — the purpose register, the just-in-time prompt, the fail-closed
  enforcement point — plus `CHATBOT_DATA_PURPOSES.md`, are cloud-side. What
  this repository keeps honest is the product claim in
  `docs/trust-contract.md`: SophionOS does not send your data to an AI model
  by default.
- **There is no consent gate in this repository.** The cloud-side consent flow
  enforces a versioned, hash-checked legal corpus at the edge from a
  first-party cookie, with the append-only `consent_records` rows as the
  authoritative evidence. Here the published pages are versioned in git and
  nothing is asked of the user at the edge — so there is no consent state to
  re-ask, and equally no consent record to produce in an incident.
- **The network address is not stored raw in the audit trail.**
  `audit_events.ip_hash` holds a hash. The record of the address a consent
  decision came from is the cloud-side consent ledger.

## Scheduled future work

| When | Item | Notes |
|---|---|---|
| **2026-11-13** | Consent Manager framework goes live | Cloud-side. The statutory Consent Manager (s.6(5)) is a future compliance obligation of the managed service. This repository has no consent gate for it to attach to; on the cloud side it should attach to `LEGAL_REGISTRY` / `loadLegalDocument` rather than reimplement document versioning. |
| **May 2027** | Translated legal documents | Cloud-side corpus. The three documents must be available in the scheduled languages of India before they are treated as meeting s.5(3) notice requirements for a broad Indian user base. The versioned markdown layout is already translation-friendly — add `legal/<slug>/v<n>.<lang>.md`, extend the registry, and the existing hash-and-reconsent machinery handles each language as its own version. Plan the translation as counsel-reviewed revisions, since each one is a re-consent event. |
| Before launch | Breach runbook rehearsal | `docs/breach-response.md` is written in this repository. It carries the restored 72-hour commitment for the EU/UK and US paths alongside the India path, and the two new branches — the GDPR path and the US state path — are marked **thin procedure — expand per counsel's answers**. Walk it once on paper with the named roles filled in. A runbook that has never been walked is a document, not a procedure. |

## What is verified

The behaviour described in these documents is covered by the test suite
(`tests/unit/audit-redaction.test.ts`, `tests/unit/api-key-hash.test.ts`,
`tests/unit/dual-user-isolation.test.ts`, `tests/unit/rls-policy-presence.test.ts`,
`tests/unit/account-deletion-finalize.test.ts`, `tests/unit/cron-briefs-hardening.test.ts`)
and the CI gate runs `typecheck`, `lint`, `test`, `build`, the structural
migration gate (`scripts/check-migrations-structure.mjs`), the API-key
differential permission harness
(`tests/security/api-key-differential.test.ts`), the route-permission check
(`scripts/check-route-permissions.mjs`) and a secret scan (`.gitleaks.toml`).
See `CHANGELOG.md` for the commit that carries a change and its test output.

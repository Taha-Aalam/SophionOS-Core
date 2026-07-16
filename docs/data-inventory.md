# SophionOS data inventory

Keep this current when schema, vendors, or integrations change. Align claims with
`docs/trust-contract.md` and real code paths (Clerk, Supabase, hashed `api_keys`).

| Data class | Examples | Storage / processor | Why retained | User control | Retention |
|---|---|---|---|---|---|
| Account identity | Clerk user ID (`sub`), email, display name | **Clerk** | Sign-in and account recovery | Clerk account settings; app deletion process | Per Clerk / operator policy |
| Work graph | Areas, goals, projects, tasks | **Supabase Postgres** | Core product | Edit / export / delete in app | Until deleted + backup window |
| Knowledge | Note content, notebooks, resources, topics | **Supabase Postgres** | Core product | Edit / export / delete | Until deleted + backup window |
| Relationships | Contacts, contact logs, linked roles | **Supabase Postgres** | Core product | Edit / export / delete | Until deleted + backup window |
| User preferences | Theme, timezone, notifications, onboarding state | **Supabase** `user_settings` | Product UX | Settings UI | Until deleted + backup window |
| AI access flags | `ai_access_enabled`, `ai_write_access_enabled`, privacy notice ack | **Supabase** `user_settings` key `ai_access` | Control external API/MCP access | Settings → AI Access | Until changed / account deleted |
| API credentials | Key label, **hash only**, prefix, client type/name, access mode, scopes, last use, revoke metadata | **Supabase** `api_keys` | AI/API/MCP access | Create / revoke / disable-all | Until revoked/deleted + security retention |
| Audit records | Credential lifecycle, AI disable-all (metadata, not note bodies) | **Supabase** `audit_events` (when used) | Security / accountability | View own activity when UI ships | Define per env |
| Subscription / tier | Plan tier, lifetime counts | **Supabase** `subscriptions` (+ related) | Feature gates (Cloud) | Billing settings | Business retention |
| Billing events | Provider event IDs, types | **Supabase** `billing_events`; **billing provider** | Payments, webhooks, legal | Billing portal / support | Legal / business |
| Product telemetry | Feature event metadata | **PostHog** (optional public key) | Improve product | Omit env keys to disable | Provider defaults |
| Error reports | Sanitized failures | Error-monitoring provider if configured | Reliability | N/A; redacted | Provider defaults |
| Hosting / CDN | Request logs, deployment metadata | **Vercel** (or self-host reverse proxy) | Delivery, DDoS, debugging | Operator config | Platform defaults |
| Contact avatars (optional) | Image blobs | **Supabase Storage** (when used) | Profile UX | Replace / delete contact | Until deleted + backup window |
| Rate-limit counters | Per-user/IP request windows | **Postgres RPC / memory** | Abuse prevention | N/A | Short-lived |

## Third-party processors (current architecture)

| Processor | Role | Notes |
|-----------|------|--------|
| **Clerk** | Authentication, sessions, user profile fields | JWT `sub` is app user id |
| **Supabase / Postgres** | Primary application database, optional storage | RLS for session path; service role for API-key path |
| **Vercel** (hosted app) | App hosting | Self-hosters may use other hosts |
| **Billing provider** (Cloud) | Subscriptions / invoices when enabled | Not required for pure self-host |
| **PostHog** | Optional product analytics | Only if public analytics keys set |
| **User-chosen AI clients** (Claude, Cursor, etc.) | MCP/API consumers | User-authorized; not SophionOS training; client may send tool results to their model host |

## Privacy review checklist (new integrations)

Before adding an external integration:

1. Add a row to this inventory (data class, processor, retention, user control).
2. Confirm claims in `docs/trust-contract.md` still hold.
3. Prefer hashed/minimized credentials; never log Authorization headers or raw `sop_` secrets.
4. Do not ship product copy that depends on unimplemented security work.

## Out of inventory scope (not stored as first-class product data)

- Operator workstation copies (forbidden except incident process)
- Browser local storage for UI prefs (ephemeral device-side)
- Model provider training corpora (SophionOS does not contribute private content for training)

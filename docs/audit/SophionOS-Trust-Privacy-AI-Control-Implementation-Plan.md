# SophionOS Trust, Privacy, and AI-Control Implementation Plan

> **Objective:** Make SophionOS trustworthy enough for users to store meaningful work and life context, while retaining clear ownership and control over AI access.
>
> **Product promise:** “Your context stays yours. SophionOS helps you connect it, control it, and use it with the AI tools you choose.”
>
> **Architecture baseline:** SophionOS uses Clerk authentication, Supabase/Postgres with Clerk-JWT-backed RLS, server-side REST API routes, hashed `sop` API keys, subscription-gated API/MCP access, and an MCP server that calls the REST API rather than the database directly.

## Success definition

A user should be able to answer the following without reading legal documents or contacting support:

1. **What data does SophionOS store about me?**
2. **Which AI clients can access it right now?**
3. **What can each client read or change?**
4. **What did an AI client do recently?**
5. **How do I revoke access immediately?**
6. **How do I export or delete my data?**
7. **Does SophionOS train AI on my private content?**

If the answer is not visible and understandable in the product, users are being asked to trust implementation details they cannot inspect.

---

# Delivery order

## Phases

| Phase | Outcome | Launch requirement |
|---|---|---|
| 0. Policy and data map | Accurate promises, inventory, retention decisions | P0 |
| 1. AI Access Center | Users see, revoke, and control AI/API access | P0 |
| 2. Audit trail and emergency controls | AI/API writes are attributable and stoppable | P0 |
| 3. Privacy Center | Users inspect, export, and delete their data | P0 for beta, expand after beta |
| 4. Permission model | Read-first, scoped, safer AI access | P0 for write toggles; P1 for granular scopes |
| 5. Trust UX and onboarding | Users understand consent before sharing more | P0 |
| 6. Operational security | Monitoring, access process, incident readiness | P0 |
| 7. Advanced privacy | Fine-grained context scopes, retention automation, privacy-preserving analytics | P1/P2 |

Build in this order. Do not lead with a polished trust page while API keys, write tools, exports, and deletion remain opaque.

---

# Phase 0: Establish the trust contract

## 0.1 Write product commitments

Create one internal document called `docs/trust-contract.md`. It becomes the source of truth for product copy, support responses, privacy policy, telemetry configuration, and code review.

### Required decisions

- [ ] Confirm and state whether SophionOS uses private user content to train any model. Recommended default: **No.**
- [ ] Confirm whether SophionOS calls third-party AI models itself today. If it does not, say so precisely.
- [ ] Define what happens when a user connects Claude, Cursor, or another MCP client: SophionOS serves data through user-authorized API access; the user’s chosen client/model provider handles its own processing under that provider’s terms.
- [ ] Define employee/founder production-data access: who can access it, when, how approval works, and how access is logged.
- [ ] Define data retention for application data, backups, security logs, product analytics, error monitoring, billing records, and deletion jobs.
- [ ] Define what “delete my account” means, including the backup-retention window and legally required billing records.
- [ ] Define support rules: support must never request a raw API key, password, Clerk session token, or private note content unless the user deliberately chooses to share a minimal redacted example.

### Plain-language statements to adopt only if true

```text
Your SophionOS data is yours.

We do not train AI models on your private SophionOS content.

SophionOS does not send your data to an AI model by default.
When you connect an AI client, it accesses SophionOS through the connection you authorize.

You can review connected clients, revoke access, export your data, and request account deletion from your settings.
```

## 0.2 Build a data inventory

Create `docs/data-inventory.md` with this table and keep it current whenever a schema, provider, or integration changes.

| Data class | Examples | Storage/processor | Why retained | User control | Retention |
|---|---|---|---|---|---|
| Account identity | Clerk user ID, email, display name | Clerk | Sign-in and account recovery | Account settings/deletion | Define period |
| Work graph | Areas, goals, projects, tasks | Supabase | Core product | Edit/export/delete | Until deleted + backup window |
| Knowledge | Note content, notebooks, resources, topics | Supabase | Core product | Edit/export/delete | Until deleted + backup window |
| Relationships | Contacts, contact logs, linked roles | Supabase | Core product | Edit/export/delete | Until deleted + backup window |
| API credentials | Key label, hash, prefix, last use, revocation | Supabase | AI/API access | Create/revoke/delete | Until deleted + security retention |
| Audit records | Action metadata, actor, entity IDs | Supabase/log platform | Security/accountability | View own relevant activity | Define period |
| Product telemetry | Feature event metadata | Analytics provider | Improve product | Consent/opt-out if required | Define period |
| Error reports | Sanitized failures | Error-monitoring provider | Reliability/security | N/A, redacted | Define period |
| Billing | Customer/provider IDs, invoices | Billing provider | Payments/legal duties | Billing portal/support | Legal/business retention |

## 0.3 Acceptance criteria

- [ ] Legal/privacy copy matches actual code and vendors.
- [ ] Every third-party processor is listed.
- [ ] Every new external integration has a privacy review before implementation.
- [ ] No product claim depends on aspirational security work.

---

# Phase 1: Build the AI Access Center

## 1.1 Product surface

Create a first-class dashboard page:

```text
/app/settings/ai-access
```

Do not bury it under a generic “Settings” accordion. It should be discoverable from the account menu and every MCP onboarding screen.

### Page layout

```text
AI Access
Control which AI clients and external tools can access your SophionOS context.

[ Global AI access: ON ]  [ Disable all AI access ]

Connected clients
-------------------------------------------------
Claude Desktop — MacBook Pro                  Active
Read + create/update enabled
Last used: 12 minutes ago
[ View activity ] [ Change access ] [ Revoke ]

Cursor — Work Laptop                          Active
Read-only
Last used: Yesterday
[ View activity ] [ Change access ] [ Revoke ]

API keys
-------------------------------------------------
Create a key for a trusted tool. Keys are shown once.
[ Create new key ]

Privacy note
SophionOS does not train AI models on your private content.
```

## 1.2 Extend the API-key data model

The current `apikeys` table already supports a hashed key, label, Clerk user ID, `last_used_at`, and revocation. Extend it instead of creating a parallel connection system.

### Migration: `YYYYMMDDHHMMSS_expand_apikeys_for_trust_controls.sql`

Add or confirm:

```sql
alter table public.apikeys
  add column if not exists key_prefix text,
  add column if not exists client_type text not null default 'unknown',
  add column if not exists client_name text,
  add column if not exists access_mode text not null default 'read_only',
  add column if not exists scopes text[] not null default '{}',
  add column if not exists expires_at timestamptz,
  add column if not exists last_used_at timestamptz,
  add column if not exists last_used_user_agent text,
  add column if not exists last_used_ip_hash text,
  add column if not exists revoked_at timestamptz,
  add column if not exists revoke_reason text;
```

Recommended constraints:

```sql
alter table public.apikeys
  add constraint apikeys_access_mode_check
  check (access_mode in ('read_only', 'write_limited', 'write_enabled'));

alter table public.apikeys
  add constraint apikeys_client_type_check
  check (client_type in ('mcp', 'automation', 'personal', 'unknown'));
```

### Important implementation rules

- [ ] Continue storing only a cryptographic hash of the full API key; never store plaintext.
- [ ] Store a non-sensitive prefix/identifier for UI recognition, such as `sop_...ab12`.
- [ ] Return the raw key only from the creation endpoint and only once.
- [ ] Do not log Authorization headers or raw key values.
- [ ] Limit active keys per user, e.g. five at beta.
- [ ] Require a label at creation, such as “Claude Desktop — MacBook Pro.”
- [ ] Default MCP-created keys to `read_only`.
- [ ] Support optional expiry, but do not force short expiry during early beta if it will cause avoidable setup failure.

## 1.3 Global AI-access kill switch

Add a user-level switch in `usersettings` or a dedicated `user_security_settings` table.

Suggested fields:

```sql
alter table public.usersettings
  add column if not exists ai_access_enabled boolean not null default true,
  add column if not exists ai_write_access_enabled boolean not null default false,
  add column if not exists privacy_notice_version text,
  add column if not exists privacy_notice_accepted_at timestamptz;
```

### Enforcement

Modify `validateApiKey` / `authenticateRequest` / `authorizeApiRequest` so that:

1. Revoked or expired keys fail with `401`.
2. If `ai_access_enabled = false`, all API-key requests fail with a clear `403 AI_ACCESS_DISABLED`.
3. If `ai_write_access_enabled = false`, write requests authenticated with API keys fail with `403 AI_WRITE_DISABLED`.
4. Clerk-session dashboard access continues to work; this switch disables external AI/API-key access, not the user’s own dashboard.
5. A server-side emergency environment flag can disable all MCP/API-key writes globally during an incident.

### API additions

```text
GET   /api/v1/user/ai-access
PATCH /api/v1/user/ai-access
POST  /api/v1/user/ai-access/disable-all
```

`disable-all` should be transactional:

- Set `ai_access_enabled = false`
- Revoke all active API keys for the user
- Create an audit event
- Return the number of revoked keys

## 1.4 API-key endpoint changes

Extend existing routes rather than duplicating CRUD:

```text
GET    /api/v1/user/api-keys
POST   /api/v1/user/api-keys
PATCH  /api/v1/user/api-keys/:id
DELETE /api/v1/user/api-keys/:id
POST   /api/v1/user/api-keys/:id/rotate     optional P1
```

### Create request schema

```ts
{
  name: string;             // required, 1–80 chars
  clientType: 'mcp' | 'automation' | 'personal';
  clientName?: string;      // e.g. Claude Desktop
  accessMode?: 'read_only' | 'write_limited' | 'write_enabled';
  scopes?: ApiScope[];      // defaults from access mode
  expiresAt?: string | null;
}
```

### List response must never include

- Raw API key
- Key hash
- Full IP address
- Sensitive request payloads

### List response should include

- ID, label, client type/name
- Key prefix/suffix identifier
- Access mode and scopes
- Created date, last-used date, expiry date
- Active/revoked/expired status
- Last-used device/user-agent summary if safely available

## 1.5 UI components

Create:

- `src/app/dashboard/settings/ai-access/page.tsx`
- `src/components/settings/ai-access-card.tsx`
- `src/components/settings/api-key-create-dialog.tsx`
- `src/components/settings/api-key-permission-dialog.tsx`
- `src/components/settings/revoke-key-dialog.tsx`
- `src/components/settings/disable-all-ai-dialog.tsx`
- `src/lib/hooks/use-ai-access.ts`
- `src/lib/hooks/use-api-keys.ts` (extend existing implementation rather than duplicate)
- `src/lib/validators/ai-access.schema.ts`

### UX requirements

- [ ] Clearly distinguish “read-only,” “can create/update,” and “can archive/delete.”
- [ ] Use plain language alongside technical scope names.
- [ ] Revoke requires confirmation but is immediate.
- [ ] “Disable all AI access” explains it revokes every active API key and blocks MCP/API connections.
- [ ] Creation success screen presents the key once, copy button, warning not to share it, and a setup link for the chosen client.
- [ ] Do not display raw key after the dialog closes.

## 1.6 Phase-1 tests

- [ ] A new MCP key defaults to read-only.
- [ ] Read-only key can query allowed data but cannot create/update/archive/delete.
- [ ] Write-limited key can perform only the explicitly allowed reversible writes.
- [ ] Revoking a key immediately rejects new requests and persistent/reused MCP connections on their next request.
- [ ] Expired key rejects requests.
- [ ] Global AI disable revokes all active keys and blocks all API-key routes.
- [ ] Dashboard access still works after global AI disable.
- [ ] User A cannot list, edit, rotate, revoke, or infer User B’s keys.
- [ ] Raw keys are absent from browser state, logs, analytics events, error reports, and API key list responses.

---

# Phase 2: Audit trails and emergency controls

## 2.1 Define what to audit

Do not store private note/task content in audit logs by default. Store metadata sufficient to answer “what happened?” without duplicating a sensitive data store.

### Audit events to capture

| Event family | Examples |
|---|---|
| Credentials | API key created, updated, revoked, expired, used, invalid use attempted |
| AI access | Global AI access enabled/disabled; write access enabled/disabled |
| MCP/API reads | Sensitive search, large list, export request, high-volume enumeration signal |
| MCP/API writes | Create/update/complete/archive/restore/delete/link/unlink/bulk action |
| Privacy controls | Export requested/completed/failed; deletion requested/cancelled/completed |
| Security events | Rate-limited, auth failure, RLS denial, unusual location/device indicator |
| Admin/support | Production-data support access, manual entitlement change, incident containment |

## 2.2 Create audit schema

### Migration: `YYYYMMDDHHMMSS_create_audit_events.sql`

```sql
create type public.audit_actor_type as enum ('user', 'api_key', 'system', 'support');

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null,
  actor_type public.audit_actor_type not null,
  api_key_id uuid references public.apikeys(id) on delete set null,
  event_type text not null,
  action text not null,
  entity_type text,
  entity_id uuid,
  target_count integer,
  request_id text,
  client_name text,
  client_type text,
  ip_hash text,
  user_agent_summary text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create index audit_events_user_time_idx
  on public.audit_events (clerk_user_id, occurred_at desc);
create index audit_events_key_time_idx
  on public.audit_events (api_key_id, occurred_at desc)
  where api_key_id is not null;
```

### Metadata policy

Allowed metadata:

```json
{
  "route": "/api/v1/tasks/…",
  "result": "success",
  "changedFields": ["dueDate", "priority"],
  "tool": "create_task",
  "errorCode": "RATE_LIMITED"
}
```

Do not store by default:

```text
note body, task description, contact email/phone, raw search query,
raw API key, Authorization header, Clerk token, full IP address,
complete request body, complete response body
```

## 2.3 Centralize auditing

Create a server-only audit utility:

```text
src/lib/audit/audit-service.ts
src/lib/audit/audit-types.ts
src/lib/audit/audit-redaction.ts
```

### Implementation approach

- [ ] Attach a request ID at the edge/route boundary and return it in error responses.
- [ ] Extend `requireAuth()` to return actor metadata: `userId`, auth type, `apiKeyId`, client/key label, request ID.
- [ ] Use a shared route-wrapper/helper so every mutating `/api/v1` handler records an event.
- [ ] Record denied, rate-limited, and failed sensitive actions as well as successful actions.
- [ ] For writes, record event after the transaction succeeds; record failure separately on error.
- [ ] Never let a non-critical audit insert break a normal user write. If audit persistence fails, log a sanitized server error and alert; decide whether high-risk operations should fail closed only after reliability is proven.

## 2.4 User-facing activity view

Create:

```text
/app/settings/ai-access/activity
GET /api/v1/user/ai-activity?page=&pageSize=&keyId=&eventType=
```

### Activity row example

```text
Today at 10:42
Claude Desktop created a task
“Review beta feedback”
Project: Private Beta
[View task]
```

For sensitive content, use an entity link/title only when the user is viewing their own history. The stored audit record should retain entity ID and action; resolve current title at display time where possible.

### Filters

- All activity
- Claude/Cursor/client/key
- Read activity
- Changes
- Security events
- Last 24 hours / 7 days / 30 days

## 2.5 Emergency controls

Add three levels of containment:

| Control | Actor | Effect |
|---|---|---|
| Revoke one key | User | Stops one client immediately |
| Disable all AI access | User | Revokes all keys and blocks API-key access |
| Global MCP write kill switch | Operator | Blocks API-key/MCP write routes for every user while preserving dashboard access |

### Global kill-switch design

- [ ] Use a server-side environment variable, edge config, or managed feature flag unavailable to normal users.
- [ ] Check it centrally in API authorization for API-key writes.
- [ ] Return a safe maintenance response, e.g. `503 MCP_WRITE_TEMPORARILY_DISABLED`.
- [ ] Do not disable dashboard writes unless incident response requires it.
- [ ] Alert operators whenever it is enabled or disabled.
- [ ] Test it in staging quarterly.

## 2.6 Phase-2 tests

- [ ] Every MCP/API write produces an audit event with user, actor, action, entity metadata, and request ID.
- [ ] Audit record does not contain a raw key, token, note body, full description, or raw request.
- [ ] User A cannot read User B activity.
- [ ] Bulk action logs target count and bounded IDs/summary without a giant sensitive payload.
- [ ] Global kill switch blocks API-key writes but permits read-only API access if that is the selected policy.
- [ ] Revocation/disable events appear in activity history.

---

# Phase 3: Privacy Center, export, and deletion

## 3.1 Create Privacy & Data page

Create:

```text
/app/settings/privacy
```

### Page sections

1. **Your data at a glance**
2. **How AI access works**
3. **Connected AI clients**
4. **Download your data**
5. **Delete your account and data**
6. **Privacy policy, security overview, subprocessors, and contact**

### Data inventory card

Show user-scoped counts without exposing internal schema complexity:

```text
Your SophionOS data
- 12 areas
- 8 goals
- 19 projects
- 126 tasks
- 84 notes
- 44 resources
- 17 topics
- 31 contacts
- 2 connected AI clients
```

Use existing service/data models or an RPC that returns only per-user counts. Do not use a privileged global aggregation unnecessarily.

## 3.2 Build export

### Scope for beta export

Export all primary entities and their relationships:

- Areas, goals, projects, tasks, recurrence details
- Notes, notebook membership, topics, note/project/area/goal relationships
- Resources and relationships
- Contacts, contact logs, roles, relationships
- User-visible settings
- API key metadata only: labels, dates, status; **never raw key/hash**
- Audit events relevant to the user, optionally as a separate file

### Format

Use a ZIP archive with:

```text
README.md
manifest.json
areas.json
areas.csv
goals.json
goals.csv
projects.json
projects.csv
tasks.json
tasks.csv
notes.json
notes.md or notes.json
resources.json
contacts.json
relationships/*.json
settings.json
ai-access.json
audit-activity.json
```

`manifest.json` should contain schema version, generated timestamp, account ID pseudonym/identifier, and file checksums.

### Export architecture

Do not build export in the browser for large accounts.

- [ ] Create an authenticated export request route: `POST /api/v1/user/data-export`.
- [ ] Create `data_export_jobs` table: user ID, status, requested/completed/expiry timestamps, file location, error code.
- [ ] Generate asynchronously using a secure background-job mechanism available in your stack.
- [ ] Store export in a private bucket with a short-lived signed download URL.
- [ ] Require recent authentication or an explicit confirmation before generating export.
- [ ] Rate limit exports, e.g. one active job per user and a daily limit.
- [ ] Delete export archives automatically after a short period, e.g. 24–72 hours.
- [ ] Audit export request, completion, download, expiration, and failure.

### Beta fallback

If background jobs are not ready, deliver a synchronous export only for small beta datasets with strict time/size caps. Treat this as temporary; do not ship a client-side export that exposes data in browser logs or crashes on realistic accounts.

## 3.3 Account deletion

### Product decision

Use a two-stage model:

1. **Request deletion:** requires re-authentication and typed confirmation.
2. **Grace period:** optional 7–30 days during which the user may cancel, while API/MCP access is immediately revoked.
3. **Final deletion:** purge application data, revoke credentials, delete private storage, anonymize or remove analytics identity, and process provider deletion requests where supported.

### Schema

```sql
create table public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  requested_at timestamptz not null default now(),
  scheduled_for timestamptz not null,
  cancelled_at timestamptz,
  completed_at timestamptz,
  status text not null check (status in ('scheduled', 'cancelled', 'processing', 'completed', 'failed')),
  failure_code text,
  requested_ip_hash text
);
```

### Deletion procedure

- [ ] Re-authenticate through Clerk before confirmation.
- [ ] Show exact consequences: dashboard unavailable, API keys revoked, exports unavailable after deadline, backup deletion timing, invoices retained where legally required.
- [ ] Immediately set `ai_access_enabled = false` and revoke API keys.
- [ ] Disable login/session or mark account pending deletion according to Clerk capabilities.
- [ ] Delete application data in dependency-safe order: junction rows, logs, child entities, primary entities, user settings, API-key records, integration records, audit records according to retention policy.
- [ ] Delete private files/exports/storage objects.
- [ ] Remove/anonymize analytics identity and scrub error-monitoring user context where supported.
- [ ] Preserve only the minimum billing/legal records required, without retained product content.
- [ ] Create an audit record for each major deletion stage.
- [ ] Send confirmation email after completion.

### Crucial note

Do not promise immediate deletion from backups if your provider backups persist for a period. State the actual retention window plainly.

## 3.4 Phase-3 tests

- [ ] User export contains every expected entity, relationship, archive state, timestamp, and user setting.
- [ ] Export contains no raw API key, key hash, secret, Clerk token, or internal service credential.
- [ ] User A cannot request/download User B export.
- [ ] Signed export URL expires; exported archive is removed after retention period.
- [ ] Account deletion revokes all keys immediately.
- [ ] Deletion test account can no longer log in/access dashboard/API/MCP after final deletion.
- [ ] No user-owned rows remain in all relevant tables after final deletion, except intentionally retained billing/legal records.
- [ ] Restore/backup policy and deletion policy are accurately reflected in UI.

---

# Phase 4: Permission model for AI tools

## 4.1 Start simple: access modes

Do not launch beta with dozens of granular controls. Begin with understandable modes that map to enforceable server rules.

| Mode | Allowed behavior | Default use |
|---|---|---|
| Read-only | Search, list, get dashboard/my-day/inbox/context | Default for new AI connections |
| Write-limited | Read + create task/note/resource + update task properties/completion | Opt-in after user understands it |
| Write-enabled | Read + permitted updates, archive/restore, linking | Explicit opt-in; show warning |
| Destructive operations | Permanent delete, broad bulk mutation | Disabled for MCP at beta or requires explicit in-client confirmation and strict limits |

Recommended beta decision: **Do not expose permanent delete via MCP.** Keep permanent deletion dashboard-only until you have strong audit, confirmation, and recovery experience.

## 4.2 Scope taxonomy

Define scopes as stable constants, not arbitrary route strings.

```ts
export const API_SCOPES = [
  'dashboard:read',
  'areas:read', 'areas:write',
  'goals:read', 'goals:write',
  'projects:read', 'projects:write',
  'tasks:read', 'tasks:write',
  'notes:read', 'notes:write',
  'resources:read', 'resources:write',
  'topics:read', 'topics:write',
  'contacts:read', 'contacts:write',
  'knowledge:search',
  'inbox:read',
  'my-day:read',
  'archive:write',
  'bulk:write'
] as const;
```

### Recommended beta presets

```ts
READ_ONLY = [
  'dashboard:read', 'areas:read', 'goals:read', 'projects:read',
  'tasks:read', 'notes:read', 'resources:read', 'topics:read',
  'contacts:read', 'knowledge:search', 'inbox:read', 'my-day:read'
]

WRITE_LIMITED = [
  ...READ_ONLY,
  'tasks:write', 'notes:write', 'resources:write'
]

WRITE_ENABLED = [
  ...WRITE_LIMITED,
  'areas:write', 'goals:write', 'projects:write', 'topics:write',
  'contacts:write', 'archive:write'
]
```

Do not grant `bulk:write` by default. Consider it separate and off for beta.

## 4.3 Enforce centrally

Create:

```text
src/lib/api/authorize-scope.ts
src/lib/api/route-permissions.ts
```

Every API route must declare:

```ts
export const routePermission = {
  readScope: 'tasks:read',
  writeScope: 'tasks:write',
  isDestructive: false,
  isBulk: false
} as const;
```

The authorization sequence for API-key traffic:

1. Validate key hash, expiry, revocation, and global/user AI access.
2. Resolve owner Clerk user ID.
3. Check paid tier if API/MCP is a paid entitlement.
4. Check access mode/scopes for the requested operation.
5. Check global write kill switch for writes.
6. Run Zod validation.
7. Execute service under RLS/tenant identity.
8. Create audit event.

Do not rely on MCP tool descriptions to enforce permissions. The REST API must enforce them because any client can call it directly.

## 4.4 Optional P1: context-bound keys

After beta proves the basic model, add optional key constraints such as:

- Only selected areas
- Only selected projects
- Read-only knowledge access
- Expiry after a time window

This is powerful but increases UI and authorization complexity. Do not implement until the base scope model is stable and tested.

## 4.5 Phase-4 tests

- [ ] Route-permission map covers every API route and fails CI when a route lacks a declaration.
- [ ] A key with one scope cannot access another entity/action by route aliases, nested routes, or bulk endpoints.
- [ ] A read-only key cannot mutate through `PATCH`, `POST`, `DELETE`, or a write-like RPC.
- [ ] A key cannot circumvent a blocked action by calling an MCP tool that maps to a different route.
- [ ] Scope checks run before expensive queries and before mutating service calls.

---

# Phase 5: Trust-centered onboarding and copy

## 5.1 Progressive consent

Do not ask a new user to connect all life data or AI tools immediately.

### Recommended onboarding path

1. Sign up and see a concise trust statement.
2. Create/select one project and one goal.
3. Add a few tasks or one research resource.
4. Show value in dashboard context.
5. Offer MCP connection only after the user understands the benefit.
6. Default the created AI connection to read-only.
7. Offer write access later when the user intentionally chooses it.

### MCP connection screen

Before key creation, show:

```text
Connect SophionOS to Claude or Cursor

This creates an API key for the AI client you choose.

Default access: Read your SophionOS context
It can see relevant projects, tasks, goals, and research.

It cannot change anything unless you enable write access.

[ Continue with read-only access ]
[ Review what this means ]
```

## 5.2 Contextual disclosure

Show the right explanation at the moment of risk:

| User action | Disclosure |
|---|---|
| Create API key | Key is powerful, shown once, can be revoked anytime |
| Enable writes | AI can create/update selected types of data; review activity anytime |
| Enable archive/bulk action | Explain scope and potential impact; require stronger confirmation |
| Export data | Link will expire; do not share it |
| Delete account | Explain data removal, grace period, backup retention, billing record exception |
| Add future integration | List exact data read/written and provider involved |

## 5.3 Public trust pages

Publish before broad beta:

- [ ] `/privacy` — readable policy and data rights
- [ ] `/security` — practical overview, not marketing fluff
- [ ] `/subprocessors` — vendors and purpose
- [ ] `/data-and-ai` — how MCP/API/AI-client connections work
- [ ] `/responsible-disclosure` — security reporting channel
- [ ] `/status` — uptime and incident communication

### Security page outline

```text
How SophionOS protects your data
- Account security and authentication
- Per-user data isolation
- Encryption in transit and at rest through providers
- API-key controls and revocation
- AI-client access controls and audit activity
- Backups and recovery
- Responsible disclosure
- What we do not claim
```

Avoid “military-grade,” “zero risk,” or “we can never access data” unless technically/operationally provable.

## 5.4 Phase-5 tests

- [ ] Usability test: five target users can explain read-only vs write-enabled AI access after onboarding.
- [ ] Users can find revoke, export, and delete in under one minute without help.
- [ ] Consent language is not preselected for optional high-risk integrations.
- [ ] No privacy-critical control is hidden behind marketing copy or a support request.

---

# Phase 6: Operational safeguards

## 6.1 Logging and monitoring

- [ ] Configure Sentry or equivalent for client, server, API, and MCP failures.
- [ ] Configure redaction before sending events: Authorization headers, cookies, keys, tokens, note bodies, task descriptions, contact PII, full URLs with query tokens, and complete request/response bodies.
- [ ] Add request IDs across API, audit events, logs, and error reports.
- [ ] Alert on API-key brute force, unusual key usage, revoked-key use, high-volume search, bulk writes, repeated 401/403/429/5xx, and audit-log persistence failure.
- [ ] Alert on export requests/downloads and deletion failures.
- [ ] Monitor RLS errors, failed RPCs/triggers, and database connection/latency pressure.

## 6.2 Founder/support access policy

- [ ] Use individual privileged accounts with MFA; never share production credentials.
- [ ] Default support access to metadata and diagnostics, not user content.
- [ ] Require a ticket, stated reason, time-bound access, and audit record for any production-data investigation.
- [ ] Prefer user-provided screenshots/redacted exports before direct content access.
- [ ] Revoke temporary access when the ticket closes.

## 6.3 Incident response

Write and test runbooks for:

- [ ] API key leaked or posted publicly
- [ ] Suspected cross-tenant/RLS exposure
- [ ] Malicious or unintended MCP write action
- [ ] Billing entitlement mismatch
- [ ] Export link exposure
- [ ] Account deletion failure
- [ ] Third-party provider outage or breach notification

Each runbook must include: containment, key rotation/revocation, evidence preservation, user impact assessment, communications, remediation, and regression test.

---

# Data model and API work summary

## Migrations to plan

| Migration | Purpose |
|---|---|
| `expand_apikeys_for_trust_controls` | Labels, client identity, mode/scopes, expiry, last-use metadata, revoke reason |
| `add_user_ai_security_settings` | Global AI enable, global write enable, notice acceptance/version |
| `create_audit_events` | User-visible and operational AI/API security activity |
| `create_data_export_jobs` | Asynchronous export lifecycle and signed-download metadata |
| `create_account_deletion_requests` | Controlled, auditable deletion workflow |
| `add_audit_and_export_retention_jobs` | Scheduled cleanup according to defined retention |

## New/extended routes

| Route | Purpose |
|---|---|
| `GET/PATCH /api/v1/user/ai-access` | Read/change user AI switches |
| `POST /api/v1/user/ai-access/disable-all` | Revoke all keys and disable API-key access |
| `GET/POST/PATCH/DELETE /api/v1/user/api-keys` | Enhanced key lifecycle and permissions |
| `GET /api/v1/user/ai-activity` | Paginated user audit activity |
| `POST/GET /api/v1/user/data-export` | Request and inspect export job |
| `GET /api/v1/user/data-export/:id/download` | Issue short-lived download URL after auth |
| `POST /api/v1/user/account-deletion` | Request deletion after re-authentication |
| `POST /api/v1/user/account-deletion/cancel` | Cancel during grace period |
| `GET /api/v1/user/privacy-summary` | Data counts, connections, policy/retention summary |

## New dashboard pages

| Page | Primary user outcome |
|---|---|
| `/dashboard/settings/ai-access` | See, control, revoke AI clients/keys |
| `/dashboard/settings/ai-access/activity` | Inspect AI/API activity |
| `/dashboard/settings/privacy` | Inspect, export, and delete personal data |
| `/dashboard/settings/security` | Account protection, sessions, key safety, security links |

---

# Test strategy

## Automated tests required

### Unit tests

- [ ] API key hashing, prefix parsing, expiry, revocation, mode presets, and scope checks
- [ ] Audit redaction removes prohibited fields
- [ ] Privacy-summary counts are tenant-scoped
- [ ] Export manifest includes correct schema version/files
- [ ] Deletion planner produces safe dependency order

### Integration tests

- [ ] Two-user RLS test suite for every new table and route
- [ ] API key read-only/write-limited/write-enabled behavior across every endpoint
- [ ] Global user disable and global MCP-write kill switch behavior
- [ ] API audit creation on success, denial, failure, and bulk operations
- [ ] Export job isolation and signed URL expiry
- [ ] Account deletion revokes sessions/keys and clears product data

### End-to-end tests

- [ ] Create a read-only Claude/Cursor key, connect, query context, see activity
- [ ] Attempt AI write with read-only key, verify safe denial and explanatory UI
- [ ] Enable limited writes, create task through MCP, verify dashboard and audit feed
- [ ] Revoke key, verify MCP can no longer act
- [ ] Disable all AI access, verify all connected clients stop
- [ ] Request export, download, inspect completeness
- [ ] Request deletion, cancel, then complete deletion in isolated test account

### Security regression tests

- [ ] API key, Clerk token, note body, contact details, and export URL never appear in logs/analytics/error payload snapshots
- [ ] User A cannot enumerate User B keys, audit events, exports, deletion requests, or privacy counts
- [ ] Scope bypass attempts through alternate methods/routes fail
- [ ] MCP prompt-injection fixtures do not cause unexpected write actions

---

# Suggested implementation milestones

## Milestone A — Trust controls foundation

**Goal:** Users can see and revoke AI access.

- [ ] Expand API key schema
- [ ] Add user AI-access settings
- [ ] Add read-only default and central scope check
- [ ] Build AI Access Center
- [ ] Add per-key revoke and Disable All AI Access
- [ ] Add baseline audit events for key lifecycle and writes

**Exit condition:** A beta user can connect Claude/Cursor read-only, see the connection, and shut it off immediately.

## Milestone B — Accountability and safe writes

**Goal:** AI actions are controlled and inspectable.

- [ ] Add write-limited preset
- [ ] Add centralized route-permission map
- [ ] Add activity timeline and filters
- [ ] Add global MCP write kill switch
- [ ] Disable permanent delete through MCP
- [ ] Add alerting for anomalous key/write activity

**Exit condition:** Every API/MCP write is authorized server-side, attributed, viewable by the user, and stoppable.

## Milestone C — Data ownership

**Goal:** Users can leave and understand what happens to their data.

- [ ] Build Privacy Center and counts
- [ ] Build export job flow
- [ ] Build deletion request/cancellation/finalization flow
- [ ] Publish privacy/security/subprocessor/data-and-AI pages
- [ ] Rehearse backup restore and deletion lifecycle

**Exit condition:** A user can export all meaningful data, request deletion, and understand backup/legal retention without contacting support.

## Milestone D — Public beta hardening

**Goal:** Trust claims are operationally true.

- [ ] Redacted observability live
- [ ] Incident runbooks tested
- [ ] RLS/privacy/key/audit test suite in CI
- [ ] Security review passes
- [ ] Support process and security reporting channel live
- [ ] First beta users complete usability testing on trust controls

**Exit condition:** You can state the trust promise publicly and demonstrate the controls in the product.

---

# Launch gate

Do not broadly launch AI/MCP access until every item below is true.

- [ ] New AI connections default to read-only.
- [ ] User can see every active key/client and revoke it immediately.
- [ ] “Disable all AI access” works and is tested.
- [ ] API and MCP writes enforce server-side scopes; tool descriptions alone are never trusted.
- [ ] Permanent delete is unavailable through MCP or protected by a stronger, tested confirmation flow.
- [ ] Every AI/API write is attributable in a user-visible activity log.
- [ ] Audit/logging systems redact secrets and private content by default.
- [ ] Export and deletion paths work for real relational data, not only empty test accounts.
- [ ] Privacy policy and marketing claims match behavior exactly.
- [ ] Cross-user isolation tests cover API keys, activity logs, exports, deletion requests, and all new tables.
- [ ] An operator can globally disable MCP/API writes within minutes.

## Guiding decision

When choosing between a clever autonomous capability and a visible user control, ship the visible control first. SophionOS earns the right to become a deep personal context system only by making ownership, permission, and exit as tangible as its intelligence.

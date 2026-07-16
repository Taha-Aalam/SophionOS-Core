# Trust, Privacy & AI Control — What Shipped

**Source plan:** `docs/audit/SophionOS-Trust-Privacy-AI-Control-Implementation-Plan.md`  
**Scope shipped:** Phases **0–6** (launch gate). **Phase 7** (advanced privacy) deferred.  
**Last major verification:** automated suite + goal skeptic panel (Phases 0–6).

This document answers two questions:

1. **What was added** (product surfaces, APIs, data, enforcement).  
2. **What a signed-in user actually sees and can do** in the application.

---

## Product promise (user-facing)

> Your context stays yours. SophionOS helps you connect it, control it, and use it with the AI tools you choose.

Accurate claims the product now supports:

- We do **not** train AI models on private SophionOS content.  
- SophionOS does **not** send your data to a model by default.  
- When you connect an AI client, it uses **your** authorized API key.  
- You can **see**, **revoke**, and **disable** AI/API access from Settings.  
- You can **export** data and **request account deletion** from Privacy & data.

---

# Part 1 — What was added

## A. Internal documentation

| Artifact | Purpose |
|----------|---------|
| `docs/trust-contract.md` | Product commitments: training, third-party AI, retention, deletion meaning, support rules |
| `docs/data-inventory.md` | Data classes + processors (Clerk, Supabase, billing, analytics, etc.) |
| `docs/ops/support-access-policy.md` | Founder/support access rules |
| `docs/ops/logging-redaction.md` | What must never appear in logs/errors |
| `docs/ops/incident-runbooks.md` | Key leak, cross-tenant, bad MCP write, export exposure, deletion failure, etc. |

## B. Database / migrations

| Migration | Adds |
|-----------|------|
| `supabase/migrations/20260716000000_expand_api_keys_for_trust_controls.sql` | Trust fields on `api_keys` (prefix, client type/name, access mode, scopes, revoke reason, last-used metadata); `audit_events` table |
| `supabase/migrations/20260716120000_privacy_export_deletion.sql` | `data_export_jobs`, `account_deletion_requests` |

**AI access flags** are stored in existing `user_settings` under key `ai_access` (not a separate settings table).

> **Operator note:** Apply these migrations on Supabase before relying on new columns/tables in a live environment.

## C. Server enforcement (invisible but critical)

| Capability | Behavior |
|------------|----------|
| API key hashing | Only hash stored; raw `sop_…` key shown once at create |
| Access modes | `read_only` (default for new MCP-style keys), `write_limited`, `write_enabled` |
| Global AI off | API-key requests → `403 AI_ACCESS_DISABLED`; **dashboard session still works** |
| Write flags | User can block API-key writes; operator kill switch → `503 MCP_WRITE_TEMPORARILY_DISABLED` |
| Scopes | Mode maps to stable scopes (`tasks:read`, `archive:write`, etc.); bulk/archive gated |
| Permanent delete | **Blocked for API keys / MCP** (`PERMANENT_DELETE_DISABLED`); dashboard may still delete |
| Session-only management | Creating/updating/revoking keys and changing AI flags / disable-all / export / deletion require **Clerk session** (`SESSION_REQUIRED`) — API keys cannot escalate privileges |
| Audit | Credential, AI-access, API-key mutations, privacy events recorded with **redacted** metadata (no note bodies, raw keys, tokens) |

## D. New / extended API routes

| Route | Role |
|-------|------|
| `GET` / `PATCH` `/api/v1/user/ai-access` | AI flags + connected keys list |
| `POST` `/api/v1/user/ai-access/disable-all` | Disable AI + revoke all active keys |
| `GET` / `POST` / `PATCH` / `DELETE` `/api/v1/user/api-keys` (+ `[id]`) | Key lifecycle; create returns raw key **once** |
| `GET` `/api/v1/user/ai-activity` | Paginated AI/API activity for the user |
| `GET` `/api/v1/user/privacy-summary` | Counts + AI status + deletion state; **auto-runs due purge** if grace elapsed |
| `GET` / `POST` `/api/v1/user/data-export` | Request/list personal export (session) |
| `GET` `/api/v1/user/export` | Legacy sync export of primary entities |
| `GET` / `POST` `/api/v1/user/account-deletion` | Status / schedule deletion |
| `POST` `/api/v1/user/account-deletion/cancel` | Cancel during grace |
| `POST` `/api/v1/user/account-deletion/finalize` | Complete purge (after grace, or early with `force: true`) |

## E. Dashboard UI (settings)

| Path | What it is |
|------|------------|
| `/settings/ai-access` | **AI Access Center** |
| `/settings/ai-access/activity` | Activity timeline |
| `/settings/privacy` | **Privacy & data** center |
| `/settings` hub | Cards for AI Access + Privacy & data |
| `/settings/mcp` | Progressive consent copy + link to AI Access |
| `/settings/api-keys` | Existing key manager (still available) |

## F. Public trust pages (no login required)

| Path | Content |
|------|---------|
| `/privacy` | Privacy summary and rights |
| `/security` | Practical security overview |
| `/subprocessors` | Vendors and purpose |
| `/data-and-ai` | How MCP/API keys work |
| `/responsible-disclosure` | How to report security issues |

## G. Automated checks

- Unit/integration tests for policy, auth, keys, scopes, audit redaction, export, deletion finalize, no-escalation.  
- `scripts/check-route-permissions.mjs` — fails if a data `/api/v1` route lacks a permission map entry.

## H. Explicitly **not** shipped (Phase 7 / non-goals)

- Context-bound keys (only selected areas/projects).  
- Full automated multi-year retention sweeps as a product feature.  
- Privacy-preserving analytics productization.  
- Async export to private object storage with short-lived signed URLs (beta uses **sync JSON** download).  
- Automatic Clerk user ban / deletion confirmation email.  
- Formal legal counsel publication process.

---

# Part 2 — What the user observes in the application

Assume a normal signed-in user on the dashboard.

## 1. Settings hub (`/settings`)

New or highlighted cards:

1. **AI Access** — “See connected clients, revoke keys, and disable all AI/API access.”  
2. **Privacy & data** — “Export your data, review counts, and request account deletion.”  

Still present: Preferences, Notifications, API Access, MCP Server, Billing, Integrations.

---

## 2. AI Access Center (`/settings/ai-access`)

### What they see

- **Global AI access: ON / OFF**  
  - Turn off → external API keys stop working.  
  - Dashboard (browser login) still works.  

- **API key writes: allowed / blocked**  
  - Even with a write-enabled key, user-level write flag can block mutations.  

- **Disable all AI access** (destructive confirm)  
  - Turns global AI off **and revokes every active API key**.  

- **View activity** → goes to activity page.  

- **Connected clients / API keys** list:  
  - Label, optional client name/type  
  - Key **prefix** only (never full secret after create)  
  - Access mode in plain language (read-only / create-update / full write)  
  - Last used  
  - Actions: **Change access**, **Revoke**  

- **Create new key** dialog:  
  - Label (e.g. “Claude Desktop — MacBook Pro”)  
  - Client type (MCP / automation / personal)  
  - Access mode (defaults toward **read-only**)  
  - On success: **full key shown once**, copy button, warning not to share  

- **Privacy note** on the page: no training; no default send to models.

### What they can do

| Action | Effect the user notices |
|--------|-------------------------|
| Create key | One-time secret; client can call API until revoked |
| Revoke key | That client fails on next request |
| Change access | Client’s write ability changes immediately on next request |
| Turn off global AI | All keys blocked without deleting dashboard access |
| Disable all | Keys gone + AI off; must create new keys after re-enable |

---

## 3. AI activity (`/settings/ai-access/activity`)

### What they see

- Paginated list of **metadata-only** events, e.g.:  
  - Key created / revoked / updated  
  - AI access settings changed  
  - Disable-all  
  - API-key write attempts (route, result codes)  
  - Export / deletion privacy events  

- Filters by event family (credentials, AI access, writes, privacy, security).  

### What they do **not** see

- Full note bodies, task descriptions, raw API keys, Authorization headers, full IP addresses.

---

## 4. Privacy & data (`/settings/privacy`)

### Your data at a glance

Counts for **their account only**, e.g.:

- Areas, goals, projects, tasks  
- Notes, resources, topics, contacts  
- Connected AI clients / active keys  

### How AI access works

- Short explanation + current global AI / write status  
- Link to **Manage AI Access**

### Download your data

- **Request export** → browser downloads a **JSON** file  
- Includes primary entities + settings + safe key metadata  
- **Never** includes raw keys or hashes  
- Toast warns not to share the file  

### Delete your account and data

Two-stage flow:

1. **Schedule**  
   - Type `DELETE` to confirm  
   - Immediately: AI access disabled, **all API keys revoked**  
   - Grace period (default **14 days**)  

2. **During grace**  
   - **Cancel deletion** (AI access re-enabled; new keys must be created if needed)  
   - Optional **early purge**: type `PURGE NOW` → product data deleted immediately  

3. **After grace**  
   - Opening Privacy & data **automatically runs the product-data purge** if still scheduled  
   - Or user clicks **Complete deletion now**  
   - Honest notes: billing/legal may remain; backups may retain data for a provider window  

### Policies & contact

Links out to public `/privacy`, `/security`, `/subprocessors`, `/data-and-ai`, `/responsible-disclosure`.

---

## 5. MCP settings (`/settings/mcp`)

### What they see (onboarding consent)

Card similar to:

- Connect SophionOS to Claude or Cursor  
- **Default access: Read** your context  
- Cannot change anything unless write is enabled  
- Buttons: **Continue with read-only access** → AI Access; **Review what this means** → `/data-and-ai`  

- Link **Open AI Access** for key management (not buried only on old API keys page).

---

## 6. Connecting Claude / Cursor (end-to-end user story)

1. User opens **Settings → MCP** or **AI Access**.  
2. Reads that default is **read-only**.  
3. Creates a labeled key; copies secret once into the client.  
4. Client can **read** context via API/MCP.  
5. Writes fail until user enables write flag + non–read-only key mode.  
6. User reviews **Activity** if something unexpected happened.  
7. User **revokes** one key or **Disable all AI access** to stop everything.  

---

## 7. Public pages (logged-out or any visitor)

From marketing/app root paths above, users can read how privacy, security, subprocessors, and AI connections work **without** opening the dashboard—aligned with the trust contract (no overclaims like “zero-knowledge” or “we never can access data”).

---

# Part 3 — Quick map: user question → where to go

| User question | Where in the app |
|---------------|------------------|
| What AI can access my data? | Settings → **AI Access** |
| Stop one client | AI Access → **Revoke** on that key |
| Stop all AI/API immediately | AI Access → **Disable all AI access** |
| What did AI do recently? | AI Access → **View activity** |
| How much data do I have? | Settings → **Privacy & data** |
| Download my data | Privacy & data → **Request export** |
| Delete my account | Privacy & data → schedule / cancel / complete |
| How does MCP work? | Settings → **MCP** + public **/data-and-ai** |
| Who processes my data? | Public **/subprocessors** |

---

# Part 4 — Operator checklist (not end-user UI)

1. Apply Supabase migrations for trust + privacy tables.  
2. Optionally set `SOPHION_DISABLE_API_KEY_WRITES=true` during an incident.  
3. Keep `docs/trust-contract.md` and `docs/data-inventory.md` updated when vendors/schema change.  
4. Do not promise behaviors that still depend on Phase 7 or external legal process.

---

*This file describes product behavior as implemented in the LifeOS Core / SophionOS codebase for the Trust/Privacy/AI-control delivery. It is not a substitute for a lawyer-reviewed privacy policy.*

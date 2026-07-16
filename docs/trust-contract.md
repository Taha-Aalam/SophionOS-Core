# SophionOS trust contract

Internal source of truth for product copy, support responses, privacy policy
drafting, telemetry configuration, and code review. **Only state claims that
match current product behavior.** Update this file when behavior changes.

**Product promise:** “Your context stays yours. SophionOS helps you connect it,
control it, and use it with the AI tools you choose.”

---

## Plain-language commitments (accurate today)

```text
Your SophionOS data is yours.

We do not train AI models on your private SophionOS content.

SophionOS does not send your data to an AI model by default.
When you connect an AI client, it accesses SophionOS through the connection you authorize.

You can review connected clients, revoke access, export your data, and manage
account-level AI/API access from Settings (AI Access / API keys).
```

---

## 1. Model training

| Decision | Statement |
|----------|-----------|
| **Training on private user content** | **No.** SophionOS does not use private user content (notes, tasks, contacts, API payloads, etc.) to train AI models. |
| Product claim allowed | “We do not train AI models on your private SophionOS content.” |

---

## 2. Third-party AI models called by SophionOS

| Decision | Statement |
|----------|-----------|
| **Does SophionOS call OpenAI / Anthropic / etc. by default?** | **No.** Core product code does not automatically send note/task bodies to a model provider. |
| What *does* happen | Users may create API keys and connect MCP clients (Claude Desktop, Cursor, etc.). Those **clients** call SophionOS’s REST API with the user’s key; the client/model provider processes whatever the **user’s client** sends under **that provider’s** terms. |
| Product claim allowed | “SophionOS does not send your data to an AI model by default. When you connect an AI client, it accesses SophionOS through the connection you authorize.” |

Do **not** claim that external AI providers never receive user data after the user connects a client—that is outside SophionOS’s control.

---

## 3. Connecting Claude, Cursor, or another MCP client

1. User creates an API key in SophionOS (Settings → AI Access / API keys), typically labeled for that client.
2. User configures the MCP client with the base URL and key.
3. SophionOS authenticates the key (hash lookup), enforces subscription gates where configured, and serves/mutates data through the REST API under the key’s access mode and the user’s AI-access flags.
4. Revoking the key or disabling AI access immediately rejects subsequent API-key requests. Clerk session (dashboard) access is separate and continues unless the user signs out or the account is removed.

---

## 4. Employee / founder production-data access

| Rule | Detail |
|------|--------|
| Who | Founders/operators with production credentials only. |
| When | Incident response, billing/support escalations the user initiates, or legal process—**not** routine browsing of user notes. |
| How | Prefer self-service export/delete and user-shared redacted examples. Service-role / DB access only with documented need. |
| Logging | Prefer audited operator actions where tooling exists (e.g. billing_events for webhooks). Expand full support-access audit in operational security work—do not claim a complete support-access log UI until shipped. |
| Never | Support must not request raw API keys, passwords, Clerk session tokens, or full private note dumps unless the user **voluntarily** pastes a minimal redacted example. |

---

## 5. Retention (application defaults)

These are product/engineering targets for Sophion Cloud-style deployments. Self-hosters set their own backup and log retention.

| Class | Retention intent |
|-------|------------------|
| Application data (graph, knowledge, relationships) | Until user deletes entity or account + backup window |
| API key metadata (hash, label, revoke info) | Until user deletes/revokes + short security retention for revoked rows |
| Audit / security events (when stored) | Define per environment; typically months, not indefinite content storage |
| Product analytics (if keys configured) | Provider defaults; omit keys to disable |
| Error monitoring | Sanitized failures; provider retention |
| Billing records | Legal/business retention via billing provider |
| Backups | Operator-defined window after deletion (document honestly; do not promise instant erasure from all backups) |

---

## 6. What “delete my account” means

| Layer | Meaning today |
|-------|----------------|
| In-app entity delete | Soft-archive or hard-delete per entity service |
| API keys | Revoke → validation fails on next request |
| Export | Authenticated `GET /api/v1/user/export` for core personal data JSON |
| Full account wipe (self-host) | Operator deletes Postgres rows for `user_id` and removes Clerk user; drop backups/logs per policy |
| Full account wipe (Cloud) | Provider-operated workflow may be added separately—**do not claim a one-click cloud-wide erase until shipped** |
| Billing | Invoices/legal records may remain with the billing provider as required by law |

---

## 7. Support rules

- Never request: raw API key, password, Clerk session token, full private note content.
- Accept: screenshots of non-secret UI, key **prefix** only (e.g. `sop_…ab12`), redacted error messages.
- Prefer: user exports their own data, revokes keys, uses “Disable all AI access.”

---

## 8. Claims that must stay out of marketing until true

- “Zero-knowledge” / “we cannot read your data” (service-role and operators can, by design, for infra).
- “End-to-end encrypted notes with no server access” (not the current architecture).
- “Instant deletion from every backup worldwide.”
- “SophionOS never lets AI see your data” after the user has connected an MCP client with a live key.
- Fine-grained scope taxonomy UI, full activity timeline, and automated retention jobs until those features ship (see trust implementation plan Phases 2–7).

---

## 9. Related docs

- `docs/data-inventory.md` — processors and data classes  
- `docs/privacy-and-data.md` — self-host oriented privacy notes  
- `docs/security-model.md` — trust boundaries  


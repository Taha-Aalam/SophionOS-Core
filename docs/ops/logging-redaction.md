# Logging and error redaction

## Always redact before logs / Sentry / analytics

- Authorization headers and cookies
- Raw API keys (`sop_…`), key_hash
- Clerk session tokens
- Note bodies, task descriptions, contact email/phone
- Full URLs with query tokens
- Complete request/response bodies

## Prefer

- Request IDs
- Entity type + id
- Error codes (`AI_ACCESS_DISABLED`, `SCOPE_DENIED`, …)
- Counts and route paths

## Audit metadata

Use `redactAuditMetadata` from `src/lib/audit/audit-redaction.ts` for any
structured audit payload.

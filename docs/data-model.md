# Data model

## Ownership

Every primary entity row is owned by a single Clerk user id stored in
`user_id` (**text**, matching JWT `sub`).

RLS policies enforce:

```sql
(select auth.jwt()->>'sub') = user_id
```

(with table-specific variations; see migrations under `supabase/migrations/`).

## Core entities

| Entity | Table | Notes |
|--------|-------|-------|
| Area | `areas` | Life/work domains |
| Goal | `goals` | Outcomes with progress |
| Project | `projects` | Time-bound work |
| Task | `tasks` | Action items; recurrence support |
| Note | `notes` | Knowledge content |
| Resource | `resources` | Links/files metadata |
| Topic | `topics` | Grouping for knowledge |
| Contact | `contacts` | People and follow-ups |

## Junction / relationship tables

Examples (exact set evolves with migrations):

- Goal ↔ area / project / note / resource / contact
- Project ↔ area / task / note
- Task ↔ area / project
- Topic ↔ note / resource
- Contact ↔ area / goal / project / task

Junction writes must not allow linking another user’s parent rows. Server paths
use ownership helpers; browser paths rely on RLS.

## Auth and platform tables

| Table | Purpose |
|-------|---------|
| `api_keys` | Hashed keys (`key_hash`), label, expiry, revoke |
| User settings | Preferences / notifications / onboarding (via settings service) |
| Rate limit RPC | Shared API rate counters when not in memory mode |

## Export surface

Personal export packages the user’s primary entities (see
`src/lib/export/personal-data-export.ts`). Junction tables may be included as
the export helper expands; treat schema version in the export JSON as the
compatibility key.

## Migrations

All schema changes live in `supabase/migrations/` with ordered prefixes. Local:

```bash
npx supabase db reset
```

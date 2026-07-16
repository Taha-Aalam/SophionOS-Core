# Architecture

## High-level layers

```text
Browser (Next.js client components)
    │  Clerk session
    ▼
Supabase PostgREST (anon key + Clerk JWT)
    │  RLS: auth.jwt()->>'sub' = user_id
    ▼
Postgres tables (areas, goals, projects, tasks, notes, …)

Browser / MCP clients
    │  Bearer sop_… API key  OR  Clerk session
    ▼
Next.js Route Handlers  /api/v1/*
    │  authorizeApiRequest / requireAuth
    │  rate limits, tier checks (where applied)
    ▼
createDataClient(auth)
    │  clerk → user JWT client (RLS)
    │  api_key → admin client + explicit userId filters
    ▼
Service layer  src/lib/services/*
```

## Authentication

- **Primary identity:** Clerk (not Supabase Auth).
- Browser Supabase clients attach the Clerk JWT so Postgres RLS can use
  `auth.jwt()->>'sub'`.
- REST API accepts `Authorization: Bearer <sop_…>` (hashed API key validation
  via service role) or a Clerk session.
- Service-role key lives only in server modules (`src/lib/supabase/admin.ts`)
  and must never ship to the browser.

## Routing

- Marketing/apex host vs `app.` subdomain (see `src/proxy.ts` and
  `NEXT_PUBLIC_APP_URL`).
- Dashboard routes under `src/app/(dashboard)/`.
- Public REST under `src/app/api/v1/`.

## Domain model

PARA-inspired personal system: Areas → Goals/Projects/Tasks, plus knowledge
entities (notes, resources, topics, contacts) and junction tables. Ownership is
always per `user_id`. See `docs/data-model.md`.

## MCP

`packages/mcp-server` is a separate package that calls the REST API with an API
key. Status: **experimental** — see `docs/mcp.md`.

## Important as-built notes

- Many entity services still default to the **browser** Supabase client; API
  routes inject a server client via `{ supabase }` options when present.
- Tier wall / paid-tier checks gate some API paths for Cloud-style monetization;
  self-hosters should understand `requirePaidTier` behavior for their deployment.
- Progress, smart priority, and some cascades are implemented with SQL triggers
  and RPCs in `supabase/migrations/`.

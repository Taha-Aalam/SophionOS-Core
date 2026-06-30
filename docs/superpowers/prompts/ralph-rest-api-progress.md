# Phase 4 REST API — Ralph Loop Progress

> Cross-iteration memory for the autonomous agent. Tick items with commit SHAs as they land.

## Baseline (iteration 1)
- master/HEAD vitest baseline: GREEN (0 failures) before Step 0. Any new failure is mine to fix.
- Branch: feat/rest-api-phase4 (cut from fix/detail-skeleton-layout HEAD 8053e4e).
- KEY LESSON: injectable-supabase refactor MUST be inline per call site — `createClient()` -> `(options?.supabase ?? createClient())`. Do NOT hoist a single `const sb` per method: tests mock `createClient` with `.mockImplementationOnce()` sequences asserting one resolution PER QUERY; hoisting collapses the count/order and breaks every multi-query test (task/project/note).

## Step 0: Service refactor (injectable supabase client)
- [x] area.service.ts — done, tsc-clean (uncommitted)
- [x] goal.service.ts — done incl. hydrate helpers (uncommitted)
- [~] project.service.ts — re-doing with INLINE recipe (hoist version reverted)
- [~] task.service.ts — re-doing with INLINE recipe (hoist version reverted)
- [~] note.service.ts — re-doing with INLINE recipe (hoist version reverted)
- [x] resource.service.ts — done (uncommitted)
- [x] topic.service.ts — done (uncommitted)
- [x] contact.service.ts — done (uncommitted)
- [x] dashboard.service.ts — done (uncommitted)
- [x] knowledge.service.ts — done (uncommitted)
- [x] user-settings.service.ts — done (uncommitted)
- [x] onboarding.service.ts — done (uncommitted)

## Step 1: API infrastructure (all written, uncommitted, pending tsc)
- [x] src/lib/api/api-response.ts — success, created, paginated, error (uses publicMessage; 429 sets Retry-After)
- [x] src/lib/api/api-auth.ts — getAuthUser, getOptionalAuthUser, authenticateRequest, requireAuth
- [x] src/lib/api/api-validator.ts — validateBody, validateQuery, validateParams (zod/v4)
- [x] src/lib/api/rate-limiter.ts — tier-driven (free100/pro500/premium1000), module Map, async
- [x] src/lib/api/pagination.ts — getPaginationParams (pg1/size50/max200), buildPageLink

## Step 2: API key system (written, uncommitted)
- [x] Migration: supabase/migrations/20260624000000_create_api_keys.sql
- [x] Migration: 20260624000001_create_subscriptions.sql + 20260624000002_create_integrations.sql
- [x] src/lib/api/api-key-service.ts — generateApiKey, validateApiKey, listApiKeys, revokeApiKey (admin client, sha256, lif_ prefix)

## Step 3: Route directory structure
- [ ] All route files created (see goal script for full list)

## Step 4: Route handlers
- [ ] Areas CRUD
- [ ] Goals CRUD + area links + progress
- [ ] Projects CRUD + area/goal links + progress
- [ ] Tasks CRUD + bulk ops + area/goal/project links
- [ ] Notes CRUD + all 12 view filters + related + links
- [ ] Resources CRUD + all 11 view filters + links
- [ ] Topics CRUD + counts + views
- [ ] Contacts CRUD + groups + log-interaction + project/task links
- [ ] Dashboard today + activity
- [ ] Inbox aggregated
- [ ] My Day focus
- [ ] Knowledge search
- [ ] User settings
- [ ] User API keys (list, create, revoke)

## Step 5: Query parameter support
- [ ] All filter params wired per entity

## Step 6: Tests
- [ ] areas.test.ts
- [ ] goals.test.ts
- [ ] projects.test.ts
- [ ] tasks.test.ts
- [ ] notes.test.ts
- [ ] resources.test.ts
- [ ] topics.test.ts
- [ ] contacts.test.ts
- [ ] dashboard.test.ts
- [ ] inbox.test.ts
- [ ] knowledge.test.ts
- [ ] user-settings.test.ts
- [ ] auth.test.ts
- [ ] rate-limiter.test.ts

## Committed endpoints (running tally)
Total: 0

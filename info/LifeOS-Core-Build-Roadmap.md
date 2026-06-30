# LifeOS Core — Build Roadmap

**Sequential build plan for the LifeOS Core SaaS application.**

Every step is completable in a single coding session (2–4 hours). Steps are ordered by dependency — you cannot start step N until step N-1 is done and tested. No skipping. No parallelization until explicitly noted.

Reference documents:
- `LifeOS-Core-PRD-Lean.md` — what to build
- `LifeOS-Core-Architecture.md` — how to build it
- `LifeOS-Core-AI-Rules.md` — coding standards

---

## As-Built Deviations (Phases 1–3 — reconciled 2026-06-30)

> Phases 1–3 are complete, but the implementation diverged from the original plan in several foundational ways. The original step text below is kept for history; the deviations recorded here are the **source of truth for what actually shipped**. Steps that changed carry an inline `> **AS BUILT:**` callout. Phase 4 and 4b have been fully rewritten to match this reality.

**1. Authentication is Clerk, not Supabase Auth (affects Steps 3, 7).**
The app uses `@clerk/nextjs`. There is no Supabase Auth, no `/auth/callback` route, and no Supabase-session `AuthProvider`. Supabase access is authorized by a **Clerk-issued JWT**: both the browser client (`src/lib/supabase/client.ts`) and the server client (`src/lib/supabase/server.ts`) pass the Clerk token through supabase-js's `accessToken` callback. RLS policies and RPCs are keyed to the Clerk user id (migrations `20260618000001_clerk_rls_rewrite`, `20260617500000_drop_legacy_auth_user_fks`, `20260618000002_clerk_user_backfill`, `20260623000000_fix_recurring_rpc_clerk_auth`).

**2. There is no server layer — client-side supabase-js + RLS is the security perimeter (affects Step 6, and was the premise of the old Phase 4).**
Every `src/lib/services/*.service.ts` runs in the browser, takes `userId` as an explicit argument, and queries PostgREST directly. There are **no API route handlers and no server actions**. RLS + the Clerk JWT is the only access control. `error-handler.ts` `publicMessage` is currently dead code. A server-side Supabase client (`src/lib/supabase/server.ts`) and a service-role admin client (`src/lib/supabase/admin.ts`, guarded against browser import) both exist and are the reuse points for the Phase 4 API tier.

**3. Middleware is `src/proxy.ts`, and it does host-based routing (affects Step 7).**
Next.js 16 renamed `middleware.ts` → `src/proxy.ts`. Beyond auth, it splits traffic by host: the **apex host serves marketing** (no `/login`), and the **`app.` subdomain serves the application**. Routing helpers live in `src/lib/routing/host.ts`; `NEXT_PUBLIC_APP_URL` is the subdomain origin. The single-shell assumption in Step 8 still holds for the app subdomain.

**4. The schema is far richer than the FK-only model in Steps 4–13, and migrations are timestamp-named.**
Migrations use `YYYYMMDDHHMMSS` names (not `000NN`). Added beyond the plan: slugs on every entity; multi-area junctions (`task_areas`, `goal_areas`, `project_areas`, `resource_areas`, `contact_areas`); additional junctions (`task_projects`, `task_resources`, `resource_projects`, `note_projects`, `goal_resources`, `goal_notes`, `contact_goals`); task recurrence (`repeat_every`/`repeat_cycle`/`recurrence_source_task_id`); goal `priority` and goal auto-inactive; `contact_logs` + interaction trigger; `user_settings`. Status churn: `saved` → `completed`, the `urgent` priority value was dropped, project gained an `inbox` status. Several progress/inactive triggers were patched repeatedly — see the `recalc_project_progress` / `recalc_area_inactive` migrations.

**5. Step 21b (Notes notebooks + related notes) shipped, but with a REDESIGNED storage model.**
Both features are live — the *implementation* changed, not the feature set. (a) **Notebooks** moved from a single `notes.notebook` TEXT column to a multi-value `note_notebooks` junction table (`20260525000000_create_note_notebooks`, column dropped in `20260525000003` — *"fully replaced by the note_notebooks junction table"*). A note can belong to multiple notebooks. (b) **Related notes** moved from an explicit `note_related_notes` edge table to being **derived from shared notebook membership** (`20260525000002` drops the edge table — *"related notes are now derived from shared notebooks"*). `note.service.ts` confirms both: `listNotebooks`/`getByNotebook`/`replaceNotebooks`/`addNotesToNotebook`/`removeNoteFromNotebook` and the derived `getRelatedByNotebook`/`getNoteRelatedCounts`. **API design consequence:** there is no link-related/unlink-related edge to write — "relating" two notes means putting them in a shared notebook. `group_by=notebook` and a notebooks filter ARE valid; `/notes/:id/related` is a read-only derived query.

**6. None of the Phase-4 supporting infra exists yet.**
There are no `api_keys`, `subscriptions`, `rate_limit`, or `integrations` tables — only `user_settings`. These are now scheduled in the rewritten Phase 4 (see Step 23).

**Phase 4 direction (decided 2026-06-30):** Build the **full REST API tier** as originally intended (route handlers wrapping the service layer server-side, with API-key auth + rate limiting), and provision the **full supporting infra** (`api_keys`, `subscriptions`, `rate_limit`, `integrations`). The MCP server (Phase 4b) wraps this REST API. The key new work versus the old text is **decoupling the service layer from the browser client** so handlers can run it server-side.

---

## Phase 1: Project Scaffold

> Goal: A running Next.js app with zero features but 100% of the infrastructure wired correctly. You should be able to open `localhost:3000`, see a styled page, and know that TypeScript, linting, and Supabase are all working.

---

### Step 1: Initialize the repository

**What:** Create the Git repo, Next.js 14 project, and configure all tooling.

**Actions:**
- `npx create-next-app@latest lifeos-core --typescript --tailwind --app --src-dir --use-pnpm`
- Enable `"strict": true` in `tsconfig.json`
- Install Biome (linter/formatter): `pnpm add -D @biomejs/biome` and create `biome.json` with project rules (semicolons, double quotes, 2-space indent, sorted imports)
- Create `.env.example` with all required env var names (no values)
- Create `.gitignore` with `.env.local`, `node_modules`, `.next`, `.vercel`
- Place `LifeOS-Core-AI-Rules.md` at repo root as `.cursorrules` (or `CLAUDE.md`)
- Create initial folder structure from architecture doc (empty directories with `.gitkeep` files): `src/lib/services/`, `src/lib/hooks/`, `src/lib/stores/`, `src/lib/validators/`, `src/lib/utils/`, `src/lib/types/`, `src/components/ui/`, `src/components/entities/`, `src/components/views/`, `src/components/layout/`, `src/components/providers/`, `src/components/charts/`

**Dependencies:** None (this is step 1).

**Testing:**
- `pnpm dev` starts without errors
- `pnpm biome check .` passes with zero issues
- `tsc --noEmit` passes with zero errors
- Verify folder structure matches architecture doc

**Deliverable:** Running Next.js app at localhost:3000 showing the default page.

---

### Step 2: Design system and shadcn/ui setup

**What:** Install shadcn/ui, configure the theme (dark mode default), and create the CSS variable foundation.

**Actions:**
- Run `npx shadcn@latest init` — select default style, slate color, CSS variables enabled
- Install core shadcn components (one by one): `button`, `input`, `label`, `card`, `dialog`, `sheet`, `popover`, `tooltip`, `badge`, `table`, `tabs`, `command`, `toast`, `skeleton`, `separator`, `dropdown-menu`, `select`, `checkbox`, `avatar`, `scroll-area`
- Configure `globals.css` with dark-mode-first CSS variables matching architecture doc (use indigo `#6366F1` as primary accent)
- Create `src/components/providers/theme-provider.tsx` using `next-themes` for light/dark toggle
- Wrap root `layout.tsx` with ThemeProvider (default theme: `"dark"`)
- Create a throwaway test page that renders every installed shadcn component to verify styling

**Dependencies:** Step 1 (repo must exist with Tailwind configured).

**Testing:**
- Every shadcn component renders correctly in dark mode
- Toggle to light mode — every component still looks correct
- No raw CSS files created (Tailwind only, per AI Rules)
- `tsc --noEmit` passes

**Deliverable:** Component library ready. Both themes working. Test page can be deleted after verification.

---

### Step 3: Supabase project setup and local development

**What:** Create the Supabase project, configure local development, and wire up auth clients.

**Actions:**
- Create a Supabase project at `supabase.com` (or use the CLI for local-only dev)
- Install Supabase dependencies: `pnpm add @supabase/supabase-js @supabase/ssr`
- Install Supabase CLI globally: `pnpm add -D supabase`
- Run `npx supabase init` to create `/supabase` directory with `config.toml`
- Start local Supabase: `npx supabase start` (requires Docker)
- Create the three Supabase client files per architecture doc:
  - `src/lib/supabase/client.ts` — `createBrowserClient` for client components
  - `src/lib/supabase/server.ts` — `createServerClient` for server components and route handlers
  - `src/lib/supabase/admin.ts` — service role client for admin operations
- Create `src/lib/supabase/middleware.ts` — Next.js middleware that refreshes auth session on every request
- Add middleware to `src/middleware.ts` (root level)
- Populate `.env.local` with local Supabase URL and anon key

**Dependencies:** Step 2 (theme provider in root layout must exist for middleware to wrap correctly).

**Testing:**
- `npx supabase status` shows local Supabase running
- Import `createBrowserClient` in a test page — no TypeScript errors
- Open Supabase Studio at `localhost:54323` — dashboard loads
- `tsc --noEmit` passes

**Deliverable:** Local Supabase running, all three client files working, auth middleware active.

> **AS BUILT:** Auth is **Clerk**, not Supabase Auth. The three Supabase clients exist (`client.ts` browser, `server.ts` server, `admin.ts` service-role) but each forwards a **Clerk JWT** via supabase-js's `accessToken` callback rather than a Supabase session. Middleware is `src/proxy.ts` (Next 16 rename). See the As-Built Deviations section.

---

### Step 4: Database schema — core tables

**What:** Create SQL migration files for the 4 core MVP tables (areas, goals, projects, tasks) plus enums and utility functions.

**Actions:**
- Create `supabase/migrations/00001_create_extensions.sql` — enable `uuid-ossp` and `pg_trgm`
- Create `supabase/migrations/00002_create_enums.sql` — all enum types from architecture doc (`priority`, `task_status`, `project_status`, `goal_term`, `area_type`)
- Create `supabase/migrations/00003_create_areas.sql` — areas table with all columns, `metadata JSONB` included
- Create `supabase/migrations/00004_create_goals.sql` — goals table with FK to areas
- Create `supabase/migrations/00005_create_projects.sql` — projects table with FK to areas
- Create `supabase/migrations/00006_create_tasks.sql` — tasks table with FK to areas and projects
- Create `supabase/migrations/00007_create_core_junctions.sql` — `goal_projects`, `goal_tasks`
- Create `supabase/migrations/00008_create_updated_at_trigger.sql` — the `update_updated_at()` function and triggers for all 4 tables
- Create `supabase/migrations/00009_create_progress_trigger.sql` — `recalc_project_progress()` trigger
- Create `supabase/migrations/00010_create_core_indexes.sql` — all indexes for the 4 core tables from architecture doc
- Create `supabase/migrations/00011_create_rls_core.sql` — RLS policies (select/insert/update/delete own data) for all 4 tables and junction tables
- Run `npx supabase db reset` to apply all migrations

**Dependencies:** Step 3 (local Supabase must be running).

**Testing:**
- `npx supabase db reset` completes without errors
- Open Supabase Studio → Tables: verify all 4 tables exist with correct columns
- Manually insert a row into `areas` via SQL editor — RLS blocks without auth
- Verify `updated_at` trigger fires (insert then update a row, check timestamp changes)
- Verify project progress trigger works (insert a project, add 2 tasks, complete 1 — `progress` should be 0.5)

**Deliverable:** Core database schema running locally with RLS, triggers, and indexes.

---

### Step 5: Generated types and Zod schemas

**What:** Auto-generate TypeScript types from the database and create Zod validation schemas for all 4 core entities.

**Actions:**
- Run `npx supabase gen types typescript --local > src/lib/types/database.types.ts`
- Create `src/lib/types/domain.types.ts` — clean re-exports and derived types (e.g., `Task` = database row type, `CreateTaskInput` = create payload type)
- Create `src/lib/validators/area.schema.ts` — `createAreaSchema`, `updateAreaSchema`
- Create `src/lib/validators/goal.schema.ts` — `createGoalSchema`, `updateGoalSchema`
- Create `src/lib/validators/project.schema.ts` — `createProjectSchema`, `updateProjectSchema`
- Create `src/lib/validators/task.schema.ts` — `createTaskSchema`, `updateTaskSchema`
- Create `src/lib/utils/constants.ts` — all const enums (`PRIORITY`, `TASK_STATUS`, `PROJECT_STATUS`, `GOAL_TERM`, etc.)
- Install Vitest: `pnpm add -D vitest @vitest/coverage-v8`
- Create `vitest.config.ts`

**Dependencies:** Step 4 (database must exist to generate types).

**Testing:**
- `tsc --noEmit` passes with the generated types
- Write first tests in `tests/unit/validators.test.ts`:
  - `createTaskSchema` passes with valid input `{ name: "Test", priority: "high" }`
  - `createTaskSchema` rejects empty name
  - `createTaskSchema` rejects unknown fields (`.strict()`)
  - `createGoalSchema` rejects invalid term value
- `pnpm vitest run` — all validator tests pass

**Deliverable:** Type-safe schema layer. First unit tests passing.

---

### Step 6: Service layer — core CRUD

**What:** Create service files for all 4 core entities with full CRUD operations.

**Actions:**
- Create `src/lib/api/error-handler.ts` — custom error classes: `ValidationError`, `NotFoundError`, `DatabaseError`, `AuthError`, `ForbiddenError`
- Create `src/lib/services/area.service.ts` — `list(userId)`, `getById(userId, id)`, `create(userId, input)`, `update(userId, id, input)`, `archive(userId, id)`
- Create `src/lib/services/goal.service.ts` — same CRUD pattern + `getActive(userId)`, `getByTerm(userId, term)`
- Create `src/lib/services/project.service.ts` — same CRUD pattern + `getByStatus(userId, status)`, `getByArea(userId, areaId)`
- Create `src/lib/services/task.service.ts` — same CRUD pattern + `complete(userId, id)`, `getByStatus(userId, status)`, `getOverdue(userId)`, `getFocused(userId)`
- Every service method: validates input with Zod → calls Supabase with explicit column selection → throws typed errors on failure → returns typed response
- Create `src/lib/utils/smart-priority.ts` — TypeScript implementation of the smart priority algorithm (used for client-side display; DB function is source of truth)

**Dependencies:** Step 5 (types and schemas must exist).

**Testing:**
- Write `tests/unit/task.service.test.ts`:
  - Creates a task with valid input
  - Throws `ValidationError` for empty name
  - Throws `NotFoundError` for non-existent task
  - `complete()` sets `complete: true` and `completed_at`
- Write `tests/unit/smart-priority.test.ts`:
  - Overdue high-priority task with 2 goals = score 5
  - No due date, low priority, no goals = score 1
  - Test all 4 weight factors independently
- `pnpm vitest run` — all tests pass

**Deliverable:** Complete service layer for 4 core entities. Business logic tested.

> **AS BUILT:** Services run **client-side**, not server-side. Each imports the browser Supabase client, takes `userId` as an argument, and queries PostgREST directly under RLS. There is no server route layer calling them. `error-handler.ts` exists but its `publicMessage` is dead code. **Phase 4 must decouple these services from the `"use client"` browser client before route handlers can reuse them.**

---

### Step 7: Authentication UI

**What:** Build the login, signup, forgot password pages and the auth flow.

**Actions:**
- Create `src/app/(auth)/layout.tsx` — minimal centered layout (no sidebar), dark background, LifeOS logo
- Create `src/app/(auth)/login/page.tsx` — email/password form + Google OAuth button + link to signup
- Create `src/app/(auth)/signup/page.tsx` — email/password form + Google OAuth button + link to login
- Create `src/app/(auth)/forgot-password/page.tsx` — email input + send reset link
- Create `src/app/auth/callback/route.ts` — OAuth callback handler (exchanges code for session)
- Configure Google OAuth in Supabase dashboard (client ID + secret)
- Create `src/components/providers/auth-provider.tsx` — React context that exposes `user`, `session`, `signOut()`, `isLoading`
- Update root `layout.tsx` to wrap app with `AuthProvider`
- Update `middleware.ts` to redirect unauthenticated users from `/(dashboard)` to `/login`, and redirect authenticated users from `/(auth)` to `/dashboard`

**Dependencies:** Step 3 (Supabase auth client) + Step 2 (shadcn form components).

**Testing:**
- Sign up with email/password — confirmation email received (check Supabase local email logs at `localhost:54324`)
- Log in with created account — redirected to `/dashboard` (empty page for now)
- Log out — redirected to `/login`
- Visit `/dashboard` while logged out — redirected to `/login`
- Visit `/login` while logged in — redirected to `/dashboard`
- Google OAuth flow works end-to-end (requires Supabase Google provider config)
- Forgot password sends reset email

**Deliverable:** Complete auth flow. Protected routes working.

> **AS BUILT:** Implemented with **Clerk** (`@clerk/nextjs`), not Supabase Auth. No `(auth)/login` email/password form wired to Supabase, no `/auth/callback` OAuth route, no Supabase-session `AuthProvider`. Login/signup live under `(auth)/login/[[...rest]]` and `(auth)/signup/[[...rest]]` (Clerk catch-all). Route protection + the apex-marketing / `app.`-subdomain split is enforced in `src/proxy.ts`.

---

## Phase 2: Core PARA Modules

> Goal: The four foundational modules (Areas, Goals, Projects, Tasks) fully functional with CRUD, views, and interconnected data. A user can create areas, set goals, plan projects with tasks, and see progress roll up.

---

### Step 8: Dashboard layout (sidebar + topbar)

**What:** Build the main app shell — sidebar navigation, topbar with user menu, and responsive mobile navigation.

**Actions:**
- Create `src/app/(dashboard)/layout.tsx` — sidebar + main content area
- Create `src/components/layout/sidebar.tsx` — collapsible sidebar with sections:
  - Core: Dashboard, Areas, Projects, Tasks, Goals
  - System: Inbox, My Day (grayed out / coming soon for now)
  - Trackers: placeholder section
  - Footer: Settings link, theme toggle, user avatar
- Create `src/components/layout/topbar.tsx` — breadcrumb nav + user dropdown menu (settings, sign out)
- Create `src/components/layout/mobile-nav.tsx` — Sheet-based drawer for mobile sidebar
- Create `src/lib/stores/ui.store.ts` — Zustand store for `sidebarOpen`, `toggleSidebar`
- Create `src/app/(dashboard)/page.tsx` — placeholder dashboard page ("Welcome to LifeOS" with empty state)
- Ensure layout is responsive: sidebar hidden on mobile (hamburger menu), visible on `lg:` and above

**Dependencies:** Step 7 (auth must work so user data appears in topbar).

**Testing:**
- Desktop: sidebar visible, collapses on toggle, all nav links render
- Mobile (375px): sidebar hidden, hamburger opens Sheet drawer
- User avatar and name appear in topbar (from Supabase auth session)
- Sign out from user menu works
- Theme toggle switches between dark and light
- Active nav link is highlighted
- `tsc --noEmit` passes

**Deliverable:** App shell complete. Every future page renders inside this layout.

---

### Step 9: Areas module

**What:** Full Areas CRUD with gallery view, detail page, and rollup counts.

**Actions:**
- Create `src/lib/hooks/use-areas.ts` — `useAreas()`, `useArea(id)`, `useCreateArea()`, `useUpdateArea()`, `useArchiveArea()` with TanStack Query
- Create `src/components/entities/area-card.tsx` — card showing icon, name, description, rollup counts (goals/projects/tasks), archive button
- Create `src/components/views/gallery-grid.tsx` — responsive grid layout (reusable)
- Create `src/components/views/empty-state.tsx` — reusable empty state with icon + message + action button
- Create `src/app/(dashboard)/areas/page.tsx` — gallery of area cards + "New Area" button + toggle Active/Archived
- Create area creation/edit dialog (shadcn Dialog + React Hook Form + Zod)
- Create `src/app/(dashboard)/areas/[id]/page.tsx` — area detail page showing linked goals, projects, tasks (placeholder lists for now)
- Create `src/lib/services/onboarding.service.ts` — `seedDefaultAreas(userId)` function that creates the 8 default areas

**Dependencies:** Step 8 (layout) + Step 6 (area service).

**Testing:**
- New user sees 8 pre-populated areas after signup (onboarding service triggered)
- Create a custom area — appears in gallery immediately (optimistic update)
- Edit area name/description — persists on refresh
- Archive area — disappears from active view, appears in archived view
- Area detail page shows correct entity (no cross-user data)
- Empty state renders when no areas exist (test by archiving all)
- Rollup counts show 0/0/0 for new areas
- `pnpm vitest run` — all existing tests still pass

**Deliverable:** First fully functional module. Data flows from DB → service → hook → component.

---

### Step 9b: Areas — "By type" grouped view and custom area types

**What:** Add the "By type" view that groups areas by their type category, and expand the type system to support user-defined types beyond the default Business/Personal.

**Actions:**
- **Schema update:** Create `supabase/migrations/000XX_expand_area_types.sql`:
  - Drop the existing `area_type` enum constraint (which only allows `business` / `personal`)
  - Replace with a `TEXT` column + a separate `area_types` reference table per user, OR simply change the column to `TEXT NOT NULL DEFAULT 'personal'` so users can define custom types (recommended — simpler, no enum migration headaches)
  - Seed default types: `Business`, `Personal`, `Studies`
  - Add index on `areas(user_id, type)` for grouped queries
- **Update Zod schema:** `src/lib/validators/area.schema.ts` — change `type` from `z.enum(["business", "personal"])` to `z.string().min(1).max(50)` to accept any user-defined type
- **Update area service:** Add `getGroupedByType(userId)` method that queries areas and groups them by type. Returns `Map<string, Area[]>` or `{ type: string; areas: Area[] }[]`
- **Update area hooks:** Add `useAreasByType()` hook wrapping the grouped query
- **Build the "By type" view component:** Create `src/app/(dashboard)/areas/areas-by-type-view.tsx`:
  - Renders collapsible sections (use shadcn `Collapsible` or a simple disclosure)
  - Each section header shows the type name as a colored badge (e.g., green for Business, blue for Personal, orange for Studies)
  - Each section contains the area cards in a gallery grid
  - Sections are collapsible (click header to expand/collapse)
  - "+" button next to each section header to create a new area with that type pre-filled
  - "+ New page" placeholder card at the end of each section for quick area creation
- **Update areas page:** Add the complete tab bar with all 4 views:
  - `Active` (default) — flat gallery of non-archived areas
  - `Inactive` — archived areas
  - `By type` — grouped view (this step)
  - `All` — flat gallery of all areas regardless of status
- **Update area creation dialog:** Add a `type` field:
  - Combobox (shadcn `Command`-based) that shows existing types as suggestions
  - User can select an existing type OR type a new custom type name
  - Default types pre-populated: Business, Personal, Studies
- **Update area card:** Show a small type badge on each card (subtle, bottom-left or top-right)
- **Update the default area seeding:** In `onboarding.service.ts`, assign types to the default 8 areas:
  - Business: Work, Finances
  - Personal: Family & Friends, Health, Home, Travel
  - Studies: Personal Growth, Career

**Dependencies:** Step 9 (base Areas module must be complete with CRUD, gallery view, and detail page).

**Testing:**
- "By type" tab renders areas grouped under correct type headers
- Business section shows Work, Finances (from seed data)
- Personal section shows Family & Friends, Health, Home, Travel
- Studies section shows Personal Growth, Career
- Collapse a section — areas hide. Expand — areas reappear. State persists during session.
- Create a new area with type "Fitness" — a new section "Fitness" appears with that single area
- Create a second area with type "Fitness" — it appears in the same section
- Edit an area's type from "Personal" to "Business" — area moves to the Business section on refresh
- "All" tab shows every area in a flat gallery regardless of status or type
- The type combobox in the creation dialog suggests existing types as you type
- Area card shows type badge in both the "Active" view and "By type" view
- Mobile (375px): sections stack vertically, cards are single-column, sections still collapsible
- `tsc --noEmit` passes (no type errors from the enum-to-string migration)
- `pnpm vitest run` passes (update existing area validator tests for string type instead of enum)

**Deliverable:** Areas page has all 4 view tabs (Active, Inactive, By type, All). Users can organize areas by custom types. The grouped view provides a clear "categorized life domains" experience.

---

### Step 9c: Areas — Archived tab and auto-active/inactive status

**What:** Add a fifth "Archived" tab to the Areas page and implement automatic active/inactive status detection based on whether an area has any linked goals, projects, or tasks.

**Key distinction between Inactive and Archived:**
- **Inactive** = the area is paused or has zero activity. It still exists in the user's mental model and can become active again automatically when items are added. Think of it as "dormant."
- **Archived** = the user has deliberately moved this area to long-term storage. It's out of sight, out of mind, kept only for historical records. It doesn't come back unless the user explicitly restores it.

This means `inactive` is a **system-computed status** (driven by data), while `archive` is a **user-initiated action** (driven by intent). They are independent — an area can be inactive but not archived, or archived regardless of whether it had activity.

**Actions:**

- **Schema update:** Create `supabase/migrations/000XX_area_status_fields.sql`:
  - Ensure the `areas` table has both fields clearly separated:
    - `inactive BOOLEAN NOT NULL DEFAULT true` — system-managed, computed from linked entity counts
    - `archive BOOLEAN NOT NULL DEFAULT false` — user-managed, set only by explicit user action
  - Add a database function `recalc_area_inactive()` that sets `inactive = true` when the area has 0 linked goals AND 0 linked projects AND 0 linked tasks (non-archived, non-completed), and `inactive = false` otherwise
  - Create triggers on `goals`, `projects`, and `tasks` tables: after INSERT, UPDATE (of `area_id`, `archive`, `complete`), or DELETE — call `recalc_area_inactive()` for the affected area
  - New areas default to `inactive = true` (no linked items yet) and `archive = false`

- **Update area service:** `src/lib/services/area.service.ts`:
  - Add `archive(userId, id)` — sets `archive = true` (user action)
  - Add `restore(userId, id)` — sets `archive = false` (user action, brings back from archive)
  - Update `list()` to accept a `status` filter: `"active"` (inactive=false, archive=false), `"inactive"` (inactive=true, archive=false), `"archived"` (archive=true), `"all"` (no filter)
  - Remove any manual `inactive` toggle from the UI — this field is now fully system-computed

- **Update Zod schema:** `updateAreaSchema` should NOT include `inactive` as a writable field (it's computed). Only `archive` is user-controllable.

- **Update area hooks:** `src/lib/hooks/use-areas.ts`:
  - `useArchiveArea()` mutation — sets archive=true, invalidates area queries
  - `useRestoreArea()` mutation — sets archive=false, invalidates area queries
  - Update `useAreas(filter)` to support the new status filter parameter

- **Update Areas page tabs:** `src/app/(dashboard)/areas/page.tsx` — now 5 tabs:
  - **Active** (default) — areas where `inactive = false AND archive = false`. These have at least one linked goal, project, or task.
  - **Inactive** — areas where `inactive = true AND archive = false`. These exist but have zero linked items. They're dormant, waiting for activity.
  - **By type** — all non-archived areas grouped by type (from Step 9b)
  - **All** — every non-archived area regardless of active/inactive status
  - **Archived** — areas where `archive = true`. Shows a "Restore" button on each card instead of the archive button. Muted visual treatment (lower opacity or grayed-out cards).

- **Update area card actions:**
  - Non-archived areas show: Edit, Archive (moves to Archived tab)
  - Archived areas show: Restore (moves back to Active or Inactive depending on linked items), Delete permanently (with confirmation dialog — this is the only hard delete in the system)

- **Auto-activation flow:** When a user creates a goal/project/task linked to an area:
  - The database trigger fires `recalc_area_inactive()`
  - The area's `inactive` flag flips from `true` to `false`
  - On the frontend, the TanStack Query cache is invalidated (the area moves from the Inactive tab to the Active tab on next refetch)
  - No user action required — the area activates itself

- **Auto-deactivation flow:** When the last goal/project/task linked to an area is completed, archived, or deleted:
  - The trigger fires again
  - If the area now has 0 non-archived, non-completed linked items, `inactive` flips to `true`
  - The area moves back to the Inactive tab automatically

- **Update area card UI:** Add a subtle status indicator:
  - Active areas: normal rendering, no extra indicator needed
  - Inactive areas: a small "No activity" label or a dimmed state to visually distinguish from active areas
  - Archived areas: grayed-out card with a "Restore" action

**Dependencies:** Step 9b (the 4-tab view system must exist to extend it to 5 tabs). This step also depends on the area-entity linking from Steps 9–9b being in place.

**Testing:**

*Auto-status tests:*
- Create a new area with no linked items — appears in Inactive tab (not Active)
- Create a goal linked to that area — area automatically moves to Active tab
- Delete that goal — area automatically moves back to Inactive tab
- Create a task linked to the area — area moves to Active
- Complete the task — area moves back to Inactive (completed tasks don't count as activity)
- Create a project with 2 tasks linked to the area — area is Active
- Complete one task — area stays Active (1 incomplete task remains)
- Complete the second task — area moves to Inactive

*Archive tests:*
- Archive an active area — it moves to the Archived tab, disappears from Active
- Archive an inactive area — it moves to the Archived tab, disappears from Inactive
- Archived areas do NOT appear in Active, Inactive, or By type tabs
- Archived areas DO appear in the All tab (with a visual "archived" badge) and the Archived tab
- Restore an archived area that has linked items — it reappears in the Active tab
- Restore an archived area that has no linked items — it reappears in the Inactive tab
- "Delete permanently" on an archived area — confirmation dialog appears, area is hard deleted on confirm

*Edge cases:*
- Creating a goal linked to an archived area: the area stays archived (archive is user-intent, not overridden by activity)
- Bulk-archiving multiple areas works correctly
- The "By type" view only shows non-archived areas
- The rollup counts on area cards still work correctly and only count non-archived/non-completed items

*Database trigger tests:*
- Write `tests/unit/area-inactive-trigger.test.ts`:
  - Insert a goal with area_id → area.inactive should be false
  - Delete that goal → area.inactive should be true
  - Insert a task with area_id → area.inactive should be false
  - Update task.complete to true → area.inactive should be true (no other linked items)
  - Insert 2 tasks, complete 1 → area.inactive should be false (1 remains)

- `tsc --noEmit` passes
- `pnpm vitest run` passes

**Deliverable:** Areas page has 5 view tabs (Active, Inactive, By type, All, Archived). Areas auto-detect their active/inactive status based on linked entity counts — zero manual toggling. Archive is a separate, deliberate user action for long-term storage. The system now understands the difference between "nothing is happening here" (inactive) and "I'm done with this" (archived).

---

### Step 10: Goals module

**What:** Full Goals CRUD with card view, progress tracking, and term filtering.

**Actions:**
- Create `src/lib/hooks/use-goals.ts` — `useGoals(filters)`, `useGoal(id)`, `useCreateGoal()`, `useUpdateGoal()`, `useArchiveGoal()`
- Create `src/components/entities/goal-card.tsx` — card with name, area badge, progress ring, priority badge, days remaining, term label
- Create `src/components/charts/progress-ring.tsx` — SVG circular progress indicator (reusable)
- Create `src/app/(dashboard)/goals/page.tsx` — tab bar with views: Active, Short Term, Mid Term, Long Term, Inactive, Completed + "New Goal" button
- Create goal creation/edit dialog — fields: name, description, area (select), term (select), priority, due date
- Create `src/lib/stores/filters.store.ts` — Zustand store for active filters (reusable across modules)
- Connect goals to areas: goal cards show area badge, area detail page lists its goals

**Dependencies:** Step 9 (areas must exist to link goals to them).

**Testing:**
- Create a goal linked to an area — goal card renders with area badge
- Filter by term — only matching goals shown
- Progress ring shows 0% for new goal
- Priority badge renders correct color (red/amber/green)
- Days remaining shows correct count (or "Overdue" in red if past due)
- Area detail page now shows linked goals under its rollup
- Area rollup count increments when goal is created
- `pnpm vitest run` passes

**Deliverable:** Goals module live. Linked to areas. Progress tracking visible.

---

### Step 11: Projects module

**What:** Full Projects CRUD with list view, kanban board, and progress rollup from tasks.

**Actions:**
- Create `src/lib/hooks/use-projects.ts` — full CRUD hooks + `useProjectsByStatus`, `useProjectsByArea`
- Create `src/components/entities/project-card.tsx` — card with name, area badge, status badge, progress bar, task count, due date
- Create `src/components/views/kanban-board.tsx` — drag-and-drop board with columns per status (Inbox → In Progress → Completed → On Hold). Use `@hello-pangea/dnd` for drag-drop.
- Create `src/app/(dashboard)/projects/page.tsx` — tab bar with views: All, Inbox, In Progress, By Area, By Status (Kanban), Archive
- Create `src/app/(dashboard)/projects/[id]/page.tsx` — project detail page showing linked tasks (empty for now), linked goals, notes section
- Create project creation/edit dialog — fields: name, description, area (select), goals (multi-select), priority, start date, due date
- Connect projects to goals via `goal_projects` junction table

**Dependencies:** Step 10 (goals must exist to link projects to them).

**Testing:**
- Create a project linked to area + goal — renders in list and kanban
- Drag project between kanban columns — status updates and persists
- Progress bar shows 0% for project with no tasks
- Link project to a goal — goal card shows project count
- Project detail page renders with correct data
- Filter projects by area — correct results
- `pnpm vitest run` passes

**Deliverable:** Projects module live. Kanban board working. Linked to areas and goals.

---

### Step 12: Tasks module — core list and CRUD

**What:** The most complex module. Build the task list view with inline editing, priority badges, checkbox completion, and filtering.

**Actions:**
- Create `src/lib/hooks/use-tasks.ts` — full CRUD hooks + `useCompleteTask()` (with optimistic update that also invalidates projects and goals queries), `useFocusTask()`, filters
- Create `src/components/entities/task-list-item.tsx` — row with: checkbox, priority badge, task name (inline editable), area tag, project tag, due date tag, focus star icon
- Create `src/components/entities/task-inline-editor.tsx` — click-to-edit task name that saves on Enter/blur
- Create `src/components/entities/priority-badge.tsx` — colored badge for high/medium/low (reusable)
- Create `src/app/(dashboard)/tasks/page.tsx` — tab bar with views: All, Inbox, Upcoming, Overdue, Completed, Focus View + "New Task" button + filter bar (priority, area, project)
- Create task creation/edit dialog — fields: name, description, area (select), project (select), goals (multi-select), priority, due date, focus toggle, important/urgent toggles
- Wire task completion: checkbox → `useCompleteTask` → optimistic update → toast "Task completed" with undo → project progress recalculates → goal completion recalculates

**Dependencies:** Step 11 (projects must exist to link tasks to them).

**Testing:**
- Create a task — appears in All and Inbox views
- Complete a task — checkbox fills, task moves to Completed view
- Complete a task linked to a project — project progress bar updates (verify the DB trigger works end-to-end)
- Complete all tasks in a project — project progress shows 100%
- Inline edit task name — saves on Enter, cancels on Escape
- Filter by priority — correct results
- Filter by area — correct results
- Overdue view shows only tasks past due date
- Focus view shows only tasks with focus flag
- Undo toast after completion — task restored to previous state
- `pnpm vitest run` passes (including task service tests)

**Deliverable:** Task module live. The full PARA chain works: Area → Goal → Project → Task, with progress rolling up at every level.

---

### Step 13: Tasks — smart priority and calendar view

**What:** Add the smart priority algorithm and calendar view to complete the task module.

**Actions:**
- Create `supabase/migrations/00012_create_smart_priority_function.sql` — the `calc_smart_priority()` PostgreSQL function from architecture doc
- Create trigger that recalculates `smart_priority` on task INSERT and UPDATE
- Create Smart Priority view tab — tasks sorted by `smart_priority DESC`, showing the score as a colored badge (5=red, 4=orange, 3=yellow, 2=blue, 1=gray)
- Create `src/components/views/calendar-view.tsx` — monthly calendar grid showing tasks on their due dates. Use a lightweight approach (CSS grid, no heavy calendar library).
- Add Calendar view tab to tasks page
- Create `src/lib/utils/smart-priority.ts` — client-side mirror of the DB function (for display/preview purposes only; DB is source of truth)

**Dependencies:** Step 12 (tasks must have CRUD working).

**Testing:**
- Create a high-priority task with tomorrow's due date linked to 2 goals — smart priority should be 4 or 5
- Create a low-priority task with no due date and no goals — smart priority should be 1 or 2
- Smart Priority view shows tasks in correct descending order
- Calendar view renders tasks on correct dates
- Navigate between months in calendar view
- Write `tests/unit/smart-priority.test.ts` — test all weight factor combinations
- `pnpm vitest run` passes

**Deliverable:** Smart priority algorithm live. Calendar view working. Task module complete.

---


## Phase 3: Knowledge Layer, Contacts, and System Modules

> Goal: The knowledge management layer (Notes, Resources, Topics), professional Contacts, daily workflow modules (Dashboard, Inbox, My Day, Quick Capture), and the Goal detail command center. After this phase, the complete PARA system is live with knowledge management, a professional network tracker, and a full daily productivity workflow.

---

### Step 14: Dashboard home page

**What:** Build the real dashboard replacing the placeholder. Shows today's tasks, active goals, and recent activity.

**Actions:**
- Create `src/lib/services/dashboard.service.ts` — `getToday(userId)` aggregates: today's tasks (due today + focus), overdue count, active goals (top 5 by priority), this week's completed count
- Create `src/lib/hooks/use-dashboard.ts` — `useDashboardToday()`
- Build dashboard page with sections:
  - Greeting bar ("Good morning, [name]. You have X tasks today.")
  - Today's tasks list (reuse `TaskListItem`)
  - Active goals widget (top 5 goal cards in a horizontal scroll)
  - Stats row: tasks completed this week, overdue count, active goals count
  - Recent activity feed (last 10 created/updated items across all entities)
- All sections have loading skeletons and empty states

**Dependencies:** Step 13 (all 4 core modules must be complete).

**Testing:**
- Dashboard loads in < 1.5s (measure with browser DevTools)
- Today's tasks shows tasks due today + focus tasks
- Completing a task from dashboard updates the count instantly
- Active goals show correct progress rings
- Recent activity shows mixed entity types with correct timestamps
- Empty state renders for new users with no data yet
- `pnpm vitest run` passes

**Deliverable:** Dashboard is the real home page. Users see actionable data on login.

---

### Step 15: Quick Capture (Cmd+K command palette)

**What:** Build the command palette for universal quick entry. Starts with core entity search and gets extended as more modules are added in subsequent steps.

**Actions:**
- Create `src/components/layout/command-palette.tsx` — shadcn `Command` component triggered by Cmd+K / Ctrl+K
- Create `src/lib/hooks/use-keyboard.ts` — global keyboard shortcut listener
- Command palette modes:
  - Default: search across existing entities (tasks, goals, projects, areas) by name
  - "Create task: [name]" → creates task inline
  - Navigation: type page name to navigate (e.g., "Goals" → navigate to /goals)
- Wire into dashboard layout (always available on any page)
- Add to `src/lib/stores/ui.store.ts` — `commandPaletteOpen` state

**Dependencies:** Step 14 (dashboard layout). Step 12 (tasks for "create task").

**Testing:**
- Cmd+K opens palette on macOS, Ctrl+K on Windows
- Type a task name — matching tasks appear in results
- Click a result — navigates to the entity
- "Create task: Call dentist" — creates task with name "Call dentist"
- Escape closes palette
- Works on every page in the app
- Palette closes after action is taken

**Deliverable:** Command palette operational. Will be extended in Steps 16–19 as more entity types are added.

---

### Step 16: Notes module (full view set)

**What:** Full Notes CRUD with Tiptap rich text editor, bidirectional linking, and 9 view tabs: Inbox, To review, Pinned, Edited, Favorite, By Topic, By Project, Archived, All.

**Actions:**
- Install Tiptap: `pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-link`
- Create `src/components/entities/note-editor.tsx` — Tiptap editor wrapper with toolbar (bold, italic, headings, lists, links, code blocks)
- Create `src/lib/hooks/use-notes.ts` — full CRUD hooks + `useNotesByProject()`, `useNotesByTopic()`, `usePinnedNotes()`, `useFavoriteNotes()`
- Create `src/lib/validators/note.schema.ts` — Zod schemas including `type` field (Note, Learning, Research, Business Plan, Journal — user-extensible text field, not a rigid enum)
- Create `src/lib/services/note.service.ts` — full CRUD with grouped queries
- Add `notes` table migration if not already created in Step 4
- Create `src/app/(dashboard)/notes/page.tsx` — table/list view with 9 tabs:
  - **Inbox** — notes with status "inbox"
  - **To review** — notes with status "to_review"
  - **Pinned** — notes with `pin = true`
  - **Edited** — notes sorted by `updated_at` descending (recently modified first)
  - **Favorite** — notes with `favorite = true`
  - **By Topic** — notes grouped under collapsible topic headers
  - **By Project** — notes grouped under collapsible project headers, each section showing a table with columns: Pin icon, Status badge, Name, Type badge (colored: Learning=pink, Research=red, Business Plan=rose), Areas, Topics, Star (favorite), Archive checkbox
  - **Archived** — notes with `archive = true`
  - **All** — all notes in a flat table view
- Table columns for list views: Pin (checkbox), Status (colored badge), Name, Type (colored badge), Areas (linked), Topics (linked), Star (favorite toggle), Archive (checkbox)
- "New Note" button opens creation dialog or navigates to editor
- Create `src/app/(dashboard)/notes/[id]/page.tsx` — full-page editor with metadata sidebar (area, project, goals, topics, notebook, type, status, pin, favorite)
- Wire notes to areas, projects, and topics (select fields in metadata sidebar)
- Add note count to area and project rollups
- Extend command palette to include notes in search results and support "Create note: [name]" command

**Dependencies:** Step 9 (areas) + Step 11 (projects) for linking. Step 15 (command palette to extend).

**Testing:**
- Create a note with rich text (bold, headings, lists) — content persists on refresh
- Link a note to an area and project — appears in their detail pages
- All 9 tabs filter correctly
- "By Project" view groups notes under correct project headers with collapsible sections
- Type badges render with correct colors (Learning=pink, Research=red, etc.)
- Pin, favorite, archive all work correctly across tabs
- "Edited" tab sorts by last modified time
- Area and project rollup counts update when notes are added/removed
- Command palette finds notes by name and supports "Create note: [name]"
- Editor handles long content without lag (test with 2000+ word note)
- `pnpm vitest run` passes

**Deliverable:** Notes module live with full view set, rich text editing, and deep cross-linking.

---

### Step 17: Resources module

**What:** Full Resources CRUD for managing external references (web clips, articles, videos, social media posts, documents). Table view with status pipeline, topic linking, and direct URL access. 6 view tabs: Inbox, To review, Favorites, By Topics, Archive, All.

**Actions:**
- Create `src/lib/services/resource.service.ts` — full CRUD + `getByTopic(userId, topicId)`, `getFavorites(userId)`
- Create `src/lib/hooks/use-resources.ts` — full CRUD hooks + `useResourcesByTopic()`
- Create `src/lib/validators/resource.schema.ts` — Zod schemas with `type` field accepting: Website, Article, Video, Document, Podcast, Social Media, Tool (user-extensible text)
- Create `src/components/entities/resource-row.tsx` — table row with: Status badge, Name, Type badge (colored), Topics (linked badges), Areas (linked), Projects (linked), "Open Link" button (opens URL in new tab), Star (favorite toggle), Archive checkbox
- Create `src/app/(dashboard)/resources/page.tsx` — table view with 6 tabs:
  - **Inbox** — resources with status "inbox"
  - **To review** — resources with status "to_review"
  - **Favorites** — resources with `favorite = true`
  - **By Topics** — resources grouped under collapsible topic headers
  - **Archive** — resources with `archive = true`
  - **All** — all resources in flat table view
- Table columns: Status, Name, Type, Topics, Areas, Projects, Open (link button), Star, Archive
- "New Resource" button with fields: name, URL, type (combobox), topics (multi-select), area, project, status
- "Open Link" disabled if URL is empty
- Extend command palette to include resources in search results and support "Create resource: [url]"

**Dependencies:** Step 16 (notes establishes table view pattern and topic linking).

**Testing:**
- Create a resource with URL — "Open Link" opens in new tab
- All 6 tabs filter correctly
- "By Topics" view groups under correct headers
- Status transitions: Inbox → To review → Saved
- Favorite, archive work correctly
- Command palette finds resources by name
- `pnpm vitest run` passes

**Deliverable:** Resources module live. External references captured, categorized, and linked into the PARA system.

---

### Step 18: Topics module

**What:** Full Topics CRUD — the tagging/categorization system connecting Notes and Resources. Gallery view with cards showing linked area badges, rollup counts. 6 view tabs: Active, Favorite, Inactive, By area, All, All (table).

**Actions:**
- Create `src/lib/services/topic.service.ts` — full CRUD + `getGroupedByArea(userId)`, `getActive(userId)`, `getInactive(userId)`
- Create `src/lib/hooks/use-topics.ts` — full CRUD hooks + `useTopicsByArea()`, `useActiveTopics()`, `useInactiveTopics()`
- Create `src/lib/validators/topic.schema.ts` — Zod schemas
- Create `src/components/entities/topic-card.tsx` — card showing: icon, topic name, linked area badges, rollup counts (X Notes, Y Resources), favorite star
- Create `src/app/(dashboard)/topics/page.tsx` — gallery view with 6 tabs:
  - **Active** (default) — topics with 1+ linked notes or resources (auto-computed, same pattern as Step 9c)
  - **Favorite** — topics with `favorite = true`
  - **Inactive** — topics with 0 linked items
  - **By area** — grouped under linked area headers
  - **All** — gallery view
  - **All (table)** — flat table with columns: Name, Areas, Notes count, Resources count, Favorite
- "New Topic" button with fields: name, linked areas (multi-select), favorite
- Topic detail page showing all linked notes and resources
- Database trigger `recalc_topic_inactive()` — same auto-active/inactive pattern as areas

**Dependencies:** Step 16 (notes) + Step 17 (resources) — topics link to both.

**Testing:**
- Create topic → appears in Inactive tab. Link a note → moves to Active tab automatically
- "By area" groups topics under correct headers
- Topic linked to 2 areas appears under both
- Rollup counts correct. Favorite works.
- `pnpm vitest run` passes

**Deliverable:** Topics module live. Knowledge layer complete — Notes, Resources, and Topics fully interconnected.

---

### Step 19: Contacts module (Professional Network & Stakeholder Tracker)

**What:** Professional contacts module — the people you work with, collaborate with, or deliver work to. Each contact links to projects and tasks with a role (team member, client, stakeholder, etc.).

**Actions:**
- **Schema:** `contacts` table: name, role, organization, group (Client/Team Member/Vendor/Mentor/Collaborator/Partner — user-extensible), phone, email, linkedin, website, last_interaction_at, follow_up_interval_days, favorite, notes, archive, metadata JSONB
- `contact_projects` junction: contact_id, project_id, role_in_project TEXT
- `contact_tasks` junction: contact_id, task_id, role_in_task TEXT
- Computed: days_since_interaction, follow_up_status (ON TRACK / FOLLOW UP)
- Service: full CRUD + getByGroup, getByProject, getByTask, getNeedFollowUp, logInteraction, linkToProject, linkToTask
- Contact card: name, role/org subtitle, group badge (colored), phone/email (clickable tel:/mailto:), linked projects with role badges, follow-up status badge
- Page with 5 tabs: All (table), Fav., By group, By project, Follow-up tracker
- "Log Interaction" one-click button on each card
- **Project integration:** "People" section on project detail page (Step 11) with role badges
- **Task integration:** optional "Assigned to" / "Requested by" on task dialog (Step 12)
- Contact detail view with all linked projects/tasks and interaction timeline
- Extend command palette to include contacts

**Dependencies:** Step 11 (projects) + Step 12 (tasks) for linking.

**Testing:**
- Create contact with role, org, group — renders correctly
- Link to project as "Client" — appears in project detail "People" section
- Link to task as "Requester" — task shows contact
- Follow-up logic works (ON TRACK / FOLLOW UP based on interval)
- "Log Interaction" resets follow-up status
- All 5 tabs filter correctly
- Command palette finds contacts
- `pnpm vitest run` passes

**Deliverable:** Professional Contacts live with project/task linking, role tracking, and follow-up reminders.

---

### Step 20: Goal detail page (goal command center)

**What:** Dedicated detail page for each goal — a command center displaying goal properties at the top and embedded, filtered sections for all linked entity types (Projects, Tasks, Notes, Resources) below. Each section has its own tab bar.

**Actions:**
- Create `src/app/(dashboard)/goals/[id]/page.tsx` with properties header + scrollable entity sections
- **Properties header:** goal title (inline editable), area badge, priority badge, completion % with progress ring, due date tracker (red if overdue), collapsible properties panel (Goal Activity rollups, By term badge, Due Date picker, Add Tasks button, Archive checkbox, Completed checkbox), breadcrumb navigation
- **Projects section:** filtered to this goal. Tabs: All, Inbox, In Progress, By status, Timeline, Archive. Reuses `project-card.tsx`. Inline project creation pre-linked to this goal.
- **Tasks section:** filtered to this goal. Tabs: All, Inbox, Upcoming, Overdue, By Projects, Completed. Reuses `task-list-item.tsx`. Inline task completion updates header completion % in real time.
- **Notes section:** filtered to this goal. Dynamic type tabs (standard: All, Inbox, To review, Favorite, Archived + auto-generated tabs from linked notes' `type` values). Filter chip "Goals: [Goal Name]" always applied.
- **Resources section:** filtered to this goal. Dynamic type tabs (standard + auto-generated from `type` values). Filter chip "Goals: [Goal Name]" always applied.
- Create `src/lib/hooks/use-goal-detail.ts` — parallel fetches for goal + all linked entities
- Create `src/components/entities/goal-detail-section.tsx` — reusable section wrapper (accent bar + tabs + filtered list), parameterized by entity type

**Dependencies:** Step 10 (goals), Step 11 (projects), Step 12 (tasks), Step 16 (notes), Step 17 (resources). All entity modules must be built before this step.

**Testing:**
- Header: correct title, area, priority, completion %, due date
- Goal Activity rollup counts correct and clickable (scrolls to section)
- Projects section shows only this goal's projects with full tab navigation
- Tasks: completing a task updates header completion % immediately
- Notes: dynamic type tabs appear based on linked notes' types
- Resources: dynamic type tabs, filter chip present
- Create entities from within goal page → auto-linked to this goal
- Performance: goal with 5 projects + 20 tasks + 10 notes + 8 resources loads in < 2s
- `pnpm vitest run` passes

**Deliverable:** Goal command center live. Users manage an entire goal's scope without navigating away from the page.

---

### Step 21: Inbox and My Day

**What:** GTD-style inbox processing and daily planning views.

**Actions:**
- Create `src/app/(dashboard)/inbox/page.tsx` — aggregated inbox across tasks, notes, and resources. Each item: type badge, name, created date, action buttons (Assign Area, Set Priority, Move to Status)
- Inbox processing: click item → inline form → item leaves inbox
- Create `src/app/(dashboard)/my-day/page.tsx` — tasks due today + focus items + "Plan my day" drag section
- Focus toggle: star icon on any task

**Dependencies:** Step 14 (dashboard). Step 12 (tasks). Step 17 (resources).

**Testing:**
- Inbox shows items from tasks, notes, resources with status "inbox"
- Processing removes item from inbox
- My Day shows today's tasks + focus tasks
- Focus toggle works
- Empty states render

**Deliverable:** Daily workflow complete. Inbox processing and day planning operational.

---

### Step 21b: Notes module — refinements and missing properties

**What:** After building the full system (Steps 14–21), revisit the Notes module to add refinements that only make sense once all other modules are live. Step 16 built the core Notes CRUD and 9 view tabs. This step adds the missing properties, inline behaviors, and cross-module integrations that the initial build deferred.

**Missing properties to add:**

- **Notebook field:** The notes schema includes `notebook` (TEXT) for grouping notes into virtual notebooks (e.g., "Recipes", "Stock Investing", "Meeting Notes"), but Step 16 didn't build the UI for it. Add:
  - A "Notebook" column to the table view (between Projects and Star columns)
  - A notebook filter dropdown in the filter bar (filter notes by notebook)
  - A notebook selector in the note creation dialog and the note editor metadata sidebar (combobox: select existing notebook or create new)
  - A new tab: **By Notebook** — notes grouped under collapsible notebook headers (same pattern as "By Project" and "By Topic")
  - This brings the total tab count to **10**: Inbox, To review, Pinned, Edited, Favorite, By Topic, By Project, By Notebook, Archived, All

- **Goals linking in table view:** The note detail page (editor sidebar) supports linking to goals, but the main table view doesn't show it. Add:
  - A "Goals" column to the table view (after Projects column)
  - Clicking a goal badge in the table navigates to the goal detail page
  - This is important because the Goal command center (Step 20) shows notes filtered by goal — the table view should reflect this relationship bidirectionally

- **Related Notes (bidirectional linking):** The architecture doc specifies a `note_related_notes` self-referential junction table, but Step 16 didn't build the UI. Add:
  - A "Related Notes" section at the bottom of the note editor page
  - "Link Related Note" button opens a note search combobox
  - Linked notes show as clickable cards (title + type badge + status)
  - Linking is bidirectional: if Note A links to Note B, Note B automatically shows Note A in its Related Notes section
  - A "Related" indicator badge on the table view for notes that have 1+ related notes

- **Note type as a column filter:** The Type column exists but the tab bar doesn't have per-type filter tabs. Add dynamic type tabs to the main Notes page (same pattern as the Goal command center from Step 20):
  - Standard tabs always visible: Inbox, To review, Pinned, Edited, Favorite, By Topic, By Project, By Notebook, Archived, All
  - Dynamic tabs auto-generated from distinct `type` values in the user's notes: if a user has notes with type "Learning", "Research", and "Meeting", three additional tabs appear
  - This mirrors how the Goal command center (Step 20) handles Notes section tabs

**Missing inline behaviors:**

- **Inline "+ New page" at table bottom:** Add a clickable "+ New page" row at the bottom of every table view (matching the screenshot). Clicking it creates a new note inline with the current tab's default status (e.g., clicking it in the Inbox tab creates a note with status "inbox")

- **Settings gear next to "New Note" button:** Add a settings popover for configuring note defaults:
  - Default status for new notes (Inbox / To review / Active)
  - Default type for new notes
  - Default notebook
  - These preferences are stored in `user_settings` and pre-fill the creation dialog

- **Pin column behavior:** The pin icon in the first column should be a clickable toggle (not a checkbox). Click to pin → note jumps to top of current view with a pin icon. Click again to unpin. Pinned notes always appear above non-pinned notes within any tab view.

- **Multi-select actions:** Add checkbox column (first column, before pin) for selecting multiple notes. When 1+ notes are selected, show a bulk action bar at the top: "Archive selected", "Change status", "Move to notebook", "Delete". This is visible in the screenshot as checkboxes on the left side of each row.

- **Star (favorite) and Archive as inline toggles:** Both should be clickable directly in the table row without opening the note. Click star → optimistic toggle → toast with undo. Click archive checkbox → note moves to Archived tab with undo toast.

**Actions:**

- Update `src/app/(dashboard)/notes/page.tsx`:
  - Add Notebook column to table
  - Add Goals column to table
  - Add dynamic type tabs alongside the 10 standard tabs
  - Add inline "+ New page" row at bottom
  - Add settings gear popover next to "New Note"
  - Add multi-select checkboxes with bulk action bar
  - Ensure pin icon is a clickable toggle, not a checkbox

- Update `src/app/(dashboard)/notes/[id]/page.tsx` (editor):
  - Add "Related Notes" section at bottom with search-and-link combobox
  - Add notebook selector to metadata sidebar

- Update `src/lib/hooks/use-notes.ts`:
  - Add `useNotesByNotebook()` hook
  - Add `useRelatedNotes(noteId)` hook
  - Add `useLinkRelatedNote()` mutation
  - Add `useBulkUpdateNotes()` mutation for multi-select actions

- Update `src/lib/services/note.service.ts`:
  - Add `getByNotebook(userId, notebook)` method
  - Add `getRelated(userId, noteId)` method
  - Add `linkRelated(userId, noteAId, noteBId)` method
  - Add `bulkArchive(userId, noteIds[])`, `bulkUpdateStatus(userId, noteIds[], status)` methods

- Update `src/lib/validators/note.schema.ts`:
  - Add notebook validation
  - Add bulk action schemas

- Create/verify `supabase/migrations/000XX_note_related_notes.sql`:
  - `note_related_notes` table with `CHECK (note_a_id < note_b_id)` to prevent duplicate bidirectional entries
  - RLS policies: user can only link their own notes
  - Index on both columns

**Dependencies:** Step 16 (base Notes module), Step 18 (Topics — for "By Topic" tab to work fully), Step 20 (Goal command center — establishes the dynamic type tab pattern that gets adopted here).

**Testing:**

*Notebook tests:*
- Create a note with notebook "Meeting Notes" — notebook badge appears in table
- Filter by notebook — only notes in that notebook shown
- "By Notebook" tab groups notes under notebook headers
- Create second notebook "Recipes" — notes correctly grouped under both

*Goals column tests:*
- Link a note to a goal — goal badge appears in the Goals column
- Click goal badge — navigates to goal detail page
- Note appears in the Goal command center's Notes section

*Related Notes tests:*
- Link Note A to Note B — Note B appears in Note A's "Related Notes" section AND Note A appears in Note B's
- Unlink — removed from both sides
- "Related" indicator badge appears on notes with 1+ related notes in table view

*Dynamic type tabs:*
- Create notes with types "Learning", "Research", "Meeting" — three new tabs appear automatically
- Click "Learning" tab — only Learning notes shown
- Delete all Learning notes — "Learning" tab disappears

*Inline behavior tests:*
- Click "+ New page" in Inbox tab → new note created with status "inbox"
- Click pin icon → note moves to top of list with pin indicator
- Click star → favorite toggles with toast + undo
- Click archive checkbox → note moves to Archived tab with undo toast
- Select 3 notes via checkboxes → bulk action bar appears
- "Archive selected" → all 3 move to Archived tab

*Settings gear tests:*
- Set default status to "To review" → new notes pre-fill with "To review" status
- Set default notebook to "Work Notes" → new notes pre-fill with that notebook

- `tsc --noEmit` passes
- `pnpm vitest run` passes

**Deliverable:** Notes module fully polished with all properties, inline behaviors, and cross-module integrations. The module now has 10+ tabs (standard + dynamic), notebook grouping, bidirectional related notes, goals column, multi-select bulk actions, inline toggles, and configurable defaults. This is the most feature-rich module in the system.

> **AS BUILT:** Shipped, but with a **redesigned storage model** (see As-Built Deviation #5). Notebooks are a multi-value `note_notebooks` **junction** (not the `notes.notebook` column this step describes — that column was dropped). Related-notes are **derived from shared notebook membership**, not an explicit `note_related_notes` edge table (also dropped). So "Link Related Note" is not a write to an edge table — two notes are "related" by sharing a notebook. The dynamic type tabs, goals column, multi-select bulk actions, and inline toggles all landed. Phase 4 (Step 27) builds API around the junction + derived model.

---

### Step 22: Knowledge Hub

**What:** Build the Knowledge Hub — a unified discovery interface that brings together Topics, Notes, and Resources on a single page. This is the user's go-to place for storing and easily retrieving all their knowledge, organized by type or topic. It is not a separate database — it is a composite page that queries and displays data from the three existing knowledge modules in embedded sections with a global search bar across all of them.

**Actions:**

- Create `src/app/(dashboard)/knowledge/page.tsx` — the Knowledge Hub page with:

  - **Page header:**
    - Search icon + "Knowledge Hub" title
    - Description: "This hub is your go-to place for storing and easily retrieving all your knowledge. Access and search your resources and notes, neatly organized by type or topic."
    - Global search bar at the top — searches across Notes + Resources + Topics simultaneously. Results appear inline below grouped by type (Topics, Notes, Resources) with match counts per category.

  - **Topics section** (first section):
    - Section header: "Topics" with light blue accent bar
    - Description: "Explore your library of Topics."
    - Embeds the full Topics gallery from Step 18 — same tab bar (Active, Favorite, Inactive, By area, All), same topic cards (icon, name, area badges, rollup counts), same "+ New page" card
    - Clicking a topic card navigates to the Topics detail page
    - "New" button creates a new topic

  - **Notes section** (second section):
    - Section header: "Notes" with accent bar
    - Description: "Access and search your latest Notes."
    - Embeds a filtered Notes table from Step 16 — tab bar: All, Inbox, To review, Pinned, Favorite, By Topic, By Project, Archived
    - Table columns: Pin, Status, Name, Type badge, Topics, Areas, Projects, Star, Archive
    - "New" button creates a new note

  - **Resources section** (third section):
    - Section header: "Resources" with accent bar
    - Description: "Access and search your latest Resources."
    - Embeds a filtered Resources table from Step 17 — tab bar: All, Inbox, To review, Favorites, By Topics, Archive
    - Table columns: Status, Name, Type, Topics, Areas, Projects, Open Link, Star, Archive
    - "New" button creates a new resource

- Create `src/lib/hooks/use-knowledge-hub.ts`:
  - `useKnowledgeSearch(query)` — full-text search across notes (name + content), resources (name + url), and topics (name) simultaneously using PostgreSQL `to_tsvector`. Returns `{ topics: [...], notes: [...], resources: [...] }` with match count per category.
  - Reuses existing `useTopics()`, `useNotes()`, `useResources()` hooks for section data — no data duplication.

- Create `src/lib/services/knowledge.service.ts`:
  - `search(userId, query)` — runs parallel searches across all three tables, returns grouped results with relevance ranking

- Update sidebar navigation: add "Knowledge Hub" link in the System section (between Dashboard and Inbox)

- The Knowledge Hub renders the same components (topic cards, note rows, resource rows) from Steps 16, 17, and 18. It is a composition page — like the Goal command center (Step 20) — not a new database.

**Dependencies:** Step 16 (Notes), Step 17 (Resources), Step 18 (Topics). All three knowledge modules must be built.

**Testing:**
- Knowledge Hub page loads with all 3 sections: Topics, Notes, Resources
- Topics section renders the same gallery as the standalone Topics page
- Notes section renders the same table as the standalone Notes page
- Resources section renders the same table as the standalone Resources page
- Global search: type "productivity" → results grouped: matching Topics, matching Notes, matching Resources
- Search with no results → "No results found" message
- Empty knowledge hub (new user) → empty states in all 3 sections with action buttons
- Click a topic card → navigates to topic detail page
- Click a note row → navigates to note editor
- Click a resource "Open Link" → opens URL in new tab
- Each section's tab bar works independently (switching tabs in Topics doesn't affect Notes)
- "New" buttons in each section create the correct entity type
- Performance: hub with 20 topics + 50 notes + 30 resources loads in < 2 seconds
- `pnpm vitest run` passes

**Deliverable:** Knowledge Hub live. Users have a single page to discover, search, and navigate all their knowledge — topics, notes, and resources unified. This completes the knowledge management layer of LifeOS.

---

## Phase 4: REST API (Full Coverage) — ✅ COMPLETE (shipped 2026-06-30, branch `feat/rest-api-phase4`)

> Goal: Every feature from Phases 1–3 available via a **server-side REST API**, ready for the MCP server (Phase 4b) and the LifeOS Agent (Project 2) to consume. Full API parity — if you can do it in the dashboard, you can do it via API.
>
> **Architectural context (read first):** The app shipped with **no server layer** — all data access is client-side supabase-js gated by Clerk-JWT + RLS, and the service layer imports the **browser** Supabase client. This phase introduces the first server tier. The single biggest new task versus the original plan is **decoupling the service layer from the browser client** (Step 23) so route handlers can execute services server-side. Auth accepts **either** a Clerk session JWT **or** a LifeOS API key, both resolving to a Clerk user id that RLS already understands. This phase covers: Areas (type grouping, auto-active/inactive, multi-area junctions), Goals (priority, detail command center), Projects (contact linking, `inbox` status), Tasks (smart priority, recurrence, multi-project/multi-area junctions, contact linking), Notes (shipped view set — **no notebooks/related-notes**, those were reverted), Resources, Topics (auto-active/inactive), Knowledge Hub (unified search), Contacts (project/task role linking, interaction logs, follow-up), Dashboard, Search, Inbox, and My Day.

---

### AS-BUILT: Phase 4 shipped surface (authoritative — reconciled 2026-06-30)

> The per-step text below (Steps 23–28) is kept for history, but it **over-specified** several endpoints that were never built and used path shapes that differ from what shipped. **This block is the source of truth for the REST tier** and is what Phase 4b (MCP) wraps. Verified against the 63 `route.ts` files under `src/app/api/v1/`, plus `src/lib/api/`.
>
> **Commits:** `72de385` (service decoupling + infra + api_keys/subscriptions/integrations migrations) · `00a4cd7` (63 route handlers + 14 vitest files) · `8dfebe4` (rate-limiter auth-contract test + goal-gate fix). Final verification: `tsc --noEmit` · vitest **1232/1232** · `next build` · goal-gate PASS — all exit 0 on the clean committed tree.

**Infra (Step 23) — all shipped:**
- Migrations: `20260624000000_create_api_keys.sql`, `20260624000001_create_subscriptions.sql`, `20260624000002_create_integrations.sql`.
- `src/lib/api/`: `api-auth.ts`, `rate-limiter.ts`, `api-response.ts`, `api-validator.ts`, `pagination.ts`, `api-key-service.ts`, `error-handler.ts`.
- **Service decoupling:** 12 services take an injectable client, resolved **inline per call site** as `(options?.supabase ?? createClient())`. Do NOT hoist a single `const sb` per method — test mocks assert one `createClient` resolution PER QUERY.

**Auth contract (`api-auth.ts`):** `requireAuth(request)` is used by every v1 route. It calls `authenticateRequest`, which checks `Authorization: Bearer <token>` first (validated as an **API key** via `validateApiKey`, → `{ userId, type: "api_key" }`); otherwise falls through to the Clerk session (`{ userId, type: "clerk" }`). 401 `AuthError` if neither resolves. API keys use the **`lif_`** prefix (sha256-hashed, admin client).

**Response envelope (`api-response.ts`):** `success(data)` → `{ data }` (200) · `created(data)` → `{ data }` (201) · `paginated(data, total, page, pageSize)` → `{ data, pagination: { total, page, pageSize, totalPages } }` · `error(err)` → `{ error: { code, message } }` (uses `err.statusCode`; adds `Retry-After: 60` on 429). Pagination params: `page` (default 1), `pageSize` (default 50, max 200) — **most list routes fetch the full set and slice in-memory**.

**Per-route pattern:** `requireAuth` → `rateLimit(request, userId)` (429 `RATE_LIMITED`) → for writes a `content-type: application/json` guard (415) → service call → envelope.

**The 63 shipped endpoints (use this list for the MCP client, NOT the Step 24–28 prose):**

```
AREAS      GET/POST  /areas                         (?grouped=true, ?inactive, ?archive, ?type)
           GET/PATCH/DELETE  /areas/[id]            (id OR slug)
           POST      /areas/[id]/archive
           POST      /areas/[id]/restore

GOALS      GET/POST  /goals                         (?term ?status ?area_id ?priority + ?archive ?completed ?inactive)
           GET/PATCH/DELETE  /goals/[id]            (GET hydrates progress+rollups — this IS the "detail")
           POST      /goals/[id]/archive · /restore
           GET/POST/DELETE  /goals/[id]/areas       (DELETE: ?area_id query param)

PROJECTS   GET/POST  /projects                      (?status ?area_id ?goal_id ?contact_id ?archive ?group_by=area|status)
           GET/PATCH/DELETE  /projects/[id]
           POST      /projects/[id]/archive · /restore
           GET/POST/DELETE  /projects/[id]/areas    (DELETE: ?area_id query)
           GET/POST/DELETE  /projects/[id]/goals    (DELETE: ?goal_id query)

TASKS      GET/POST  /tasks                          (?status ?priority ?area_id ?project_id ?goal_id ?contact_id ?focused ?overdue ?upcoming ?due_date_from ?due_date_to ?sort=smart-priority)
           GET/PATCH/DELETE  /tasks/[id]             (PATCH is how you complete/focus: { is_completed } / { is_focused })
           POST      /tasks/[id]/archive · /restore
           GET/POST/DELETE  /tasks/[id]/areas        (POST/DELETE body: { area_id })
           GET/POST/DELETE  /tasks/[id]/goals        (body: { goal_id })
           GET/POST/DELETE  /tasks/[id]/projects     (body: { project_id })
           POST      /tasks/bulk/complete · /bulk/archive · /bulk/delete   (body: { ids: uuid[] })

NOTES      GET/POST  /notes                          (?notebook ?goal_id ?topic_id ?project_id ?area_id ?status ?favorite ?pinned ?type ?group_by=notebook|status|type)
           GET/PATCH/DELETE  /notes/[id]
           POST      /notes/[id]/archive · /restore
           GET       /notes/[id]/related             (derived from shared notebooks — READ-ONLY)
           GET/POST/DELETE  /notes/[id]/areas        (DELETE: ?area_id query)
           GET/POST/DELETE  /notes/[id]/projects     (DELETE: ?project_id query)
           GET/POST/DELETE  /notes/[id]/topics       (scalar topic_id; POST {topic_id}, DELETE clears)
           GET/PUT/POST/DELETE  /notes/[id]/notebooks (PUT {notebooks[]} replace · POST {notebook} add · DELETE ?notebook= remove)

RESOURCES  GET/POST  /resources                      (?status ?favorite ?type ?area_id ?goal_id ?project_id ?topic_id ?group_by=status|type|area_id|topic_id|favorite)
           GET/PATCH/DELETE  /resources/[id]
           POST      /resources/[id]/archive · /restore   (restore → resourceService.unarchive)
           GET/POST/DELETE  /resources/[id]/areas    (DELETE body: { area_id })
           GET/POST/DELETE  /resources/[id]/projects (DELETE body: { project_id })

TOPICS     GET/POST  /topics                          (?grouped=true ?archive ?favorite ?inactive)
           GET/PATCH/DELETE  /topics/[id]
           POST      /topics/[id]/archive · /restore

CONTACTS   GET/POST  /contacts                        (?follow_up=true ?group ?archive ?favorite)
           GET/PATCH/DELETE  /contacts/[id]
           POST      /contacts/[id]/archive · /restore  (no dedicated method — update {archive})
           POST      /contacts/[id]/log               (body { message? }: with msg→createLog, without→logInteraction)
           GET/POST/DELETE  /contacts/[id]/projects   (POST { project_id, role_in_project? }; DELETE body { project_id })
           GET/POST/DELETE  /contacts/[id]/tasks      (POST { task_id, role_in_task? }; DELETE body { task_id })
           GET       /contacts/groups

SYSTEM     GET       /dashboard/today · /dashboard/activity
           GET       /inbox                           (tasks+notes+resources where status=inbox, with counts)
           GET       /my-day                          (is_focused tasks)
           GET       /knowledge/search?q=             → { data: results }
           GET       /search?q=                       → { data: { query, results } }   (note the extra `query` wrapper)

USER       GET/PATCH /user/settings                   (note_defaults only)
           GET/POST  /user/api-keys                   (POST { name } → returns raw key ONCE)
           DELETE    /user/api-keys/[id]
           GET/POST  /user/integrations               (POST { type, external_id })
           DELETE    /user/integrations/[id]
```

**Endpoints the Step 24–28 prose specified that were NOT built (do not reference them in Phase 4b):**
`/areas/grouped-by-type` (use `?grouped=true`) · `/goals/[id]/detail` (use `GET /goals/[id]`) · `/tasks/[id]/complete` (use PATCH or `bulk/complete`) · `/tasks/calendar` · `/tasks/[id]/focus` (use PATCH `{is_focused}`) · `/tasks/bulk` create · `/notes/bulk` · `/notes/types` · collection `/notes/notebooks` · `/projects/[id]/contacts` (link from contact side) · `/contacts/[id]/link-project` & `/log-interaction` (shipped as `/projects` & `/log`) · `/export` · `/import/notion`.

**Load-bearing inconsistencies for the MCP client to handle:** junction DELETEs are split between query-param style (goals/areas, projects/areas+goals, notes/areas+projects+notebooks) and JSON-body style (tasks/*, resources/*, contacts/*); `/notes/[id]/notebooks` is the only route using **PUT**; the two search endpoints wrap results differently. The `user/settings` endpoint only exposes `note_defaults` (not the full timezone/briefing settings the Agent eventually wants — that is a Phase 4 follow-up, not an MCP blocker).

---

## Phase 4 — AS BUILT (shipped 2026-06-30, branch `feat/rest-api-phase4`)

> **This block is the source of truth for what Phase 4 actually shipped.** The Step 23–28 text below kept its pre-build spec; the real surface deviated from it in several places. Final verification on a clean committed tree: `tsc --noEmit` · `vitest 1232/1232` · `next build` · goal-gate all exit 0. Commits `72de385` (service decoupling + infra + api-key/subscriptions/integrations migrations), `00a4cd7` (63 route handlers + 14 vitest files), `8dfebe4` (rate-limiter test + goal-gate fix).
>
> **63 `route.ts` files under `src/app/api/v1/`.** Cross-cutting infra in `src/lib/api/`: `api-auth.ts`, `rate-limiter.ts`, `api-response.ts`, `api-validator.ts`, `pagination.ts`, `api-key-service.ts`, `error-handler.ts`.

**Conventions that differ from the Step 24–28 spec — heed these when building the MCP client (Phase 4b):**

- **Auth** (`api-auth.ts`): `requireAuth(request)` accepts **either** a Clerk session JWT **or** an `Authorization: Bearer <key>` LifeOS API key. API-key prefix is **`lif_`** (not `sk_live_`), sha256-hashed, validated via `validateApiKey`. Both resolve to a Clerk user id. Missing/invalid → 401.
- **Response envelope** (`api-response.ts`): success → `{ data }`; created → `{ data }` @ 201; list → `{ data, pagination: { total, page, pageSize, totalPages } }`; error → `{ error: { code, message } }` with `Retry-After: 60` on 429. Most list routes fetch the full set and slice in-memory.
- **Updates use `PATCH`**, not `PUT`. The only `PUT` route is `notes/[id]/notebooks` (full-set replace).
- **Pagination**: `?page` (default 1) + `?pageSize` (default 50, max 200).

**Surface deviations from the Step 24–28 spec:**

- **Tasks:** No `/tasks/[id]/complete`, no `/tasks/calendar`, no `/tasks/[id]/focus`. Single-task completion = `PATCH /tasks/[id] { is_completed }`; focus = `PATCH /tasks/[id] { is_focused }`. `taskService.complete` is reached only via `POST /tasks/bulk/complete`. **Bulk = complete / archive / delete only** (body `{ ids: uuid[] }`), **no bulk create**.
- **Goals:** No `/goals/[id]/detail` — the command-center payload IS `GET /goals/[id]` (hydrates progress + rollups + linked entities).
- **Areas:** No `/areas/grouped-by-type` — use `GET /areas?grouped=true`.
- **Projects:** No `/projects/[id]/contacts` — project↔contact links are managed from the contact side.
- **Contacts:** Linking is `POST/DELETE /contacts/[id]/projects` (body `{ project_id, role_in_project? }`) and `/contacts/[id]/tasks` (body `{ task_id, role_in_task? }`) — NOT `/link-project`. Interaction log is `POST /contacts/[id]/log` (optional `{ message }`; with message → persists a log row + bumps `last_interaction_at`, without → timestamp bump only).
- **Notes:** No `/notes/bulk`, no `/notes/types`, no collection-level `/notes/notebooks`. Only `/notes/[id]/notebooks` (GET/PUT-replace/POST-add/DELETE-remove). `/notes/[id]/related` is GET-only (derived from shared notebooks). A note has at most one topic (`/notes/[id]/topics` is scalar-backed).
- **No `/export`, no `/import/notion`.**
- **Archive/restore** is a per-entity POST pair `[id]/archive` + `[id]/restore` for areas, goals, projects, tasks, notes, resources, topics, contacts. (`resources/[id]/restore` calls `resourceService.unarchive`; contacts archive/restore are `update({ archive })` — no dedicated method.)
- **Junction subroutes** shipped instead of inline array updates: `tasks/[id]/{areas,goals,projects}`, `notes/[id]/{areas,projects,topics,notebooks}`, `goals/[id]/areas`, `projects/[id]/{areas,goals}`, `resources/[id]/{areas,projects}`, `contacts/[id]/{projects,tasks}`. **Inconsistency to handle in the client:** junction `DELETE` is split — query-param style (goals/areas, projects/areas+goals, notes/areas+projects+notebooks) vs JSON-body style (tasks/*, resources/*, contacts/*).
- **User settings** (`/user/settings`) shipped **narrow**: only `{ note_defaults: { default_status, default_type, default_notebook } }` — NOT the timezone/morning_briefing/evening_review/weekly_digest/theme/language/onboarding fields the Step 28 spec listed. (The MCP startup ping in Step 29 still works against it.)
- **API keys** managed at `/user/api-keys` (GET list, POST create → returns raw `key` once) + `/user/api-keys/[id]` (DELETE revoke). **Integrations** at `/user/integrations` (GET/POST) + `/user/integrations/[id]` (DELETE) — direct table access, body `{ type, external_id }`.
- **Search** has two endpoints: `/search?q=` (wraps `{ query, results }`) and `/knowledge/search?q=` (returns `{ results }` only) — both reuse `knowledgeService.search`.
- **Dashboard**: `/dashboard/today` (full payload) + `/dashboard/activity` (just `recentActivity`). **Inbox**: `/inbox` (tasks+notes+resources where status=inbox + counts). **My Day**: `/my-day` (focused tasks + count).

**Full shipped path list (method → notes):** areas (GET/POST), areas/[id] (GET/PATCH/DELETE), areas/[id]/{archive,restore} (POST); goals (GET/POST), goals/[id] (GET/PATCH/DELETE), goals/[id]/{archive,restore} (POST), goals/[id]/areas (GET/POST/DELETE); projects (GET/POST, `?group_by`), projects/[id] (GET/PATCH/DELETE), projects/[id]/{archive,restore} (POST), projects/[id]/{areas,goals} (GET/POST/DELETE); tasks (GET/POST), tasks/[id] (GET/PATCH/DELETE), tasks/[id]/{archive,restore} (POST), tasks/[id]/{areas,goals,projects} (GET/POST/DELETE), tasks/bulk/{complete,archive,delete} (POST); notes (GET/POST), notes/[id] (GET/PATCH/DELETE), notes/[id]/{archive,restore} (POST), notes/[id]/related (GET), notes/[id]/{areas,projects,topics} (GET/POST/DELETE), notes/[id]/notebooks (GET/PUT/POST/DELETE); resources (GET/POST), resources/[id] (GET/PATCH/DELETE), resources/[id]/{archive,restore} (POST), resources/[id]/{areas,projects} (GET/POST/DELETE); topics (GET/POST), topics/[id] (GET/PATCH/DELETE), topics/[id]/{archive,restore} (POST); contacts (GET/POST), contacts/[id] (GET/PATCH/DELETE), contacts/[id]/{archive,restore} (POST), contacts/[id]/log (POST), contacts/[id]/{projects,tasks} (GET/POST/DELETE), contacts/groups (GET); dashboard/{today,activity} (GET); inbox (GET); my-day (GET); knowledge/search (GET); search (GET); user/settings (GET/PATCH); user/api-keys (GET/POST), user/api-keys/[id] (DELETE); user/integrations (GET/POST), user/integrations/[id] (DELETE).

---

### Step 23: API infrastructure (service decoupling, auth, infra tables, rate limiting, error handling)

**What:** Build the server tier foundation that all route handlers share. This is a larger step than the original plan because the service layer must first be made server-executable.

**Actions:**
- **Decouple the service layer from the browser client (prerequisite).** Services currently import `src/lib/supabase/client.ts` (`"use client"`). Refactor each `*.service.ts` to receive a Supabase client (or accept an injected client), so the same service can run with the **server** client (`src/lib/supabase/server.ts`, Clerk-JWT backed) inside route handlers and with the browser client in existing dashboard hooks. Keep the `userId` argument — it stays compatible with RLS. Verify dashboard hooks still pass after the refactor.
- **Provision supporting infra (none of these tables exist yet):**
  - `api_keys` migration — hashed key (`sk_live_…`), label, `clerk_user_id`, scopes, `last_used_at`, `revoked_at`. RLS so users see only their own keys.
  - `subscriptions` migration — tier (`free`/`pro`/`premium`), status, period, linked to `clerk_user_id`. Tiers drive rate limits.
  - `rate_limit` backing store (table or Upstash/Redis-style counter) keyed by user + window.
  - `integrations` migration — `type` (`whatsapp`/`telegram`), `external_id`, `status`, `clerk_user_id` (used by Step 28's `/user/integrations` and the Agent).
- Create `src/lib/api/auth-guard.ts` — accepts **either** a Clerk session JWT **or** an `Authorization: Bearer sk_live_xxx` API key. Resolves both to a Clerk user id. Returns `{ userId, error }`. (Note: this replaces the original's "extract user from JWT or API key" — the JWT here is Clerk's, not Supabase's.)
- Create `src/lib/api/rate-limiter.ts` — token bucket per user, tier from `subscriptions`. Free: 100 req/min, Pro: 500, Premium: 1000.
- Wire `src/lib/api/error-handler.ts` into the response path — its `publicMessage` field (currently dead code) becomes the API's user-facing error message. Maps Zod/Auth/NotFound/DB errors to standardized JSON.
- Create `src/lib/api/pagination.ts` — cursor-based pagination helper.
- Create `src/lib/api/response.ts` — `successResponse(data)`, `listResponse(data, meta)`, `errorResponse(code, message)`.

**Dependencies:** Step 6 (service layer) + Step 7 (Clerk auth).

**Testing:**
- Service layer runs unchanged from existing dashboard hooks (browser client) AND from a route handler (server client) — no regressions in the dashboard.
- Valid Clerk JWT → userId. Valid API key → userId. Invalid/absent → 401.
- Over rate limit → 429 with Retry-After; limit reflects the user's subscription tier.
- `pnpm vitest run` passes.

**Deliverable:** Server API tier foundation complete: service layer is client-agnostic, auth accepts Clerk JWT or API key, and `api_keys`/`subscriptions`/`rate_limit`/`integrations` tables exist.

---

### Step 24: Core PARA API routes (Areas, Goals, Projects, Tasks)

**What:** REST endpoints for the four core entities with all the features built in Phase 2.

**Actions:**
- Create route handlers:
  ```
  /api/v1/areas                       → GET (list, supports ?type= filter, ?status=active|inactive|archived), POST
  /api/v1/areas/[id]                  → GET (with rollup counts), PUT, DELETE
  /api/v1/areas/grouped-by-type       → GET (returns areas grouped by type for "By type" view)

  /api/v1/goals                       → GET (supports ?term=, ?area_id=, ?status=active|inactive|completed), POST
  /api/v1/goals/[id]                  → GET, PUT, DELETE
  /api/v1/goals/[id]/detail           → GET (full command center: goal + linked projects, tasks, notes, resources)

  /api/v1/projects                    → GET (supports ?status=, ?area_id=, ?goal_id=), POST
  /api/v1/projects/[id]               → GET (with task count, progress, linked contacts), PUT, DELETE

  /api/v1/tasks                       → GET (supports ?status=, ?priority=, ?area_id=, ?project_id=, ?focus=, ?overdue=, ?sort_by=smart_priority), POST
  /api/v1/tasks/[id]                  → GET, PUT, DELETE
  /api/v1/tasks/[id]/complete         → POST
  /api/v1/tasks/bulk                  → POST (bulk create — critical for Agent)
  ```
- Every handler: auth guard → Zod validation → service call → standardized response
- GET list endpoints support: cursor, limit, sort_by, sort_order query params

**Dependencies:** Step 23 (API infrastructure).

**Testing:**
- Full CRUD test suite for tasks (create, read, list with filters, update, complete, delete, bulk create)
- GET /api/v1/areas/grouped-by-type → returns correct grouped structure
- GET /api/v1/goals/:id/detail → returns goal + all 4 linked entity arrays
- GET /api/v1/tasks?sort_by=smart_priority → sorted by smart priority descending
- GET /api/v1/tasks?overdue=true → only overdue tasks
- Same pattern for areas, goals, projects
- `pnpm vitest run` passes

**Deliverable:** Full API for core PARA with all Phase 2 features accessible.

> **AS BUILT alignment:** Reflect the shipped schema. Tasks support **multi-area** (`task_areas`) and **multi-project** (`task_projects`) junctions and **recurrence** (`repeat_every`/`repeat_cycle`/`recurrence_source_task_id`) — list filters and create/update payloads must accept arrays for areas/projects and the recurrence fields. Goals carry a `priority`. Projects include the `inbox` status. The `urgent` priority value no longer exists. `?status=` enums must match the shipped values (`completed`, not `saved`). All handlers resolve `userId` from the Step 23 auth-guard (Clerk JWT **or** API key).

---

### Step 25: Knowledge layer API routes (Notes, Resources, Topics)

**What:** REST endpoints for the knowledge management modules with all their views and grouping capabilities.

**Actions:**
- Create route handlers:
  ```
  /api/v1/notes                       → GET (supports ?status=, ?topic_id=, ?project_id=, ?type=, ?pin=, ?favorite=, ?group_by=project|topic), POST
  /api/v1/notes/[id]                  → GET (with full content), PUT, DELETE

  /api/v1/resources                   → GET (supports ?status=, ?topic_id=, ?area_id=, ?type=, ?favorite=, ?group_by=topic), POST
  /api/v1/resources/[id]              → GET, PUT, DELETE

  /api/v1/topics                      → GET (supports ?status=active|inactive, ?area_id=, ?include_counts=true, ?group_by=area), POST
  /api/v1/topics/[id]                 → GET (with linked notes/resources), PUT, DELETE
  ```
- Notes group_by returns sections: `{ sections: [{ header: "Project Name", items: [...notes] }] }`
- Topics include_counts returns: `{ ...topic, note_count: 5, resource_count: 3 }`

**Dependencies:** Step 24 (core API routes). Steps 16–18 (modules must exist).

**Testing:**
- POST /api/v1/notes → 201 with content field
- GET /api/v1/notes?group_by=project → grouped results
- GET /api/v1/notes?type=Learning → filtered by type
- GET /api/v1/resources?group_by=topic → grouped results
- GET /api/v1/topics?include_counts=true → counts included
- GET /api/v1/topics?status=inactive → only inactive topics
- `pnpm vitest run` passes

**Deliverable:** Knowledge layer fully API-accessible. Agent can create notes from voice, save URLs as resources, and auto-tag with topics.

> **AS BUILT alignment:** Notes notebooks ship as a multi-value `note_notebooks` **junction** (not a column), so `group_by=notebook` and a notebook filter ARE valid here (alongside `project` and `topic`). Notes support multi-project (`note_projects`) and the `?type=` dynamic values that actually shipped. Resources support multi-area (`resource_areas`) and `resource_projects` junctions. Topics use the auto-active/inactive trigger. All `?status=` enums must match shipped values.

---

### Step 26: Contacts, Dashboard, Search, and Inbox API routes

**What:** REST endpoints for Contacts (with project/task role linking), Dashboard aggregations, full-text search across ALL entity types, and Inbox.

**Actions:**
- Create route handlers:
  ```
  /api/v1/contacts                              → GET (supports ?group=, ?project_id=, ?follow_up_needed=true), POST
  /api/v1/contacts/[id]                         → GET (with linked projects/tasks and roles), PUT, DELETE
  /api/v1/contacts/[id]/log-interaction          → POST (updates last_interaction_at)
  /api/v1/contacts/[id]/link-project             → POST ({ project_id, role_in_project })
  /api/v1/contacts/[id]/link-task                → POST ({ task_id, role_in_task })
  /api/v1/contacts/[id]/unlink-project/[pid]     → DELETE
  /api/v1/contacts/[id]/unlink-task/[tid]        → DELETE

  /api/v1/dashboard/today                        → GET (today's tasks, focus, overdue, active goals, stats)
  /api/v1/dashboard/summary                      → GET (weekly stats, streaks, entity counts)

  /api/v1/search                                 → GET (?q=...&types[]=tasks&types[]=notes&types[]=contacts&types[]=resources&types[]=topics — full-text search across ALL entities)

  /api/v1/inbox                                  → GET (aggregated inbox items across tasks, notes, resources)

  /api/v1/export                                 → GET (export all user data as JSON)
  /api/v1/import/notion                          → POST (import from CSV)
  ```
- Search queries ALL entity types: tasks, projects, goals, areas, notes, resources, topics, contacts
- Contacts GET with `?follow_up_needed=true` returns only overdue contacts
- Dashboard/today returns same aggregation as the dashboard service

**Dependencies:** Step 25 (knowledge API). Step 19 (contacts module).

**Testing:**
- POST /api/v1/contacts → 201 with role, organization, group
- POST /api/v1/contacts/:id/link-project → links with role
- POST /api/v1/contacts/:id/log-interaction → updates timestamp
- GET /api/v1/contacts?follow_up_needed=true → only overdue contacts
- GET /api/v1/search?q=marketing&types[]=tasks&types[]=notes → matching results
- GET /api/v1/search?q=john&types[]=contacts → matching contacts
- GET /api/v1/dashboard/today → correct aggregation
- GET /api/v1/inbox → all inbox items across entity types
- `pnpm vitest run` passes

**Deliverable:** API coverage for Contacts, Dashboard, Search, and Inbox complete.

> **AS BUILT alignment:** Contacts shipped with `contact_logs` (interaction log rows + follow-up trigger), and `contact_areas` / `contact_goals` junctions in addition to `contact_projects` / `contact_tasks`. The interaction-log column is `logged_at` and the payload field is `message` (not `note`). Search must cover the shipped entity set. Dashboard/Inbox/My-Day aggregations reuse the decoupled services from Step 23.

---

### Step 27: Notes refinements API routes (junction + derived model)

**What:** API endpoints for the shipped Notes refinements — notebooks (multi-value junction), related-notes (derived from shared notebooks), bulk actions, pin filtering, and dynamic type-tab data. **Note the redesigned storage model (As-Built Deviation #5):** notebooks live in the `note_notebooks` junction (a note can be in many notebooks), and related-notes are **derived** from shared notebook membership rather than stored in an edge table.

**Actions:**
- Create/extend route handlers:
  ```
  /api/v1/notes?notebook=<name>        → GET filter: notes in a specific notebook (via note_notebooks junction)
  /api/v1/notes?pin=true               → GET filter: pinned notes only
  /api/v1/notes?group_by=project|topic|notebook → GET: grouped results (notebook grouping is junction-backed)
  /api/v1/notes/notebooks              → GET: distinct notebook names for the user (noteService.listNotebooks)
  /api/v1/notes/types                  → GET: distinct type values for the user's notes (dynamic type tabs)
  /api/v1/notes/bulk                   → POST: bulk ops. Body: { note_ids: [], action: "archive" | "change_status" | "move_to_notebook", params: { status?, notebook? } }
  /api/v1/notes/[id]/notebooks         → GET (note's notebooks), PUT (replace via replaceNotebooks), POST (add), DELETE (remove)
  /api/v1/notes/[id]/related           → GET: notes derived as related (share a notebook with this note; noteService.getRelatedByNotebook). READ-ONLY — there is no related edge to write.
  ```
- **Design note for the implementer:** Do NOT create a `note_related_notes` edge table or `link-related`/`unlink-related` write endpoints — that edge model was dropped. "Relating" two notes = placing them in a shared notebook (use the `/notes/:id/notebooks` add endpoint or the `move_to_notebook` bulk action). `/notes/:id/related` is purely a derived read.

**Dependencies:** Step 25 (base Notes API). Step 16 + 21b (shipped Notes module — junction + derived model).

**Testing:**
- GET /api/v1/notes?notebook=Meeting%20Notes → only notes in that notebook
- GET /api/v1/notes?pin=true → only pinned notes
- GET /api/v1/notes?group_by=notebook → notes grouped under notebook headers (a note in 2 notebooks appears under both)
- GET /api/v1/notes/notebooks → returns distinct notebook names
- GET /api/v1/notes/types → returns distinct shipped type values
- POST /api/v1/notes/bulk { note_ids:[a,b,c], action:"archive" } → all 3 archived
- POST /api/v1/notes/bulk { note_ids:[a], action:"move_to_notebook", params:{ notebook:"Recipes" } } → note added to that notebook
- PUT /api/v1/notes/:id/notebooks { notebooks:["A","B"] } → note's notebook membership replaced
- GET /api/v1/notes/:id/related → returns notes sharing a notebook (derived); never a 404 for a note with no shared-notebook peers (empty array)
- `pnpm vitest run` passes

**Deliverable:** Notes API has parity with the shipped Notes module — notebook membership (multi-value junction), derived related-notes, bulk operations, pin filtering, and dynamic type enumeration.

---

### Step 28: Missing entity action and system API routes

**What:** Close all remaining API gaps identified in the audit — area archive/restore actions, project contacts listing, task calendar and focus endpoints, My Day endpoint, and user settings endpoint (critical for Agent).

**Actions:**
- Create route handlers:
  ```
  AREAS (archive/restore actions):
  /api/v1/areas/[id]/archive           → POST: sets archive=true (user action, not auto-inactive)
  /api/v1/areas/[id]/restore           → POST: sets archive=false, returns area to active or inactive based on linked entity count

  PROJECTS (contacts listing):
  /api/v1/projects/[id]/contacts       → GET: list all contacts linked to this project with their role_in_project. Returns [{ contact: {...}, role: "Client" }, ...]

  TASKS (calendar + focus):
  /api/v1/tasks/calendar               → GET (?month=&year=): returns tasks grouped by date for the calendar view. Response: { dates: { "2026-05-03": [task, task], "2026-05-04": [task] } }
  /api/v1/tasks/[id]/focus             → POST: toggle focus flag on a task. Body: { focus: boolean }

  MY DAY:
  /api/v1/my-day                       → GET: returns combined view of tasks due today + tasks with focus=true. Same data as the My Day page. Response: { today_tasks: [...], focus_tasks: [...], overdue: [...] }

  USER SETTINGS (critical for Agent):
  /api/v1/user/settings                → GET: returns user preferences (timezone, morning_briefing_time, evening_review_time, weekly_digest_day, theme, language, onboarding_complete)
  /api/v1/user/settings                → PUT: update user preferences. Body: any subset of settings fields.
  /api/v1/user/integrations            → GET: list user's linked integrations (whatsapp, telegram — type, external_id, status)
  /api/v1/user/integrations            → POST: link a new integration. Body: { type: "whatsapp" | "telegram", external_id: string }. Used by Agent during onboarding.
  /api/v1/user/integrations/[id]       → DELETE: unlink an integration

  KNOWLEDGE HUB (unified search):
  /api/v1/knowledge/search             → GET (?q=...): searches across notes, resources, and topics simultaneously. Returns { topics: [...], notes: [...], resources: [...], counts: { topics: N, notes: N, resources: N } }
  ```

**Dependencies:** Step 25 (all prior API routes). Step 9c (area archive/restore logic). Step 21 (My Day logic). Step 7 (user settings table).

**Testing:**

*Areas:*
- POST /api/v1/areas/:id/archive → area.archive = true
- POST /api/v1/areas/:id/restore → area.archive = false, area.inactive recalculated based on linked entities
- Archive an area, then restore it — verify correct active/inactive state post-restore
- Archive an already-archived area → idempotent (no error)

*Projects:*
- GET /api/v1/projects/:id/contacts → returns linked contacts with roles
- Project with 0 contacts → returns empty array (not 404)
- Project with 3 contacts (2 as Client, 1 as Reviewer) → correct role values

*Tasks:*
- GET /api/v1/tasks/calendar?month=5&year=2026 → returns tasks grouped by date strings
- Calendar response includes tasks from all statuses except "done" by default
- POST /api/v1/tasks/:id/focus with { focus: true } → task.focus = true
- POST /api/v1/tasks/:id/focus with { focus: false } → task.focus = false

*My Day:*
- GET /api/v1/my-day → returns today_tasks (due today) + focus_tasks (focus=true) + overdue
- A task due today AND marked as focus appears in both arrays (no deduplication — let the client decide display)
- Empty day → all arrays empty (not error)

*User Settings:*
- GET /api/v1/user/settings → returns all settings for authenticated user
- PUT /api/v1/user/settings with { timezone: "Asia/Kolkata" } → timezone updated, other fields unchanged
- PUT with unknown field → rejected (Zod strict mode)
- GET /api/v1/user/integrations → returns [] for new user
- POST /api/v1/user/integrations with { type: "whatsapp", external_id: "+91..." } → integration created
- Duplicate integration (same type + external_id) → returns 409 Conflict
- DELETE /api/v1/user/integrations/:id → integration removed

*Knowledge Hub:*
- GET /api/v1/knowledge/search?q=productivity → returns matching topics, notes, and resources with counts
- GET /api/v1/knowledge/search?q=nonexistent → returns empty arrays with zero counts (not error)

- `pnpm vitest run` passes

**Deliverable:** All API gaps from the audit are closed. Phase 4 now has complete parity with every feature built in Phases 1–3. No dashboard feature is unreachable via API.

> **AS BUILT alignment:** `user_settings` already exists; `integrations` is provisioned in Step 23 (not here). `/user/integrations` writes to that table and is consumed by the Agent. Area archive/restore and the auto-inactive recompute match the shipped `recalc_area_inactive` triggers. Knowledge-hub search reuses the shipped client-side `knowledge.service` logic, run server-side via the Step 23 decoupling.

---

## Phase 4b: MCP Server

> Goal: Build an MCP (Model Context Protocol) server that wraps the LifeOS Core REST API, allowing users to connect LifeOS to any MCP-compatible AI client — Claude Desktop, Claude Code, Cursor, Codex, or any future MCP host. This is the launch differentiator: "LifeOS works inside the AI you already use." No new AI infrastructure needed. The user's existing AI model handles natural language; the MCP server handles structured data operations.
>
> **AS BUILT alignment (authoritative — read the "AS-BUILT: Phase 4 shipped surface" block above first):** This phase wraps the REST tier exactly as it shipped. Auth uses a **LifeOS API key** (`lif_` prefix, from the `api_keys` table; sent as `Authorization: Bearer lif_…`); `requireAuth` resolves it server-side to a Clerk user id, so the MCP server never touches Clerk directly. **Startup validation hits `GET /api/v1/user/settings`** (returns `{ data: { note_defaults } }`; a 200 = key valid). The MCP client must mirror the **63 real endpoints** listed in the Phase 4 AS-BUILT block — including its load-bearing quirks: junction DELETEs are split query-param vs JSON-body; `/notes/[id]/notebooks` uses PUT; `/search` wraps results in `{ data: { query, results } }` while `/knowledge/search` returns `{ data: results }`. Map MCP "tool verbs" onto these:
> - `complete_task` → `POST /tasks/bulk/complete { ids:[id] }` (no single-task complete route) or `PATCH /tasks/[id] { is_completed:true }`.
> - `get_goal_detail` → `GET /goals/[id]` (already hydrates progress + rollups; no `/detail` route).
> - `archive_area`/`restore_area` → `POST /areas/[id]/archive` / `/restore`.
> - `link_contact_to_project` → `POST /contacts/[id]/projects { project_id, role_in_project? }`.
> - `log_interaction` → `POST /contacts/[id]/log { message? }`.
> - `get_today` → `GET /dashboard/today`; `get_my_day` → `GET /my-day`; `get_inbox` → `GET /inbox`.
> - Notebook membership and derived related-notes use the junction + derived model (`/notes/[id]/notebooks`, `/notes/[id]/related` read-only) — there is no related-notes edge to write.

---

### Step 29: MCP server — scaffold and authentication — ✅ COMPLETE (verified PASS)

**What:** Initialize the MCP server project, set up transport layers (stdio + HTTP/SSE), and implement user authentication via LifeOS Core API keys.

**Actions:**
- Create `packages/mcp-server/` in the monorepo with TypeScript + Node.js
- Directory structure: `src/` with `index.ts`, `server.ts`, `auth.ts`, `client.ts`, `tools/` (one file per entity category), `types.ts`, `utils.ts`
- Install MCP SDK: `pnpm add @modelcontextprotocol/sdk`
- Implement stdio transport (for Claude Desktop / Claude Code) and HTTP/SSE transport (for remote hosting)
- Implement auth: user provides API key during config → server validates against `GET /api/v1/user/settings` on startup → all tool calls use this key
- Create typed LifeOS API client in `src/client.ts` mirroring every REST endpoint

**Dependencies:** Step 28 (REST API must be complete).

**Testing:**
- Server starts on stdio and HTTP/SSE transports
- Valid API key → tools listed. Invalid → clear error, server refuses to start
- `tsc --noEmit` passes

**Deliverable:** MCP server scaffold with auth. No tools yet.

---

### Step 30: MCP server — core PARA tools — ✅ COMPLETE (verified PASS)

**What:** MCP tools for Areas, Goals, Projects, Tasks — the highest-frequency operations.

**Actions:**
- **Task tools:** `create_task`, `list_tasks` (with all filters), `complete_task`, `update_task`, `get_today`, `get_smart_priority`
- **Goal tools:** `create_goal`, `list_goals`, `get_goal_detail` (command center data), `update_goal`
- **Project tools:** `create_project`, `list_projects`, `get_project` (with tasks + contacts), `update_project`
- **Area tools:** `list_areas`, `create_area`, `archive_area`, `restore_area`
- Every tool has: descriptive name, AI-optimized description (written for model consumption, not human), JSON Schema input definition, async handler calling the API client

**Dependencies:** Step 29 (scaffold + auth).

**Testing:**
- Connect to Claude Desktop → all tools appear
- "Create a task called Review pitch deck, high priority, due Friday" → task appears in LifeOS dashboard
- "What are my tasks for today?" → returns formatted today view
- "Complete the pitch deck task" → task done, project progress updates
- "Show me the Fundraising goal details" → returns command center data
- All error cases return friendly messages

**Deliverable:** Core PARA tools live via MCP.

---

### Step 31: MCP server — knowledge, contacts, and system tools — ✅ COMPLETE (verified PASS)

**What:** MCP tools for Notes, Resources, Topics, Knowledge Hub search, Contacts, Dashboard, Inbox, and My Day.

**Actions:**
- **Note tools:** `create_note`, `list_notes`, `get_note`, `update_note`
- **Resource tools:** `save_resource`, `list_resources`
- **Topic tools:** `list_topics`, `create_topic`
- **Contact tools:** `create_contact`, `list_contacts`, `log_interaction`, `link_contact_to_project`
- **Search tools:** `search` (all entities), `knowledge_search` (notes + resources + topics)
- **System tools:** `get_dashboard`, `get_my_day`, `get_inbox`

**Dependencies:** Step 30 (core tools establish the pattern).

**Testing:**
- "Save this article about React patterns" → resource created
- "Create a note about the meeting, link it to Product Launch" → note with project link
- "Search my knowledge hub for marketing" → grouped results
- "Who's on the Website Redesign project?" → contacts with roles
- "What's in my inbox?" → inbox items across entity types
- Full tool suite: ~30 tools covering every LifeOS module

**Deliverable:** Complete MCP tool suite. Every LifeOS feature accessible from any MCP-compatible AI client.

---

### Step 32: MCP server — publishing and documentation — 🟡 IN PROGRESS (docs + dashboard page shipped; npm publish + registry submission pending — both require maintainer npm auth)

> **AS BUILT:** README (`packages/mcp-server/README.md`) and the `/settings/mcp` dashboard page have shipped. The page lists/creates/revokes API keys via same-origin fetch to `/api/v1/user/api-keys` (Clerk-session auth — `requireAuth` falls through to the Clerk session when no Bearer key is present) and renders copy-able Claude Desktop / Claude Code configs using `@lifeos/mcp-server`. **Not yet done:** `pnpm publish` of the package and Anthropic MCP-registry submission — irreversible public actions, left for the maintainer to run with their npm credentials.

**What:** Package for npm distribution, setup docs, and a dashboard settings page for easy user onboarding.

**Actions:**
- Publish to npm as `@lifeos/mcp-server`
- README with setup for Claude Desktop (JSON config), Claude Code (`claude mcp add`), and Cursor
- Create `/settings/mcp` page in web dashboard:
  - Pre-filled setup instructions with user's API key
  - "Copy Claude Desktop config" and "Copy Claude Code command" buttons
  - Connection status indicator
- Submit to Anthropic MCP server registry for public listing
- Landing page section: "Connect LifeOS to your AI assistant"

**Dependencies:** Step 31 (all tools). Step 23 (api_keys table — users need keys; the Step 38 settings UI for managing them is a nicety, not a blocker).

**Testing:**
- `npx @lifeos/mcp-server` starts cleanly
- Copy-paste Claude Desktop config → tools appear
- End-to-end: create API key → configure MCP → say "create a task" → task in dashboard
- npm package installs with zero dependency issues

**Deliverable:** MCP server published and installable. Users connect LifeOS to their AI in under 2 minutes.

---

## Phase 5: Personal Trackers (MVP Set)

> Goal: Three personal tracker modules to validate the tracker concept. If users adopt these, we build the remaining six. Each tracker includes both dashboard UI and API routes.

---

### Step 33: Database schema — tracker tables

**What:** Migrations for Bookmarks, Grocery List, and Book Tracker.

**Actions:**
- Create migrations for: `bookmarks`, `bookmark_collections`, `bookmark_tags`, `grocery_items`, `grocery_categories`, `books`, `book_notes`
- Add RLS policies, indexes, `updated_at` triggers
- Regenerate types

**Dependencies:** Step 4 (core schema).

**Testing:** Tables created, RLS works, `tsc --noEmit` passes.

**Deliverable:** Tracker database layer ready.

---

### Step 34: Bookmarks tracker

**What:** Bookmarks with collections, tags, favorites. Tabs: All, Bookmarks, Reading List, Favorites.

**Dependencies:** Step 28. **Includes API routes:** `/api/v1/trackers/bookmarks`.

---

### Step 35: Grocery List tracker

**What:** Categorized items with quantity and in-stock toggling. Grouped by category.

**Dependencies:** Step 28. **Includes API routes:** `/api/v1/trackers/groceries`.

---

### Step 36: Book Tracker

**What:** Reading list with status, ratings, reading notes. Gallery view. Tabs: All, To Read, Reading, Completed.

**Dependencies:** Step 28. **Includes API routes:** `/api/v1/trackers/books`.

**Deliverable (Steps 34–36):** Three personal trackers live with both dashboard UI and API routes. MVP tracker set complete.

---

## Phase 6: Onboarding and Polish

> Goal: New user experience is smooth, mobile experience is solid, and the app is deployable to production.

---

### Step 37: Onboarding flow

**What:** Multi-step post-signup wizard: areas setup → first goal → first tasks → preferences.

**Dependencies:** Steps 9, 10, 12, 7.

---

### Step 38: API key management

**What:** Settings page (UI only) for creating/revoking/listing API keys. The `api_keys` table and auth-guard already exist from Step 23 — this step is just the management surface.

**Dependencies:** Step 23 (api_keys table + auth guard).

---

### Step 39: Settings page and user preferences

**What:** General settings: profile, timezone, theme, notifications, account management, integrations placeholder.

**Dependencies:** Step 32 (onboarding creates initial settings).

---

### Step 40: Responsive polish and PWA

**What:** Audit all pages at 375px–1440px. PWA manifest, icons, service worker, "Add to Home Screen" testing.

**Dependencies:** All previous steps.

**Deliverable (Steps 37–40):** Onboarding, settings, API keys, responsive polish, PWA all complete.

---

## Phase 7: Deployment and Launch Prep

> Goal: Running in production with CI/CD, monitoring, and E2E tests.

---

### Step 41: CI/CD pipeline

**What:** GitHub Actions: lint → type-check → test → deploy to Vercel + Supabase production.

**Dependencies:** All previous steps.

---

### Step 42: Production hardening

**What:** Sentry, PostHog, CSP headers, rate limiting verification, RLS audit, load testing, Playwright E2E tests against production.

**Dependencies:** Step 41 (must be deployed).

**Deliverable (Steps 41–42):** Production-ready. Invite beta users.

---

## Phase 8: Post-MVP (Out of Scope for This Roadmap)

```
Step 43+: LifeOS Agent (Project 2) — WhatsApp/Telegram AI assistant
Step 44+: Time Tracker + Pomodoro
Step 45+: Archive cross-entity view
Step 46+: Remaining 6 personal trackers (Movies, Supplements, Wishlist, Orders, Warranties, Passwords)
Step 49+: Stripe billing integration
Step 51+: Outbound webhooks system
Step 52+: CSV import
Step 53+: Data export (GDPR)
Step 54+: Semantic search with pgvector
Step 55+: Supabase Realtime subscriptions (live updates from Agent)
```

---

## Summary

```
PHASE    STEPS      WHAT YOU HAVE WHEN DONE
─────────────────────────────────────────────────────────────────
1        1–7        Running app with auth, DB schema, service
                    layer, type safety, and first tests passing

2        8–13       Full PARA system (Areas → Goals → Projects →
         (inc.      Tasks) with "By type" grouped view, auto
         9b, 9c)    active/inactive detection, archive system,
                    smart priority, and calendar view

3        14–22      Dashboard, Quick Capture, Notes (shipped
         (inc.      view set + notebooks), Resources (6 views),
         21b)       Topics (6 views), Contacts (professional CRM
                    with role linking + interaction logs), Goal
                    command center, Inbox, My Day, Knowledge Hub.
                    21b shipped with a REDESIGNED storage model:
                    notebooks = note_notebooks junction (multi-
                    value); related-notes = derived from shared
                    notebooks (no edge table).

4        23–28      Full server-side REST API over ALL Phase 1–3
                    modules. Introduces the first server tier:
                    service layer decoupled from the browser
                    client; auth accepts Clerk JWT OR API key;
                    api_keys/subscriptions/rate_limit/integrations
                    tables provisioned. 60+ endpoints, zero gaps.

4b       29–32      MCP Server: ~30 tools wrapping the REST API.
                    Published to npm as @lifeos/mcp-server.
                    Users connect LifeOS to Claude Desktop,
                    Claude Code, Cursor, or any MCP client.
                    "LifeOS works inside the AI you already use."

5        33–36      3 personal trackers (Bookmarks, Groceries,
                    Books) with UI + API routes

6        37–40      Onboarding, settings, API keys, PWA,
                    responsive polish

7        41–42      CI/CD, production deployment, monitoring,
                    E2E tests, beta launch

POST-MVP 43+        Agent (Project 2), remaining trackers,
                    billing, Time Tracker, webhooks, imports
```

**Total MVP steps: 42** (Steps 1–42, including 9b, 9c, 21b)
**Estimated timeline: 13–16 weeks for a solo developer, 8–10 weeks for a team of 2–3**

---

*Each step in this roadmap maps directly to the LifeOS Core PRD, Architecture Document, and AI Rules. When building any step, reference all three documents.*

# LifeOS Core — Build Roadmap

**Sequential build plan for the LifeOS Core SaaS application.**

Every step is completable in a single coding session (2–4 hours). Steps are ordered by dependency — you cannot start step N until step N-1 is done and tested. No skipping. No parallelization until explicitly noted.

Reference documents:
- `LifeOS-Core-PRD-Lean.md` — what to build
- `LifeOS-Core-Architecture.md` — how to build it
- `LifeOS-Core-AI-Rules.md` — coding standards

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

## Phase 4: REST API (Full Coverage)

> Goal: Every feature from Phases 1–3 available via REST API, ready for the LifeOS Agent (Project 2) to consume. Full API parity — if you can do it in the dashboard, you can do it via API. This covers: Areas (with type grouping and auto-active/inactive), Goals (with detail command center data), Projects (with contact linking), Tasks (with smart priority and contact linking), Notes (9+ views), Resources (6 views), Topics (with auto-active/inactive), Knowledge Hub (unified search), Contacts (with project/task role linking and follow-up tracking), Dashboard, Search, and Inbox.

---

### Step 23: API infrastructure (auth, rate limiting, error handling)

**What:** Build the API middleware layer that all route handlers share.

**Actions:**
- Create `src/lib/api/auth-guard.ts` — extracts user from JWT or API key (`Authorization: Bearer sk_live_xxx`). Returns `{ user, error }`.
- Create `src/lib/api/rate-limiter.ts` — token bucket per user. Free: 100 req/min, Pro: 500, Premium: 1000.
- Create `src/lib/api/error-handler.ts` — maps Zod/Auth/NotFound/DB errors to standardized JSON responses
- Create `src/lib/api/pagination.ts` — cursor-based pagination helper
- Create `src/lib/api/response.ts` — `successResponse(data)`, `listResponse(data, meta)`, `errorResponse(code, message)`
- Add `api_keys`, `user_settings`, `subscriptions` table migrations if not present

**Dependencies:** Step 6 (service layer) + Step 7 (auth).

**Testing:**
- Valid JWT → user. Invalid → 401. Valid API key → user. No auth → 401.
- Over rate limit → 429 with Retry-After
- `pnpm vitest run` passes

**Deliverable:** API middleware complete.

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

---

### Step 27: Notes refinements API routes (closing Step 21b gaps)

**What:** API endpoints for all features added in Step 21b — notebooks, related notes (bidirectional linking), bulk actions, and dynamic type tab data. Without this step, the Agent cannot manage notebooks, link related notes, or perform bulk operations on notes.

**Actions:**
- Create/extend route handlers:
  ```
  /api/v1/notes?notebook=              → GET filter: notes in a specific notebook
  /api/v1/notes?pin=true               → GET filter: pinned notes only
  /api/v1/notes?group_by=notebook      → GET: notes grouped by notebook (extends existing group_by to support 3 values: project, topic, notebook)
  /api/v1/notes/notebooks              → GET: list of distinct notebook names for the user (used by Agent to know which notebooks exist)
  /api/v1/notes/types                  → GET: list of distinct type values for the user's notes (used to generate dynamic type tabs)
  /api/v1/notes/bulk                   → POST: bulk operations on multiple notes. Body: { note_ids: [], action: "archive" | "change_status" | "move_to_notebook", params: { status?: string, notebook?: string } }
  /api/v1/notes/[id]/related           → GET: list of related notes (bidirectional) for a specific note
  /api/v1/notes/[id]/link-related      → POST: link two notes as related. Body: { related_note_id: string }. Creates bidirectional link.
  /api/v1/notes/[id]/unlink-related/[rid] → DELETE: remove a related note link (bidirectional)
  ```

**Dependencies:** Step 25 (base Notes API). Step 21b (UI features these endpoints serve).

**Testing:**
- GET /api/v1/notes?notebook=Meeting%20Notes → only notes in that notebook
- GET /api/v1/notes?pin=true → only pinned notes
- GET /api/v1/notes?group_by=notebook → notes grouped by notebook headers
- GET /api/v1/notes/notebooks → returns ["Meeting Notes", "Recipes", "Work Notes"]
- GET /api/v1/notes/types → returns ["Note", "Learning", "Research", "Meeting"]
- POST /api/v1/notes/bulk with { note_ids: [a, b, c], action: "archive" } → all 3 archived
- POST /api/v1/notes/bulk with { note_ids: [a], action: "change_status", params: { status: "to_review" } } → status updated
- GET /api/v1/notes/:id/related → returns related notes
- POST /api/v1/notes/:id/link-related → creates bidirectional link (verify both directions)
- DELETE /api/v1/notes/:id/unlink-related/:rid → removes link from both sides
- Linking a note to itself → returns 400
- Linking notes owned by different users → returns 403
- `pnpm vitest run` passes

**Deliverable:** Notes API has full parity with the Step 21b dashboard features. Agent can manage notebooks, link related notes, and perform bulk operations.

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

---

## Phase 4b: MCP Server

> Goal: Build an MCP (Model Context Protocol) server that wraps the LifeOS Core REST API, allowing users to connect LifeOS to any MCP-compatible AI client — Claude Desktop, Claude Code, Cursor, Codex, or any future MCP host. This is the launch differentiator: "LifeOS works inside the AI you already use." No new AI infrastructure needed. The user's existing AI model handles natural language; the MCP server handles structured data operations.

---

### Step 29: MCP server — scaffold and authentication

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

### Step 30: MCP server — core PARA tools

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

### Step 31: MCP server — knowledge, contacts, and system tools

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

### Step 32: MCP server — publishing and documentation

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

**Dependencies:** Step 31 (all tools). Step 34 (API key management — users need keys).

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

**What:** Settings page for creating/managing API keys (required for Agent integration).

**Dependencies:** Step 23 (auth guard).

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

3        14–22      Dashboard, Quick Capture, Notes (9+ views),
         (inc.      Resources (6 views), Topics (6 views),
         21b)       Contacts (professional CRM with role linking),
                    Goal command center, Inbox, My Day,
                    Notes polish, Knowledge Hub (unified search)

4        23–28      Full REST API covering ALL Phase 1–3 modules
                    with zero gaps. 60+ endpoints.

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

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

## Phase 3: System Modules and Notes

> Goal: The daily workflow modules (Dashboard, Inbox, My Day, Quick Capture) and the Notes module. After this phase, a user has a complete daily productivity workflow.

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

### Step 15: Notes module

**What:** Full Notes CRUD with Tiptap rich text editor and bidirectional linking.

**Actions:**
- Install Tiptap: `pnpm add @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder @tiptap/extension-link`
- Create `src/components/entities/note-editor.tsx` — Tiptap editor wrapper with toolbar (bold, italic, headings, lists, links, code blocks)
- Create `src/lib/hooks/use-notes.ts` — full CRUD hooks
- Create `src/lib/validators/note.schema.ts` — Zod schemas
- Create `src/lib/services/note.service.ts` — full CRUD
- Add `notes` table migration: `supabase/migrations/00013_create_notes.sql` (if not already created in Step 4, add it now)
- Add `note_status` enum if not already present
- Create `src/app/(dashboard)/notes/page.tsx` — list view with status filter tabs (Inbox, To Review, Active, Archive) + favorites filter + notebook filter
- Create `src/app/(dashboard)/notes/[id]/page.tsx` — full-page editor with metadata sidebar (area, project, goals, topics, notebook, status)
- Wire notes to areas and projects (select fields in metadata sidebar)
- Add note count to area and project rollups

**Dependencies:** Step 9 (areas) + Step 11 (projects) for linking. Step 8 (layout) for sidebar nav update.

**Testing:**
- Create a note with rich text (bold, headings, lists) — content persists on refresh
- Link a note to an area and project — appears in their detail pages
- Filter by status — correct results
- Favorite a note — appears in favorites filter
- Area rollup now shows note count
- Editor handles long content without lag (test with 2000+ word note)
- `pnpm vitest run` passes

**Deliverable:** Notes module live with rich text. Linked into the PARA system.

---

### Step 16: Quick Capture (Cmd+K command palette)

**What:** Build the command palette for universal quick entry.

**Actions:**
- Create `src/components/layout/command-palette.tsx` — shadcn `Command` component triggered by Cmd+K / Ctrl+K
- Create `src/lib/hooks/use-keyboard.ts` — global keyboard shortcut listener
- Command palette modes:
  - Default: search across all entities (tasks, goals, projects, notes) by name
  - "Create task: [name]" → creates task inline
  - "Create note: [name]" → creates note and opens editor
  - Navigation: type page name to navigate (e.g., "Goals" → navigate to /goals)
- Wire into dashboard layout (always available on any page)
- Add to `src/lib/stores/ui.store.ts` — `commandPaletteOpen` state

**Dependencies:** Step 15 (notes must exist for "create note" command). Step 12 (tasks for "create task").

**Testing:**
- Cmd+K opens palette on macOS, Ctrl+K on Windows
- Type a task name — matching tasks appear in results
- Click a result — navigates to the entity
- "Create task: Call dentist" — creates task with name "Call dentist"
- Escape closes palette
- Works on every page in the app
- Palette closes after action is taken

**Deliverable:** Command palette operational. Fastest way to capture and navigate.

---

### Step 17: Inbox and My Day

**What:** Build the GTD-style inbox processing view and the daily planning view.

**Actions:**
- Create `src/app/(dashboard)/inbox/page.tsx` — aggregated view of all items with status "inbox" across tasks and notes. Each item shows type badge, name, created date, and action buttons (Assign Area, Set Priority, Move to Status)
- Inbox processing flow: click an item → inline form to assign area/project/priority/status → item leaves inbox
- Create `src/app/(dashboard)/my-day/page.tsx` — shows: tasks due today, tasks marked as focus, a "Plan my day" section where users can drag tasks from a sidebar list into today's focus
- Focus toggle: click star icon on any task to add/remove from My Day
- My Day resets concept: items are filtered by `due_date = today OR focus = true`, not stored separately

**Dependencies:** Step 14 (dashboard provides the data queries). Step 12 (tasks with focus flag).

**Testing:**
- Create a task with status "inbox" — appears in Inbox view
- Process the task (assign area + priority + change status to "todo") — disappears from inbox
- Create a note with status "inbox" — appears in Inbox view
- My Day shows tasks due today
- Toggle focus on a task from tasks page — appears in My Day
- Remove focus — disappears from My Day
- Empty states render when inbox is clear / my day is empty

**Deliverable:** Daily workflow complete. Users can process inbox and plan their day.

---

## Phase 4: REST API

> Goal: Every feature available via REST API, ready for the LifeOS Agent (Project 2) to consume. This phase exists because the PRD mandates API parity — if you can do it in the dashboard, you can do it via API.

---

### Step 18: API infrastructure (auth, rate limiting, error handling)

**What:** Build the API middleware layer that all route handlers share.

**Actions:**
- Create `src/lib/api/auth-guard.ts` — function that extracts user from: (a) Supabase session JWT, or (b) API key from `Authorization: Bearer sk_live_xxx` header. Returns `{ user, error }`.
- Create `src/lib/api/rate-limiter.ts` — in-memory token bucket per user. Free: 100 req/min, Pro: 500, Premium: 1000. Returns 429 with `Retry-After` header.
- Create `src/lib/api/error-handler.ts` — `handleApiError(error)` maps Zod/Auth/NotFound/DB errors to standardized JSON responses
- Create `src/lib/api/pagination.ts` — cursor-based pagination helper: takes `cursor` + `limit` params, returns `{ data, meta: { cursor, has_more } }`
- Create `src/lib/api/response.ts` — helper functions: `successResponse(data)`, `listResponse(data, meta)`, `errorResponse(code, message)`
- Add `api_keys` table migration if not already present
- Add `user_settings` table migration (for timezone, tier info)
- Add `subscriptions` table migration (for tier enforcement)

**Dependencies:** Step 6 (service layer) + Step 7 (auth).

**Testing:**
- Write `tests/integration/auth-guard.test.ts`:
  - Valid JWT → returns user
  - Invalid JWT → returns 401
  - Valid API key → returns user
  - Invalid API key → returns 401
  - No auth header → returns 401
- Write `tests/integration/rate-limiter.test.ts`:
  - Under limit → passes
  - Over limit → returns 429 with Retry-After
- `pnpm vitest run` passes

**Deliverable:** API middleware layer complete. Every route handler gets auth + rate limiting + error handling for free.

---

### Step 19: Core CRUD API routes

**What:** REST endpoints for areas, goals, projects, and tasks.

**Actions:**
- Create route handlers following the pattern:
  ```
  /app/api/v1/areas/route.ts          → GET (list), POST (create)
  /app/api/v1/areas/[id]/route.ts     → GET, PUT, DELETE
  /app/api/v1/goals/route.ts          → GET, POST
  /app/api/v1/goals/[id]/route.ts     → GET, PUT, DELETE
  /app/api/v1/projects/route.ts       → GET, POST
  /app/api/v1/projects/[id]/route.ts  → GET, PUT, DELETE
  /app/api/v1/tasks/route.ts          → GET, POST
  /app/api/v1/tasks/[id]/route.ts     → GET, PUT, DELETE
  /app/api/v1/tasks/[id]/complete/route.ts → POST
  /app/api/v1/tasks/bulk/route.ts     → POST (bulk create)
  ```
- Every handler: auth guard → Zod validation → service call → standardized response
- GET list endpoints support: `cursor`, `limit`, `status`, `area_id`, `priority`, `sort_by`, `sort_order` query params
- POST/PUT return the created/updated entity
- DELETE returns `{ success: true }`

**Dependencies:** Step 18 (API infrastructure).

**Testing:**
- Write `tests/integration/tasks.api.test.ts`:
  - POST /api/v1/tasks → 201 with valid input
  - POST /api/v1/tasks → 400 with invalid input (empty name)
  - POST /api/v1/tasks → 401 without auth
  - GET /api/v1/tasks → 200 with list of user's tasks
  - GET /api/v1/tasks?status=inbox → filtered results
  - PUT /api/v1/tasks/:id → 200 with updated task
  - POST /api/v1/tasks/:id/complete → 200 with completed task
  - DELETE /api/v1/tasks/:id → 200
  - POST /api/v1/tasks/bulk → 201 with array of tasks
- Same test pattern for areas, goals, projects (lighter coverage — same handler pattern)
- `pnpm vitest run` passes

**Deliverable:** Full REST API for core PARA modules. Agent (Project 2) can now read/write all core data.

---

### Step 20: Dashboard and search API routes

**What:** API endpoints for dashboard aggregation and full-text search.

**Actions:**
- Create `/app/api/v1/dashboard/today/route.ts` — returns: today's tasks, focus tasks, overdue count, active goals (top 5), stats
- Create `/app/api/v1/dashboard/summary/route.ts` — returns: total tasks, completed this week, active goals, active projects, streak data
- Create `/app/api/v1/search/route.ts` — accepts `q` (query string), `types[]` (filter by entity type), `limit`. Uses PostgreSQL `to_tsvector` full-text search across tasks, notes, resources
- Create `/app/api/v1/notes/route.ts` — GET/POST for notes
- Create `/app/api/v1/notes/[id]/route.ts` — GET/PUT/DELETE for notes

**Dependencies:** Step 19 (core API routes).

**Testing:**
- GET /api/v1/dashboard/today → returns correct structure
- GET /api/v1/search?q=dentist → returns tasks/notes matching "dentist"
- GET /api/v1/search?q=dentist&types=tasks → returns only matching tasks
- Search with no results → returns empty array (not error)
- `pnpm vitest run` passes

**Deliverable:** API is feature-complete for MVP. Agent can query dashboard data and search.

---

## Phase 5: Personal Trackers (MVP Set)

> Goal: Three personal tracker modules to validate the tracker concept. If users adopt these, we build the remaining six.

---

### Step 21: Database schema — tracker tables

**What:** Create migrations for the 3 MVP trackers (Bookmarks, Grocery List, Book Tracker) plus their supporting tables.

**Actions:**
- Create `supabase/migrations/00014_create_bookmarks.sql` — `bookmarks`, `bookmark_collections`, `bookmark_tags` tables
- Create `supabase/migrations/00015_create_groceries.sql` — `grocery_items`, `grocery_categories` tables
- Create `supabase/migrations/00016_create_books.sql` — `books`, `book_notes` tables
- Add RLS policies, indexes, and `updated_at` triggers for all new tables
- Run `npx supabase db reset` and regenerate types

**Dependencies:** Step 4 (core schema must exist).

**Testing:**
- All tables created successfully
- RLS prevents cross-user access
- Types regenerated and `tsc --noEmit` passes

**Deliverable:** Tracker database layer ready.

---

### Step 22: Bookmarks tracker

**What:** Full bookmarks module with collections, tags, and favorites.

**Actions:**
- Create service, hooks, validators, and Zod schemas for bookmarks
- Create `src/app/(dashboard)/trackers/bookmarks/page.tsx` — list view with columns: name, short URL, kind badge, collections, favorite star, status. Filter tabs: All, Bookmarks, Reading List, Favorites
- Create bookmark creation dialog — fields: name, URL, kind (Website/Article/Tool), collection (select/create), tags
- Create collection management (sidebar or dialog)
- Add API routes: `/api/v1/trackers/bookmarks/route.ts`

**Dependencies:** Step 21 (tracker tables) + Step 8 (sidebar nav — add Trackers section).

**Testing:**
- Create a bookmark — appears in list
- Favorite a bookmark — appears in Favorites filter
- Filter by collection — correct results
- API: POST /api/v1/trackers/bookmarks → 201
- API: GET /api/v1/trackers/bookmarks → list with pagination

**Deliverable:** First personal tracker live.

---

### Step 23: Grocery List tracker

**What:** Categorized grocery list with quantity and in-stock toggling.

**Actions:**
- Create service, hooks, validators for grocery items and categories
- Create `src/app/(dashboard)/trackers/groceries/page.tsx` — list grouped by category, each item shows: name, quantity, in-stock checkbox. "Add item" inline input at top.
- In-stock toggle: tap checkbox → item is checked off (stays in list but grayed out)
- Category management: create/edit categories
- "Clear checked" button to remove all in-stock items
- Add API routes

**Dependencies:** Step 21 (tracker tables).

**Testing:**
- Add item with category — appears under correct category header
- Toggle in-stock — item grays out
- Clear checked — checked items removed
- API endpoints work correctly

**Deliverable:** Second tracker live. Validates the "personal life management" positioning.

---

### Step 24: Book Tracker

**What:** Reading list with status, ratings, and reading notes.

**Actions:**
- Create service, hooks, validators for books and book notes
- Create `src/app/(dashboard)/trackers/books/page.tsx` — gallery view of book cards with: title, author, status badge (To Read / Reading / Completed), star rating, cover placeholder
- Create book detail page (or dialog) with reading notes section
- Filter tabs: All, To Read, Reading, Completed
- Star rating component (1–5 stars, clickable)
- Add API routes

**Dependencies:** Step 21 (tracker tables).

**Testing:**
- Create a book — appears in gallery
- Change status to "Reading" — moves to Reading tab
- Add reading notes — persists
- Set rating — displays correctly
- API endpoints work

**Deliverable:** Third tracker live. MVP tracker set complete.

---

## Phase 6: Onboarding and Polish

> Goal: New user experience is smooth, mobile experience is solid, and the app is deployable to production.

---

### Step 25: Onboarding flow

**What:** Guided post-signup experience that creates the user's initial data.

**Actions:**
- Create `src/app/onboarding/page.tsx` — multi-step wizard:
  - Step 1: Welcome screen ("Let's set up your LifeOS in 2 minutes")
  - Step 2: Areas — show default 8, let user toggle on/off or add custom
  - Step 3: First goal — "What's one goal you're working on?" (name + area + term)
  - Step 4: First tasks — "What are 2-3 things you need to do for this goal?"
  - Step 5: Preferences — timezone picker, briefing time, theme confirmation
  - Step 6: Done — "Your LifeOS is ready!" with button to dashboard
- Create `src/lib/services/onboarding.service.ts` — orchestrates area seeding, goal creation, task creation, user settings
- Add `onboarding_complete` flag to `user_settings` — redirect to onboarding if false
- Update middleware to redirect new users to `/onboarding`

**Dependencies:** Step 9 (areas), Step 10 (goals), Step 12 (tasks), Step 7 (auth).

**Testing:**
- New signup → redirected to onboarding (not dashboard)
- Complete all steps → user has areas, a goal, tasks, and user settings
- Returning user → goes directly to dashboard (not onboarding again)
- Skip individual steps — partial data saved correctly
- Mobile responsive (test at 375px)

**Deliverable:** First-run experience is smooth. No empty dashboard for new users.

---

### Step 26: API key management

**What:** Settings page where users create and manage API keys (required for Agent integration).

**Actions:**
- Create `src/app/(dashboard)/settings/api-keys/page.tsx` — list of API keys with: name, created date, last used, scopes, delete button
- "Create API Key" dialog — name input + scope checkboxes (read:all, write:tasks, write:notes, etc.)
- On creation: generate `sk_live_<random>`, hash it, store hash in `api_keys` table, show raw key ONCE in a copy-to-clipboard dialog with warning "This key won't be shown again"
- Delete key functionality with confirmation dialog
- Update the auth guard to look up API keys from this table

**Dependencies:** Step 18 (auth guard must support API keys).

**Testing:**
- Create an API key — raw key shown, copyable
- Use the key to call `/api/v1/tasks` — returns user's tasks
- Delete the key — subsequent API calls with that key return 401
- Scoped key (read-only) rejects POST requests

**Deliverable:** Agent (Project 2) can now authenticate against the API. Critical integration point.

---

### Step 27: Settings page and user preferences

**What:** General settings page with timezone, theme, notification preferences, and account management.

**Actions:**
- Create `src/app/(dashboard)/settings/page.tsx` — sections:
  - Profile: name, email (read-only), avatar
  - Preferences: timezone (select from common list), default theme, language
  - Notifications: morning briefing time, evening review time (these are read by the Agent)
  - Account: change password, delete account (with confirmation dialog)
- Create `src/app/(dashboard)/settings/integrations/page.tsx` — placeholder page showing "Connect WhatsApp" and "Connect Telegram" buttons (these will deep-link to the Agent onboarding when Project 2 is built)
- Wire settings to `user_settings` table

**Dependencies:** Step 25 (onboarding creates initial settings).

**Testing:**
- Change timezone — persists on refresh
- Change theme preference — applies immediately
- Change password works
- Delete account: confirmation required, then all user data removed

**Deliverable:** Settings complete. User preferences accessible via API for Agent consumption.

---

### Step 28: Responsive polish and PWA

**What:** Final responsive testing and PWA setup for mobile install.

**Actions:**
- Audit every page at breakpoints: 375px (iPhone SE), 390px (iPhone 14), 768px (iPad), 1024px (laptop), 1440px (desktop)
- Fix any overflow, cramped layouts, or touch target issues
- Create `public/manifest.json` — PWA manifest with app name, icons, theme color, display: standalone
- Create `public/icons/` — app icons at required sizes (192x192, 512x512)
- Add `<link rel="manifest">` to root layout
- Create `src/app/service-worker.ts` (basic offline page)
- Add `next.config.ts` PWA configuration
- Test "Add to Home Screen" on iOS Safari and Android Chrome

**Dependencies:** All previous steps (this is a polish pass).

**Testing:**
- Every page passes the 375px width test (no horizontal scroll)
- Touch targets are at least 44x44px on mobile
- PWA installs successfully on iOS and Android
- Installed PWA opens in standalone mode (no browser chrome)
- Lighthouse performance score > 90

**Deliverable:** Mobile experience is production-ready. PWA installable.

---

## Phase 7: Deployment and Launch Prep

> Goal: The app is running in production, CI/CD is configured, and the first beta users can sign up.

---

### Step 29: CI/CD pipeline

**What:** GitHub Actions for automated linting, testing, type-checking, and deployment.

**Actions:**
- Create `.github/workflows/ci.yml`:
  - Trigger: on PR to `main`
  - Steps: install deps → `biome check` → `tsc --noEmit` → `vitest run` → report results
- Create `.github/workflows/deploy.yml`:
  - Trigger: on push to `main`
  - Steps: run CI checks → deploy to Vercel via CLI → run Supabase migrations against production
- Configure Vercel project (connect GitHub repo, set env vars)
- Configure Supabase production project (separate from local dev)
- Set all production env vars in Vercel dashboard

**Dependencies:** All previous steps (the app must be buildable).

**Testing:**
- Push to a PR branch — CI runs, all checks pass
- Merge to main — deploys to Vercel automatically
- Visit production URL — app loads, auth works, data persists
- Supabase production database has all migrations applied

**Deliverable:** Automated deployment pipeline. Merge to main = live in production.

---

### Step 30: Production hardening

**What:** Final security, performance, and monitoring setup before beta.

**Actions:**
- Configure Sentry: install `@sentry/nextjs`, set up error tracking + performance monitoring
- Configure PostHog: install `posthog-js`, set up event tracking for key actions (signup, task_created, goal_completed)
- Add Content Security Policy headers in `next.config.ts`
- Add rate limiting headers to API responses
- Run Lighthouse audit — fix any scores below 90
- Verify all RLS policies in production (attempt cross-user access via API — must fail)
- Verify API rate limiting works in production
- Load test: create 100 tasks, 20 projects, 10 goals — dashboard still loads in < 1.5s
- Write `tests/e2e/onboarding.spec.ts` (Playwright) — full onboarding flow
- Write `tests/e2e/task-crud.spec.ts` (Playwright) — create, complete, delete task
- Run E2E tests against production URL

**Dependencies:** Step 29 (must be deployed).

**Testing:**
- Sentry captures a test error
- PostHog captures signup and task creation events
- Lighthouse: Performance > 90, Accessibility > 90, Best Practices > 90
- E2E tests pass against production
- No console errors in production

**Deliverable:** Production-ready. Invite beta users.

---

## Phase 8: Post-MVP (Out of Scope for This Roadmap)

These are documented for planning purposes but are NOT built until MVP metrics are validated.

```
Step 31+: Resources + Topics + Knowledge Hub
Step 33+: Time Tracker + Pomodoro
Step 35+: Contacts module
Step 36+: Archive cross-entity view
Step 37+: Remaining 6 personal trackers (Movies, Supplements, Wishlist, Orders, Warranties, Passwords)
Step 40+: Stripe billing integration
Step 42+: Outbound webhooks system
Step 43+: Notion CSV import
Step 44+: Data export (GDPR)
Step 45+: Semantic search with pgvector
Step 46+: Supabase Realtime subscriptions (live updates from Agent)
```

---

## Summary

```
PHASE    STEPS    WHAT YOU HAVE WHEN DONE
─────────────────────────────────────────────────────────────────
1        1–7      Running app with auth, DB schema, service
                  layer, type safety, and first tests passing

2        8–13     Full PARA system (Areas → Goals → Projects →
                  Tasks) with smart priority and calendar view

3        14–17    Dashboard, Notes, Command Palette, Inbox,
                  My Day — complete daily workflow

4        18–20    Full REST API — Agent (Project 2) can now
                  consume every feature programmatically

5        21–24    3 personal trackers validating the concept

6        25–28    Onboarding, settings, API keys, PWA,
                  responsive polish

7        29–30    CI/CD, production deployment, monitoring,
                  E2E tests, beta launch

POST-MVP 31–46    Everything else (billing, remaining trackers,
                  Knowledge Hub, webhooks, imports)
```

**Total MVP steps: 30**
**Estimated timeline: 8–10 weeks for a solo developer, 5–6 weeks for a team of 2–3**

---

*Each step in this roadmap maps directly to the LifeOS Core PRD, Architecture Document, and AI Rules. When building any step, reference all three documents.*

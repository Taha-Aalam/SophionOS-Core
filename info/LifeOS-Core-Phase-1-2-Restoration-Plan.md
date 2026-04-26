# LifeOS Core - Phase 1 & 2 Restoration Plan

> Date: 2026-04-24
> Scope: Restore roadmap coverage for Phase 1 and Phase 2 only
> Source references: `info/LifeOS-Core-Build-Roadmap.md`, `info/LifeOS-Core-Architecture.md`, `info/LifeOS-Core-PRD-Lean.md`, `info/LifeOS-Core-AI-Rules.md`

## Purpose

This document turns the current audit into a structured restoration roadmap after the reported `git stash` incident.

The goal is not to "fix everything in one pass." The goal is to restore the project in small, safe, verifiable steps until Phase 1 and Phase 2 match the documented roadmap again.

This plan intentionally follows the roadmap structure for Steps `1-13`, including `9b` and `9c`, and adds recovery gates between steps so we do not compound breakage while trying to restore missing workflows.

---

## Current Baseline

The repository still contains a meaningful amount of Phase 1 and 2 code, but the current state is not healthy enough to count as "Phase 2 complete."

### Confirmed baseline facts

- A large portion of the app shell, auth pages, Supabase layer, validators, services, hooks, migrations, and Phase 2 pages still exists on disk.
- The project does not currently build cleanly.
- The post-login route flow is broken because auth redirects target `/dashboard`, while the actual app routes live under route groups and there is no concrete `src/app/dashboard` route.
- The root page still shows the default Next starter screen.
- Several pages and workflows exist only as partial UI shells.
- Some roadmap-required relationships exist in schema or UI, but are not wired end-to-end.

### Health issues to treat as blockers before deeper restoration

- `pnpm exec tsc --noEmit` fails
- `pnpm build` fails
- `pnpm exec vitest run` fails
- Route protection and post-login navigation do not align with the current App Router structure

---

## Restoration Principles

### 1. Restore in sequence, not by convenience

Follow roadmap dependency order. Do not fully restore Step 11 or Step 12 while Step 7 or Step 8 is still unstable.

### 2. Stabilize the shell before module behavior

Route resolution, auth redirects, compile health, and build health come first. A broken shell makes every module harder to verify.

### 3. One recovery slice per checkpoint

Each slice should end with:

- code reviewed
- `tsc` green
- relevant tests green
- manual route check done

### 4. Prefer reconciliation over reinvention

A lot of code still exists. Restoration should reuse and reconnect surviving work where possible instead of rewriting whole modules.

### 5. Preserve evidence while restoring

When a feature is only partially present, keep a note of:

- what survived
- what is broken
- what is missing
- what was intentionally deferred by prior work

---

## Status Legend

- `Present`: feature exists and appears substantially aligned
- `Partial`: feature exists but is incomplete, broken, or only visual
- `Missing`: feature/page/workflow is absent
- `Blocked`: cannot be trusted until earlier restoration work is complete

---

## Restoration Order

### Batch A - Foundation Recovery

Restore Steps `1-3`, then verify app entry, routing, auth flow, and toolchain health.

### Batch B - Data and Core Integrity

Restore Steps `4-6`, then verify schema, types, validators, services, and tests.

### Batch C - Access and Shell

Restore Steps `7-8`, then verify login, signup, callback, protected routes, dashboard shell, sidebar, topbar, and mobile nav.

### Batch D - Areas

Restore Steps `9`, `9b`, `9c`, then verify the full Areas experience before moving to Goals.

### Batch E - Goals

Restore Step `10`, then verify linking to Areas and progress behavior.

### Batch F - Projects

Restore Step `11`, then verify list, kanban, detail page, and goal linking.

### Batch G - Tasks

Restore Steps `12-13`, then verify the full PARA chain and smart-priority behavior.

---

## Detailed Restoration Plan

## Step 1 - Initialize the Repository

### Current status

- `Partial`

### Confirmed gaps

- `package.json` still identifies the app as `temp-app`
- the root route still shows the default Next starter page
- scripts do not reflect the documented toolchain expectations
- current build/test/lint posture does not represent a stable scaffold baseline

### Restoration tasks

- `1.1` Normalize repository identity
  - rename package metadata from placeholder values to LifeOS Core values
  - align scripts with actual project needs: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `biome`
- `1.2` Reconfirm TypeScript strict baseline
  - keep `strict: true`
  - verify path aliases and include/exclude behavior
  - decide whether tests stay excluded from `tsc` or get a separate typecheck pass
- `1.3` Restore scaffold expectations
  - ensure architecture folders exist and are intentionally organized
  - remove remaining starter-page behavior from root app entry
- `1.4` Create a clean “foundation restored” checkpoint
  - repo identity is correct
  - root route behavior is intentional
  - scripts reflect actual maintenance workflow

### Exit criteria

- `package.json` reflects LifeOS Core identity
- root route is no longer the default starter screen
- core scripts are present and usable

---

## Step 2 - Design System and shadcn/ui Setup

### Current status

- `Partial`

### Confirmed gaps

- many UI primitives exist, but the dashboard imports a missing `Progress` component
- the design system is not yet proven by a clean build
- theme system exists but needs verification as part of a healthy shell

### Restoration tasks

- `2.1` Audit current UI primitives against roadmap expectations
  - confirm required primitives are present
  - identify missing or drifted primitives
- `2.2` Restore missing primitives
  - add or repair components like `progress` if they are used by surviving pages
- `2.3` Reconcile theme foundation
  - verify `globals.css`, theme provider, and light/dark rendering assumptions
- `2.4` Run a design-system integrity pass
  - ensure all referenced UI components exist
  - remove orphan imports and stale references

### Exit criteria

- all referenced UI primitives exist
- theme provider works without compile or runtime failures
- dashboard shell pages no longer fail due to missing design-system components

---

## Step 3 - Supabase Project Setup and Local Development

### Current status

- `Partial`

### Confirmed gaps

- Supabase client files exist
- the request guard exists, but older restoration wording still refers to `middleware` instead of the current Next.js `proxy.ts` convention
- auth redirect flow points at `/dashboard`, while the real app pages are elsewhere

### Restoration tasks

- `3.1` Reconcile app route model
  - decide the canonical post-login landing route
  - either create a real `/dashboard` route or update redirects to the actual destination
- `3.2` Repair auth/session request-guard behavior
  - align protection rules with the actual dashboard route group structure
  - make route guarding consistent for login and app pages
- `3.3` Verify callback flow
  - confirm `/auth/callback` lands in the correct app destination
- `3.4` Verify local auth client behavior
  - login
  - signup
  - signout
  - redirect while unauthenticated
  - redirect while authenticated

### Exit criteria

- login lands on a working app page
- protected pages are actually protected
- auth callback and signout flow behave consistently

---

## Step 4 - Database Schema: Core Tables

### Current status

- `Partial`

### Confirmed gaps

- core migrations exist
- later migrations introduce schema drift across naming conventions such as `archive` vs `is_archived`
- area activity logic exists, but broader schema consistency must be revalidated

### Restoration tasks

- `4.1` Reconcile the canonical schema for Areas, Goals, Projects, Tasks
  - decide the authoritative column names per entity
  - check current migrations against roadmap and architecture
- `4.2` Verify migration chain integrity
  - confirm migrations apply in order without hidden assumptions
- `4.3` Reconcile status/archive/completion fields
  - areas: `inactive`, `archive`
  - goals/projects/tasks: confirm intended completed/archive fields and naming
- `4.4` Verify trigger behavior
  - project progress trigger
  - area inactive trigger
  - smart priority trigger later in Step 13

### Exit criteria

- schema naming is consistent enough for services and hooks to trust
- migrations apply cleanly
- core triggers are valid and aligned with the actual columns

---

## Step 5 - Generated Types and Zod Schemas

### Current status

- `Partial`

### Confirmed gaps

- generated database/domain types exist
- validators exist
- current compile/test failures suggest type drift between schema, services, and components

### Restoration tasks

- `5.1` Regenerate database types from the reconciled schema
- `5.2` Reconcile domain types with actual table fields
- `5.3` Reconcile Zod validators with actual forms and services
- `5.4` Remove stale property usage
  - examples already seen: `completed` vs `is_completed`
- `5.5` Repair test typing posture
  - fix test files whose syntax or extensions are invalid for the current toolchain

### Exit criteria

- types match current schema
- validators match forms and services
- type drift errors are removed

---

## Step 6 - Service Layer: Core CRUD

### Current status

- `Partial`

### Confirmed gaps

- area, goal, project, task services exist
- several services still use broad `select('*')`
- some service behavior is only partially aligned with roadmap expectations
- end-to-end relationship behavior is not consistently wired

### Restoration tasks

- `6.1` Reconcile area service with restored area model
  - list filters
  - get by id/slug
  - create
  - update
  - archive
  - restore
  - delete
- `6.2` Reconcile goal service
  - active/completed/archived behavior
  - area linking
  - completion/progress expectations
- `6.3` Reconcile project service
  - list/status/area filters
  - archive behavior
  - relation fetches
  - goal-project junction behavior
- `6.4` Reconcile task service
  - completion
  - uncomplete
  - focus
  - archive
  - overdue/focused queries
- `6.5` Rebuild service-level test trust
  - fix failing tests
  - add missing coverage where drift is currently hidden

### Exit criteria

- all four core services align with the reconciled schema
- tests covering service behavior are green

---

## Step 7 - Authentication UI

### Current status

- `Partial`

### What survived

- login page
- signup page
- forgot password page
- callback route
- auth provider

### Confirmed gaps

- post-login redirect lands at a missing or mismatched route
- protected-route behavior is not aligned with the actual app structure
- onboarding/area seeding is happening in auth provider, but the seeded defaults no longer match the documented defaults

### Restoration tasks

- `7.1` Fix destination routing after auth
- `7.2` Reconfirm auth layout behavior
- `7.3` Reconfirm login/signup/forgot-password flow
- `7.4` Decide where default area seeding belongs
  - keep in auth event flow if acceptable
  - or move behind a cleaner onboarding/service boundary
- `7.5` Restore documented default areas

### Exit criteria

- auth pages work end-to-end
- protected app entry works
- newly created users receive the correct default areas

---

## Step 8 - Dashboard Layout (Sidebar + Topbar)

### Current status

- `Partial`

### What survived

- dashboard group layout
- sidebar
- topbar
- mobile nav
- UI store

### Confirmed gaps

- dashboard entry route is broken
- the placeholder dashboard page itself fails typecheck
- shell exists, but trust in the shell is blocked by route and compile issues

### Restoration tasks

- `8.1` Define the canonical dashboard landing page
- `8.2` Repair the placeholder dashboard page so it compiles
- `8.3` Verify sidebar/topbar/mobile nav behavior
- `8.4` Verify active nav highlighting and user menu behavior
- `8.5` Make desktop/mobile navigation behavior part of the regression checklist

### Exit criteria

- app shell compiles
- desktop and mobile shell work
- users can navigate reliably between restored Phase 2 modules

---

## Step 9 - Areas Module

### Current status

- `Partial`

### What survived

- areas page
- area cards
- area dialog
- area hooks/service
- area detail page

### Confirmed gaps

- area creation exists
- area edit from the main Areas page is not actually wired
- area rollup counts are still placeholder values
- area detail only truly links Goals; Projects and Tasks remain placeholder sections

### Restoration tasks

- `9.1` Repair create/edit parity on the Areas page
- `9.2` Make area card rollups real
  - goals count
  - projects count
  - tasks count
- `9.3` Restore area detail data
  - linked goals
  - linked projects
  - linked tasks
- `9.4` Reconfirm archive flow from list and detail views

### Exit criteria

- areas can be created and edited from the main flow
- rollups are real, not placeholders
- area detail reflects linked entity data

---

## Step 9b - Areas “By Type” Grouped View and Custom Area Types

### Current status

- `Partial`

### What survived

- custom type migration exists
- by-type page tab exists
- by-type view component exists
- type entry exists in the area dialog

### Confirmed gaps

- needs verification against the intended default type system
- edit flow and move-between-types behavior must be revalidated after Area edit is restored
- current type labels/constants are inconsistent across the codebase

### Restoration tasks

- `9b.1` Reconcile the canonical area type vocabulary
  - current code mixes lowercase system-style values and title-case user-facing values
- `9b.2` Verify grouped query behavior
- `9b.3` Verify create-with-type flow
- `9b.4` Verify edit-type flow moves an area between type groups
- `9b.5` Verify “All” and “By Type” remain consistent after edits

### Exit criteria

- grouped view is stable
- types are editable
- type grouping reflects current area data accurately

---

## Step 9c - Areas Archived Tab and Auto Active/Inactive Status

### Current status

- `Partial`

### What survived

- archived tab exists
- inactive/archive fields exist
- area inactive trigger migration exists

### Confirmed gaps

- test coverage for this behavior is currently broken
- by-type tests do not currently run
- active/inactive behavior needs end-to-end verification with goals/projects/tasks

### Restoration tasks

- `9c.1` Fix broken area inactive tests
- `9c.2` Verify trigger behavior through real module flows
  - create linked goal -> area becomes active
  - remove/complete/archive linked work -> area becomes inactive
- `9c.3` Verify archived vs inactive distinction in UI behavior
- `9c.4` Confirm restore flow returns area to correct active/inactive tab

### Exit criteria

- auto-active/inactive behavior works from real linked entity changes
- archived behavior remains user-controlled and separate

---

## Step 10 - Goals Module

### Current status

- `Partial`

### What survived

- goals page
- goal cards
- goal dialog
- goal hooks/service
- progress ring component

### Confirmed gaps

- roadmap-required `Inactive` view is missing
- goals page does not consistently show linked area badge context
- goal completion/progress rollup behavior is not fully proven
- area detail shows goals, but the broader goal rollup contract is incomplete

### Restoration tasks

- `10.1` Restore full roadmap tab set
  - Active
  - Short Term
  - Mid Term
  - Long Term
  - Inactive
  - Completed
- `10.2` Restore area badge visibility from the main goals experience
- `10.3` Reconcile goal completion and progress behavior
- `10.4` Verify area rollup counts increment/decrement correctly from goal changes

### Exit criteria

- goals page matches roadmap views
- goals clearly link back to areas
- goal progress behavior is trustworthy

---

## Step 11 - Projects Module

### Current status

- `Partial`

### What survived

- projects page
- project cards
- kanban board
- project dialog
- project detail page
- project-goal linking actions on detail page

### Confirmed gaps

- project dialog does not currently expose roadmap-required goal multi-select
- projects page tabs differ from the documented tab wording
- project detail still says tasks are a future update
- notes section required by roadmap is absent from project detail

### Restoration tasks

- `11.1` Restore create/edit project dialog feature parity
  - add goal multi-select
- `11.2` Reconcile project page views with roadmap intent
- `11.3` Restore project detail completeness
  - linked tasks
  - linked goals
  - notes placeholder or real notes section, depending on Phase 2 boundary decision
- `11.4` Verify kanban drag-drop persists and refreshes correctly

### Exit criteria

- projects can be created with goals attached
- project detail is not placeholder-only
- project-to-goal relationship works from both create/edit and detail flows

---

## Step 12 - Tasks Module: Core List and CRUD

### Current status

- `Partial`

### What survived

- tasks page
- task list item
- task inline editor
- priority badge
- task dialog
- task hooks/service
- completion/focus mutations

### Confirmed gaps

- roadmap-required goal multi-select is missing from task create/edit
- the full Area -> Goal -> Project -> Task chain is not restored
- undo/optimistic completion exists in hook logic, but must be revalidated after service/schema cleanup
- project and goal progress recalculation from task completion is not fully trusted yet

### Restoration tasks

- `12.1` Add task-to-goal linking back into the dialog and service flow
- `12.2` Verify inline editing end-to-end
- `12.3` Verify completion flow end-to-end
  - optimistic update
  - undo
  - project progress update
  - goal progress update
- `12.4` Verify list filters
  - priority
  - area
  - project
  - overdue
  - focus

### Exit criteria

- task CRUD is complete
- task-goal linking is restored
- task completion updates the rest of the PARA chain correctly

---

## Step 13 - Tasks Smart Priority and Calendar View

### Current status

- `Partial`

### What survived

- smart priority migration exists
- smart priority badge exists
- smart view exists
- calendar view exists

### Confirmed gaps

- the database function hardcodes goal count to `0`
- smart priority therefore does not currently include real goal alignment
- calendar view exists, but needs verification only after task data integrity is restored

### Restoration tasks

- `13.1` Reconnect smart priority to real task-goal relationships
- `13.2` Verify trigger recalculation on task insert/update
- `13.3` Verify smart-priority ordering in the UI
- `13.4` Verify calendar rendering and month navigation
- `13.5` Re-run smart priority unit coverage after relationship restoration

### Exit criteria

- smart priority reflects real due date, priority, urgency/importance, and goal alignment
- calendar view is stable and correct

---

## Phase 1-2 Lost or Degraded Items to Explicitly Restore

This is the short-form restoration checklist derived from the audit.

### Pages or routes degraded

- root app entry page
- dashboard landing route
- dashboard placeholder page
- area detail page
- project detail page

### Workflows degraded

- post-login redirect workflow
- protected-route workflow
- area edit workflow from the Areas page
- area detail rollup workflow
- goal area-badge visibility workflow
- project create/edit with goal linking workflow
- project detail linked-tasks workflow
- task create/edit with goal linking workflow
- smart priority goal-alignment workflow

### Verification systems degraded

- TypeScript compile health
- production build health
- test-suite health

---

## Suggested Execution Checkpoints

Use these as stop points between recovery batches.

### Checkpoint 1 - Foundation Green

- Steps `1-3`
- app boots
- auth redirects are correct
- route protection is correct
- `tsc` is green

### Checkpoint 2 - Data and Service Green

- Steps `4-6`
- schema and types reconciled
- services tested
- tests green

### Checkpoint 3 - Shell Green

- Steps `7-8`
- user can sign in and land in working shell
- nav works on desktop and mobile

### Checkpoint 4 - Areas Green

- Steps `9`, `9b`, `9c`
- areas end-to-end complete

### Checkpoint 5 - Goals and Projects Green

- Steps `10-11`
- goals/projects relationship chain restored

### Checkpoint 6 - Tasks Green

- Steps `12-13`
- full PARA chain and smart priority restored

---

## Recommended First Restoration Slice

Do not start with Tasks.

Start with the shell and trust foundations:

1. Step 1 repository identity and root route cleanup
2. Step 3 auth redirect and protected-route repair
3. Step 8 dashboard landing route and dashboard compile fix
4. green `tsc`
5. green `build`

That slice unlocks everything else.

---

## Out of Scope for This Restoration Document

This plan does not restore Phase 3 or beyond:

- Dashboard Step 14 real home page
- Notes
- Quick Capture
- Inbox / My Day
- API
- Trackers
- onboarding wizard beyond the Phase 1/2 dependency notes

Those should wait until Phase 1 and 2 are actually healthy again.

---

## Documented Deviations That Remain Explicit

- Goals `Inactive` view maps to archived goals in the restored Phase 2 model.
  - The current schema and filters back the `Inactive` tab with `goals.is_archived = true` rather than a separate inactive-only goal state, and the UI copy should keep that explicit.
- Request-guard naming follows current Next.js guidance, not the original roadmap wording.
  - The active request guard lives in `src/proxy.ts` because Next.js 16 renamed `middleware` to `proxy`; auth protection behavior stays the same.

---

## Final Guidance

Treat this as a recovery program, not a feature sprint.

The safest path is:

- restore the shell
- restore trust in schema and types
- restore Areas
- restore Goals
- restore Projects
- restore Tasks
- then verify the full PARA chain from top to bottom

If a later step uncovers deeper schema drift, pause and update this document before continuing. The document should remain the living source of truth for restoration progress until Phase 2 is genuinely whole again.

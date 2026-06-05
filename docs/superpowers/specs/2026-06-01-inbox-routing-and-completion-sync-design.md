# Inbox Routing + Task Completion Sync — Design

**Date:** 2026-06-01
**Status:** Approved (design), pending implementation plan

## Problem

Two related workflow gaps:

1. **Context-aware inbox routing is missing.** New Tasks, Notes, Resources, and
   Projects should land in the global **Inbox** only when created with no
   organizing context. When created from inside an area/project/goal/topic, they
   should skip the inbox and start in an active status. Today every entity
   hard-defaults to `inbox` (Task/Note/Resource) or `planning` (Project)
   regardless of context.

2. **Project inbox is fake.** `useInboxProjects` filters `status === 'planning'`.
   There is no real `inbox` value in the `project_status` enum, so projects are
   asymmetric with the other three entities.

3. **Task completion is not reflected in status.** Checking the completed
   checkbox sets `is_completed = true` / `completed_at` but leaves `status`
   unchanged. There is no path to set `status = 'completed'` from the UI, and no
   two-way sync between the checkbox and the status field.

## Routing rules (target behavior)

| Entity   | Context links that count        | Has context → status | No context → status |
| -------- | ------------------------------- | -------------------- | ------------------- |
| Task     | area, project                   | `todo`               | `inbox`             |
| Note     | area, project, goal, topic      | `to_review`          | `inbox`             |
| Resource | area, project, goal, topic      | `to_review`          | `inbox`             |
| Project  | area, goal                      | `planning`           | `inbox`             |

"Context" = at least one of the listed links is present on the create payload
(single `*_id` or multi `*_ids`/`topic_id`).

## Current state (verified)

- `task_status` enum **already** has `completed`. Only the completion *logic* is
  missing, not the enum value.
- `note_status` (`inbox, to_review, active, archive, saved`) and
  `resource_status` (`inbox, to_review, active, saved`) already have both
  `inbox` and `to_review`. No enum change needed for Note/Resource.
- `project_status` (`planning, active, completed, on_hold, archived`) has **no**
  `inbox`. Needs an enum addition.
- Create schemas hard-default status: Task/Note/Resource → `inbox`,
  Project → `planning`. These defaults pre-empt any service-side derivation.
- `task.service.complete()` sets `is_completed`/`completed_at` only;
  `uncomplete()` clears them only. Neither touches `status`.
- Task-dialog status selector lists only Inbox / To Do / In Progress — no
  Completed option.
- Note and Resource create schemas both support `area_ids`, `project_ids`,
  `goal_ids`, and `topic_id`.

## Design decisions (locked)

1. **Rule location:** centralized in each entity's `service.create()`. Schemas
   stop hard-defaulting `status`; an explicit status from the caller still wins.
2. **Completion sync mechanism:** service layer (not a Postgres trigger).
   `complete`/`uncomplete`/`update` keep `is_completed` and `status` in lockstep;
   optimistic caches mirror the change.
3. **Un-complete target status:** store-and-restore the previous status via a new
   `previous_status` column. Fallback order on restore:
   `previous_status` → context-recompute (`todo` if area/project else `inbox`)
   → `todo`.
4. **Project backfill:** after adding the real `inbox` enum value, migrate
   existing `planning` projects that have **no** linked area AND **no** linked
   goal to `inbox`.

## Part A — Context→status defaults (all four entities)

**Schemas:** in the four create schemas (`createTaskSchema`,
`createNoteSchema`, `createResourceSchema`, `createProjectSchema`), make
`status` optional with **no `.default(...)`**. Update schemas are unchanged
(status already optional there).

**Services:** each `create()` already extracts the context link arrays
(`areaIds`, `projectIds`, `goalIds`, `topic_id`). Add one small helper per
service that derives status when the caller omitted it:

```ts
// task.service
const status = input.status
  ?? ((areaIds?.length || projectIds?.length) ? TASK_STATUS.TODO : TASK_STATUS.INBOX);

// note.service / resource.service
const status = input.status
  ?? ((areaIds?.length || projectIds?.length || goalIds?.length || topicId)
        ? STATUS.TO_REVIEW : STATUS.INBOX);

// project.service
const status = input.status
  ?? ((areaIds?.length || goalIds?.length) ? PROJECT_STATUS.PLANNING : PROJECT_STATUS.INBOX);
```

The derived status is written into the insert payload.

**Explicit-wins + dialog default reconciliation:** quick-add call sites (area /
project / goal / topic detail pages, command palette) omit `status` → service
derives. The full create dialogs (task, note, resource, project) that show a
status field will **initialize that field from the same context rule** at open
time, so the visible default matches the routing behavior. The user can still
override; an overridden value is sent explicitly and wins. This keeps
dialog-created entities consistent with quick-add behavior without the service
having to guess intent.

## Part B — Project real inbox

1. **Migration — enum:** `ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'inbox';`
   (must run in its own migration / outside a transaction block per Postgres
   enum rules). Add `INBOX: 'inbox'` to `PROJECT_STATUS` in `constants.ts`.
2. **Migration — backfill:** set `status = 'inbox'` for projects where
   `status = 'planning'` AND the project has no row in `project_areas` AND no row
   in `goal_projects`. Run as a separate migration ordered after the enum
   addition.
3. **`useInboxProjects`:** filter `status === PROJECT_STATUS.INBOX` instead of
   `PROJECT_STATUS.PLANNING`.
4. **Graduate action:** verify the inbox page "promote/graduate" handler for
   projects now moves them to `planning` (or `active`), since `inbox` is a
   distinct prior state. Adjust if it assumed `planning` was the inbox.

## Part C — Task completion ↔ status two-way sync (service layer)

1. **Migration:** add nullable `previous_status task_status` to `tasks`. Add the
   column to `TASK_SELECT` and to the `Task` domain type.
2. **`complete()`:** if the row is not already completed, set
   `previous_status = <current status>`; then `status = 'completed'`,
   `is_completed = true`, `completed_at = now`.
3. **`uncomplete()`:** `status = previous_status ?? <context-recompute> ?? 'todo'`,
   `is_completed = false`, `completed_at = null`, `previous_status = null`.
   Context-recompute uses the task's existing area/project links.
4. **`update()` normalization helper:** before writing the update payload,
   normalize completion fields:
   - incoming `status === 'completed'` and row was not completed → also set
     `is_completed = true`, `completed_at = now`, stash `previous_status`.
   - incoming `status !== 'completed'` and row was completed → also set
     `is_completed = false`, `completed_at = null`.
   - incoming `is_completed` toggled directly (no status in payload) → mirror to
     `status` using the same complete/uncomplete logic.
5. **UI:** add `<SelectItem value={TASK_STATUS.COMPLETED}>Completed</SelectItem>`
   to the task-dialog status selector so manual completion is reachable.
6. **Optimistic caches:** `useCompleteTask`, `useUncompleteTask`, and
   `useCompleteTaskWithGoalRefresh` set `status` alongside `is_completed` in
   their `onMutate` cache patches (`'completed'` on complete; recompute on
   uncomplete). `onSettled` invalidation reconciles `previous_status` from the
   server.

**Invariant after Part C:** `is_completed === (status === 'completed')` holds no
matter which control the user touches (checkbox or status selector).

## Out of scope

- No `completed` lifecycle added to Note / Resource / Project (their own
  lifecycles are unchanged).
- No bulk re-routing of existing Tasks / Notes / Resources (only the Project
  `planning → inbox` backfill is performed).
- No new global status semantics beyond the rules above.

## Testing focus

- Service unit tests: each `create()` derives the correct status across the
  context matrix (with/without each link type) and respects an explicit status.
- Service unit tests: `complete` stores `previous_status`; `uncomplete` restores
  it and falls back correctly when null; `update` keeps the
  `is_completed ⇔ status==='completed'` invariant from both directions.
- Migration check: project enum addition + backfill only touches contextless
  planning projects.
- Manual/UI: checkbox ↔ status selector stay in sync; contextual quick-adds skip
  inbox; global quick-adds land in inbox.

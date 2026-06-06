# Recurring Task Orphan Fix — Design

**Date:** 2026-06-05
**Branch:** `worktree-feat-recurring-task`
**Status:** Approved (user confirmed scope and approach on 2026-06-05)

## Problem

When a user un-checks a recurring task, the previously spawned next instance
is not deleted. Each `complete → uncheck → complete` cycle leaks one task
row. After N cycles the workspace has N orphan forward instances.

### Reproduction

1. Create task `T1` (area A1, goal G1, project P1, due 2026-06-05, recurring,
   repeat every 2 days).
2. Mark `T1` complete. RPC `complete_recurring_task` spawns `T2` (due
   2026-06-07).
3. Mark `T2` complete. RPC spawns `T3` (due 2026-06-09).
4. Uncheck `T2`. UI calls `useUncompleteTask.mutateAsync(T2.id)`, which calls
   `taskService.uncomplete()`. The hook has no access to `T3.id` and never
   asks the service to delete it. `T3` stays.
5. Recheck `T2`. RPC spawns a new `T4` (also due 2026-06-09) because no
   guard checks for an existing live child. Workspace now has `T1` (done),
   `T2` (done), `T3` (live, due 2026-06-09), `T4` (live, due 2026-06-09).

### Root cause

- `taskService.complete()` returns `{ completedTask, spawnedTaskId }`. Correct.
- `taskService.undoComplete(userId, id, spawnedTaskId)` calls RPC
  `undo_complete_recurring_task` which deletes the spawned row. Correct.
- `useCompleteTask`'s toast Undo action passes `result.spawnedTaskId`. Correct.
- **`useUncompleteTask` calls `taskService.uncomplete()`, NOT
  `undoComplete()`.** `uncomplete()` only patches the row; it never sees or
  deletes the spawned child.
- The page-level completion handler
  (`project-detail-content.tsx`, `contact-detail-content.tsx`,
  `tasks-content.tsx`, `my-day-content.tsx`,
  `dashboard/today-tasks-list.tsx`) calls `uncompleteTask.mutateAsync(id)` for
  the uncheck branch. Every uncheck leaks.
- `taskService.update()` is the path the dialog uses. It does not spawn or
  cleanup either, so the dialog is currently inconsistent with the rest of
  the app.

## Goal

Every code path that flips `is_completed` for a recurring task routes
through the same spawn/cleanup RPC pair, regardless of entry point
(toast undo, page toggle, dialog save). No orphan row is possible from
client behaviour alone.

## Approach: pointer-driven cleanup at uncheck

The server is the source of truth. The `tasks` row already carries
`recurrence_source_task_id`, set by `complete_recurring_task` to the parent
id when spawning. We use that pointer to find the live child and delete
it during uncomplete. No schema change, no client tracker, no idempotency
heuristic that could silently merge occurrences.

### Why not other approaches

- **Client tracker map** of `parentId → childId` is lost on refresh, on
  toast dismiss, across tabs, and across sessions. Doesn't fix the real
  bug.
- **Server-side idempotency** (don't create if child exists) silently
  merges occurrences the user thought were separate, and still doesn't
  handle the dismiss-then-recheck case once the child is already done.

## Design

### Architecture

```
         ┌────────────────────────────┐
   UI ──▶│ useCompleteTask            │
         │ useUncompleteTask          │  ← only hooks the pages call
         └─────────────┬──────────────┘
                       │
              ┌────────▼────────┐
              │ taskService     │
              │ complete()      │──▶ RPC complete_recurring_task
              │ uncomplete()    │──▶ find child + RPC undo_complete_recurring_task
              │ update()        │──▶ detect is_completed transition,
              │                 │    delegate to complete/uncomplete
              └─────────────────┘
```

### Service changes

#### 1. `taskService.uncomplete(userId, id)` — recurring aware

Current behaviour: patch the row to uncomplete. Returns `Task`.

New behaviour:

1. Read the current row.
2. If `is_recurring && repeat_every && repeat_cycle`, query for a live
   spawned child:
   ```ts
   const { data: child } = await createClient()
     .from("tasks")
     .select("id")
     .eq("user_id", userId)
     .eq("recurrence_source_task_id", id)
     .eq("is_completed", false)
     .eq("is_archived", false)
     .limit(1)
     .maybeSingle();
   ```
3. If a child exists, call RPC `undo_complete_recurring_task` with
   `p_completed_task_id = id` and `p_spawned_task_id = child.id`. RPC
   deletes the child and its join-table rows.
4. Apply the existing uncomplete patch (`is_completed = false`,
   `status = previous_status ?? fallback`, `previous_status = null`).
5. Return the patched row.

Non-recurring rows take the existing fast path (no lookup, no RPC).

#### 2. `taskService.update(userId, id, input)` — delegate on completion transition

Current behaviour: detects a completion transition via
`resolveTaskCompletionOnUpdate`, applies an in-place patch. Does not
spawn or clean up.

New behaviour: when the resolved transition is
`is_completed: false → true` and the row is recurring, return
`this.complete(userId, id)` (which returns `CompleteTaskResult`).
When the transition is `true → false` and the row is recurring, return
`this.uncomplete(userId, id)` (which returns `Task`). The caller
receives whichever shape matches what actually happened.

The return type becomes `Task | CompleteTaskResult`. Callers that ignore
the return value (dialog save) are unaffected. Callers that read
`spawnedTaskId` are unaffected because the dialog has no reason to read
it — the existing dialog flow doesn't surface the spawned task.

#### 3. `taskService.complete()` and `undoComplete()` — unchanged

These already do the right thing.

#### 4. Hooks

- `useCompleteTask` — unchanged. Toast Undo still passes
  `result.spawnedTaskId`. The toast's Undo now goes through
  `taskService.undoComplete`, which is unchanged.
- `useUncompleteTask` — unchanged externally. Internally it now calls
  the new recurring-aware `taskService.uncomplete()`. No change to the
  hook's call sites (`project-detail-content.tsx`,
  `contact-detail-content.tsx`, `tasks-content.tsx`,
  `my-day-content.tsx`, `dashboard/today-tasks-list.tsx`).

### RPC changes

None. `undo_complete_recurring_task` deletes the row at
`p_spawned_task_id` and its join-table rows; it raises only if the row
exists but is not linked back to `p_completed_task_id` via
`recurrence_source_task_id`. If the child was concurrently deleted by
another path, the row is simply not there and the delete is a no-op.
Both end states are correct.

The new child lookup is a plain `select`, not a new RPC.

### Dialog

No form change. The dialog calls `updateTask.mutateAsync({ id, input })`
with `is_completed` in the payload. The new `update()` behaviour
delegates to `complete()` or `uncomplete()` server-side, so a complete
or uncheck from the dialog also spawns / cleans up. The form only
notices: a successful save.

### Edge cases

| Scenario | Behaviour |
| --- | --- |
| Uncheck non-recurring task | Fast path, no lookup, no RPC. |
| Recurring task, no child spawned yet (impossible by design but defensive) | Lookup returns `null`, no RPC, plain uncomplete patch. |
| Child was archived by user | Filter `is_archived = false` excludes it. No cleanup. User keeps the orphan they made. Out of scope to clean up. |
| Child was completed by user separately | Filter `is_completed = false` excludes it. No cleanup. Same out-of-scope. |
| `is_recurring` was turned off on parent after spawn | Don't run cleanup. Just uncomplete the parent. Forward child stays as the user's separate decision. |
| Multi-tab: tab A completes, tab B unchecks | Tab B's lookup finds the child, deletes it. Correct. |
| Network failure: RPC succeeds, patch fails | Child gone, parent still completed. User retries uncheck, patch applies, correct end state. |
| Network failure: RPC fails, patch not attempted | Child stays, parent still completed. User retries uncheck, both run, correct. |
| Same render: user clicks complete, then uncheck before invalidate | React-Query serialises mutations. No race. |

### Out of scope (explicit)

- Cleaning up the forward child when the user turns off recurrence on
  the parent. This is a lifecycle decision (do we delete the user's
  work-in-progress?) and warrants its own design.
- Surfacing "this uncheck will also delete the next instance" in the
  toast or dialog. The uncheck is fast and the result is what the user
  expected (a clean workspace).
- A server-side idempotency guard on `complete_recurring_task` ("don't
  spawn if a live child exists"). We may add it later as
  belt-and-suspenders, but the client fix is sufficient to close the
  leak.

## Testing

### Unit (Vitest)

Add to `tests/unit/task.service.recurring.test.ts`:

1. `uncomplete` on a recurring task with a live child → calls RPC
   `undo_complete_recurring_task` with the child's id, then patches the
   parent.
2. `uncomplete` on a recurring task with no live child → does not call
   the RPC, patches the parent.
3. `uncomplete` on a non-recurring task → does not call the RPC, patches
   the parent.
4. `uncomplete` on a recurring task whose child was archived → does not
   call the RPC.
5. `update` on a recurring task with `is_completed: true` → calls
   `complete`, returns `CompleteTaskResult` with `spawnedTaskId`.
6. `update` on a recurring task with `is_completed: false` → calls
   recurring-aware `uncomplete`, returns `Task`.
7. `update` on a non-recurring task with a completion transition →
   existing patch path, no RPC.

### Integration scenarios (test sequence)

Reuse the existing recurring test harness and add:

1. Complete → uncheck: child deleted, parent reverted, row count
   returns to 1.
2. Complete → uncheck → complete: exactly one new child created, no
   duplicate.
3. Complete → uncheck via `update()` (dialog form): same as scenario 1.
4. Complete via `update()` (dialog form): child spawned, same as
   `complete()`.

### Manual

- Dev server (port 3030 per `user-dev-environment.md`).
- Three complete / uncheck cycles on a recurring task. Confirm
  `select count(*) from tasks where is_archived = false` returns the
  expected count (parent + at most one live child + any user-archived
  rows).
- Confirm `recurrence_source_task_id` on the live child points back to
  the parent.

## Migration

No DB migration. The `recurrence_source_task_id` column already exists
(migration `20260605000000_add_task_recurrence.sql`). No index change —
the existing lookup scans a small per-user subset; if profiling shows
otherwise, add a partial index `(recurrence_source_task_id) WHERE
is_completed = false AND is_archived = false` in a follow-up.

## Risks

- **Concurrent mutations on the same parent.** Two tabs each try to
  uncomplete at the same time. React-Query's mutation queue serialises
  per-hook-call. Across tabs, the RPC + patch are two separate calls
  each, so worst case the child is deleted twice (idempotent) or the
  parent is double-patched (no-op). End state correct.
- **`update()` return-type widening.** `Task | CompleteTaskResult` is
  technically a breaking change for any caller that destructures the
  return. Grep confirms no caller destructures `update()`; the dialog
  ignores the return and invalidates via `onSettled`.
- **Dialog submit while toggle is also flipping `is_completed`.** If
  the dialog and the page toggle both target the same row, React-Query
  serialises them. The last write wins. This was already the case.

## Files touched

- `src/lib/services/task.service.ts` — `uncomplete` recurring-aware
  branch, `update` delegates to complete/uncomplete on recurring
  transition.
- `src/lib/hooks/use-tasks.ts` — `useUncompleteTask` continues to call
  `taskService.uncomplete`; no API change. Document the new contract
  inline.
- `tests/unit/task.service.recurring.test.ts` — add the seven scenarios
  above.

No client-page or dialog change required.

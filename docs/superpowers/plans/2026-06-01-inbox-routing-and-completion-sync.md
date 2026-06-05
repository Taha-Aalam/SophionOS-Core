# Inbox Routing + Task Completion Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route newly-created Tasks/Notes/Resources/Projects to the global Inbox only when created with no organizing context, give Projects a real `inbox` status, and keep a task's completed-checkbox and `status='completed'` in two-way sync.

**Architecture:** A pure, unit-tested status-routing module derives the default status from which context links are present; each entity's `service.create()` calls it when the caller omits a status (explicit status still wins). A pure task-completion module computes the synced `{is_completed, completed_at, status, previous_status}` patch; `task.service` complete/uncomplete/update apply it. A `previous_status` column and a `project_status` enum addition back the persistence; React-Query optimistic caches mirror the status flip.

**Tech Stack:** Next.js (App Router), TypeScript, Supabase (Postgres), Zod, TanStack Query, Vitest, pnpm. Dev server runs on port 3030. Migrations apply via `npx supabase db push`.

**Spec:** `docs/superpowers/specs/2026-06-01-inbox-routing-and-completion-sync-design.md`

---

## File map

- Create: `src/lib/utils/status-routing.ts` — pure context→status derivation for all 4 entities.
- Create: `src/lib/utils/__tests__/status-routing.test.ts` — unit tests for the above.
- Create: `src/lib/utils/task-completion.ts` — pure completion-sync patch builders.
- Create: `src/lib/utils/__tests__/task-completion.test.ts` — unit tests for the above.
- Create: `supabase/migrations/20260601000000_add_project_inbox_status.sql` — enum value `inbox`.
- Create: `supabase/migrations/20260601000001_backfill_project_inbox.sql` — contextless `planning`→`inbox`.
- Create: `supabase/migrations/20260601000002_add_task_previous_status.sql` — `tasks.previous_status` column.
- Modify: `src/lib/utils/constants.ts` — add `PROJECT_STATUS.INBOX`.
- Modify: `src/lib/types/database.types.ts` — `inbox` in `project_status` enum; `previous_status` on tasks Row/Insert/Update.
- Modify: `src/lib/services/task.service.ts` — `TASK_SELECT`, derive on create, completion sync in create/complete/uncomplete/update.
- Modify: `src/lib/validators/task.schema.ts` — create `status` optional (no default).
- Modify: `src/lib/validators/note.schema.ts` — create `status` optional.
- Modify: `src/lib/validators/resource.schema.ts` — create `status` optional.
- Modify: `src/lib/validators/project.schema.ts` — create `status` optional; add `INBOX` to `projectStatusValues`.
- Modify: `src/lib/services/note.service.ts` — derive on create.
- Modify: `src/lib/services/resource.service.ts` — derive on create.
- Modify: `src/lib/services/project.service.ts` — derive on create.
- Modify: `src/lib/hooks/use-inbox.ts` — `useInboxProjects` filters `inbox`.
- Modify: `src/lib/hooks/use-tasks.ts` — optimistic `status` mirror in complete/uncomplete hooks.
- Modify: `src/components/entities/task-dialog.tsx` — add Completed option; context-derived default status.
- Modify: `src/components/entities/note-editor-dialog.tsx` — drop hardcoded create status (service derives).
- Modify: `src/components/entities/resource-dialog.tsx` — context-derived create-init status.
- Modify: `src/components/entities/project-dialog.tsx` — context-derived default status + Inbox option.
- Modify: `src/app/(dashboard)/knowledge/page.tsx` — drop hardcoded resource create status (service derives).

---

## Task 1: Branch and commit the spec

**Files:** none (git only)

- [ ] **Step 1: Create a feature branch off master**

Run:
```bash
git checkout -b inbox-routing-and-completion-sync
```
Expected: `Switched to a new branch 'inbox-routing-and-completion-sync'`

- [ ] **Step 2: Commit the already-written spec**

Run:
```bash
git add "docs/superpowers/specs/2026-06-01-inbox-routing-and-completion-sync-design.md" "docs/superpowers/plans/2026-06-01-inbox-routing-and-completion-sync.md"
git commit -m "docs: spec + plan for inbox routing and task completion sync"
```
Expected: one commit created on the new branch.

---

## Task 2: Add `inbox` to PROJECT_STATUS constant

**Files:**
- Modify: `src/lib/utils/constants.ts:20-26`

- [ ] **Step 1: Add the INBOX key**

In `src/lib/utils/constants.ts`, change the `PROJECT_STATUS` object so `INBOX` is first:

```typescript
export const PROJECT_STATUS = {
  INBOX: 'inbox',
  PLANNING: 'planning',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ON_HOLD: 'on_hold',
  ARCHIVED: 'archived',
} as const;
```

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors from `constants.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils/constants.ts
git commit -m "feat: add inbox to PROJECT_STATUS constant"
```

---

## Task 3: Pure status-routing helpers (with tests)

**Files:**
- Create: `src/lib/utils/status-routing.ts`
- Test: `src/lib/utils/__tests__/status-routing.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/utils/__tests__/status-routing.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import {
  deriveNoteStatus,
  deriveProjectStatus,
  deriveResourceStatus,
  deriveTaskStatus,
} from "@/lib/utils/status-routing";

describe("deriveTaskStatus", () => {
  it("returns inbox with no area and no project", () => {
    expect(deriveTaskStatus({})).toBe("inbox");
  });
  it("returns todo when an area_id is present", () => {
    expect(deriveTaskStatus({ area_id: "a" })).toBe("todo");
  });
  it("returns todo when area_ids is non-empty", () => {
    expect(deriveTaskStatus({ area_ids: ["a"] })).toBe("todo");
  });
  it("returns todo when a project is present", () => {
    expect(deriveTaskStatus({ project_ids: ["p"] })).toBe("todo");
  });
  it("ignores empty arrays", () => {
    expect(deriveTaskStatus({ area_ids: [], project_ids: [] })).toBe("inbox");
  });
});

describe("deriveNoteStatus", () => {
  it("returns inbox with no context", () => {
    expect(deriveNoteStatus({})).toBe("inbox");
  });
  it("returns to_review when a goal is present", () => {
    expect(deriveNoteStatus({ goal_ids: ["g"] })).toBe("to_review");
  });
  it("returns to_review when a topic is present", () => {
    expect(deriveNoteStatus({ topic_id: "t" })).toBe("to_review");
  });
  it("returns to_review when a project is present", () => {
    expect(deriveNoteStatus({ project_id: "p" })).toBe("to_review");
  });
});

describe("deriveResourceStatus", () => {
  it("returns inbox with no context", () => {
    expect(deriveResourceStatus({})).toBe("inbox");
  });
  it("returns to_review when an area is present", () => {
    expect(deriveResourceStatus({ area_ids: ["a"] })).toBe("to_review");
  });
  it("returns to_review when a topic is present", () => {
    expect(deriveResourceStatus({ topic_id: "t" })).toBe("to_review");
  });
});

describe("deriveProjectStatus", () => {
  it("returns inbox with no area and no goal", () => {
    expect(deriveProjectStatus({})).toBe("inbox");
  });
  it("returns planning when an area is present", () => {
    expect(deriveProjectStatus({ area_ids: ["a"] })).toBe("planning");
  });
  it("returns planning when a goal is present", () => {
    expect(deriveProjectStatus({ goal_ids: ["g"] })).toBe("planning");
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm test -- src/lib/utils/__tests__/status-routing.test.ts`
Expected: FAIL — cannot resolve `@/lib/utils/status-routing`.

- [ ] **Step 3: Implement the module**

Create `src/lib/utils/status-routing.ts`:

```typescript
import {
  NOTE_STATUS,
  PROJECT_STATUS,
  RESOURCE_STATUS,
  TASK_STATUS,
  type ProjectStatus,
  type TaskStatus,
} from "./constants";

type Maybe = string | null | undefined;

/** True when any scalar id is truthy or any id array is non-empty. */
function hasAny(...values: Array<Maybe | string[]>): boolean {
  return values.some((v) => (Array.isArray(v) ? v.length > 0 : Boolean(v)));
}

/** Task context = area OR project (single or multi). */
export function deriveTaskStatus(input: {
  area_id?: Maybe;
  area_ids?: string[];
  project_id?: Maybe;
  project_ids?: string[];
}): TaskStatus {
  return hasAny(input.area_id, input.area_ids, input.project_id, input.project_ids)
    ? TASK_STATUS.TODO
    : TASK_STATUS.INBOX;
}

/** Note context = area, project, goal, OR topic. */
export function deriveNoteStatus(input: {
  area_id?: Maybe;
  area_ids?: string[];
  project_id?: Maybe;
  project_ids?: string[];
  goal_ids?: string[];
  topic_id?: Maybe;
}): typeof NOTE_STATUS.TO_REVIEW | typeof NOTE_STATUS.INBOX {
  return hasAny(
    input.area_id,
    input.area_ids,
    input.project_id,
    input.project_ids,
    input.goal_ids,
    input.topic_id,
  )
    ? NOTE_STATUS.TO_REVIEW
    : NOTE_STATUS.INBOX;
}

/** Resource context = area, project, goal, OR topic. */
export function deriveResourceStatus(input: {
  area_id?: Maybe;
  area_ids?: string[];
  project_id?: Maybe;
  goal_ids?: string[];
  topic_id?: Maybe;
}): typeof RESOURCE_STATUS.TO_REVIEW | typeof RESOURCE_STATUS.INBOX {
  return hasAny(
    input.area_id,
    input.area_ids,
    input.project_id,
    input.goal_ids,
    input.topic_id,
  )
    ? RESOURCE_STATUS.TO_REVIEW
    : RESOURCE_STATUS.INBOX;
}

/** Project context = area OR goal. */
export function deriveProjectStatus(input: {
  area_id?: Maybe;
  area_ids?: string[];
  goal_ids?: string[];
}): ProjectStatus {
  return hasAny(input.area_id, input.area_ids, input.goal_ids)
    ? PROJECT_STATUS.PLANNING
    : PROJECT_STATUS.INBOX;
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `pnpm test -- src/lib/utils/__tests__/status-routing.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/status-routing.ts src/lib/utils/__tests__/status-routing.test.ts
git commit -m "feat: add pure context->status routing helpers"
```

---

## Task 4: Pure task-completion sync helpers (with tests)

**Files:**
- Create: `src/lib/utils/task-completion.ts`
- Test: `src/lib/utils/__tests__/task-completion.test.ts`

This module is the single source of truth for the `is_completed ⇔ status==='completed'` invariant. `fallbackStatus` is the status to restore to when a task is un-completed and has no stored `previous_status` (the caller computes it via `deriveTaskStatus`).

- [ ] **Step 1: Write the failing test**

Create `src/lib/utils/__tests__/task-completion.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import {
  buildCompletePatch,
  buildUncompletePatch,
  resolveTaskCompletionOnUpdate,
} from "@/lib/utils/task-completion";

const NOW = "2026-06-01T00:00:00.000Z";

describe("buildCompletePatch", () => {
  it("marks completed and stashes the prior status", () => {
    expect(buildCompletePatch("todo", NOW)).toEqual({
      is_completed: true,
      completed_at: NOW,
      status: "completed",
      previous_status: "todo",
    });
  });
  it("does not overwrite previous_status when already completed", () => {
    expect(buildCompletePatch("completed", NOW)).toEqual({
      is_completed: true,
      completed_at: NOW,
      status: "completed",
    });
  });
});

describe("buildUncompletePatch", () => {
  it("restores the stored previous status", () => {
    expect(buildUncompletePatch("in_progress", "inbox")).toEqual({
      is_completed: false,
      completed_at: null,
      status: "in_progress",
      previous_status: null,
    });
  });
  it("falls back when previous_status is null", () => {
    expect(buildUncompletePatch(null, "todo")).toEqual({
      is_completed: false,
      completed_at: null,
      status: "todo",
      previous_status: null,
    });
  });
});

describe("resolveTaskCompletionOnUpdate", () => {
  const base = { fallbackStatus: "todo" as const, now: NOW };

  it("returns no completion changes when neither field is in the payload", () => {
    expect(
      resolveTaskCompletionOnUpdate({
        ...base,
        current: { status: "todo", is_completed: false, previous_status: null },
      }),
    ).toEqual({});
  });

  it("entering completed via status sets is_completed and stashes prev", () => {
    expect(
      resolveTaskCompletionOnUpdate({
        ...base,
        incomingStatus: "completed",
        current: { status: "in_progress", is_completed: false, previous_status: null },
      }),
    ).toEqual({
      status: "completed",
      is_completed: true,
      completed_at: NOW,
      previous_status: "in_progress",
    });
  });

  it("leaving completed via status clears completion flags", () => {
    expect(
      resolveTaskCompletionOnUpdate({
        ...base,
        incomingStatus: "todo",
        current: { status: "completed", is_completed: true, previous_status: "in_progress" },
      }),
    ).toEqual({
      status: "todo",
      is_completed: false,
      completed_at: null,
      previous_status: null,
    });
  });

  it("checking is_completed (no status) mirrors to status=completed", () => {
    expect(
      resolveTaskCompletionOnUpdate({
        ...base,
        incomingIsCompleted: true,
        current: { status: "todo", is_completed: false, previous_status: null },
      }),
    ).toEqual({
      status: "completed",
      is_completed: true,
      completed_at: NOW,
      previous_status: "todo",
    });
  });

  it("unchecking is_completed (no status) restores previous_status", () => {
    expect(
      resolveTaskCompletionOnUpdate({
        ...base,
        incomingIsCompleted: false,
        current: { status: "completed", is_completed: true, previous_status: "in_progress" },
      }),
    ).toEqual({
      status: "in_progress",
      is_completed: false,
      completed_at: null,
      previous_status: null,
    });
  });

  it("no-op when target completed state already matches", () => {
    expect(
      resolveTaskCompletionOnUpdate({
        ...base,
        incomingStatus: "completed",
        current: { status: "completed", is_completed: true, previous_status: "todo" },
      }),
    ).toEqual({});
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm test -- src/lib/utils/__tests__/task-completion.test.ts`
Expected: FAIL — cannot resolve `@/lib/utils/task-completion`.

- [ ] **Step 3: Implement the module**

Create `src/lib/utils/task-completion.ts`:

```typescript
import { TASK_STATUS, type TaskStatus } from "./constants";

export interface TaskCompletionPatch {
  is_completed?: boolean;
  completed_at?: string | null;
  status?: TaskStatus;
  previous_status?: TaskStatus | null;
}

/** Patch for marking a task complete from `currentStatus`. */
export function buildCompletePatch(currentStatus: TaskStatus, now: string): TaskCompletionPatch {
  const patch: TaskCompletionPatch = {
    is_completed: true,
    completed_at: now,
    status: TASK_STATUS.COMPLETED,
  };
  // Only stash the prior status when we are actually transitioning into completed.
  if (currentStatus !== TASK_STATUS.COMPLETED) {
    patch.previous_status = currentStatus;
  }
  return patch;
}

/** Patch for un-completing a task; restores `previousStatus` or `fallbackStatus`. */
export function buildUncompletePatch(
  previousStatus: TaskStatus | null,
  fallbackStatus: TaskStatus,
): TaskCompletionPatch {
  return {
    is_completed: false,
    completed_at: null,
    status: previousStatus ?? fallbackStatus,
    previous_status: null,
  };
}

/**
 * Given an incoming update payload (which may carry `status` and/or
 * `is_completed`) and the current row, returns the extra fields needed to keep
 * `is_completed === (status === 'completed')`. Returns `{}` when no completion
 * change is implied.
 */
export function resolveTaskCompletionOnUpdate(args: {
  incomingStatus?: TaskStatus;
  incomingIsCompleted?: boolean;
  current: { status: TaskStatus; is_completed: boolean; previous_status: TaskStatus | null };
  fallbackStatus: TaskStatus;
  now: string;
}): TaskCompletionPatch {
  const { incomingStatus, incomingIsCompleted, current, fallbackStatus, now } = args;

  // Determine the target completed-state from whichever field the caller sent.
  let targetCompleted: boolean;
  if (incomingStatus !== undefined) {
    targetCompleted = incomingStatus === TASK_STATUS.COMPLETED;
  } else if (incomingIsCompleted !== undefined) {
    targetCompleted = incomingIsCompleted;
  } else {
    return {};
  }

  const wasCompleted = current.is_completed || current.status === TASK_STATUS.COMPLETED;

  if (targetCompleted === wasCompleted) {
    return {};
  }

  if (targetCompleted) {
    // Entering completed. If the caller only sent is_completed, set status too.
    return buildCompletePatch(current.status, now);
  }

  // Leaving completed. If the caller sent an explicit non-completed status, honor it;
  // otherwise restore the stored previous status (or the context fallback).
  const restored = buildUncompletePatch(current.previous_status, fallbackStatus);
  if (incomingStatus !== undefined) {
    restored.status = incomingStatus;
  }
  return restored;
}
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `pnpm test -- src/lib/utils/__tests__/task-completion.test.ts`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/task-completion.ts src/lib/utils/__tests__/task-completion.test.ts
git commit -m "feat: add pure task completion-sync patch builders"
```

---

## Task 5: Migration — project `inbox` enum + backfill

**Files:**
- Create: `supabase/migrations/20260601000000_add_project_inbox_status.sql`
- Create: `supabase/migrations/20260601000001_backfill_project_inbox.sql`

`ALTER TYPE ... ADD VALUE` cannot run in the same transaction that later uses the new value, so the enum addition and the backfill are two separate migration files.

- [ ] **Step 1: Write the enum migration**

Create `supabase/migrations/20260601000000_add_project_inbox_status.sql`:

```sql
-- Add a real 'inbox' value to project_status so projects are symmetric with
-- tasks/notes/resources. Previously the project "inbox" was faked as 'planning'.
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'inbox' BEFORE 'planning';
```

- [ ] **Step 2: Write the backfill migration**

Create `supabase/migrations/20260601000001_backfill_project_inbox.sql`:

```sql
-- Re-flag existing contextless projects (no linked area AND no linked goal) that
-- are still sitting at the old fake-inbox status 'planning' as the real 'inbox'.
UPDATE projects p
SET status = 'inbox'
WHERE p.status = 'planning'
  AND NOT EXISTS (SELECT 1 FROM project_areas pa WHERE pa.project_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM goal_projects gp WHERE gp.project_id = p.id);
```

- [ ] **Step 3: Apply the migrations**

Run in terminal: `! npx supabase db push`
Expected: both new migrations apply with no error. If using a remote project, apply the two SQL files via the Supabase Studio SQL editor in filename order instead.

- [ ] **Step 4: Verify the enum and backfill**

Run a query (Supabase Studio SQL editor or `psql`):
```sql
SELECT unnest(enum_range(NULL::project_status));
SELECT status, count(*) FROM projects GROUP BY status;
```
Expected: the enum list includes `inbox`; no contextless project remains at `planning` that should be `inbox`.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260601000000_add_project_inbox_status.sql supabase/migrations/20260601000001_backfill_project_inbox.sql
git commit -m "feat(db): add project inbox status and backfill contextless projects"
```

---

## Task 6: Migration — `tasks.previous_status` + generated types

**Files:**
- Create: `supabase/migrations/20260601000002_add_task_previous_status.sql`
- Modify: `src/lib/types/database.types.ts:454-505` (tasks Row/Insert/Update), `:773` (project_status enum)
- Modify: `src/lib/services/task.service.ts:8-9` (`TASK_SELECT`)

- [ ] **Step 1: Write the column migration**

Create `supabase/migrations/20260601000002_add_task_previous_status.sql`:

```sql
-- Remembers the status a task held before it was completed, so un-completing
-- can restore it. Nullable; only set while a task is in the completed state.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS previous_status task_status;
```

- [ ] **Step 2: Apply the migration**

Run in terminal: `! npx supabase db push`
Expected: migration applies; `tasks` gains a nullable `previous_status` column.

- [ ] **Step 3: Add `previous_status` to the generated tasks types**

In `src/lib/types/database.types.ts`, in the `tasks` block, add a line after each `completed_at` line:
- In `Row` (after `completed_at: string | null;`):
  ```typescript
          previous_status: Database["public"]["Enums"]["task_status"] | null;
  ```
- In `Insert` (after `completed_at?: string | null;`):
  ```typescript
          previous_status?: Database["public"]["Enums"]["task_status"] | null;
  ```
- In `Update` (after `completed_at?: string | null;`):
  ```typescript
          previous_status?: Database["public"]["Enums"]["task_status"] | null;
  ```

- [ ] **Step 4: Add `inbox` to the project_status enum type**

In `src/lib/types/database.types.ts:773`, change:
```typescript
      project_status: "planning" | "active" | "completed" | "on_hold" | "archived";
```
to:
```typescript
      project_status: "inbox" | "planning" | "active" | "completed" | "on_hold" | "archived";
```

- [ ] **Step 5: Add `previous_status` to TASK_SELECT**

In `src/lib/services/task.service.ts`, change the `TASK_SELECT` constant to include `previous_status`:
```typescript
export const TASK_SELECT =
  "id, user_id, area_id, project_id, name, description, status, priority, due_date, is_completed, is_focused, is_important, is_urgent, completed_at, previous_status, smart_priority, is_archived, created_at, updated_at";
```

- [ ] **Step 6: Verify typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no new errors. `Task` now carries `previous_status` via `DatabaseTable<"tasks">`.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260601000002_add_task_previous_status.sql src/lib/types/database.types.ts src/lib/services/task.service.ts
git commit -m "feat(db): add tasks.previous_status column and types"
```

---

## Task 7: Make create-schema `status` optional (all 4) + project enum value

**Files:**
- Modify: `src/lib/validators/task.schema.ts:70`
- Modify: `src/lib/validators/note.schema.ts:45`
- Modify: `src/lib/validators/resource.schema.ts:54`
- Modify: `src/lib/validators/project.schema.ts:6-12` (status values) and `:95` (status field)
- Test: `src/lib/__tests__/project.schema.test.ts` (extend existing) and a new `src/lib/__tests__/create-status-optional.test.ts`

Removing the hard default lets each `service.create()` derive the status. An explicit status passed by a caller still validates and wins.

- [ ] **Step 1: Write a failing test for optional status**

Create `src/lib/__tests__/create-status-optional.test.ts`:

```typescript
import { describe, expect, it } from "vitest";

import { createNoteSchema } from "@/lib/validators/note.schema";
import { createResourceSchema } from "@/lib/validators/resource.schema";
import { createTaskSchema } from "@/lib/validators/task.schema";

describe("create schemas leave status undefined when omitted", () => {
  it("task", () => {
    const parsed = createTaskSchema.parse({ name: "T" });
    expect(parsed.status).toBeUndefined();
  });
  it("note", () => {
    const parsed = createNoteSchema.parse({ name: "N" });
    expect(parsed.status).toBeUndefined();
  });
  it("resource", () => {
    const parsed = createResourceSchema.parse({ name: "R" });
    expect(parsed.status).toBeUndefined();
  });
  it("still accepts an explicit status", () => {
    expect(createTaskSchema.parse({ name: "T", status: "todo" }).status).toBe("todo");
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm test -- src/lib/__tests__/create-status-optional.test.ts`
Expected: FAIL — parsed.status is `"inbox"` (the current default), not `undefined`.

- [ ] **Step 3: Make task create status optional**

In `src/lib/validators/task.schema.ts`, change line 70 from:
```typescript
    status: z.nativeEnum(TASK_STATUS).default(TASK_STATUS.INBOX),
```
to:
```typescript
    status: z.nativeEnum(TASK_STATUS).optional(),
```

- [ ] **Step 4: Make note create status optional**

In `src/lib/validators/note.schema.ts`, change line 45 from:
```typescript
  status: z.enum(noteStatusValues).default(NOTE_STATUS.INBOX),
```
to:
```typescript
  status: z.enum(noteStatusValues).optional(),
```

- [ ] **Step 5: Make resource create status optional**

In `src/lib/validators/resource.schema.ts`, change line 54 from:
```typescript
  status: z.enum(resourceStatusValues).default(RESOURCE_STATUS.INBOX),
```
to:
```typescript
  status: z.enum(resourceStatusValues).optional(),
```

- [ ] **Step 6: Add INBOX to projectStatusValues and make project create status optional**

In `src/lib/validators/project.schema.ts`, change the `projectStatusValues` array (lines 6-12) to include INBOX first:
```typescript
const projectStatusValues = [
  PROJECT_STATUS.INBOX,
  PROJECT_STATUS.PLANNING,
  PROJECT_STATUS.ACTIVE,
  PROJECT_STATUS.COMPLETED,
  PROJECT_STATUS.ON_HOLD,
  PROJECT_STATUS.ARCHIVED,
] as const;
```
Then change the create-schema status field (line 95) from:
```typescript
    status: z.enum(projectStatusValues).default(PROJECT_STATUS.PLANNING),
```
to:
```typescript
    status: z.enum(projectStatusValues).optional(),
```

- [ ] **Step 7: Run the new test + existing schema tests**

Run: `pnpm test -- src/lib/__tests__/create-status-optional.test.ts src/lib/__tests__/project.schema.test.ts`
Expected: PASS. If the existing `project.schema.test.ts` asserted a `planning` default anywhere, update that assertion to expect `undefined` (status is now caller/service-driven).

- [ ] **Step 8: Commit**

```bash
git add src/lib/validators/task.schema.ts src/lib/validators/note.schema.ts src/lib/validators/resource.schema.ts src/lib/validators/project.schema.ts src/lib/__tests__/create-status-optional.test.ts
git commit -m "feat: make create-schema status optional so services derive it"
```

---

## Task 8: Derive status in `task.service.create`

**Files:**
- Modify: `src/lib/services/task.service.ts:335-378` (`create`)

- [ ] **Step 1: Import the helper**

At the top of `src/lib/services/task.service.ts`, add to the existing import from `../utils`:
```typescript
import { deriveTaskStatus } from "../utils/status-routing";
```

- [ ] **Step 2: Inject the derived status into the insert**

In `create()`, after the line:
```typescript
      const { goalIds, taskInput } = extractGoalIds(projectCleanedInput);
```
add:
```typescript
      const status =
        taskInput.status ?? deriveTaskStatus({ area_ids: areaIds, project_ids: projectIds });
```
Then change the insert call from:
```typescript
        .insert({ ...taskInput, user_id: userId })
```
to:
```typescript
        .insert({ ...taskInput, status, user_id: userId })
```

- [ ] **Step 3: Verify typecheck and helper tests still pass**

Run: `pnpm exec tsc --noEmit && pnpm test -- src/lib/utils/__tests__/status-routing.test.ts`
Expected: no type errors; routing tests PASS.

- [ ] **Step 4: Manual smoke (after final UI tasks; note here)**

Note for verification step (Task 16): a task created from the global Tasks page with no links lands `inbox`; one created from an Area/Project detail page lands `todo`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/task.service.ts
git commit -m "feat: derive task status from context on create"
```

---

## Task 9: Task completion sync in `task.service` (complete / uncomplete / update)

**Files:**
- Modify: `src/lib/services/task.service.ts` — `complete` (433-448), `uncomplete` (502-517), `update` (380-431)

The service reads the current row via `getById` (already hydrates `linkedAreaIds`/`linkedProjectIds`) to compute the completion patch and the context fallback.

- [ ] **Step 1: Import the completion helpers**

Add near the top of `src/lib/services/task.service.ts`:
```typescript
import {
  buildCompletePatch,
  buildUncompletePatch,
  resolveTaskCompletionOnUpdate,
} from "../utils/task-completion";
```

- [ ] **Step 2: Rewrite `complete()` to set status + previous_status**

Replace the body of `complete()` with:
```typescript
  async complete(userId: string, id: string): Promise<Task> {
    const current = await this.getById(userId, id);
    const patch = buildCompletePatch(current.status, new Date().toISOString());

    const { data, error } = await createClient()
      .from("tasks")
      .update(patch)
      .eq("user_id", userId)
      .eq("id", id)
      .select(TASK_SELECT)
      .single();

    if (error) {
      if (error.code === "PGRST116") throw new NotFoundError("Task", id);
      throw new DatabaseError(error.message);
    }

    return data;
  },
```

- [ ] **Step 3: Rewrite `uncomplete()` to restore the previous status**

Replace the body of `uncomplete()` with:
```typescript
  async uncomplete(userId: string, id: string): Promise<Task> {
    const current = await this.getById(userId, id);
    const fallback = deriveTaskStatus({
      area_ids: current.linkedAreaIds,
      project_ids: current.linkedProjectIds,
    });
    const patch = buildUncompletePatch(current.previous_status ?? null, fallback);

    const { data, error } = await createClient()
      .from("tasks")
      .update(patch)
      .eq("user_id", userId)
      .eq("id", id)
      .select(TASK_SELECT)
      .single();

    if (error) {
      if (error.code === "PGRST116") throw new NotFoundError("Task", id);
      throw new DatabaseError(error.message);
    }

    return data;
  },
```

- [ ] **Step 4: Sync completion fields inside `update()`**

In `update()`, the task-column update happens in the `hasTaskUpdates` branch. Before that branch runs, compute a completion patch when the incoming payload touches `status` or `is_completed`, and merge it into `taskInput`. Insert this immediately after:
```typescript
      const hasTaskUpdates = Object.keys(taskInput).length > 0;
```
add:
```typescript
      const touchesCompletion =
        taskInput.status !== undefined || taskInput.is_completed !== undefined;
      if (touchesCompletion) {
        const current = await this.getById(userId, id);
        const fallback = deriveTaskStatus({
          area_ids: current.linkedAreaIds,
          project_ids: current.linkedProjectIds,
        });
        const syncPatch = resolveTaskCompletionOnUpdate({
          incomingStatus: taskInput.status,
          incomingIsCompleted: taskInput.is_completed,
          current: {
            status: current.status,
            is_completed: current.is_completed,
            previous_status: current.previous_status ?? null,
          },
          fallbackStatus: fallback,
          now: new Date().toISOString(),
        });
        Object.assign(taskInput, syncPatch);
      }
```

Note: `hasTaskUpdates` is computed before this block, so a payload that only set `is_completed` already counts as a task update and the merged `syncPatch` is written. `taskInput` is a typed object from the validated schema; the `previous_status` / `completed_at` keys added by `Object.assign` are valid `tasks` Update columns.

- [ ] **Step 5: Verify typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no type errors. If TS complains that `previous_status` is not assignable on `taskInput`, widen the local with `const taskInput = { ...} as UpdateTaskInput & { previous_status?: TaskStatus | null; completed_at?: string | null }` at its declaration, or type the merge target accordingly.

- [ ] **Step 6: Run the full unit suite**

Run: `pnpm test`
Expected: PASS (pure helpers cover the logic; no regressions).

- [ ] **Step 7: Commit**

```bash
git add src/lib/services/task.service.ts
git commit -m "feat: keep task is_completed and status='completed' in two-way sync"
```

---

## Task 10: Derive status in note / resource / project `create`

**Files:**
- Modify: `src/lib/services/note.service.ts` (`create`)
- Modify: `src/lib/services/resource.service.ts` (`create`, ~line 300-306)
- Modify: `src/lib/services/project.service.ts` (`create`)

- [ ] **Step 1: Note service — import and derive**

In `src/lib/services/note.service.ts`, add the import:
```typescript
import { deriveNoteStatus } from "../utils/status-routing";
```
In `create()`, after:
```typescript
      const { taskIds, noteInput: taskCleanedInput } = extractTaskIds(projectCleanedInput);
```
add:
```typescript
      const status =
        taskCleanedInput.status ??
        deriveNoteStatus({
          area_ids: areaIds,
          project_ids: projectIds,
          goal_ids: goalIds,
          topic_id: taskCleanedInput.topic_id,
        });
```
Then change the insert from:
```typescript
          .insert({ ...taskCleanedInput, user_id: userId, slug })
```
to:
```typescript
          .insert({ ...taskCleanedInput, status, user_id: userId, slug })
```

- [ ] **Step 2: Resource service — import and derive**

In `src/lib/services/resource.service.ts`, add the import:
```typescript
import { deriveResourceStatus } from "../utils/status-routing";
```
In `create()`, after:
```typescript
      const { taskIds, resourceInput } = extractTaskIds(goalCleanedInput);
```
add:
```typescript
      const status =
        resourceInput.status ??
        deriveResourceStatus({
          area_ids: areaIds,
          project_id: resourceInput.project_id,
          goal_ids: goalIds,
          topic_id: resourceInput.topic_id,
        });
```
Then change the insert from:
```typescript
        .insert({ ...resourceInput, user_id: userId })
```
to:
```typescript
        .insert({ ...resourceInput, status, user_id: userId })
```

- [ ] **Step 3: Project service — import and derive**

In `src/lib/services/project.service.ts`, add the import:
```typescript
import { deriveProjectStatus } from "../utils/status-routing";
```
In `create()`, after:
```typescript
    const { goalIds, projectInput } = extractGoalIds(areaCleanedInput);
```
add:
```typescript
    const status =
      projectInput.status ?? deriveProjectStatus({ area_ids: areaIds, goal_ids: goalIds });
```
Then change both insert branches inside `runWriteProjectQuery` from:
```typescript
            selectClause === PROJECT_SELECT
              ? { ...projectInput, user_id: userId, slug }
              : { ...projectInput, user_id: userId },
```
to:
```typescript
            selectClause === PROJECT_SELECT
              ? { ...projectInput, status, user_id: userId, slug }
              : { ...projectInput, status, user_id: userId },
```

- [ ] **Step 4: Verify typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/note.service.ts src/lib/services/resource.service.ts src/lib/services/project.service.ts
git commit -m "feat: derive note/resource/project status from context on create"
```

---

## Task 11: `useInboxProjects` filters real inbox + verify graduate

**Files:**
- Modify: `src/lib/hooks/use-inbox.ts:31-33`
- Inspect: `src/app/(dashboard)/inbox/page.tsx` (graduate/promote handler)

- [ ] **Step 1: Filter on the real inbox status**

In `src/lib/hooks/use-inbox.ts`, change:
```typescript
export function useInboxProjects() {
  return useProjects({ status: PROJECT_STATUS.PLANNING });
}
```
to:
```typescript
export function useInboxProjects() {
  return useProjects({ status: PROJECT_STATUS.INBOX });
}
```

- [ ] **Step 2: Verify the graduate/promote action targets a post-inbox status**

Open `src/app/(dashboard)/inbox/page.tsx`. Find where an inbox project is "graduated"/promoted (it calls `useUpdateProjectStatus` / `useUpdateProject`). Confirm it sets `PROJECT_STATUS.PLANNING` (or `ACTIVE`). If the handler currently assumes projects leave the inbox by some other means (e.g. it had no project graduate path because the inbox was faked as planning), add a promote action that calls:
```typescript
updateProjectStatus({ id: project.id, status: PROJECT_STATUS.PLANNING });
```
using the existing `useUpdateProjectStatus` hook. If a correct promote path already exists, make no change.

- [ ] **Step 3: Verify typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/hooks/use-inbox.ts src/app/\(dashboard\)/inbox/page.tsx
git commit -m "feat: inbox projects filter real inbox status"
```

---

## Task 12: Mirror `status` in task completion optimistic caches

**Files:**
- Modify: `src/lib/hooks/use-tasks.ts` — `useCompleteTask` (187-197), `useUncompleteTask` (243-250), `useCompleteTaskWithGoalRefresh` (370-380)

Optimistic patches currently flip `is_completed` only; add `status` so the UI status badge updates instantly. `onSettled` invalidation reconciles `previous_status` from the server.

- [ ] **Step 1: Import the routing helper**

At the top of `src/lib/hooks/use-tasks.ts`, add:
```typescript
import { deriveTaskStatus } from "@/lib/utils/status-routing";
import { TASK_STATUS } from "@/lib/utils/constants";
```

- [ ] **Step 2: Mirror status on complete (both complete hooks)**

In `useCompleteTask` and `useCompleteTaskWithGoalRefresh`, in the `setQueriesData` map callback, change the completed patch from:
```typescript
            ? { ...task, completed_at: new Date().toISOString(), is_completed: true }
```
to:
```typescript
            ? {
                ...task,
                completed_at: new Date().toISOString(),
                is_completed: true,
                status: TASK_STATUS.COMPLETED,
              }
```

- [ ] **Step 3: Mirror status on uncomplete**

In `useUncompleteTask`, change the patch from:
```typescript
            ? { ...task, completed_at: null, is_completed: false }
```
to:
```typescript
            ? {
                ...task,
                completed_at: null,
                is_completed: false,
                status:
                  task.previous_status ??
                  deriveTaskStatus({
                    area_ids: task.linkedAreaIds,
                    project_ids: task.linkedProjectIds,
                  }),
              }
```

- [ ] **Step 4: Verify typecheck and tests**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: no type errors; all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/hooks/use-tasks.ts
git commit -m "feat: mirror task status in completion optimistic caches"
```

---

## Task 13: Add "Completed" to the task-dialog status selector

**Files:**
- Modify: `src/components/entities/task-dialog.tsx:643-647`

So a user can set completed manually (which the service then mirrors to the checkbox).

- [ ] **Step 1: Add the SelectItem**

In `src/components/entities/task-dialog.tsx`, change the `<SelectContent>` block from:
```tsx
                      <SelectContent>
                        <SelectItem value={TASK_STATUS.INBOX}>Inbox</SelectItem>
                        <SelectItem value={TASK_STATUS.TODO}>To Do</SelectItem>
                        <SelectItem value={TASK_STATUS.IN_PROGRESS}>In Progress</SelectItem>
                      </SelectContent>
```
to:
```tsx
                      <SelectContent>
                        <SelectItem value={TASK_STATUS.INBOX}>Inbox</SelectItem>
                        <SelectItem value={TASK_STATUS.TODO}>To Do</SelectItem>
                        <SelectItem value={TASK_STATUS.IN_PROGRESS}>In Progress</SelectItem>
                        <SelectItem value={TASK_STATUS.COMPLETED}>Completed</SelectItem>
                      </SelectContent>
```

- [ ] **Step 2: Verify typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/entities/task-dialog.tsx
git commit -m "feat: allow setting task status to Completed from the dialog"
```

---

## Task 14: Context-derived default status in create dialogs + knowledge forms

**Files:**
- Modify: `src/components/entities/task-dialog.tsx` — `buildTaskFormValues` (3 create branches, 158-188)
- Modify: `src/components/entities/note-editor-dialog.tsx` — create handler (74-94)
- Modify: `src/components/entities/resource-dialog.tsx` — create-init effect (175-187)
- Modify: `src/components/entities/project-dialog.tsx` — create form-value branches (102-115) + status Select (~362)
- Modify: `src/app/(dashboard)/knowledge/page.tsx` — resource create handler (400-409)

Because the design honors an explicit status ("explicit wins"), each create UI that submits a status must submit the context-derived one (not a hardcoded `inbox`/`planning`), or omit status so the service derives it. Edit mode must keep using the existing entity's real status — only the create path changes. The exact structures were verified against the current code below.

- [ ] **Step 1: Task dialog — seed status in each create branch**

In `src/components/entities/task-dialog.tsx`, add the import:
```typescript
import { deriveTaskStatus } from "@/lib/utils/status-routing";
```
In `buildTaskFormValues`, the `if (!task) { ... }` block has three create branches that each spread `...EMPTY_FORM_VALUES` (whose `status` is `TASK_STATUS.INBOX`). Add a `status` to each returned create object computed from that branch's own area/project:

- goalScoped branch (currently returns `{ ...EMPTY_FORM_VALUES, area_ids: scopedAreaIds, project_id: "", project_ids: [], goal_ids: [goalScoped.goalId] }`) — add:
  ```typescript
        status: deriveTaskStatus({ area_ids: scopedAreaIds }),
  ```
- projectScoped branch (returns `{ ...EMPTY_FORM_VALUES, area_ids: scopedAreaIds, project_id: projectScoped.projectId, project_ids: [projectScoped.projectId], goal_ids: ... }`) — add:
  ```typescript
        status: deriveTaskStatus({ area_ids: scopedAreaIds, project_ids: [projectScoped.projectId] }),
  ```
- default branch (returns `{ ...EMPTY_FORM_VALUES, area_ids: defaultAreaId ? [defaultAreaId] : [], project_id: defaultProjectId ?? "", project_ids: defaultProjectId ? [defaultProjectId] : [], goal_ids: ... }`) — add:
  ```typescript
        status: deriveTaskStatus({
          area_ids: defaultAreaId ? [defaultAreaId] : [],
          project_ids: defaultProjectId ? [defaultProjectId] : [],
        }),
  ```
Do NOT change the edit-mode return (the final `return { ... status: task.status }`).

- [ ] **Step 2: Note dialog — omit hardcoded status (no picker → let service derive)**

In `src/components/entities/note-editor-dialog.tsx`, the create handler builds `createInput` with a hardcoded `status: "inbox",` (line ~77) and then conditionally attaches `goal_ids`/`project_id`/`area_id`/`topic_id`. This dialog has no status picker, so simply delete the `status: "inbox",` line. With the create schema now optional (Task 7), the service's `deriveNoteStatus` routes it from the attached context (`to_review` when any of goal/project/area/topic is present, else `inbox`).

- [ ] **Step 3: Resource dialog — derive the create-init status**

In `src/components/entities/resource-dialog.tsx`, add the import:
```typescript
import { deriveResourceStatus } from "@/lib/utils/status-routing";
```
In the `useEffect` create branch (`else if (open) { ... }`), change:
```typescript
        setStatus(RESOURCE_STATUS.INBOX);
```
to:
```typescript
        setStatus(
          deriveResourceStatus({
            area_ids: initialAreaIds,
            project_id: initialProjectId,
            goal_ids: initialGoalIds,
            topic_id: initialTopicId,
          }),
        );
```
The status `<Select>` options (`RESOURCE_STATUS_OPTIONS`) already include `to_review`, so the seeded value displays. Leave the edit branch (`if (open && resource) { ... setStatus(resource.status ...) }`) unchanged.

- [ ] **Step 4: Project dialog — seed status in create branches + add Inbox option**

In `src/components/entities/project-dialog.tsx`, add the import:
```typescript
import { deriveProjectStatus } from "@/lib/utils/status-routing";
```
In the create form-values builder, the two `if (!project)` branches spread `...EMPTY_FORM_VALUES` (status `PROJECT_STATUS.PLANNING`). Add a derived `status`:
- goalScoped branch (`{ ...EMPTY_FORM_VALUES, area_ids: goalScoped.areaId ? [goalScoped.areaId] : [], goal_ids: [goalScoped.goalId] }`) — add:
  ```typescript
        status: deriveProjectStatus({
          area_ids: goalScoped.areaId ? [goalScoped.areaId] : [],
          goal_ids: [goalScoped.goalId],
        }),
  ```
- default branch (`{ ...EMPTY_FORM_VALUES, area_ids: defaultAreaIds ?? [], goal_ids: defaultGoalId ? [defaultGoalId] : [] }`) — add:
  ```typescript
        status: deriveProjectStatus({
          area_ids: defaultAreaIds ?? [],
          goal_ids: defaultGoalId ? [defaultGoalId] : [],
        }),
  ```
Then add an Inbox item to the status `<SelectContent>` (it currently lists only Planning/In Progress/Completed/On Hold) so a contextless project's seeded `inbox` default renders. Change:
```tsx
                      <SelectContent>
                        <SelectItem value={PROJECT_STATUS.PLANNING}>Planning</SelectItem>
```
to:
```tsx
                      <SelectContent>
                        <SelectItem value={PROJECT_STATUS.INBOX}>Inbox</SelectItem>
                        <SelectItem value={PROJECT_STATUS.PLANNING}>Planning</SelectItem>
```
Leave the edit-mode return (`status: project.status`) unchanged.

- [ ] **Step 5: Knowledge page resource form — omit hardcoded status**

In `src/app/(dashboard)/knowledge/page.tsx`, the resource create handler (around line 400) passes `status: resourceForm.status as ResourceStatus,` even though that quick form has no status picker (it only collects name/url/type/area/project/topic). Delete that `status:` line from the `createResource.mutateAsync({ ... })` call so the service derives the status from the form's `area_id`/`project_id`/`topic_id`. Leave the note create handler as-is — that form attaches no context, so `inbox` is already correct.

- [ ] **Step 6: Verify typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/entities/task-dialog.tsx src/components/entities/note-editor-dialog.tsx src/components/entities/resource-dialog.tsx src/components/entities/project-dialog.tsx "src/app/(dashboard)/knowledge/page.tsx"
git commit -m "feat: route create-dialog and knowledge-form status by context"
```

---

## Task 15: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Lint, typecheck, unit tests, build**

Run:
```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test
pnpm build
```
Expected: lint clean, no type errors, all tests pass, build succeeds.

- [ ] **Step 2: Manual smoke — routing (dev server on port 3030)**

Start: `pnpm dev` (port 3030). Verify:
- New Task from the global Tasks page (no links) → appears in **Inbox**, status `inbox`.
- New Task from an Area or Project detail page → skips inbox, status `To Do`.
- New Note/Resource with no context → Inbox; with an area/project/goal/topic → `To Review`, not in inbox.
- New Project with no area/goal → Inbox tab; with an area or goal → `planning`, not in inbox.
- **Knowledge page** resource quick-form with an area/project/topic set → lands in `To Review`, not the Inbox tab; with none set → Inbox.

- [ ] **Step 3: Manual smoke — completion two-way sync**

- Check a task's completed checkbox → its status shows **Completed**; uncheck → status returns to its prior value (e.g. To Do / In Progress), not stuck.
- Open the task dialog, set status to **Completed** → the completed checkbox becomes checked. Set status back to To Do → checkbox clears.
- Confirm a completed task created in an area, when un-completed, returns to `todo` (context fallback) if it had no recorded prior status.

- [ ] **Step 4: Final commit if any verification fixes were made**

```bash
git add -A
git commit -m "fix: address verification findings for inbox routing and completion sync"
```

---

## Self-review notes (for the implementer)

- **Explicit-status-wins:** every `service.create()` uses `input.status ?? derive...`, so any caller that passes a status keeps it. Quick-add call sites omit status → derived.
- **Invariant:** after Task 9, `is_completed === (status === 'completed')` holds whether the user toggles the checkbox (`complete`/`uncomplete`) or the status selector (`update`).
- **`previous_status` lifecycle:** set on entering completed, cleared (`null`) on leaving. Restore falls back to context-derived `todo`/`inbox` when null.
- **No new completed lifecycle** was added to notes/resources/projects (out of scope).
- **Only project data** is backfilled (`planning`→`inbox` for contextless projects); tasks/notes/resources keep existing rows as-is.

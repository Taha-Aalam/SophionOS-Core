# Task List Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate inconsistent task-list wrapping containers and duplicated data plumbing across all 7 pages by creating a unified `TaskList` container and shared helper utilities.

**Architecture:** (1) Add 4 shared `getTaskLinked*` helpers to the existing `src/lib/utils/tasks.ts`, (2) create `TaskList` component with `card`/`simple` variants, (3) migrate each consumer page, (4) delete `TodayTasksList`.

**Tech Stack:** React/Next.js 14, shadcn/ui, lucide-react, existing `TaskListItem` component (`src/components/entities/task-list-item.tsx`)

---

### Task 1: Add shared `getTaskLinked*` helpers to `src/lib/utils/tasks.ts`

**Files:**
- Modify: `src/lib/utils/tasks.ts` (append after `getTaskCounts` at line 222)

- [ ] **Step 1: Add 4 helper functions**

Insert at end of `src/lib/utils/tasks.ts` (after `getTaskCounts`):

```ts
export function getTaskLinkedAreaNames(
  task: Task,
  areaNames: Map<string, string>,
): string[] {
  return getTaskLinkedAreaIds(task)
    .map((id) => areaNames.get(id))
    .filter((n): n is string => Boolean(n));
}

export function getTaskLinkedAreaIcons(
  task: Task,
  areaIcons: Map<string, string | null>,
): (string | null)[] {
  return getTaskLinkedAreaIds(task).map((id) => areaIcons.get(id) ?? null);
}

export function getTaskLinkedGoalNames(
  task: Task,
  goalNames: Map<string, string>,
): string[] {
  return getTaskLinkedGoalIds(task)
    .map((id) => goalNames.get(id))
    .filter((n): n is string => Boolean(n));
}

export function getTaskLinkedProjectNames(
  task: Task,
  projectNames: Map<string, string>,
): string[] {
  return getTaskLinkedProjectIds(task)
    .map((id) => projectNames.get(id))
    .filter((n): n is string => Boolean(n));
}
```

No existing code imports these yet — they're consumed starting in Task 3.

- [ ] **Step 2: Verify file is valid TypeScript**

Run: `npx tsc --noEmit src/lib/utils/tasks.ts 2>&1 | head -20`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils/tasks.ts
git commit -m "feat: add shared getTaskLinked helpers for area/goal/project names"

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
```

---

### Task 2: Create `TaskList` component

**Files:**
- Create: `src/components/entities/task-list.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";

import { TaskListItem } from "@/components/entities/task-list-item";
import { EmptyState } from "@/components/views/empty-state";
import type { Task } from "@/lib/types/domain.types";
import { cn } from "@/lib/utils";

interface TaskListProps {
  tasks: Task[];
  variant?: "card" | "simple";
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
  /** Shared callbacks — passed to every TaskListItem */
  onCompletionToggle: (id: string, isCompleted: boolean) => void;
  onFocusToggle: (id: string, focused: boolean) => void;
  onNameSave: (id: string, name: string) => void;
  onEdit?: (task: Task) => void;
  onArchiveToggle?: (task: Task) => void;
  onPermanentDelete?: (id: string) => void;
  /** Per-task linked entity props — getters so each task resolves differently */
  getAreaName?: (task: Task) => string | null | undefined;
  getLinkedAreaNames?: (task: Task) => string[];
  getLinkedAreaIcons?: (task: Task) => (string | null)[];
  getGoalName?: (task: Task) => string | null | undefined;
  getLinkedGoalNames?: (task: Task) => string[];
  getProjectName?: (task: Task) => string | null | undefined;
  getLinkedProjectNames?: (task: Task) => string[];
  showSmartPriority?: boolean;
}

export function TaskList({
  tasks,
  variant = "card",
  emptyTitle,
  emptyDescription,
  emptyIcon,
  onCompletionToggle,
  onFocusToggle,
  onNameSave,
  onEdit,
  onArchiveToggle,
  onPermanentDelete,
  getAreaName,
  getLinkedAreaNames,
  getLinkedAreaIcons,
  getGoalName,
  getLinkedGoalNames,
  getProjectName,
  getLinkedProjectNames,
  showSmartPriority,
}: TaskListProps) {
  if (tasks.length === 0) {
    if (!emptyTitle) return null;
    return (
      <EmptyState
        icon={emptyIcon}
        title={emptyTitle}
        description={emptyDescription ?? ""}
      />
    );
  }

  return (
    <div
      className={cn(
        variant === "card" && "rounded-lg border bg-card",
        variant === "simple" && "divide-y-0",
      )}
    >
      {tasks.map((task) => (
        <TaskListItem
          key={task.id}
          task={task}
          areaName={getAreaName?.(task) ?? null}
          linkedAreaNames={getLinkedAreaNames?.(task) ?? []}
          linkedAreaIcons={getLinkedAreaIcons?.(task) ?? []}
          goalName={getGoalName?.(task) ?? null}
          linkedGoalNames={getLinkedGoalNames?.(task) ?? []}
          projectName={getProjectName?.(task) ?? null}
          linkedProjectNames={getLinkedProjectNames?.(task) ?? []}
          showSmartPriority={showSmartPriority}
          onCompletionToggle={onCompletionToggle}
          onFocusToggle={onFocusToggle}
          onNameSave={onNameSave}
          onEdit={onEdit}
          onArchiveToggle={onArchiveToggle}
          onPermanentDelete={onPermanentDelete}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify file compiles**

Run: `npx tsc --noEmit src/components/entities/task-list.tsx 2>&1 | head -20`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/entities/task-list.tsx
git commit -m "feat: create TaskList unified container with card/simple variants"

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
```

---

### Task 3: Migrate Dashboard page

**Files:**
- Modify: `src/app/(dashboard)/dashboard/dashboard-content.tsx`

- [ ] **Step 1: Update imports**

Replace:
```tsx
import { TaskListItem } from "@/components/entities/task-list-item";
import {
  getTaskLinkedAreaIds,
  getTaskLinkedGoalIds,
  getTaskLinkedProjectIds,
} from "@/lib/utils/tasks";
```

With:
```tsx
import { TaskList } from "@/components/entities/task-list";
import {
  getTaskLinkedAreaIds,
  getTaskLinkedAreaNames,
  getTaskLinkedAreaIcons,
  getTaskLinkedGoalNames,
  getTaskLinkedProjectNames,
} from "@/lib/utils/tasks";
```

`getTaskLinkedGoalIds` and `getTaskLinkedProjectIds` — check if still used elsewhere in the file. If not, drop them from the import.

- [ ] **Step 2: Replace the task section (lines ~444–491)**

**Replacement:**
```tsx
<TaskList
  tasks={todoInProgressTasks}
  variant="card"
  emptyTitle="No active tasks"
  emptyDescription="Tasks in To do and In progress will appear here."
  emptyIcon={NotebookPen}
  getAreaName={(task) => (task.area_id ? areaNamesMap.get(task.area_id) ?? null : null)}
  getLinkedAreaNames={(task) => getTaskLinkedAreaNames(task, areaNamesMap)}
  getLinkedAreaIcons={(task) => getTaskLinkedAreaIcons(task, areaIconsMap)}
  getLinkedGoalNames={(task) => getTaskLinkedGoalNames(task, goalNamesMap)}
  getProjectName={(task) => (task.project_id ? projectNamesMap.get(task.project_id) ?? null : null)}
  getLinkedProjectNames={(task) => getTaskLinkedProjectNames(task, projectNamesMap)}
  onCompletionToggle={(id, isCompleted) => {
    if (isCompleted) { completeTask.mutate(id); return; }
    updateTask.mutate({ id, input: { completed_at: null, is_completed: false } });
  }}
  onFocusToggle={(id, focused) => focusTask.mutate({ id, is_focused: focused })}
  onNameSave={(id, name) => updateTask.mutate({ id, input: { name } })}
  onEdit={(t) => { setEditingTask(t); setTaskDialogOpen(true); }}
  onArchiveToggle={(task) => archiveTask.mutate(task.id)}
  onPermanentDelete={(id) => permanentDelete.mutate(id)}
/>
```

Remove the old `<div className="rounded-lg border border-border">` + `map` + `TaskListItem` block entirely.

- [ ] **Step 3: Remove unused imports**

If `getTaskLinkedGoalIds` and `getTaskLinkedProjectIds` are no longer referenced in the file, remove them from the import.

- [ ] **Step 4: Run build to verify**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/dashboard-content.tsx
git commit -m "refactor: migrate Dashboard task list to unified TaskList component"

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
```

---

### Task 4: Migrate Tasks page

**Files:**
- Modify: `src/app/(dashboard)/tasks/tasks-content.tsx`

- [ ] **Step 1: Update imports**

Replace `import { TaskListItem } from "@/components/entities/task-list-item";` with:
```tsx
import { TaskList } from "@/components/entities/task-list";
```

Add to the `tasks` import:
```tsx
import {
  getTaskLinkedAreaIds,
  getTaskLinkedAreaNames,
  getTaskLinkedAreaIcons,
  getTaskLinkedGoalIds,
  getTaskLinkedGoalNames,
  getTaskLinkedProjectIds,
  getTaskLinkedProjectNames,
} from "@/lib/utils/tasks";
```

- [ ] **Step 2: Replace flat list sections (lines ~700–737 and ~838–860)**

Find the two `<div className="divide-y-0">` blocks containing `visibleTasks.map(task => <TaskListItem ... />)` and `archivedTasks.map(task => <TaskListItem ... />)`.

Replace each with:
```tsx
<TaskList
  tasks={visibleTasks}
  variant="simple"
  emptyTitle="No tasks here"
  emptyDescription={...}  // keep existing empty description logic
  getAreaName={(task) => (task.area_id ? areaMap.get(task.area_id)?.name ?? null : null)}
  getLinkedAreaNames={(task) => getTaskLinkedAreaNames(task, areaMap as Map<string, string>)}
  getLinkedAreaIcons={(task) => getTaskLinkedAreaIcons(task, areaIconsMap)}
  getLinkedGoalNames={(task) => getTaskLinkedGoalNames(task, goalMap as Map<string, string>)}
  getProjectName={(task) => (task.project_id ? projectMap.get(task.project_id)?.name ?? null : null)}
  getLinkedProjectNames={(task) => getTaskLinkedProjectNames(task, projectMap as Map<string, string>)}
  showSmartPriority={tab === TASK_VIEW.SMART_PRIORITY}
  onCompletionToggle={...}
  onFocusToggle={...}
  onNameSave={...}
  onEdit={...}
  onArchiveToggle={...}
  onPermanentDelete={...}
/>
```

Replace the archived section similarly with `tasks={archivedTasks}` and no `showSmartPriority`.

**Important:** The existing code passes `areaMap`, `goalMap`, `projectMap` as `Map<string, { name: string; icon?: string }>` etc. But the helpers accept `Map<string, string>` (just names). Either:
- Option A: Create `areaNamesMap` (names only) alongside existing maps
- Option B: Accept looser maps

Check existing maps in tasks-content.tsx:
```tsx
const areaMap = useMemo(() => new Map(areas.map((a) => [a.id, a])), [areas]);
```
This stores full area objects. We need a `areaNamesMap = new Map(areas.map((a) => [a.id, a.name]))` and `areaIconsMap = new Map(areas.map((a) => [a.id, a.icon ?? null]))`.

Add those alongside existing maps in the component body.

- [ ] **Step 3: Remove unused imports and the two `<div className="divide-y-0">` blocks**

The old `TaskListItem` import is no longer used in this file (only used indirectly via `TaskList`).

- [ ] **Step 4: Run build to verify**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/tasks/tasks-content.tsx
git commit -m "refactor: migrate Tasks page flat lists to TaskList component"

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
```

---

### Task 5: Migrate My Day page

**Files:**
- Modify: `src/app/(dashboard)/my-day/my-day-content.tsx`

- [ ] **Step 1: Update imports**

Replace `import { TaskListItem } from "@/components/entities/task-list-item";` with:
```tsx
import { TaskList } from "@/components/entities/task-list";
```

Add to tasks import:
```tsx
import {
  getTaskLinkedAreaIds,
  getTaskLinkedAreaNames,
  getTaskLinkedAreaIcons,
  getTaskLinkedGoalNames,
  getTaskLinkedProjectNames,
} from "@/lib/utils/tasks";
```

Remove the 3 `useCallback` functions `getLinkedAreaIcons`, `getLinkedGoalNames`, `getLinkedProjectNames` (lines ~164–184).

- [ ] **Step 2: Add areaIconsMap memo near the existing maps (line ~128–139)**

```tsx
const areaIconsMap = useMemo(
  () => new Map(allAreas?.map((a) => [a.id, a.icon ?? null]) ?? []),
  [allAreas],
);
```

- [ ] **Step 3: Replace Due Today section (lines ~258–286)**

Replace:
```tsx
<div className="mt-4 divide-y-0">
  {myDay.dueToday.map((task) => (
    <TaskListItem ... />
  ))}
</div>
```

With:
```tsx
<TaskList
  tasks={myDay.dueToday}
  variant="simple"
  getAreaName={(task) => (task.area_id ? areaMap.get(task.area_id)?.name ?? null : null)}
  getLinkedAreaNames={(task) => getTaskLinkedAreaNames(task, new Map(allAreas?.map((a) => [a.id, a.name]) ?? []))}
  getLinkedAreaIcons={(task) => getTaskLinkedAreaIcons(task, areaIconsMap)}
  getLinkedGoalNames={(task) => getTaskLinkedGoalNames(task, new Map(allGoals?.map((g) => [g.id, g.name]) ?? []))}
  getProjectName={(task) => (task.project_id ? projectMap.get(task.project_id)?.name ?? null : null)}
  getLinkedProjectNames={(task) => getTaskLinkedProjectNames(task, new Map(allProjects?.map((p) => [p.id, p.name]) ?? []))}
  onCompletionToggle={(id, isCompleted) => {
    if (isCompleted) { completeTask.mutate(id); } else { updateTask.mutate({ id, input: { completed_at: null, is_completed: false } }); }
  }}
  onFocusToggle={(id, focused) => focusTask.mutate({ id, is_focused: focused })}
  onNameSave={(id, name) => updateTask.mutate({ id, input: { name } })}
  onEdit={handleEdit}
  onArchiveToggle={handleArchiveToggle}
  onPermanentDelete={handlePermanentDelete}
/>
```

- [ ] **Step 4: Replace Focus section (lines ~304–329)**

Same replacement but with `tasks={myDay.focused}`.

- [ ] **Step 5: Remove unused `getLinkedAreaIcons`, `getLinkedGoalNames`, `getLinkedProjectNames`** callback definitions (lines 164–184).

- [ ] **Step 6: Run build to verify**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: no type errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/\(dashboard\)/my-day/my-day-content.tsx
git commit -m "refactor: migrate My Day task lists to TaskList component"

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
```

---

### Task 6: Migrate Area detail page

**Files:**
- Modify: `src/app/(dashboard)/areas/[id]/area-detail-content.tsx`

- [ ] **Step 1: Update imports**

Replace `import { TaskListItem } from "@/components/entities/task-list-item";` with:
```tsx
import { TaskList } from "@/components/entities/task-list";
```

Add to tasks import:
```tsx
import {
  getTaskLinkedAreaIds,
  getTaskLinkedAreaNames,
  getTaskLinkedAreaIcons,
  getTaskLinkedGoalNames,
  getTaskLinkedProjectNames,
} from "@/lib/utils/tasks";
```

- [ ] **Step 2: Remove the 4 `useCallback` getters** — `getLinkedAreaNames`, `getLinkedAreaIcons`, `getLinkedGoalNames`, `getLinkedProjectNames` (lines 691–719). These are only passed to `TasksByGroupView` and the flat `TaskListItem` loop.

- [ ] **Step 3: Replace the flat TaskListItem loop (lines ~1407–1428)**

Replace the `<div className="rounded-lg border bg-card">` + `map` + `TaskListItem` with:
```tsx
<TaskList
  tasks={filteredTasks}
  variant="card"
  getLinkedAreaNames={(task) => getTaskLinkedAreaNames(task, areaNamesById)}
  getLinkedAreaIcons={(task) => getTaskLinkedAreaIcons(task, areaIconsById)}
  getLinkedGoalNames={(task) => getTaskLinkedGoalNames(task, allGoalsById)}
  getLinkedProjectNames={(task) => getTaskLinkedProjectNames(task, projectsById)}
  onCompletionToggle={handleTaskCompletion}
  onFocusToggle={handleTaskFocus}
  onNameSave={handleTaskNameSave}
  onArchiveToggle={handleTaskArchiveToggle}
  onPermanentDelete={handlePermanentDelete}
  onEdit={(task) => { setEditingTask(task); setIsTaskEditOpen(true); }}
/>
```

- [ ] **Step 4: Update `TasksByGroupView` usage** to use the new shared helper names (if the getter callbacks were removed). The `getLinkedAreaNames` etc. passed to `TasksByGroupView` on lines 1401–1404 need to be replaced with the imported helpers:

```tsx
getLinkedAreaNames={getTaskLinkedAreaNames}
getLinkedAreaIcons={getTaskLinkedAreaIcons}
getLinkedGoalNames={getTaskLinkedGoalNames}
getLinkedProjectNames={getTaskLinkedProjectNames}
```

Wait — these are callback functions `(task) => string[]`, not helpers receiving maps. `TasksByGroupView` expects `(task: Task) => string[]` — it calls `getLinkedAreaNames(task)` internally.

Two options:
1. Keep the local `useCallback` wrappers that close over the maps
2. Pass arrow functions: `getLinkedAreaNames={(task) => getTaskLinkedAreaNames(task, areaNamesById)}`

Option 2 is cleaner and avoids stale closures. Replace the `TasksByGroupView` getter props:

```tsx
<TasksByGroupView
  ...
  getLinkedAreaNames={(task) => getTaskLinkedAreaNames(task, areaNamesById)}
  getLinkedAreaIcons={(task) => getTaskLinkedAreaIcons(task, areaIconsById)}
  getLinkedGoalNames={(task) => getTaskLinkedGoalNames(task, allGoalsById)}
  getLinkedProjectNames={(task) => getTaskLinkedProjectNames(task, projectsById)}
/>
```

- [ ] **Step 5: Run build to verify**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/areas/\[id\]/area-detail-content.tsx
git commit -m "refactor: migrate Area detail task list to TaskList component"

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
```

---

### Task 7: Migrate Goal detail page

**Files:**
- Modify: `src/app/(dashboard)/goals/[id]/goal-detail-content.tsx`

- [ ] **Step 1: Update imports**

Replace `import { TaskListItem } from "@/components/entities/task-list-item";` with:
```tsx
import { TaskList } from "@/components/entities/task-list";
```

Add to tasks import:
```tsx
import {
  getTaskLinkedAreaIds,
  getTaskLinkedAreaNames,
  getTaskLinkedAreaIcons,
  getTaskLinkedGoalNames,
  getTaskLinkedProjectNames,
} from "@/lib/utils/tasks";
```

- [ ] **Step 2: Remove the 4 `getTaskLinkedAreaNames`/`getTaskLinkedAreaIcons`/`getTaskLinkedGoalNames`/`getTaskLinkedProjectNames` local `useCallback` definitions (lines 816–841).**

- [ ] **Step 3: Replace the flat TaskListItem loop**

Find the `<div className="rounded-lg border bg-card">` block with the `TaskListItem` loop (around line 1570). Replace with:
```tsx
<TaskList
  tasks={filteredTasks}
  variant="card"
  getLinkedAreaNames={(task) => getTaskLinkedAreaNames(task, areaNames)}
  getLinkedAreaIcons={(task) => getTaskLinkedAreaIcons(task, areaIcons)}
  getLinkedGoalNames={(task) => getTaskLinkedGoalNames(task, goalNamesMap)}
  getProjectName={(task) => task.project_id ? projectNamesMap.get(task.project_id) ?? null : null}
  getLinkedProjectNames={(task) => getTaskLinkedProjectNames(task, projectNamesMap)}
  onCompletionToggle={handleTaskCompletion}
  onFocusToggle={handleTaskFocus}
  onNameSave={handleTaskNameSave}
  onEdit={(task) => { setEditingTask(task); setIsTaskEditOpen(true); }}
  onArchiveToggle={handleTaskArchiveToggle}
  onPermanentDelete={handlePermanentDelete}
/>
```

- [ ] **Step 4: Update `TasksByGroupView` getter props**

Replace the 4 `getTaskLinkedAreaNames`/`getTaskLinkedAreaIcons`/`getTaskLinkedGoalNames`/`getTaskLinkedProjectNames` refs on `TasksByGroupView` (lines 1539–1542, 1563–1566) with arrow functions:

```tsx
getLinkedAreaNames={(task) => getTaskLinkedAreaNames(task, areaNames)}
getLinkedAreaIcons={(task) => getTaskLinkedAreaIcons(task, areaIcons)}
getLinkedGoalNames={(task) => getTaskLinkedGoalNames(task, goalNamesMap)}
getLinkedProjectNames={(task) => getTaskLinkedProjectNames(task, projectNamesMap)}
```

- [ ] **Step 5: Run build to verify**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/goals/\[id\]/goal-detail-content.tsx
git commit -m "refactor: migrate Goal detail task list to TaskList component"

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
```

---

### Task 8: Migrate Project detail page

**Files:**
- Modify: `src/app/(dashboard)/projects/[id]/project-detail-content.tsx`

- [ ] **Step 1: Update imports**

Replace `import { TaskListItem } from "@/components/entities/task-list-item";` with:
```tsx
import { TaskList } from "@/components/entities/task-list";
```

Add to tasks import:
```tsx
import {
  getTaskLinkedAreaIds,
  getTaskLinkedAreaNames,
  getTaskLinkedAreaIcons,
  getTaskLinkedGoalNames,
  getTaskLinkedProjectNames,
} from "@/lib/utils/tasks";
```

- [ ] **Step 2: Remove the 4 `getTaskLinkedAreaNames`/`getTaskLinkedAreaIcons`/`getTaskLinkedGoalNames`/`getTaskLinkedProjectNames` local `useCallback` definitions (lines 568–595).**

- [ ] **Step 3: Replace the flat TaskListItem loop**

Find the `<div className="rounded-lg border bg-card">` block with the `TaskListItem` loop (around line 1510). Replace with:
```tsx
<TaskList
  tasks={filteredTasks}
  variant="card"
  getLinkedAreaNames={(task) => getTaskLinkedAreaNames(task, areaNamesMap)}
  getLinkedAreaIcons={(task) => getTaskLinkedAreaIcons(task, areaIconsMap)}
  getLinkedGoalNames={(task) => getTaskLinkedGoalNames(task, goalNamesMap)}
  getLinkedProjectNames={(task) => getTaskLinkedProjectNames(task, projectNamesMap)}
  onCompletionToggle={handleTaskCompletion}
  onFocusToggle={handleTaskFocus}
  onNameSave={handleTaskNameSave}
  onEdit={(task) => { setEditingTask(task); setIsTaskEditOpen(true); }}
  onArchiveToggle={handleTaskArchiveToggle}
  onPermanentDelete={handlePermanentDelete}
/>
```

- [ ] **Step 4: Update `TasksByGroupView` getter props**

Replace the 4 getter refs on `TasksByGroupView` (lines 1482–1485, 1505–1508) with arrow functions:

```tsx
getLinkedAreaNames={(task) => getTaskLinkedAreaNames(task, areaNamesMap)}
getLinkedAreaIcons={(task) => getTaskLinkedAreaIcons(task, areaIconsMap)}
getLinkedGoalNames={(task) => getTaskLinkedGoalNames(task, goalNamesMap)}
getLinkedProjectNames={(task) => getTaskLinkedProjectNames(task, projectNamesMap)}
```

- [ ] **Step 5: Run build to verify**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/projects/\[id\]/project-detail-content.tsx
git commit -m "refactor: migrate Project detail task list to TaskList component"

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
```

---

### Task 9: Migrate Contact detail page task sections

**Files:**
- Modify: `src/components/entities/contact-detail-relationship-sections.tsx`

- [ ] **Step 1: Update imports**

Replace `import { TaskListItem } from "@/components/entities/task-list-item";` with:
```tsx
import { TaskList } from "@/components/entities/task-list";
```

Add:
```tsx
import {
  getTaskLinkedAreaIds,
  getTaskLinkedAreaNames,
  getTaskLinkedAreaIcons,
  getTaskLinkedGoalNames,
  getTaskLinkedProjectNames,
} from "@/lib/utils/tasks";
```

- [ ] **Step 2: Remove 4 `getLinked*ForTask` `useCallback` definitions (lines 291–316)**

- [ ] **Step 3: Replace flat TaskListItem loop**

Replace the `<div className="rounded-lg border bg-card">` block containing `TaskListItem` (around the contact-detail task section) with `TaskList`:

```tsx
<TaskList
  tasks={filteredTasks}
  variant="card"
  getLinkedAreaNames={(task) => getTaskLinkedAreaNames(task, new Map(allAreas.map((a) => [a.id, a.name])))}
  getLinkedAreaIcons={(task) => getTaskLinkedAreaIcons(task, new Map(allAreas.map((a) => [a.id, a.icon ?? null])))}
  getLinkedGoalNames={(task) => getTaskLinkedGoalNames(task, new Map(allGoals.map((g) => [g.id, g.name])))}
  getLinkedProjectNames={(task) => getTaskLinkedProjectNames(task, new Map(allProjects.map((p) => [p.id, p.name])))}
  onCompletionToggle={...}
  onFocusToggle={...}
  onNameSave={...}
  onEdit={...}
  onArchiveToggle={...}
  onPermanentDelete={...}
/>
```

Preserve the existing handlers from the surrounding code.

- [ ] **Step 4: Run build to verify**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/entities/contact-detail-relationship-sections.tsx
git commit -m "refactor: migrate Contact detail task list to TaskList component"

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
```

---

### Task 10: Delete `TodayTasksList` and update its consumer

**Files:**
- Delete: `src/components/dashboard/today-tasks-list.tsx`
- Modify: `src/app/(dashboard)/dashboard/dashboard-content.tsx`

- [ ] **Step 1: Remove the import of `TodayTasksList` from `dashboard-content.tsx`**

Find and remove:
```tsx
import { TodayTasksList } from "@/components/dashboard/today-tasks-list";
```

- [ ] **Step 2: Replace the `<TodayTasksList tasks={data.todayTasks} />` usage in the Dashboard**

Search for `<TodayTasksList` and replace with:
```tsx
<TaskList
  tasks={data.todayTasks.map((t) => ({
    id: t.id,
    name: t.title,
    description: t.description,
    due_date: t.dueDate,
    priority: t.priority as "low" | "medium" | "high",
    status: t.status as "completed" | "inbox" | "todo" | "in_progress" | "archived",
    is_completed: false,
    is_focused: false,
    completed_at: null,
    created_at: "",
    updated_at: "",
    user_id: "",
    project_id: t.projectId,
    area_id: t.areaId,
    is_important: false,
    is_urgent: false,
    smart_priority: 0,
    is_archived: false,
  } satisfies Task))}
  variant="simple"
  getAreaName={(task) => task.area_id ? areaNamesMap.get(task.area_id) ?? null : null}
  getLinkedAreaNames={(task) => getTaskLinkedAreaNames(task, areaNamesMap)}
  getLinkedAreaIcons={(task) => getTaskLinkedAreaIcons(task, areaIconsMap)}
  getProjectName={(task) => task.project_id ? projectNamesMap.get(task.project_id) ?? null : null}
  onCompletionToggle={(id) => completeTask.mutate(id)}
  onFocusToggle={(id, isFocused) => focusTask.mutate({ id, is_focused: isFocused })}
  onNameSave={(id, name) => updateTask.mutate({ id, input: { name } })}
/>
```

**Note:** This mapping was already done in `TodayTasksList` — we're keeping the mapping logic but inlining it. The mapping from `TodayData["todayTasks"][0]` to `Task` is required because the two types differ. If `todayTasks` data includes linked area IDs, add those to the mapped object.

- [ ] **Step 3: Delete `src/components/dashboard/today-tasks-list.tsx`**

- [ ] **Step 4: Run build to verify**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: no type errors.

- [ ] **Step 5: Commit**

```bash
git rm src/components/dashboard/today-tasks-list.tsx
git add src/app/\(dashboard\)/dashboard/dashboard-content.tsx
git commit -m "refactor: remove TodayTasksList, use TaskList directly in Dashboard"

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
```

---

### Task 11: Refit `TasksByGroupView` internals to use `TaskList`

**Files:**
- Modify: `src/components/views/tasks-by-group-view.tsx`

- [ ] **Step 1: Update imports**

Replace `import { TaskListItem } from "@/components/entities/task-list-item";` with:
```tsx
import { TaskList } from "@/components/entities/task-list";
```

- [ ] **Step 2: Replace group render**

In `CollapsibleTaskGroup`, replace the `<div className="rounded-lg border divide-y">` block (lines 101–129) with:

```tsx
{isOpen && (
  <TaskList
    tasks={group.tasks}
    variant="card"
    getAreaName={(task) => task.area_id ? areaMap.get(task.area_id)?.name ?? null : null}
    getLinkedAreaNames={getLinkedAreaNames}
    getLinkedAreaIcons={getLinkedAreaIcons}
    getLinkedGoalNames={getLinkedGoalNames}
    getProjectName={(task) => task.project_id ? projectMap.get(task.project_id)?.name ?? null : null}
    getLinkedProjectNames={getLinkedProjectNames}
    onCompletionToggle={onCompletionToggle}
    onFocusToggle={onFocusToggle}
    onNameSave={onNameSave}
    onEdit={onEdit}
    onArchiveToggle={onArchiveToggle}
    onPermanentDelete={onPermanentDelete}
  />
)}
```

Keep the "New task" button outside `TaskList` (it's between the list and the group header): wrap `TaskList` and the new-task button in a fragment. Actually, looking at the original: the new-task button is inside the `</div>` that wraps the task list. With `TaskList` we lose the outer div. So:

```tsx
{isOpen && (
  <>
    <TaskList ... tasks={group.tasks} variant="card" ... />
    {group.groupId !== "unassigned" && (
      <button onClick={() => onNewTask(group.groupId)}
        className="flex w-full items-center gap-2 rounded-b-lg border border-t-0 bg-card px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      >
        <Plus className="size-4" /> New task
      </button>
    )}
  </>
)}
```

The new-task button needs `rounded-b-lg border border-t-0 bg-card` to visually blend with the TaskList's `rounded-lg border bg-card`.

- [ ] **Step 3: Remove `TaskListItemProps` import** from the old import — no longer directly used.

- [ ] **Step 4: Run build to verify**

Run: `npx tsc --noEmit 2>&1 | head -30`
Expected: no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/views/tasks-by-group-view.tsx
git commit -m "refactor: TasksByGroupView uses TaskList internally for consistent group rendering"

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
```

---

### Task 12: Final verification

- [ ] **Step 1: Full type check**

Run: `npx tsc --noEmit 2>&1`
Expected: no errors (zero lines output).

- [ ] **Step 2: Quick visual check of task row rendering on key pages**

Start the dev server: `npx next dev -p 3030` (or existing server). Visit:
- `/dashboard` — active tasks section should appear with same styling
- `/tasks` — flat task list, grouped tab views
- `/my-day` — today and focus sections
- `/areas/[id]` — tasks section
- `/goals/[id]` — tasks section
- `/projects/[id]` — tasks section

Verify: row styling (padding, hover, border-b) is identical to before. Empty states render.

- [ ] **Step 3: Final commit with any fixes**

```bash
git commit -m "chore: final verification and cleanup for TaskList unification"

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>
```

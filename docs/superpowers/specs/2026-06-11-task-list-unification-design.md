# Design: Unify Task Row + Task List Across All Pages

## 1. Problem

`TaskListItem` (at `src/components/entities/task-list-item.tsx`) is already the shared row component. However:

1. **Wrapping containers diverge** — each page wraps tasks in different containers:
   - `divide-y-0` (Tasks page, My Day)
   - `rounded-lg border border-border` (Dashboard)
   - `rounded-lg border bg-card` (Area/Goal/Project detail pages)
   - `space-y-2` (TodayTasksList on Dashboard, but `TodayTasksList` is an entirely separate wrapper)

2. **Data plumbing duplicated ~6×** — `getLinkedAreaNames`, `getLinkedAreaIcons`, `getLinkedGoalNames`, `getLinkedProjectNames` inline helpers redefined per page with identical patterns.

3. **`TodayTasksList` is an outlier** — creates fake `Task` objects from `TodayData`, reinvents sorting, and duplicates the row-rendering loop. Should be replaced with the unified list.

4. **Empty states** — some pages inline them, some use `EmptyState` component, some rely on `TasksByGroupView`.

## 2. Proposed Components

### 2A. `TaskList` — unified list container

New file: `src/components/entities/task-list.tsx`

```
┌─────────────────────────────────┐
│  TaskList [variant="card"]      │
│  ┌───────────────────────────┐  │
│  │ <TaskListItem ... />      │  │  border-b
│  │ <TaskListItem ... />      │  │  border-b
│  │ <TaskListItem ... />      │  │  border-b
│  └───────────────────────────┘  │
│  [empty state if isEmpty]       │  rounded-lg border bg-card
└─────────────────────────────────┘
```

**Props:**
```ts
interface TaskListProps {
  tasks: Task[];
  renderActions?: (task: Task) => React.ReactNode;
  variant?: "card" | "simple";         // card=rounded-lg+border+bg-card, simple=divide-y-0
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: LucideIcon;
}
```

**Variants:**
- `"card"` — `rounded-lg border bg-card` (used in detail pages, dashboard)
- `"simple"` — `divide-y-0` (used in Tasks page, My Day) with no outer border

**Behavior:**
- Empty: renders `EmptyState` via the `emptyTitle`/`emptyDescription`/`emptyIcon` props
- Tasks present: renders each task with `TaskListItem`, passing down shared callbacks
- Responsive: renders the border consistently across all pages

**Does NOT handle:**
- Sorting (caller sorts before passing)
- Grouping (handled by `TasksByGroupView`)
- Task actions/editing (handled by caller, passed through callbacks)

### 2B. Shared data helpers

Add to `src/lib/utils/tasks.ts`:
```ts
export function getTaskLinkedAreaNames(task: Task, areaMap: Map<string, { name: string; icon?: string | null }>): string[]
export function getTaskLinkedAreaIcons(task: Task, areaMap: Map<string, { name: string; icon?: string | null }>): (string | null)[]
export function getTaskLinkedGoalNames(task: Task, goalMap: Map<string, { name: string }>): string[]
export function getTaskLinkedProjectNames(task: Task, projectMap: Map<string, { name: string }>): string[]
```

Each follows the same pattern: `getTaskLinkedAreaIds(task).map(id => map.get(id)?.name).filter(Boolean)`.

### 2C. Eliminate `TodayTasksList`

Replace `src/components/dashboard/today-tasks-list.tsx` with direct usage of `TaskList` + `TaskListItem` in `dashboard-content.tsx`. Sorting moves into the dashboard page or a shared utility.

### 2D. `TasksByGroupView` — internal refit

`TasksByGroupView` itself stays as-is (it already handles grouping consistently). But its internal task-rendering loop (`<div className="rounded-lg border divide-y">` inside `CollapsibleTaskGroup`) can use `TaskList variant="card"` for consistency, and its data plumbing helpers (`getLinkedAreaNames`, `getTaskLinkedAreaIds` maps) can use the new shared helpers.

## 3. Migration per page

### 3A. Dashboard (`dashboard-content.tsx`)

**Before:**
```tsx
<div className="rounded-lg border border-border">
  {todoInProgressTasks.map(task => (
    <TaskListItem
      task={task}
      areaName={...} linkedAreaNames={...} linkedAreaIcons={...}
      linkedGoalNames={...} projectName={...} linkedProjectNames={...}
      onCompletionToggle={...} onFocusToggle={...} onNameSave={...}
      onEdit={...} onArchiveToggle={...} onPermanentDelete={...}
    />
  ))}
</div>
```

**After:**
```tsx
<TaskList
  tasks={todoInProgressTasks}
  variant="card"
  emptyTitle="No active tasks"
  emptyDescription="Tasks in To do and In progress will appear here."
  emptyIcon={NotebookPen}
/>
```
with shared helpers producing the name/icon arrays.

### 3B. Tasks page (`tasks-content.tsx`)

**Before:** `visibleTasks.map(task => <TaskListItem ... />)` inside `<div className="divide-y-0">`

**After:** `<TaskList tasks={visibleTasks} variant="simple" ... />`

### 3C. My Day (`my-day-content.tsx`)

**Before:** `myDay.dueToday.map(task => <TaskListItem ... />)` inside `<div className="mt-4 divide-y-0">`

**After:** `<TaskList tasks={myDay.dueToday} variant="simple" ... />`

Same for `myDay.focused`.

### 3D. Area / Goal / Project detail pages

**Before:** `<div className="rounded-lg border bg-card">{filteredTasks.map(task => <TaskListItem ... />)}</div>`

**After:** `<TaskList tasks={filteredTasks} variant="card" ... />`

## 4. `TaskListItem` — no changes

The row component stays exactly the same. It's already correct and used everywhere. The changes are:

- **Callers** pass simpler props (shared helpers reduce inline plumbing)
- **Callers** stop wrapping in ad-hoc containers

## 5. Plan

1. Write shared helpers in `src/lib/utils/tasks.ts` (`getTaskLinkedAreaNames`, etc.)
2. Create `TaskList` component with `variant` prop and empty state
3. Migrate each consumer (Tasks page, My Day, Dashboard, Area detail, Goal detail, Project detail)
4. Remove `TodayTasksList`
5. Clean up `TasksByGroupView` internals to use `TaskList` for the group render
6. Verify no visual regressions

## 6. Files changed

| File | Change |
|------|--------|
| `src/lib/utils/tasks.ts` | +4 shared helper functions |
| `src/components/entities/task-list.tsx` | **New** — unified list container |
| `src/components/dashboard/today-tasks-list.tsx` | **Delete** — replaced by inline TaskList |
| `src/app/(dashboard)/dashboard/dashboard-content.tsx` | Use TaskList, use shared helpers |
| `src/app/(dashboard)/tasks/tasks-content.tsx` | Use TaskList, use shared helpers |
| `src/app/(dashboard)/my-day/my-day-content.tsx` | Use TaskList, use shared helpers |
| `src/app/(dashboard)/areas/[id]/area-detail-content.tsx` | Use TaskList (for flat list), use shared helpers |
| `src/app/(dashboard)/goals/[id]/goal-detail-content.tsx` | Same |
| `src/app/(dashboard)/projects/[id]/project-detail-content.tsx` | Same |
| `src/components/views/tasks-by-group-view.tsx` | Refit internals to use TaskList + shared helpers |

Knowledge hub and Topic detail pages do NOT render task rows — they only show task names in note/resource badges. No change needed.

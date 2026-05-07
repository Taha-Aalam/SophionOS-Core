# Notes Metadata Panel — Bug Fixes & Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix scroll, convert project to multi-select, add cross-field cascading filtering, and add optimistic state to the notes metadata panel on both the new-note and detail pages.

**Architecture:** All changes are client-side React/TypeScript. One service-layer addition (`hydrateProjectGoalLinks` in project.service.ts) populates `Project.linkedGoalIds` so the cross-filtering memos have the data they need. `NoteMetadataPanel` gains four `useMemo` filtered lists and a new `ProjectSelector` component. The detail page (`[id]/page.tsx`) gains local optimistic state for all four relationship fields.

**Tech Stack:** Next.js 15, React, TypeScript, TanStack Query, shadcn/ui (Popover + Command + Checkbox), cmdk

---

## File Map

| File | Change |
|---|---|
| `src/lib/services/project.service.ts` | Add `hydrateProjectGoalLinks`; chain into every call site that currently calls `hydrateProjectAreaLinks` |
| `src/components/entities/note-task-selector.tsx` | Remove `ScrollArea` wrapper; fix `CommandList` scroll |
| `src/components/entities/note-metadata-panel.tsx` | Scroll + search fix for `AreaSelector` / `GoalSelector`; new `ProjectSelector`; prop rename; four cross-filtering memos |
| `src/app/(dashboard)/notes/new/page.tsx` | `projectId → projectIds` state; updated save payload and panel props |
| `src/app/(dashboard)/notes/[id]/page.tsx` | Add `localAreaIds / localGoalIds / localProjectIds / localTaskIds` optimistic state; updated panel props |

---

## Task 1 — Fix scroll in NoteTaskSelector

**Files:**
- Modify: `src/components/entities/note-task-selector.tsx`

### What to change

Remove the `ScrollArea` wrapper (and its import) from inside `CommandGroup`. Apply scroll directly to `CommandList` with Tailwind classes. This is the idiomatic shadcn/cmdk pattern; Radix `ScrollArea` requires a fixed `h-` (not just `max-h-`) on its outer container to activate — `CommandList` with `overflow-y-auto` does not have that limitation.

- [ ] **Step 1: Edit `note-task-selector.tsx`**

Remove the `ScrollArea` import line and replace the `CommandList` / `CommandGroup` / `ScrollArea` nesting.

Find this block (lines 87–107):
```tsx
            <CommandList>
              <CommandEmpty>No tasks found.</CommandEmpty>
              <CommandGroup>
                <ScrollArea className="max-h-56">
                  {filtered.map((task) => (
                    <CommandItem
                      key={task.id}
                      value={task.id}
                      onSelect={() => toggle(task.id)}
                      className="flex items-center gap-2"
                    >
                      <Checkbox checked={selectedSet.has(task.id)} />
                      <span className="flex-1 truncate text-sm">{task.name}</span>
                      {selectedSet.has(task.id) && <Check className="size-3.5" />}
                    </CommandItem>
                  ))}
                </ScrollArea>
              </CommandGroup>
            </CommandList>
```

Replace with:
```tsx
            <CommandList className="max-h-56 overflow-y-auto">
              <CommandEmpty>No tasks found.</CommandEmpty>
              <CommandGroup>
                {filtered.map((task) => (
                  <CommandItem
                    key={task.id}
                    value={task.id}
                    onSelect={() => toggle(task.id)}
                    className="flex items-center gap-2"
                  >
                    <Checkbox checked={selectedSet.has(task.id)} />
                    <span className="flex-1 truncate text-sm">{task.name}</span>
                    {selectedSet.has(task.id) && <Check className="size-3.5" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
```

Also remove the `ScrollArea` import at the top of the file:
```tsx
import { ScrollArea } from "@/components/ui/scroll-area";
```

- [ ] **Step 2: Verify TypeScript compiles**

```powershell
npx tsc --noEmit
```

Expected: no new errors related to `note-task-selector.tsx`.

- [ ] **Step 3: Commit**

```powershell
git add src/components/entities/note-task-selector.tsx
git commit -m "fix: remove ScrollArea from NoteTaskSelector, use CommandList scroll"
```

---

## Task 2 — Add `linkedGoalIds` hydration to project service

**Files:**
- Modify: `src/lib/services/project.service.ts`

### What to change

Add `hydrateProjectGoalLinks` (queries `goal_projects` for `project_id → goal_id` rows and sets `Project.linkedGoalIds`). Create a `hydrateProjectRelations` wrapper that chains area + goal hydration. Replace all 8 existing call sites of `hydrateProjectAreaLinks` / `hydrateSingleProjectAreaLinks` with the two new wrappers.

- [ ] **Step 1: Add the two new functions after `hydrateSingleProjectAreaLinks` (line ~176)**

Insert after `hydrateSingleProjectAreaLinks`:
```typescript
async function hydrateProjectGoalLinks(projects: Project[]): Promise<Project[]> {
  if (projects.length === 0) return projects;

  const projectIds = projects.map((p) => p.id);

  try {
    const result = await createClient()
      .from("goal_projects")
      .select("project_id, goal_id")
      .in("project_id", projectIds);

    if (result.error) {
      if (result.error.code === "42P01") {
        return projects.map((p) => ({ ...p, linkedGoalIds: [] }));
      }
      throw new DatabaseError(result.error.message);
    }

    const goalIdsByProjectId = new Map<string, string[]>();
    for (const row of result.data ?? []) {
      const current = goalIdsByProjectId.get(row.project_id) ?? [];
      current.push(row.goal_id);
      goalIdsByProjectId.set(row.project_id, current);
    }

    return projects.map((p) => ({
      ...p,
      linkedGoalIds: goalIdsByProjectId.get(p.id) ?? [],
    }));
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "42P01"
    ) {
      return projects.map((p) => ({ ...p, linkedGoalIds: [] }));
    }
    throw error;
  }
}

async function hydrateProjectRelations(projects: Project[]): Promise<Project[]> {
  const withAreas = await hydrateProjectAreaLinks(projects);
  return hydrateProjectGoalLinks(withAreas);
}

async function hydrateSingleProjectRelations(project: Project): Promise<Project> {
  const [hydrated] = await hydrateProjectRelations([project]);
  return hydrated;
}
```

- [ ] **Step 2: Replace all `hydrateProjectAreaLinks` call sites**

There are 4 list-level call sites. Each returns `Project[]`.

Replace:
```typescript
    return hydrateProjectAreaLinks(projects);
```
With:
```typescript
    return hydrateProjectRelations(projects);
```

This appears in:
- `list()` method (line ~307)
- `listByStatus()` method (line ~510)
- `listByArea()` method (line ~524)
- any other list methods

- [ ] **Step 3: Replace all `hydrateSingleProjectAreaLinks` call sites**

There are 4 single-project call sites. Replace:
```typescript
    return hydrateSingleProjectAreaLinks(project);
```
With:
```typescript
    return hydrateSingleProjectRelations(project);
```

This appears in:
- `getById()` method
- `getBySlug()` method (2 occurrences)
- `create()` method
- `update()` method
- `archive()` method

- [ ] **Step 4: Verify TypeScript compiles**

```powershell
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/services/project.service.ts
git commit -m "feat: hydrate Project.linkedGoalIds from goal_projects table"
```

---

## Task 3 — Rewrite NoteMetadataPanel

**Files:**
- Modify: `src/components/entities/note-metadata-panel.tsx`

### What to change

1. Fix scroll + add `shouldFilter={false}` + manual search state to `AreaSelector` and `GoalSelector`.
2. Add `ProjectSelector` (same multi-select combobox pattern).
3. Change prop `projectId: string | null` → `projectIds: string[]` and `onProjectIdChange` → `onProjectIdsChange`.
4. Add four cross-filtering `useMemo` hooks.
5. Replace static `activeAreas` / `activeGoals` / `activeProjects` / `tasks` passed to selectors with the filtered variants.

- [ ] **Step 1: Update the props interface**

Find the interface `NoteMetadataPanelProps` and change:
```typescript
  projectId: string | null;
  // ...
  onProjectIdChange: (projectId: string | null) => void;
```
To:
```typescript
  projectIds: string[];
  // ...
  onProjectIdsChange: (projectIds: string[]) => void;
```

Also update the destructured parameters in the function signature:
```typescript
export function NoteMetadataPanel({
  // ...
  projectIds,       // was: projectId
  // ...
  onProjectIdsChange,  // was: onProjectIdChange
  // ...
}: NoteMetadataPanelProps) {
```

- [ ] **Step 2: Add `toggleProject` and `selectedProjectLabels` alongside the existing `toggleArea` / `toggleGoal`**

Add after `toggleGoal`:
```typescript
  const toggleProject = (projectId: string) => {
    onProjectIdsChange(
      projectIds.includes(projectId)
        ? projectIds.filter((id) => id !== projectId)
        : [...projectIds, projectId],
    );
  };

  const selectedProjectLabels = useMemo(
    () =>
      projectIds
        .map((id) => activeProjects.find((p) => p.id === id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p)),
    [projectIds, activeProjects],
  );
```

- [ ] **Step 3: Add the four cross-filtering memos**

Add after the `selectedGoalLabels` memo:
```typescript
  const filteredAreas = useMemo(() => {
    const hasConstraints = goalIds.length > 0 || projectIds.length > 0 || taskIds.length > 0;
    if (!hasConstraints) return activeAreas;
    const allowed = new Set<string>();
    for (const gId of goalIds) {
      const goal = goals.find((g) => g.id === gId);
      for (const aId of goal?.linkedAreaIds ?? []) allowed.add(aId);
    }
    for (const pId of projectIds) {
      const proj = activeProjects.find((p) => p.id === pId);
      for (const aId of proj?.linkedAreaIds ?? []) allowed.add(aId);
    }
    for (const tId of taskIds) {
      const task = tasks.find((t) => t.id === tId);
      if (task?.project_id) {
        const proj = activeProjects.find((p) => p.id === task.project_id);
        for (const aId of proj?.linkedAreaIds ?? []) allowed.add(aId);
      }
    }
    return activeAreas.filter((a) => allowed.has(a.id));
  }, [activeAreas, goalIds, projectIds, taskIds, goals, activeProjects, tasks]);

  const filteredGoals = useMemo(() => {
    const hasConstraints = areaIds.length > 0 || projectIds.length > 0 || taskIds.length > 0;
    if (!hasConstraints) return activeGoals;
    const allowed = new Set<string>();
    for (const aId of areaIds) {
      for (const g of activeGoals) {
        if (g.linkedAreaIds?.includes(aId)) allowed.add(g.id);
      }
    }
    for (const pId of projectIds) {
      const proj = activeProjects.find((p) => p.id === pId);
      for (const gId of proj?.linkedGoalIds ?? []) allowed.add(gId);
    }
    for (const tId of taskIds) {
      const task = tasks.find((t) => t.id === tId);
      if (task?.project_id) {
        const proj = activeProjects.find((p) => p.id === task.project_id);
        for (const gId of proj?.linkedGoalIds ?? []) allowed.add(gId);
      }
    }
    return activeGoals.filter((g) => allowed.has(g.id));
  }, [activeGoals, areaIds, projectIds, taskIds, activeProjects, tasks]);

  const filteredProjects = useMemo(() => {
    const hasConstraints = areaIds.length > 0 || goalIds.length > 0 || taskIds.length > 0;
    if (!hasConstraints) return activeProjects;
    const allowed = new Set<string>();
    for (const aId of areaIds) {
      for (const p of activeProjects) {
        if (p.linkedAreaIds?.includes(aId)) allowed.add(p.id);
      }
    }
    for (const gId of goalIds) {
      for (const p of activeProjects) {
        if (p.linkedGoalIds?.includes(gId)) allowed.add(p.id);
      }
    }
    for (const tId of taskIds) {
      const task = tasks.find((t) => t.id === tId);
      if (task?.project_id) allowed.add(task.project_id);
    }
    return activeProjects.filter((p) => allowed.has(p.id));
  }, [activeProjects, areaIds, goalIds, taskIds, tasks]);

  const filteredTasks = useMemo(() => {
    const hasConstraints = areaIds.length > 0 || goalIds.length > 0 || projectIds.length > 0;
    if (!hasConstraints) return tasks;
    const allowedProjectIds = new Set<string>(projectIds);
    for (const aId of areaIds) {
      for (const p of activeProjects) {
        if (p.linkedAreaIds?.includes(aId)) allowedProjectIds.add(p.id);
      }
    }
    for (const gId of goalIds) {
      for (const p of activeProjects) {
        if (p.linkedGoalIds?.includes(gId)) allowedProjectIds.add(p.id);
      }
    }
    return tasks.filter((t) => t.project_id !== null && allowedProjectIds.has(t.project_id!));
  }, [tasks, areaIds, goalIds, projectIds, activeProjects]);
```

- [ ] **Step 4: Replace the `<Select>` project field in JSX with `<ProjectSelector>`**

Find the project `<div className="space-y-1.5">` block (the one with `<Select value={projectId ?? "none"} ...>`) and replace the entire block with:
```tsx
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Projects</Label>
        <ProjectSelector
          projects={filteredProjects}
          selectedIds={projectIds}
          onToggle={toggleProject}
          disabled={disabled}
        />
        {selectedProjectLabels.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {selectedProjectLabels.map((project) => (
              <Badge key={project.id} variant="secondary" className="flex items-center gap-1">
                <span className="max-w-[120px] truncate">{project.name}</span>
                <button
                  type="button"
                  onClick={() => toggleProject(project.id)}
                  className="rounded-full p-0.5 hover:bg-muted"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
```

- [ ] **Step 5: Pass filtered lists to existing selectors in JSX**

In the `<AreaSelector>` usage, change `areas={activeAreas}` → `areas={filteredAreas}`.
In the `<GoalSelector>` usage, change `goals={activeGoals}` → `goals={filteredGoals}`.
In the `<NoteTaskSelector>` usage, change `tasks={tasks}` → `tasks={filteredTasks}`.

- [ ] **Step 6: Rewrite `AreaSelector` (at bottom of file)**

Replace the entire `AreaSelector` function with:
```tsx
function AreaSelector({
  areas,
  selectedIds,
  onToggle,
  disabled,
}: {
  areas: Area[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(() => {
    if (!query.trim()) return areas;
    return areas.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()));
  }, [areas, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between text-sm font-normal"
          disabled={disabled}
        >
          <span className="truncate">
            {selectedIds.length === 0 ? "Select areas..." : `${selectedIds.length} selected`}
          </span>
          <ChevronDown className="ml-2 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search areas..." value={query} onValueChange={setQuery} />
          <CommandList className="max-h-56 overflow-y-auto">
            <CommandEmpty>No areas found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((area) => (
                <CommandItem
                  key={area.id}
                  value={area.id}
                  onSelect={() => onToggle(area.id)}
                  className="flex items-center gap-2"
                >
                  <Checkbox checked={selectedSet.has(area.id)} />
                  <span className="text-sm">
                    {area.icon ? `${area.icon} ` : ""}
                    {area.name}
                  </span>
                  {selectedSet.has(area.id) && <Check className="ml-auto size-3.5" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 7: Rewrite `GoalSelector` (at bottom of file)**

Replace the entire `GoalSelector` function with:
```tsx
function GoalSelector({
  goals,
  selectedIds,
  onToggle,
  disabled,
}: {
  goals: Goal[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(() => {
    if (!query.trim()) return goals;
    return goals.filter((g) => g.name.toLowerCase().includes(query.toLowerCase()));
  }, [goals, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between text-sm font-normal"
          disabled={disabled}
        >
          <span className="truncate">
            {selectedIds.length === 0 ? "Select goals..." : `${selectedIds.length} selected`}
          </span>
          <ChevronDown className="ml-2 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search goals..." value={query} onValueChange={setQuery} />
          <CommandList className="max-h-56 overflow-y-auto">
            <CommandEmpty>No goals found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((goal) => (
                <CommandItem
                  key={goal.id}
                  value={goal.id}
                  onSelect={() => onToggle(goal.id)}
                  className="flex items-center gap-2"
                >
                  <Checkbox checked={selectedSet.has(goal.id)} />
                  <span className="flex-1 truncate text-sm">{goal.name}</span>
                  <Badge variant="outline" className="text-[10px] uppercase">
                    {goal.term}
                  </Badge>
                  {selectedSet.has(goal.id) && <Check className="size-3.5" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 8: Add `ProjectSelector` at bottom of file**

Add after `GoalSelector`:
```tsx
function ProjectSelector({
  projects,
  selectedIds,
  onToggle,
  disabled,
}: {
  projects: Project[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(() => {
    if (!query.trim()) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()));
  }, [projects, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between text-sm font-normal"
          disabled={disabled}
        >
          <span className="truncate">
            {selectedIds.length === 0 ? "Select projects..." : `${selectedIds.length} selected`}
          </span>
          <ChevronDown className="ml-2 size-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search projects..." value={query} onValueChange={setQuery} />
          <CommandList className="max-h-56 overflow-y-auto">
            <CommandEmpty>No projects found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((project) => (
                <CommandItem
                  key={project.id}
                  value={project.id}
                  onSelect={() => onToggle(project.id)}
                  className="flex items-center gap-2"
                >
                  <Checkbox checked={selectedSet.has(project.id)} />
                  <span className="flex-1 truncate text-sm">{project.name}</span>
                  {selectedSet.has(project.id) && <Check className="size-3.5" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

- [ ] **Step 9: Remove unused `Select*` and `ScrollArea` imports**

The project field no longer uses shadcn `Select`. Remove these imports if they are no longer referenced anywhere in the file:
```typescript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
```
Also remove:
```typescript
import { ScrollArea } from "@/components/ui/scroll-area";
```
`Select` is still used for the Status field — keep it if so; only remove the ones that are genuinely unused. Run `tsc --noEmit` to confirm.

- [ ] **Step 10: Add `Project` to the imports from domain types**

The `ProjectSelector` renders `Project[]`. The type import at the top currently is:
```typescript
import type { Area, Goal, Project, Task } from "@/lib/types/domain.types";
```
`Project` is already there — confirm it is present, no change needed.

- [ ] **Step 11: Verify TypeScript compiles**

```powershell
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 12: Commit**

```powershell
git add src/components/entities/note-metadata-panel.tsx
git commit -m "feat: project multi-select, scroll fix, cross-field filtering in NoteMetadataPanel"
```

---

## Task 4 — Update new/page.tsx for project multi-select

**Files:**
- Modify: `src/app/(dashboard)/notes/new/page.tsx`

### What to change

Replace the single `projectId` state with `projectIds` array and update the save payload and panel props.

- [ ] **Step 1: Replace the state declaration**

Find:
```typescript
  const [projectId, setProjectId] = useState<string | null>(null);
```
Replace with:
```typescript
  const [projectIds, setProjectIds] = useState<string[]>([]);
```

- [ ] **Step 2: Update `handleSave`**

Find inside `handleSave`:
```typescript
      project_id: projectId,
```
Replace with:
```typescript
      project_ids: projectIds,
```

Remove `project_id` from the object if it appears separately. `CreateNoteInput` accepts `project_ids: string[]` — the service handles the rest.

- [ ] **Step 3: Update `NoteMetadataPanel` props**

Find:
```tsx
            projectId={projectId}
            // ...
            onProjectIdChange={setProjectId}
```
Replace with:
```tsx
            projectIds={projectIds}
            // ...
            onProjectIdsChange={setProjectIds}
```

- [ ] **Step 4: Verify TypeScript compiles**

```powershell
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```powershell
git add src/app/(dashboard)/notes/new/page.tsx
git commit -m "feat: project multi-select on new note page"
```

---

## Task 5 — Add optimistic state and project multi-select to detail page

**Files:**
- Modify: `src/app/(dashboard)/notes/[id]/page.tsx`

### What to change

1. Add `localAreaIds`, `localGoalIds`, `localProjectIds`, `localTaskIds` state variables.
2. Initialize them in the existing `useEffect` when `note` loads.
3. Update all four `on*Change` callbacks to set local state immediately before calling `save`.
4. Pass local state (not `note.*`) to `NoteMetadataPanel`.

- [ ] **Step 1: Add four new `useState` declarations**

Find the existing state declarations block (near the top of `NoteDetailPage`, after `const [saveState, ...]`):
```typescript
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
```
Add after it:
```typescript
  const [localAreaIds,    setLocalAreaIds]    = useState<string[]>([]);
  const [localGoalIds,    setLocalGoalIds]    = useState<string[]>([]);
  const [localProjectIds, setLocalProjectIds] = useState<string[]>([]);
  const [localTaskIds,    setLocalTaskIds]    = useState<string[]>([]);
```

- [ ] **Step 2: Extend the `useEffect` that fires when `note` loads**

Find the existing effect:
```typescript
  useEffect(() => {
    if (note) {
      startTransition(() => {
        setLocalTitle(note.name);
        setLocalNotebook(note.notebook ?? "");
        setPageTitle(note.name);
      });
    }
    return () => setPageTitle("");
  }, [note, setPageTitle]);
```
Replace with:
```typescript
  useEffect(() => {
    if (note) {
      startTransition(() => {
        setLocalTitle(note.name);
        setLocalNotebook(note.notebook ?? "");
        setLocalAreaIds(note.linkedAreaIds ?? (note.area_id ? [note.area_id] : []));
        setLocalGoalIds(note.linkedGoalIds ?? []);
        setLocalProjectIds(note.linkedProjectIds ?? (note.project_id ? [note.project_id] : []));
        setLocalTaskIds(note.linkedTaskIds ?? []);
        setPageTitle(note.name);
      });
    }
    return () => setPageTitle("");
  }, [note, setPageTitle]);
```

- [ ] **Step 3: Update `NoteMetadataPanel` props — relationship fields**

Find the `<NoteMetadataPanel>` usage inside the `<aside>` and replace the four relationship props:

Old:
```tsx
            areaIds={note.linkedAreaIds ?? (note.area_id ? [note.area_id] : [])}
            goalIds={note.linkedGoalIds ?? []}
            projectId={note.project_id}
            taskIds={note.linkedTaskIds ?? []}
```
New:
```tsx
            areaIds={localAreaIds}
            goalIds={localGoalIds}
            projectIds={localProjectIds}
            taskIds={localTaskIds}
```

- [ ] **Step 4: Update the four `on*Change` callbacks**

Old:
```tsx
            onAreaIdsChange={(areaIds) => handleMetaChange({ area_ids: areaIds })}
            onGoalIdsChange={(goalIds) => handleMetaChange({ goal_ids: goalIds })}
            onProjectIdChange={(projectId) => handleMetaChange({ project_id: projectId })}
            onTaskIdsChange={(taskIds) => handleMetaChange({ task_ids: taskIds })}
```
New:
```tsx
            onAreaIdsChange={(ids) => { setLocalAreaIds(ids); handleMetaChange({ area_ids: ids }); }}
            onGoalIdsChange={(ids) => { setLocalGoalIds(ids); handleMetaChange({ goal_ids: ids }); }}
            onProjectIdsChange={(ids) => { setLocalProjectIds(ids); handleMetaChange({ project_ids: ids }); }}
            onTaskIdsChange={(ids) => { setLocalTaskIds(ids); handleMetaChange({ task_ids: ids }); }}
```

- [ ] **Step 5: Verify TypeScript compiles**

```powershell
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```powershell
git add src/app/(dashboard)/notes/[id]/page.tsx
git commit -m "fix: optimistic local state for area/goal/project/task in note detail page"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Area scroll bug (new + detail) — Task 3 Step 6 (AreaSelector rewrite with `CommandList` scroll)
- [x] Task scroll bug — Task 1
- [x] Area search non-functional — Task 3 Steps 6–7 (`shouldFilter={false}` + manual query)
- [x] Project multi-select (new page) — Tasks 3 + 4
- [x] Project multi-select (detail page) — Tasks 3 + 5
- [x] Cross-filtering: area by goal — Task 3 Step 3 (`filteredAreas`)
- [x] Cross-filtering: area by project — Task 3 Step 3 (`filteredAreas`)
- [x] Cross-filtering: area by task — Task 3 Step 3 (`filteredAreas`)
- [x] Cross-filtering: goal by area — Task 3 Step 3 (`filteredGoals`)
- [x] Cross-filtering: goal by project — Task 3 Steps 2 + 3 (requires `Project.linkedGoalIds` from Task 2)
- [x] Cross-filtering: goal by task — Task 3 Step 3 (`filteredGoals`)
- [x] Cross-filtering: project by area — Task 3 Step 3 (`filteredProjects`)
- [x] Cross-filtering: project by goal — Task 3 Step 3 (`filteredProjects`)
- [x] Cross-filtering: project by task — Task 3 Step 3 (`filteredProjects`)
- [x] Cross-filtering: task by area — Task 3 Step 3 (`filteredTasks`)
- [x] Cross-filtering: task by goal — Task 3 Step 3 (`filteredTasks`)
- [x] Cross-filtering: task by project — Task 3 Step 3 (`filteredTasks`)
- [x] Detail page goals not selectable (optimistic) — Task 5
- [x] Detail page tasks not selectable (optimistic) — Task 5

**Dependencies:**
- Task 3 depends on Task 2 (needs `Project.linkedGoalIds` populated for goal-cross-filtering to work)
- Task 4 depends on Task 3 (panel props changed)
- Task 5 depends on Task 3 (panel props changed)
- Task 1 is independent

**Execution order:** Task 1 → Task 2 → Task 3 → Task 4 → Task 5

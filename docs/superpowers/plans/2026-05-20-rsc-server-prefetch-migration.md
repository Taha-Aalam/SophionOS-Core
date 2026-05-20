# RSC Server Prefetch Migration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert 16 dashboard pages from `"use client"` to async Server Components that prefetch data server-side via React Query's `HydrationBoundary`, eliminating loading states on first render.

**Architecture:** Each `page.tsx` becomes an async server component that (1) authenticates via `cookies()`, (2) runs a server-side Supabase query, (3) dehydrates the result into a fresh `QueryClient`, and (4) wraps its content in `<HydrationBoundary>`. The existing page JSX moves verbatim into a `*-content.tsx` client component. All hooks, services, stores, and mutation logic remain untouched.

**Tech Stack:** Next.js App Router, `@tanstack/react-query` v5 (`dehydrate`, `HydrationBoundary`), `@supabase/ssr` server client (`src/lib/supabase/server.ts`)

**Dev server:** `pnpm dev` — runs on port 3030. Visit `http://localhost:3030` to verify.

**Spec:** `docs/superpowers/specs/2026-05-20-rsc-server-prefetch-migration-design.md`

---

## Query Key Reference

Critical: server prefetch key must match client hook key exactly or hydration silently fails.

| Hook | Query Key Structure | Note |
|------|---------------------|------|
| `useTasks()` | `["tasks"]` | No filters, no userId |
| `useGoals(filters)` | `["goals", filters]` | filters obj, no userId |
| `useProjects(filters)` | `["projects", filters]` | filters obj, no userId |
| `useAreas(filters?)` | `["areas", "list", userId, filters ?? {}]` | includes userId |
| `useNotes(filters?)` | `["notes", "list", userId, filters ?? {}]` | includes userId |
| `useResources(filters?)` | `["resources", "list", userId, filters ?? {}]` | includes userId |
| `useTopics()` | `["topics", "list", userId]` | includes userId |
| `useContacts(filters?)` | `["contacts", filters]` | filters is `undefined` by default |
| `useGoalDetail(id)` | `["goal-detail", id, undefined]` | third element is filters (undefined default) |
| `useAreaDetail(id)` | `["area-detail", id]` | two-element key |
| `useDashboardToday()` | `["dashboard", userId, "today"]` | includes userId |

---

## File Map

**New files to create:**
- `src/lib/queries/server-query-client.ts` — shared `makeQueryClient()` factory
- `src/lib/queries/goals.queries.ts`
- `src/lib/queries/projects.queries.ts`
- `src/lib/queries/tasks.queries.ts`
- `src/lib/queries/notes.queries.ts`
- `src/lib/queries/contacts.queries.ts`
- `src/lib/queries/areas.queries.ts`
- `src/lib/queries/resources.queries.ts`
- `src/lib/queries/topics.queries.ts`
- `src/lib/queries/goal-detail.queries.ts`
- `src/lib/queries/area-detail.queries.ts`
- `src/lib/queries/dashboard.queries.ts`
- `src/app/(dashboard)/goals/goals-content.tsx`
- `src/app/(dashboard)/projects/projects-content.tsx`
- `src/app/(dashboard)/tasks/tasks-content.tsx`
- `src/app/(dashboard)/notes/notes-content.tsx`
- `src/app/(dashboard)/contacts/contacts-content.tsx`
- `src/app/(dashboard)/areas/areas-content.tsx`
- `src/app/(dashboard)/resources/resources-content.tsx`
- `src/app/(dashboard)/topics/topics-content.tsx`
- `src/app/(dashboard)/goals/[id]/goal-detail-content.tsx`
- `src/app/(dashboard)/projects/[id]/project-detail-content.tsx`
- `src/app/(dashboard)/areas/[id]/area-detail-content.tsx`
- `src/app/(dashboard)/notes/[id]/note-detail-content.tsx`
- `src/app/(dashboard)/topics/[id]/topic-detail-content.tsx`
- `src/app/(dashboard)/contacts/[id]/contact-detail-content.tsx`
- `src/app/(dashboard)/dashboard/dashboard-content.tsx`
- `src/app/(dashboard)/my-day/my-day-content.tsx`

**Files to rewrite (page.tsx → server component):**
- All 16 `page.tsx` files listed above (goals, projects, tasks, notes, contacts, areas, resources, topics, and their [id] variants, plus dashboard and my-day)

---

## Task 1: Shared QueryClient factory

**Files:**
- Create: `src/lib/queries/server-query-client.ts`

- [ ] **Step 1: Create the file**

```ts
// src/lib/queries/server-query-client.ts
import { QueryClient } from "@tanstack/react-query"

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60 * 1000 },
    },
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/queries/server-query-client.ts
git commit -m "feat(rsc): add makeQueryClient factory for server-side prefetch"
```

---

## Task 2: Server query functions — goals, projects, tasks

**Files:**
- Create: `src/lib/queries/goals.queries.ts`
- Create: `src/lib/queries/projects.queries.ts`
- Create: `src/lib/queries/tasks.queries.ts`

- [ ] **Step 1: Create goals.queries.ts**

Open `src/lib/services/goal.service.ts` and copy the `GOAL_SELECT` constant string (line 14). Then create:

```ts
// src/lib/queries/goals.queries.ts
import type { SupabaseClient } from "@supabase/supabase-js"

const GOAL_SELECT =
  "id, user_id, area_id, name, description, term, priority, target_date, progress, is_completed, is_archived, slug, created_at, updated_at"

export interface GoalServerFilters {
  status?: "active" | "completed" | "all"
  term?: "all" | "short" | "mid" | "long"
}

export async function serverFetchGoals(
  supabase: SupabaseClient,
  userId: string,
  filters: GoalServerFilters = {},
) {
  let query = supabase
    .from("goals")
    .select(GOAL_SELECT)
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false })

  if (filters.status === "completed") {
    query = query.eq("is_completed", true)
  } else if (filters.status === "active") {
    query = query.eq("is_completed", false)
  }

  if (filters.term && filters.term !== "all") {
    query = query.eq("term", filters.term)
  }

  const { data } = await query
  return data ?? []
}
```

- [ ] **Step 2: Create projects.queries.ts**

Open `src/lib/services/project.service.ts` and copy its `PROJECT_SELECT` constant. Then create:

```ts
// src/lib/queries/projects.queries.ts
import type { SupabaseClient } from "@supabase/supabase-js"

// Copy PROJECT_SELECT from src/lib/services/project.service.ts
const PROJECT_SELECT =
  "id, user_id, area_id, goal_id, name, description, status, priority, target_date, is_archived, slug, created_at, updated_at"

export interface ProjectServerFilters {
  status?: "active" | "completed" | "paused" | "cancelled" | "all"
}

export async function serverFetchProjects(
  supabase: SupabaseClient,
  userId: string,
  filters: ProjectServerFilters = {},
) {
  let query = supabase
    .from("projects")
    .select(PROJECT_SELECT)
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false })

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status)
  }

  const { data } = await query
  return data ?? []
}
```

**Note:** If `PROJECT_SELECT` in the service file differs from the string above, use the service file's value — it is authoritative.

- [ ] **Step 3: Create tasks.queries.ts**

```ts
// src/lib/queries/tasks.queries.ts
import type { SupabaseClient } from "@supabase/supabase-js"

const TASK_SELECT =
  "id, user_id, area_id, project_id, name, description, status, priority, due_date, is_completed, is_focused, is_important, is_urgent, completed_at, smart_priority, is_archived, created_at, updated_at"

export async function serverFetchTasks(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false })

  return data ?? []
}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/queries/goals.queries.ts src/lib/queries/projects.queries.ts src/lib/queries/tasks.queries.ts
git commit -m "feat(rsc): add server query functions for goals, projects, tasks"
```

---

## Task 3: Server query functions — notes, contacts, areas, resources, topics

**Files:**
- Create: `src/lib/queries/notes.queries.ts`
- Create: `src/lib/queries/contacts.queries.ts`
- Create: `src/lib/queries/areas.queries.ts`
- Create: `src/lib/queries/resources.queries.ts`
- Create: `src/lib/queries/topics.queries.ts`

- [ ] **Step 1: Create notes.queries.ts**

Open `src/lib/services/note.service.ts`, copy its `NOTE_SELECT` constant. Then create:

```ts
// src/lib/queries/notes.queries.ts
import type { SupabaseClient } from "@supabase/supabase-js"

// Copy NOTE_SELECT from src/lib/services/note.service.ts
const NOTE_SELECT =
  "id, user_id, area_id, project_id, topic_id, title, content, status, is_favorite, is_archived, slug, created_at, updated_at"

export async function serverFetchNotes(
  supabase: SupabaseClient,
  userId: string,
  filters: { includeArchived?: boolean } = {},
) {
  let query = supabase
    .from("notes")
    .select(NOTE_SELECT)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })

  if (!filters.includeArchived) {
    query = query.eq("is_archived", false)
  }

  const { data } = await query
  return data ?? []
}
```

- [ ] **Step 2: Create contacts.queries.ts**

Open `src/lib/services/contact.service.ts`, copy its `CONTACT_SELECT` constant. Then create:

```ts
// src/lib/queries/contacts.queries.ts
import type { SupabaseClient } from "@supabase/supabase-js"

// Copy CONTACT_SELECT from src/lib/services/contact.service.ts
const CONTACT_SELECT =
  "id, user_id, name, email, phone, company, role, image_url, notes, is_favorite, is_archived, created_at, updated_at"

export async function serverFetchContacts(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data } = await supabase
    .from("contacts")
    .select(CONTACT_SELECT)
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false })

  return data ?? []
}
```

- [ ] **Step 3: Create areas.queries.ts**

```ts
// src/lib/queries/areas.queries.ts
import type { SupabaseClient } from "@supabase/supabase-js"

const AREA_SELECT =
  "id, user_id, name, description, icon, color, type, metadata, inactive, archive, slug, created_at, updated_at"

export async function serverFetchAreas(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data } = await supabase
    .from("areas")
    .select(AREA_SELECT)
    .eq("user_id", userId)
    .eq("archive", false)
    .order("created_at", { ascending: false })

  return data ?? []
}
```

- [ ] **Step 4: Create resources.queries.ts**

Open `src/lib/services/resource.service.ts`, copy its `RESOURCE_SELECT` constant. Then create:

```ts
// src/lib/queries/resources.queries.ts
import type { SupabaseClient } from "@supabase/supabase-js"

// Copy RESOURCE_SELECT from src/lib/services/resource.service.ts
const RESOURCE_SELECT =
  "id, user_id, area_id, project_id, topic_id, title, url, description, type, status, is_favorite, is_archived, created_at, updated_at"

export async function serverFetchResources(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data } = await supabase
    .from("resources")
    .select(RESOURCE_SELECT)
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false })

  return data ?? []
}
```

- [ ] **Step 5: Create topics.queries.ts**

Open `src/lib/services/topic.service.ts`, copy its `TOPIC_SELECT` constant. Then create:

```ts
// src/lib/queries/topics.queries.ts
import type { SupabaseClient } from "@supabase/supabase-js"

// Copy TOPIC_SELECT from src/lib/services/topic.service.ts
const TOPIC_SELECT =
  "id, user_id, name, description, slug, is_archived, created_at, updated_at"

export async function serverFetchTopics(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data } = await supabase
    .from("topics")
    .select(TOPIC_SELECT)
    .eq("user_id", userId)
    .eq("is_archived", false)
    .order("created_at", { ascending: false })

  return data ?? []
}
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/queries/notes.queries.ts src/lib/queries/contacts.queries.ts src/lib/queries/areas.queries.ts src/lib/queries/resources.queries.ts src/lib/queries/topics.queries.ts
git commit -m "feat(rsc): add server query functions for notes, contacts, areas, resources, topics"
```

---

## Task 4: Convert goals page

**Files:**
- Create: `src/app/(dashboard)/goals/goals-content.tsx`
- Modify: `src/app/(dashboard)/goals/page.tsx`

- [ ] **Step 1: Create goals-content.tsx**

Copy the entire contents of `src/app/(dashboard)/goals/page.tsx` into a new file. Change the export from `export default function GoalsPage()` to `export function GoalsContent()`. Add `"use client"` at the top if not already there (it is). Keep all imports unchanged.

```ts
// src/app/(dashboard)/goals/goals-content.tsx
"use client";

// Paste all imports from page.tsx here unchanged
// ...

export function GoalsContent() {
  // Paste entire function body from GoalsPage() unchanged
}
```

- [ ] **Step 2: Rewrite page.tsx**

Replace the entire contents of `src/app/(dashboard)/goals/page.tsx` with:

```ts
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { makeQueryClient } from "@/lib/queries/server-query-client"
import { GOALS_QUERY_KEY } from "@/lib/hooks/use-goals"
import { serverFetchGoals } from "@/lib/queries/goals.queries"
import { GoalsContent } from "./goals-content"

const DEFAULT_FILTERS = { status: "active" as const, term: "all" as const }

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const queryClient = makeQueryClient()
  await queryClient.prefetchQuery({
    queryKey: [GOALS_QUERY_KEY, DEFAULT_FILTERS],
    queryFn: () => serverFetchGoals(supabase, user.id, DEFAULT_FILTERS),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <GoalsContent />
    </HydrationBoundary>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Test in browser**

Run `pnpm dev` if not already running. Visit `http://localhost:3030/goals`. Verify:
- Page renders goals list immediately (no spinner/skeleton flash)
- Opening network tab: no `supabase` goals fetch on first load
- Switching filter tabs triggers a client refetch (normal behavior)

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/goals/goals-content.tsx src/app/\(dashboard\)/goals/page.tsx
git commit -m "feat(rsc): convert goals page to server component with prefetch"
```

---

## Task 5: Convert projects page

**Files:**
- Create: `src/app/(dashboard)/projects/projects-content.tsx`
- Modify: `src/app/(dashboard)/projects/page.tsx`

- [ ] **Step 1: Create projects-content.tsx**

Copy entire contents of `src/app/(dashboard)/projects/page.tsx`. Change export to named `ProjectsContent`. Keep `"use client"` and all imports.

- [ ] **Step 2: Rewrite page.tsx**

```ts
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { makeQueryClient } from "@/lib/queries/server-query-client"
import { PROJECTS_QUERY_KEY } from "@/lib/hooks/use-projects"
import { serverFetchProjects } from "@/lib/queries/projects.queries"
import { ProjectsContent } from "./projects-content"

const DEFAULT_FILTERS = { status: "active" as const }

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const queryClient = makeQueryClient()
  await queryClient.prefetchQuery({
    queryKey: [PROJECTS_QUERY_KEY, DEFAULT_FILTERS],
    queryFn: () => serverFetchProjects(supabase, user.id, DEFAULT_FILTERS),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectsContent />
    </HydrationBoundary>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Test in browser**

Visit `http://localhost:3030/projects`. Verify immediate render with no loading flash.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/projects/projects-content.tsx src/app/\(dashboard\)/projects/page.tsx
git commit -m "feat(rsc): convert projects page to server component with prefetch"
```

---

## Task 6: Convert tasks page

**Files:**
- Create: `src/app/(dashboard)/tasks/tasks-content.tsx`
- Modify: `src/app/(dashboard)/tasks/page.tsx`

- [ ] **Step 1: Create tasks-content.tsx**

Copy entire contents of `src/app/(dashboard)/tasks/page.tsx`. Change export to named `TasksContent`. Keep `"use client"` and all imports.

- [ ] **Step 2: Rewrite page.tsx**

```ts
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { makeQueryClient } from "@/lib/queries/server-query-client"
import { TASKS_QUERY_KEY } from "@/lib/hooks/use-tasks"
import { serverFetchTasks } from "@/lib/queries/tasks.queries"
import { TasksContent } from "./tasks-content"

export default async function TasksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const queryClient = makeQueryClient()
  await queryClient.prefetchQuery({
    queryKey: [TASKS_QUERY_KEY],
    queryFn: () => serverFetchTasks(supabase, user.id),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TasksContent />
    </HydrationBoundary>
  )
}
```

- [ ] **Step 3: Verify + Test + Commit**

```bash
pnpm tsc --noEmit
# Visit http://localhost:3030/tasks — verify no loading flash
git add src/app/\(dashboard\)/tasks/tasks-content.tsx src/app/\(dashboard\)/tasks/page.tsx
git commit -m "feat(rsc): convert tasks page to server component with prefetch"
```

---

## Task 7: Convert notes page

**Files:**
- Create: `src/app/(dashboard)/notes/notes-content.tsx`
- Modify: `src/app/(dashboard)/notes/page.tsx`

- [ ] **Step 1: Create notes-content.tsx**

Copy entire contents of `src/app/(dashboard)/notes/page.tsx`. Change export to named `NotesContent`. Keep `"use client"` and all imports.

- [ ] **Step 2: Rewrite page.tsx**

```ts
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { makeQueryClient } from "@/lib/queries/server-query-client"
import { NOTES_QUERY_KEY } from "@/lib/hooks/use-notes"
import { serverFetchNotes } from "@/lib/queries/notes.queries"
import { NotesContent } from "./notes-content"

export default async function NotesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const queryClient = makeQueryClient()
  // Query key must match useNotes() exactly: ["notes", "list", userId, filters]
  await queryClient.prefetchQuery({
    queryKey: [NOTES_QUERY_KEY, "list", user.id, {}],
    queryFn: () => serverFetchNotes(supabase, user.id, {}),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <NotesContent />
    </HydrationBoundary>
  )
}
```

- [ ] **Step 3: Verify + Test + Commit**

```bash
pnpm tsc --noEmit
# Visit http://localhost:3030/notes — verify no loading flash
git add src/app/\(dashboard\)/notes/notes-content.tsx src/app/\(dashboard\)/notes/page.tsx
git commit -m "feat(rsc): convert notes page to server component with prefetch"
```

---

## Task 8: Convert contacts page

**Files:**
- Create: `src/app/(dashboard)/contacts/contacts-content.tsx`
- Modify: `src/app/(dashboard)/contacts/page.tsx`

- [ ] **Step 1: Create contacts-content.tsx**

Copy entire contents of `src/app/(dashboard)/contacts/page.tsx`. Change export to named `ContactsContent`. Keep `"use client"` and all imports.

- [ ] **Step 2: Rewrite page.tsx**

```ts
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { makeQueryClient } from "@/lib/queries/server-query-client"
import { CONTACTS_QUERY_KEY } from "@/lib/hooks/use-contacts"
import { serverFetchContacts } from "@/lib/queries/contacts.queries"
import { ContactsContent } from "./contacts-content"

export default async function ContactsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const queryClient = makeQueryClient()
  // useContacts() is called with no args on this page → filters is undefined
  await queryClient.prefetchQuery({
    queryKey: [CONTACTS_QUERY_KEY, undefined],
    queryFn: () => serverFetchContacts(supabase, user.id),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ContactsContent />
    </HydrationBoundary>
  )
}
```

- [ ] **Step 3: Verify + Test + Commit**

```bash
pnpm tsc --noEmit
# Visit http://localhost:3030/contacts — verify no loading flash
git add src/app/\(dashboard\)/contacts/contacts-content.tsx src/app/\(dashboard\)/contacts/page.tsx
git commit -m "feat(rsc): convert contacts page to server component with prefetch"
```

---

## Task 9: Convert areas page

**Files:**
- Create: `src/app/(dashboard)/areas/areas-content.tsx`
- Modify: `src/app/(dashboard)/areas/page.tsx`

The areas page calls `useAreas()`, `useGoals()`, `useProjects()`, `useTasks()`, `useNotes()`, `useResources()`. We prefetch all 6 in parallel.

- [ ] **Step 1: Create areas-content.tsx**

Copy entire contents of `src/app/(dashboard)/areas/page.tsx`. Change export to named `AreasContent`. Keep `"use client"` and all imports.

- [ ] **Step 2: Rewrite page.tsx**

```ts
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { makeQueryClient } from "@/lib/queries/server-query-client"
import { AREAS_QUERY_KEY } from "@/lib/hooks/use-areas"
import { GOALS_QUERY_KEY } from "@/lib/hooks/use-goals"
import { PROJECTS_QUERY_KEY } from "@/lib/hooks/use-projects"
import { TASKS_QUERY_KEY } from "@/lib/hooks/use-tasks"
import { NOTES_QUERY_KEY } from "@/lib/hooks/use-notes"
import { RESOURCES_QUERY_KEY } from "@/lib/hooks/use-resources"
import { serverFetchAreas } from "@/lib/queries/areas.queries"
import { serverFetchGoals } from "@/lib/queries/goals.queries"
import { serverFetchProjects } from "@/lib/queries/projects.queries"
import { serverFetchTasks } from "@/lib/queries/tasks.queries"
import { serverFetchNotes } from "@/lib/queries/notes.queries"
import { serverFetchResources } from "@/lib/queries/resources.queries"
import { AreasContent } from "./areas-content"

export default async function AreasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const queryClient = makeQueryClient()

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: [AREAS_QUERY_KEY, "list", user.id, {}],
      queryFn: () => serverFetchAreas(supabase, user.id),
    }),
    queryClient.prefetchQuery({
      queryKey: [GOALS_QUERY_KEY, { status: "all" }],
      queryFn: () => serverFetchGoals(supabase, user.id, { status: "all" }),
    }),
    queryClient.prefetchQuery({
      queryKey: [PROJECTS_QUERY_KEY, { status: "all" }],
      queryFn: () => serverFetchProjects(supabase, user.id, { status: "all" }),
    }),
    queryClient.prefetchQuery({
      queryKey: [TASKS_QUERY_KEY],
      queryFn: () => serverFetchTasks(supabase, user.id),
    }),
    queryClient.prefetchQuery({
      queryKey: [NOTES_QUERY_KEY, "list", user.id, { includeArchived: true }],
      queryFn: () => serverFetchNotes(supabase, user.id, { includeArchived: true }),
    }),
    queryClient.prefetchQuery({
      queryKey: [RESOURCES_QUERY_KEY, "list", user.id, {}],
      queryFn: () => serverFetchResources(supabase, user.id),
    }),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AreasContent />
    </HydrationBoundary>
  )
}
```

**Important:** Open `src/app/(dashboard)/areas/page.tsx` (before rewriting) and check the exact filters passed to `useNotes(...)` and `useGoals(...)`. Match those filters exactly in the query keys above — if the page calls `useNotes({ includeArchived: true })`, the key must be `[NOTES_QUERY_KEY, "list", user.id, { includeArchived: true }]`.

- [ ] **Step 3: Verify + Test + Commit**

```bash
pnpm tsc --noEmit
# Visit http://localhost:3030/areas — verify no loading flash
git add src/app/\(dashboard\)/areas/areas-content.tsx src/app/\(dashboard\)/areas/page.tsx
git commit -m "feat(rsc): convert areas page to server component with parallel prefetch"
```

---

## Task 10: Convert resources and topics pages

**Files:**
- Create: `src/app/(dashboard)/resources/resources-content.tsx`
- Modify: `src/app/(dashboard)/resources/page.tsx`
- Create: `src/app/(dashboard)/topics/topics-content.tsx`
- Modify: `src/app/(dashboard)/topics/page.tsx`

- [ ] **Step 1: Create resources-content.tsx**

Copy entire contents of `resources/page.tsx`. Export as `ResourcesContent`. Keep `"use client"` and all imports.

- [ ] **Step 2: Rewrite resources/page.tsx**

```ts
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { makeQueryClient } from "@/lib/queries/server-query-client"
import { RESOURCES_QUERY_KEY } from "@/lib/hooks/use-resources"
import { serverFetchResources } from "@/lib/queries/resources.queries"
import { ResourcesContent } from "./resources-content"

export default async function ResourcesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const queryClient = makeQueryClient()
  await queryClient.prefetchQuery({
    queryKey: [RESOURCES_QUERY_KEY, "list", user.id, {}],
    queryFn: () => serverFetchResources(supabase, user.id),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ResourcesContent />
    </HydrationBoundary>
  )
}
```

- [ ] **Step 3: Create topics-content.tsx**

Copy entire contents of `topics/page.tsx`. Export as `TopicsContent`. Keep `"use client"` and all imports.

- [ ] **Step 4: Rewrite topics/page.tsx**

```ts
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { makeQueryClient } from "@/lib/queries/server-query-client"
import { TOPICS_QUERY_KEY } from "@/lib/hooks/use-topics"
import { serverFetchTopics } from "@/lib/queries/topics.queries"
import { TopicsContent } from "./topics-content"

export default async function TopicsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const queryClient = makeQueryClient()
  // useTopics() key includes userId: ["topics", "list", userId]
  await queryClient.prefetchQuery({
    queryKey: [TOPICS_QUERY_KEY, "list", user.id],
    queryFn: () => serverFetchTopics(supabase, user.id),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TopicsContent />
    </HydrationBoundary>
  )
}
```

- [ ] **Step 5: Verify + Test + Commit**

```bash
pnpm tsc --noEmit
# Visit http://localhost:3030/resources and http://localhost:3030/topics
git add src/app/\(dashboard\)/resources/resources-content.tsx src/app/\(dashboard\)/resources/page.tsx src/app/\(dashboard\)/topics/topics-content.tsx src/app/\(dashboard\)/topics/page.tsx
git commit -m "feat(rsc): convert resources and topics pages to server components"
```

---

## Task 11: Server query functions for detail pages

**Files:**
- Create: `src/lib/queries/goal-detail.queries.ts`
- Create: `src/lib/queries/area-detail.queries.ts`

The detail hooks (`useGoalDetail`, `useAreaDetail`) fetch the primary entity plus all related entities in parallel, then compute rollups. The server query functions mirror this.

- [ ] **Step 1: Create goal-detail.queries.ts**

Read `src/lib/hooks/use-goal-detail.ts` fully to understand `GoalDetailData` shape. Then create:

```ts
// src/lib/queries/goal-detail.queries.ts
import type { SupabaseClient } from "@supabase/supabase-js"
import type { GoalDetailData } from "@/lib/hooks/use-goal-detail"

const GOAL_SELECT =
  "id, user_id, area_id, name, description, term, priority, target_date, progress, is_completed, is_archived, slug, created_at, updated_at"

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function serverFetchGoalDetail(
  supabase: SupabaseClient,
  userId: string,
  identifier: string,
): Promise<GoalDetailData> {
  // Fetch primary goal (by slug or UUID)
  const goalQuery = supabase
    .from("goals")
    .select(GOAL_SELECT)
    .eq("user_id", userId)

  const { data: goalData } = isUuid(identifier)
    ? await goalQuery.eq("id", identifier).single()
    : await goalQuery.eq("slug", identifier).single()

  if (!goalData) throw new Error(`Goal not found: ${identifier}`)
  const goal = { ...goalData, linkedAreaIds: goalData.area_id ? [goalData.area_id] : [] }

  // Parallel fetch of related entities
  const [
    { data: projectsData },
    { data: tasksData },
    { data: notesData },
    { data: resourcesData },
  ] = await Promise.all([
    supabase.from("projects").select("id, user_id, area_id, goal_id, name, description, status, priority, target_date, is_archived, slug, created_at, updated_at").eq("user_id", userId).eq("goal_id", goalData.id).eq("is_archived", false),
    supabase.from("tasks").select("id, user_id, area_id, project_id, name, description, status, priority, due_date, is_completed, is_focused, is_important, is_urgent, completed_at, smart_priority, is_archived, created_at, updated_at").eq("user_id", userId).eq("is_archived", false),
    supabase.from("notes").select("id, user_id, area_id, project_id, topic_id, title, content, status, is_favorite, is_archived, slug, created_at, updated_at").eq("user_id", userId).eq("is_archived", false),
    supabase.from("resources").select("id, user_id, area_id, project_id, topic_id, title, url, description, type, status, is_favorite, is_archived, created_at, updated_at").eq("user_id", userId).eq("is_archived", false),
  ])

  const projects = projectsData ?? []
  const tasks = (tasksData ?? []).filter((t) => t.area_id === goalData.area_id || t.project_id && projects.some((p) => p.id === t.project_id))
  const notes = notesData ?? []
  const resources = resourcesData ?? []

  const completedTaskCount = tasks.filter((t) => t.is_completed).length
  const activeProjectCount = projects.filter((p) => p.status === "active").length

  return {
    goal,
    projects,
    tasks,
    notes,
    resources,
    rollups: {
      projectCount: projects.length,
      taskCount: tasks.length,
      completedTaskCount,
      noteCount: notes.length,
      resourceCount: resources.length,
      activeProjectCount,
      activeTaskCount: tasks.filter((t) => !t.is_completed).length,
      activeNoteCount: notes.length,
      activeResourceCount: resources.length,
    },
  }
}
```

**Note:** The task/note/resource filtering logic here is simplified. Open `src/lib/hooks/use-goal-detail.ts` and check its `queryFn` for exact filter conditions. Adjust the `tasks`, `notes`, `resources` filtering to match.

- [ ] **Step 2: Create area-detail.queries.ts**

Read `src/lib/hooks/use-area-detail.ts` fully. Then create:

```ts
// src/lib/queries/area-detail.queries.ts
import type { SupabaseClient } from "@supabase/supabase-js"
import type { AreaDetailData } from "@/lib/hooks/use-area-detail"

const AREA_SELECT =
  "id, user_id, name, description, icon, color, type, metadata, inactive, archive, slug, created_at, updated_at"

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export async function serverFetchAreaDetail(
  supabase: SupabaseClient,
  userId: string,
  identifier: string,
): Promise<AreaDetailData> {
  const areaQuery = supabase.from("areas").select(AREA_SELECT).eq("user_id", userId)
  const { data: areaData } = isUuid(identifier)
    ? await areaQuery.eq("id", identifier).single()
    : await areaQuery.eq("slug", identifier).single()

  if (!areaData) throw new Error(`Area not found: ${identifier}`)

  const [
    { data: goalsData },
    { data: projectsData },
    { data: tasksData },
    { data: notesData },
    { data: resourcesData },
  ] = await Promise.all([
    supabase.from("goals").select("id, user_id, area_id, name, description, term, priority, target_date, progress, is_completed, is_archived, slug, created_at, updated_at").eq("user_id", userId).eq("is_archived", false),
    supabase.from("projects").select("id, user_id, area_id, goal_id, name, description, status, priority, target_date, is_archived, slug, created_at, updated_at").eq("user_id", userId).eq("is_archived", false),
    supabase.from("tasks").select("id, user_id, area_id, project_id, name, description, status, priority, due_date, is_completed, is_focused, is_important, is_urgent, completed_at, smart_priority, is_archived, created_at, updated_at").eq("user_id", userId).eq("is_archived", false),
    supabase.from("notes").select("id, user_id, area_id, project_id, topic_id, title, content, status, is_favorite, is_archived, slug, created_at, updated_at").eq("user_id", userId).eq("area_id", areaData.id),
    supabase.from("resources").select("id, user_id, area_id, project_id, topic_id, title, url, description, type, status, is_favorite, is_archived, created_at, updated_at").eq("user_id", userId).eq("area_id", areaData.id),
  ])

  const goals = (goalsData ?? []).filter((g) => g.area_id === areaData.id)
  const projects = (projectsData ?? []).filter((p) => p.area_id === areaData.id)
  const tasks = (tasksData ?? []).filter((t) => t.area_id === areaData.id)
  const notes = notesData ?? []
  const resources = resourcesData ?? []

  return {
    area: areaData,
    goals,
    projects,
    tasks,
    notes,
    resources,
    rollups: {
      goalCount: goals.length,
      projectCount: projects.length,
      taskCount: tasks.length,
      noteCount: notes.length,
      resourceCount: resources.length,
    },
  }
}
```

**Note:** Open `src/lib/hooks/use-area-detail.ts` and verify the filter conditions for goals, projects, tasks match what the hook does. Adjust above if needed.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `pnpm tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/queries/goal-detail.queries.ts src/lib/queries/area-detail.queries.ts
git commit -m "feat(rsc): add server query functions for goal and area detail pages"
```

---

## Task 12: Convert goals/[id] and projects/[id] detail pages

**Files:**
- Create: `src/app/(dashboard)/goals/[id]/goal-detail-content.tsx`
- Modify: `src/app/(dashboard)/goals/[id]/page.tsx`
- Create: `src/app/(dashboard)/projects/[id]/project-detail-content.tsx`
- Modify: `src/app/(dashboard)/projects/[id]/page.tsx`

- [ ] **Step 1: Create goal-detail-content.tsx**

Copy entire contents of `src/app/(dashboard)/goals/[id]/page.tsx`. Change `export default function` to `export function GoalDetailContent()`. Keep `"use client"` and all imports.

- [ ] **Step 2: Rewrite goals/[id]/page.tsx**

```ts
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { makeQueryClient } from "@/lib/queries/server-query-client"
import { GOAL_DETAIL_QUERY_KEY } from "@/lib/hooks/use-goal-detail"
import { serverFetchGoalDetail } from "@/lib/queries/goal-detail.queries"
import { GoalDetailContent } from "./goal-detail-content"

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const queryClient = makeQueryClient()
  await queryClient.prefetchQuery({
    queryKey: [GOAL_DETAIL_QUERY_KEY, id, undefined],
    queryFn: () => serverFetchGoalDetail(supabase, user.id, id),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <GoalDetailContent />
    </HydrationBoundary>
  )
}
```

- [ ] **Step 3: Create project-detail-content.tsx**

Copy entire contents of `src/app/(dashboard)/projects/[id]/page.tsx`. Export as `ProjectDetailContent`. Keep `"use client"` and all imports.

- [ ] **Step 4: Rewrite projects/[id]/page.tsx**

Open `src/lib/hooks/use-projects.ts` — `useProject(id)` uses key `[PROJECTS_QUERY_KEY, id]`. We prefetch the project entity individually:

```ts
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { makeQueryClient } from "@/lib/queries/server-query-client"
import { PROJECTS_QUERY_KEY } from "@/lib/hooks/use-projects"
import { ProjectDetailContent } from "./project-detail-content"

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const queryClient = makeQueryClient()
  // projects/[id] page uses useProject(id) → key: [PROJECTS_QUERY_KEY, id]
  await queryClient.prefetchQuery({
    queryKey: [PROJECTS_QUERY_KEY, id],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("id, user_id, area_id, goal_id, name, description, status, priority, target_date, is_archived, slug, created_at, updated_at")
        .eq("user_id", user.id)
        .or(`id.eq.${id},slug.eq.${id}`)
        .single()
      return data
    },
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectDetailContent />
    </HydrationBoundary>
  )
}
```

**Note:** Open `projects/[id]/page.tsx` (original) and check which hook it uses for the primary project fetch. If it uses `useProject(id)` → key is `[PROJECTS_QUERY_KEY, id]`. Adjust if it uses a different hook.

- [ ] **Step 5: Verify + Test + Commit**

```bash
pnpm tsc --noEmit
# Visit a goal detail page e.g. http://localhost:3030/goals/[some-id]
# Visit a project detail page
git add src/app/\(dashboard\)/goals/\[id\]/goal-detail-content.tsx src/app/\(dashboard\)/goals/\[id\]/page.tsx src/app/\(dashboard\)/projects/\[id\]/project-detail-content.tsx src/app/\(dashboard\)/projects/\[id\]/page.tsx
git commit -m "feat(rsc): convert goal and project detail pages to server components"
```

---

## Task 13: Convert areas/[id] detail page

**Files:**
- Create: `src/app/(dashboard)/areas/[id]/area-detail-content.tsx`
- Modify: `src/app/(dashboard)/areas/[id]/page.tsx`

- [ ] **Step 1: Create area-detail-content.tsx**

Copy entire contents of `src/app/(dashboard)/areas/[id]/page.tsx`. Export as `AreaDetailContent`. Keep `"use client"` and all imports.

- [ ] **Step 2: Rewrite areas/[id]/page.tsx**

```ts
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { makeQueryClient } from "@/lib/queries/server-query-client"
import { AREA_DETAIL_QUERY_KEY } from "@/lib/hooks/use-area-detail"
import { serverFetchAreaDetail } from "@/lib/queries/area-detail.queries"
import { AreaDetailContent } from "./area-detail-content"

export default async function AreaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const queryClient = makeQueryClient()
  await queryClient.prefetchQuery({
    queryKey: [AREA_DETAIL_QUERY_KEY, id],
    queryFn: () => serverFetchAreaDetail(supabase, user.id, id),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AreaDetailContent />
    </HydrationBoundary>
  )
}
```

- [ ] **Step 3: Verify + Test + Commit**

```bash
pnpm tsc --noEmit
# Visit http://localhost:3030/areas/[some-id]
git add src/app/\(dashboard\)/areas/\[id\]/area-detail-content.tsx src/app/\(dashboard\)/areas/\[id\]/page.tsx
git commit -m "feat(rsc): convert area detail page to server component with prefetch"
```

---

## Task 14: Convert notes/[id], topics/[id], contacts/[id] detail pages

**Files:**
- Create + Modify: `notes/[id]`, `topics/[id]`, `contacts/[id]` pages

These pages use `useNote(id)`, `useTopic(id)`, `useContact(id)` hooks. Check the query keys in their respective hook files before writing.

- [ ] **Step 1: Check hook query keys**

Open these files and note the `queryKey` used:
- `src/lib/hooks/use-notes.ts` → `useNote(id)` → likely `[NOTES_QUERY_KEY, id]`
- `src/lib/hooks/use-topics.ts` → `useTopic(id)` → likely `[TOPICS_QUERY_KEY, id]`
- `src/lib/hooks/use-contacts.ts` → `useContact(id)` → likely `[CONTACTS_QUERY_KEY, id]`

- [ ] **Step 2: Create content files**

For each: copy the entire page.tsx, rename export to `NoteDetailContent` / `TopicDetailContent` / `ContactDetailContent`, keep `"use client"`.

- [ ] **Step 3: Rewrite notes/[id]/page.tsx**

```ts
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { makeQueryClient } from "@/lib/queries/server-query-client"
import { NOTES_QUERY_KEY } from "@/lib/hooks/use-notes"
import { NoteDetailContent } from "./note-detail-content"

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const queryClient = makeQueryClient()
  await queryClient.prefetchQuery({
    queryKey: [NOTES_QUERY_KEY, id],
    queryFn: async () => {
      const { data } = await supabase
        .from("notes")
        .select("id, user_id, area_id, project_id, topic_id, title, content, status, is_favorite, is_archived, slug, created_at, updated_at")
        .eq("user_id", user.id)
        .or(`id.eq.${id},slug.eq.${id}`)
        .single()
      return data
    },
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <NoteDetailContent />
    </HydrationBoundary>
  )
}
```

- [ ] **Step 4: Rewrite topics/[id]/page.tsx**

```ts
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { makeQueryClient } from "@/lib/queries/server-query-client"
import { TOPICS_QUERY_KEY } from "@/lib/hooks/use-topics"
import { TopicDetailContent } from "./topic-detail-content"

export default async function TopicDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const queryClient = makeQueryClient()
  await queryClient.prefetchQuery({
    queryKey: [TOPICS_QUERY_KEY, id],
    queryFn: async () => {
      const { data } = await supabase
        .from("topics")
        .select("id, user_id, name, description, slug, is_archived, created_at, updated_at")
        .eq("user_id", user.id)
        .or(`id.eq.${id},slug.eq.${id}`)
        .single()
      return data
    },
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TopicDetailContent />
    </HydrationBoundary>
  )
}
```

- [ ] **Step 5: Rewrite contacts/[id]/page.tsx**

```ts
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { makeQueryClient } from "@/lib/queries/server-query-client"
import { CONTACTS_QUERY_KEY } from "@/lib/hooks/use-contacts"
import { ContactDetailContent } from "./contact-detail-content"

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const queryClient = makeQueryClient()
  await queryClient.prefetchQuery({
    queryKey: [CONTACTS_QUERY_KEY, id],
    queryFn: async () => {
      const { data } = await supabase
        .from("contacts")
        .select("id, user_id, name, email, phone, company, role, image_url, notes, is_favorite, is_archived, created_at, updated_at")
        .eq("user_id", user.id)
        .eq("id", id)
        .single()
      return data
    },
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ContactDetailContent />
    </HydrationBoundary>
  )
}
```

- [ ] **Step 6: Verify + Test + Commit**

```bash
pnpm tsc --noEmit
# Visit a note, topic, and contact detail page to verify immediate render
git add src/app/\(dashboard\)/notes/\[id\]/note-detail-content.tsx src/app/\(dashboard\)/notes/\[id\]/page.tsx src/app/\(dashboard\)/topics/\[id\]/topic-detail-content.tsx src/app/\(dashboard\)/topics/\[id\]/page.tsx src/app/\(dashboard\)/contacts/\[id\]/contact-detail-content.tsx src/app/\(dashboard\)/contacts/\[id\]/page.tsx
git commit -m "feat(rsc): convert note, topic, contact detail pages to server components"
```

---

## Task 15: Convert dashboard page

**Files:**
- Create: `src/app/(dashboard)/dashboard/dashboard-content.tsx`
- Create: `src/lib/queries/dashboard.queries.ts`
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Create dashboard.queries.ts**

Open `src/lib/services/dashboard.service.ts` and copy the full `getToday` query logic. Adapt it to accept a server Supabase client:

```ts
// src/lib/queries/dashboard.queries.ts
import type { SupabaseClient } from "@supabase/supabase-js"
import type { TodayData } from "@/lib/services/dashboard.service"
import { getLocalDateEnd, getLocalDateStart, getWeekStart } from "@/lib/utils/dates"

export async function serverFetchDashboard(
  supabase: SupabaseClient,
  userId: string,
): Promise<TodayData> {
  const todayStart = getLocalDateStart()
  const todayEnd = getLocalDateEnd()
  const weekStart = getWeekStart()

  const [
    { data: tasksData },
    { data: focusTasks },
    { data: goalsData },
    { count: completedThisWeek },
    { count: activeGoalsCount },
    { count: overdueCount },
  ] = await Promise.all([
    supabase.from("tasks").select("id, title, description, due_date, priority, status, project_id, area_id, projects(name), areas(name)").eq("user_id", userId).eq("status", "pending").gte("due_date", todayStart).lte("due_date", todayEnd).order("due_date", { ascending: true }),
    supabase.from("tasks").select("id, title, description, due_date, priority, status, project_id, area_id, projects(name), areas(name)").eq("user_id", userId).eq("status", "pending").eq("is_focus", true).limit(20),
    supabase.from("goals").select("id, title, description, progress, target_date, area_id, areas(name)").eq("user_id", userId).eq("status", "active").order("priority", { ascending: false }).limit(5),
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("status", "completed").gte("updated_at", weekStart),
    supabase.from("goals").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("status", "active"),
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("user_id", userId).eq("status", "pending").lt("due_date", todayStart),
  ])

  type TodayTaskRow = NonNullable<typeof tasksData>[number]
  const taskMap = new Map<string, TodayTaskRow>()
  for (const t of tasksData ?? []) taskMap.set(t.id, t)
  for (const t of focusTasks ?? []) if (!taskMap.has(t.id)) taskMap.set(t.id, t)

  const todayStartDate = new Date(todayStart)
  const todayTasksFormatted = Array.from(taskMap.values()).map((t) => {
    const dueDate = t.due_date ? new Date(t.due_date) : null
    return {
      id: t.id,
      title: t.title,
      description: t.description,
      dueDate: t.due_date,
      priority: t.priority,
      status: t.status,
      isOverdue: dueDate !== null && dueDate < todayStartDate && t.status === "pending",
      projectId: t.project_id,
      projectName: (t.projects?.[0] as { name: string } | undefined)?.name ?? null,
      areaId: t.area_id,
      areaName: (t.areas?.[0] as { name: string } | undefined)?.name ?? null,
    }
  })

  const activeGoals = (goalsData ?? []).map((g) => ({
    id: g.id,
    title: g.title,
    description: g.description,
    progress: g.progress ?? 0,
    targetDate: g.target_date,
    areaName: (g.areas as { name: string }[] | null)?.[0]?.name ?? null,
  }))

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : hour < 21 ? "evening" : "night"

  return {
    greeting,
    tasksTodayCount: todayTasksFormatted.length,
    todayTasks: todayTasksFormatted,
    activeGoals,
    stats: {
      completedThisWeek: completedThisWeek ?? 0,
      activeGoalsCount: activeGoalsCount ?? 0,
      overdueCount: overdueCount ?? 0,
    },
    recentActivity: [],
  }
}
```

**Note:** `recentActivity` is left empty to avoid extra queries. The client will re-fetch the full data on mount (30s staleTime). If recentActivity is important to prefetch, add the 4 activity queries from `getRecentActivity` in `dashboard.service.ts`.

- [ ] **Step 2: Create dashboard-content.tsx**

Copy entire contents of `src/app/(dashboard)/dashboard/page.tsx`. Export as `DashboardContent`. Keep `"use client"` and all imports.

- [ ] **Step 3: Rewrite dashboard/page.tsx**

```ts
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { makeQueryClient } from "@/lib/queries/server-query-client"
import { DASHBOARD_QUERY_KEY } from "@/lib/services/dashboard.service"
import { serverFetchDashboard } from "@/lib/queries/dashboard.queries"
import { DashboardContent } from "./dashboard-content"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const queryClient = makeQueryClient()
  // useDashboardToday() key: ["dashboard", userId, "today"]
  await queryClient.prefetchQuery({
    queryKey: [DASHBOARD_QUERY_KEY, user.id, "today"],
    queryFn: () => serverFetchDashboard(supabase, user.id),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardContent />
    </HydrationBoundary>
  )
}
```

- [ ] **Step 4: Verify + Test + Commit**

```bash
pnpm tsc --noEmit
# Visit http://localhost:3030/dashboard
# Verify greeting bar and today's tasks render immediately with no skeleton flash
git add src/lib/queries/dashboard.queries.ts src/app/\(dashboard\)/dashboard/dashboard-content.tsx src/app/\(dashboard\)/dashboard/page.tsx
git commit -m "feat(rsc): convert dashboard page to server component with prefetch"
```

---

## Task 16: Convert my-day page

**Files:**
- Create: `src/app/(dashboard)/my-day/my-day-content.tsx`
- Modify: `src/app/(dashboard)/my-day/page.tsx`

`useMyDayTasks` and `useMyDayAvailable` both derive from `useTasks()` — they just filter in memory. So prefetching tasks (`["tasks"]`) is sufficient.

- [ ] **Step 1: Create my-day-content.tsx**

Copy entire contents of `src/app/(dashboard)/my-day/page.tsx`. Export as `MyDayContent`. Keep `"use client"` and all imports.

- [ ] **Step 2: Rewrite my-day/page.tsx**

```ts
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { makeQueryClient } from "@/lib/queries/server-query-client"
import { TASKS_QUERY_KEY } from "@/lib/hooks/use-tasks"
import { serverFetchTasks } from "@/lib/queries/tasks.queries"
import { MyDayContent } from "./my-day-content"

export default async function MyDayPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const queryClient = makeQueryClient()
  await queryClient.prefetchQuery({
    queryKey: [TASKS_QUERY_KEY],
    queryFn: () => serverFetchTasks(supabase, user.id),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <MyDayContent />
    </HydrationBoundary>
  )
}
```

- [ ] **Step 3: Verify + Test + Commit**

```bash
pnpm tsc --noEmit
# Visit http://localhost:3030/my-day
# Verify tasks render immediately, no spinner
git add src/app/\(dashboard\)/my-day/my-day-content.tsx src/app/\(dashboard\)/my-day/page.tsx
git commit -m "feat(rsc): convert my-day page to server component with prefetch"
```

---

## Final Verification

- [ ] Run `pnpm tsc --noEmit` — zero errors
- [ ] Visit each of the 16 converted pages and confirm no loading spinner on hard refresh
- [ ] Open DevTools Network tab on `/goals`: confirm no `supabase.co/rest/v1/goals` request fires on initial load
- [ ] Confirm filter interactions, dialogs, and mutations still work on all pages
- [ ] Run `pnpm build` — confirm production build succeeds with no errors

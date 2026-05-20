# RSC Server Prefetch Migration — Design Spec

**Date:** 2026-05-20  
**Status:** Approved  

## Goal

Convert 21 dashboard `page.tsx` files from `"use client"` to async Server Components. Each page prefetches its primary dataset server-side using the existing server Supabase client, dehydrates it into React Query's cache via `HydrationBoundary`, and renders a client component containing all existing interactive logic. Result: zero loading state on first render, server-rendered HTML with data baked in.

## Non-Goals

- Replacing Zustand filter stores with URL params
- Converting list/card/dialog components to server components
- Changing any hook, service, mutation, or optimistic update logic
- Group D pages: `inbox`, `knowledge`, `settings`, `notes/new`, `areas/[id]/edit`

## Architecture

### Pattern (applied to every in-scope page)

**Before:**
```
page.tsx ("use client")
  → useQuery → network fetch → loading state → render
```

**After:**
```
page.tsx (Server, async)
  → server Supabase client → prefetchQuery → dehydrate
  → HydrationBoundary
      → [module]-content.tsx ("use client")
          → useQuery → cache HIT → instant render
```

### File structure per page

| File | Role |
|------|------|
| `src/app/(dashboard)/[module]/page.tsx` | Async server component — auth check, prefetch, HydrationBoundary |
| `src/app/(dashboard)/[module]/[module]-content.tsx` | Client component — all existing page JSX moved here |
| `src/lib/queries/[module].queries.ts` | Server query functions using server Supabase client |
| `src/lib/queries/server-query-client.ts` | Factory for fresh per-request QueryClient |

### Shared infrastructure

**`src/lib/queries/server-query-client.ts`**

```ts
import { QueryClient } from "@tanstack/react-query"

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60 * 1000 },
    },
  })
}
```

Must be called per request — never a module-level singleton.

## Data Flow

### Server query functions

Each `src/lib/queries/[module].queries.ts` exports pure async functions that accept a server Supabase client and userId. They mirror the SQL logic in the existing service layer but take the client as a parameter.

```ts
// src/lib/queries/goals.queries.ts
import type { SupabaseClient } from "@supabase/supabase-js"
import type { GoalQueryFilters } from "@/lib/hooks/use-goals"

const GOAL_SELECT = "id, user_id, area_id, name, description, term, priority, target_date, progress, is_completed, is_archived, slug, created_at, updated_at"

export async function serverFetchGoals(
  supabase: SupabaseClient,
  userId: string,
  filters: GoalQueryFilters
) {
  let query = supabase
    .from("goals")
    .select(GOAL_SELECT)
    .eq("user_id", userId)
    .eq("is_archived", false)

  if (filters.status === "completed") query = query.eq("is_completed", true)
  else if (filters.status === "active") query = query.eq("is_completed", false)

  const { data } = await query
  return data ?? []
}
```

### Page.tsx pattern

```ts
// src/app/(dashboard)/goals/page.tsx
import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { makeQueryClient } from "@/lib/queries/server-query-client"
import { GOALS_QUERY_KEY } from "@/lib/hooks/use-goals"
import { serverFetchGoals } from "@/lib/queries/goals.queries"
import { GoalsContent } from "./goals-content"

const DEFAULT_FILTERS = { status: "active", term: "all" } as const

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

### Content component

```ts
// src/app/(dashboard)/goals/goals-content.tsx
"use client"

// All existing JSX from goals/page.tsx moves here verbatim.
// No other changes.
export function GoalsContent() { ... }
```

### Default prefetch per page

| Page | Dataset(s) prefetched | Default filter |
|------|-----------------------|----------------|
| `goals` | goals | `{ status: "active", term: "all" }` |
| `projects` | projects | `{ status: "active" }` |
| `tasks` | tasks | all |
| `notes` | notes | `{ includeArchived: false }` |
| `contacts` | contacts | all |
| `areas` | areas + goals + projects + tasks + notes + resources | all |
| `resources` | resources | all |
| `topics` | topics | all |
| `goals/[id]` | goal detail by id | — |
| `projects/[id]` | project detail by id | — |
| `areas/[id]` | area detail + linked entities | — |
| `notes/[id]` | note by id | — |
| `topics/[id]` | topic by id | — |
| `contacts/[id]` | contact by id | — |
| `dashboard` | tasks + goals + projects + areas (parallel) | all |
| `my-day` | tasks + notes | today's date |

### Dashboard: parallel fetches + Suspense streaming

Dashboard prefetches all 4 datasets in parallel. Each section is wrapped in `<Suspense>` so the page streams sections independently.

```ts
await Promise.all([
  queryClient.prefetchQuery({ queryKey: ["tasks"], queryFn: ... }),
  queryClient.prefetchQuery({ queryKey: ["goals"], queryFn: ... }),
  queryClient.prefetchQuery({ queryKey: ["projects"], queryFn: ... }),
  queryClient.prefetchQuery({ queryKey: ["areas"], queryFn: ... }),
])
```

## Auth

`supabase.auth.getUser()` in the server component replaces the client-side auth redirect in `AuthProvider`. If no user, `redirect("/login")` fires server-side — faster than the current client-side redirect (no unauthenticated flash).

The existing `AuthProvider` continues to manage session refresh and `onAuthStateChange` for client-side navigation. These are complementary, not redundant.

## What Does Not Change

- `src/lib/hooks/use-*.ts` — all hooks untouched
- `src/lib/services/*.ts` — all services untouched  
- `src/lib/stores/*.ts` — Zustand stores untouched
- All dialog, card, list, table components — untouched
- Mutation logic + optimistic updates — untouched
- `src/components/providers/query-provider.tsx` — untouched
- `src/lib/supabase/client.ts` and `server.ts` — untouched

## Pages in Scope

### Group A — Single dataset (8 pages)
`goals`, `projects`, `tasks`, `notes`, `contacts`, `areas`, `resources`, `topics`

### Group B — Detail pages (6 pages)
`goals/[id]`, `projects/[id]`, `areas/[id]`, `notes/[id]`, `topics/[id]`, `contacts/[id]`

### Group C — Multi-dataset (2 pages)
`dashboard`, `my-day`

### Group D — Skipped (5 pages)
`inbox`, `knowledge`, `settings`, `notes/new`, `areas/[id]/edit`
Reason: no primary data fetch, pure form UI, or negligible traffic impact.

## Build Order

1. Shared infrastructure: `makeQueryClient`, import pattern for server client
2. Group A — 8 simple pages (validates pattern end-to-end)
3. Group B — 6 detail pages (reads `params.id` from route)
4. Group C — multi-dataset pages (parallel + Suspense)

## Query Key Alignment

Server prefetch must use the **exact same query key** as the client `useQuery` call, or the cache miss will cause a client refetch. Each module's query key constant (e.g. `GOALS_QUERY_KEY`) is imported and reused in both the server query function and the page prefetch call.

## Risk + Mitigations

| Risk | Mitigation |
|------|-----------|
| Query key mismatch causes client refetch | Import key constants from hook files, not hardcode strings |
| Server Supabase client not cookie-authenticated | `createClient()` from `src/lib/supabase/server.ts` already uses `cookies()` |
| `makeQueryClient` accidentally shared across requests | Factory function (not singleton) enforced by linting pattern |
| Detail page params not available at server | Use `{ params }: { params: Promise<{ id: string }> }` — App Router passes params to page |
| Areas page fetches 6 datasets — slow server render | Cap with `Promise.all`, add Suspense on each section |

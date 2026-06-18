# Clerk Auth Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current Supabase Auth (email/password + Google OAuth) with Clerk authentication, wired to the existing Supabase Postgres database via Clerk's **native third-party auth integration**, preserving existing user data.

**Architecture:** Clerk owns the auth shell (sign-in/up UI, session, middleware). Supabase remains the database. The two are bridged by Clerk's native integration: Clerk session tokens carry a `role: authenticated` claim, and the Supabase clients are rebuilt to attach that token through the `accessToken()` callback. Row-Level Security policies are rewritten from `auth.uid() = user_id` to `(select auth.jwt()->>'sub') = user_id::text`, and `user_id` columns change from `uuid` to `text` (Clerk ids are strings like `user_2abc...`). Existing rows are backfilled via an explicit Supabase-UUID → Clerk-id mapping. The existing `useAuth()` hook interface is preserved as a thin shim over Clerk so the ~51 consumer files keep working.

**Tech Stack:** Next.js 16 (App Router), React 19, `@clerk/nextjs@latest`, `@supabase/supabase-js`, TanStack Query, TypeScript, Vitest, pnpm.

## Global Constraints

- Package manager is **pnpm** (use `pnpm add`, `pnpm tsc`, `pnpm vitest run`, `pnpm lint`, `pnpm build`). A `pnpm-lock.yaml` exists — do not introduce npm/yarn.
- Next.js version is **16.2.6** with App Router. The proxy/middleware file is `src/proxy.ts` and exports `proxy` + `config` (this repo uses `proxy.ts`, matching the Clerk quickstart's `proxy.ts` note). Read `node_modules/next/dist/docs/` before changing middleware conventions if anything is unclear.
- Clerk imports come **only** from `@clerk/nextjs` (client) or `@clerk/nextjs/server` (server). Use `clerkMiddleware()`, never the deprecated `authMiddleware()`.
- The Supabase **service-role** client (`src/lib/supabase/admin.ts`) must never reach the browser bundle — leave its `typeof window` guard intact.
- RLS must stay **enabled** on every table after migration. A missing/disabled policy leaks other users' rows. Never disable RLS as a shortcut.
- Reuse the existing env var name `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the Supabase publishable/anon key (same value Clerk's docs call `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) to minimize churn. Add only the new Clerk keys.
- All DB schema changes are delivered as **new dated Supabase migration files** under `supabase/migrations/` — never edit existing migrations.
- This work runs in an isolated git worktree named **`command-center-full-coverage`** (created via `superpowers:using-git-worktrees`). All commands run from the repo root inside that worktree.

---

## File Map

| File | Change |
|------|--------|
| `package.json` | Add `@clerk/nextjs` dependency |
| `.env.local` (not committed) | Add Clerk keys; keep Supabase URL + anon key |
| `.env.example` (create if absent) | Document required env vars |
| `src/proxy.ts` | Replace Supabase `updateSession` with `clerkMiddleware()` + route protection |
| `src/app/layout.tsx` | Wrap tree in `<ClerkProvider>` |
| `src/lib/supabase/client.ts` | Rebuild browser client with `accessToken()` reading `window.Clerk` token |
| `src/lib/supabase/server.ts` | Rebuild server client with `accessToken()` reading Clerk `auth()` token |
| `src/lib/supabase/admin.ts` | Unchanged (verify guard intact) |
| `src/lib/supabase/session-proxy.ts` | Delete (replaced by clerkMiddleware) |
| `src/app/auth/callback/route.ts` | Delete (Clerk owns OAuth callback) |
| `src/components/providers/auth-provider.tsx` | Rewrite as Clerk-backed shim preserving `useAuth()` shape |
| `src/lib/auth/auth-routing.ts` | Keep redirect helpers; used by middleware matcher logic |
| `src/app/(auth)/login/page.tsx` | Replace Supabase form with Clerk `<SignIn />` |
| `src/app/(auth)/signup/page.tsx` | Replace Supabase form with Clerk `<SignUp />` |
| `src/app/(auth)/forgot-password/page.tsx` | Remove (Clerk handles reset) — redirect to `/login` |
| `src/app/(auth)/reset-password/page.tsx` | Remove (Clerk handles reset) — redirect to `/login` |
| `src/components/layout/topbar.tsx` | Swap custom sign-out for Clerk `<UserButton />` / `signOut` |
| `src/components/layout/sidebar.tsx`, `mobile-nav.tsx` | Update any `useAuth().signOut` call sites if shape changed |
| `supabase/migrations/<ts>_clerk_rls_rewrite.sql` | Create: drop old policies, alter `user_id` to text, recreate Clerk policies |
| `supabase/migrations/<ts>_clerk_user_backfill.sql` | Create: map old Supabase UUIDs → Clerk ids and update rows |
| `tests/unit/auth-routing.test.ts` | Add/extend tests for routing helpers |
| `tests/unit/supabase-client.test.ts` | Create: assert `accessToken` callback wiring |

---

## Task 1 — Install Clerk and scaffold env vars

**Files:**
- Modify: `package.json` (via pnpm)
- Create: `.env.example`

**Interfaces:**
- Produces: `@clerk/nextjs` available for import; documented env var names.

- [ ] **Step 1: Install the package**

Run:
```bash
pnpm add @clerk/nextjs@latest
```
Expected: `@clerk/nextjs` appears under `dependencies` in `package.json`; lockfile updated.

- [ ] **Step 2: Add Clerk keys to `.env.local`** (local only — do NOT commit)

Add these lines to `.env.local` (values from https://dashboard.clerk.com/ → API Keys):
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_REPLACE_ME
CLERK_SECRET_KEY=sk_test_REPLACE_ME
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
```
Keep the existing `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` lines.

- [ ] **Step 3: Document env vars in `.env.example`**

Create `.env.example`:
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
```

- [ ] **Step 4: Configure the native integration (manual dashboard step — record, do not block code)**

Document in the commit body that the operator must:
1. Clerk Dashboard → Integrations → Supabase → activate → copy the Clerk domain.
2. Supabase Dashboard → Authentication → Sign In / Providers → add provider → Clerk → paste the Clerk domain.

- [ ] **Step 5: Commit**
```bash
git add package.json pnpm-lock.yaml .env.example
git commit -m "feat(auth): add @clerk/nextjs and scaffold Clerk env vars"
```

---

## Task 2 — clerkMiddleware in proxy.ts

**Files:**
- Modify: `src/proxy.ts`
- Reference: `src/lib/auth/auth-routing.ts` (existing `PUBLIC_APP_PATHS`, `isProtectedAppPath`)

**Interfaces:**
- Consumes: `clerkMiddleware`, `createRouteMatcher` from `@clerk/nextjs/server`.
- Produces: a `proxy` export and `config.matcher` that gate every non-public route on a Clerk session.

- [ ] **Step 1: Replace the file contents**

Replace all of `src/proxy.ts`:
```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Public routes that never require a session. Everything else is protected
// (deny-by-default), mirroring the prior auth-routing behavior.
const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/signup(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/__clerk/:path*",
    "/(api|trpc)(.*)",
  ],
};
```

> Note: Next.js in this repo loads middleware from `src/proxy.ts` with a default export. The Clerk quickstart's `proxy.ts` convention matches. If a `proxy`-named export is required by this Next version, re-export: `export const proxy = clerkMiddleware(...)`. Verify by reading `node_modules/next/dist/docs/` for the middleware/proxy contract before finalizing.

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: PASS (no references to deleted `updateSession` remain).

- [ ] **Step 3: Commit**
```bash
git add src/proxy.ts
git commit -m "feat(auth): replace supabase session proxy with clerkMiddleware"
```

---

## Task 3 — ClerkProvider in layout.tsx

**Files:**
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `ClerkProvider` from `@clerk/nextjs`.
- Produces: a Clerk-context-wrapped tree so `useUser`/`useSession`/`useClerk` work app-wide.

- [ ] **Step 1: Wrap the body in `<ClerkProvider>`**

Add the import and wrap the existing provider tree. Replace the import block and the `<body>` return:
```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { InboxBackfillProvider } from "@/components/providers/inbox-backfill-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UIProvider } from "@/lib/stores/ui.store";
```

```tsx
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col antialiased`} suppressHydrationWarning>
        <ClerkProvider>
          <QueryProvider>
            <div suppressHydrationWarning>
              <ThemeProvider>
                <AuthProvider>
                  <InboxBackfillProvider>
                    <TooltipProvider>
                      <UIProvider>
                        {children}
                      </UIProvider>
                    </TooltipProvider>
                  </InboxBackfillProvider>
                </AuthProvider>
              </ThemeProvider>
            </div>
          </QueryProvider>
        </ClerkProvider>
      </body>
    </html>
  );
```
(`ClerkProvider` is the outermost wrapper inside `<body>` so all downstream providers — including the rewritten `AuthProvider` — can read Clerk context.)

- [ ] **Step 2: Type-check + commit**

Run: `pnpm tsc --noEmit` → PASS
```bash
git add src/app/layout.tsx
git commit -m "feat(auth): mount ClerkProvider in root layout"
```

---

## Task 4 — Rebuild the Supabase browser client (Clerk token)

**Files:**
- Modify: `src/lib/supabase/client.ts`
- Test: `tests/unit/supabase-client.test.ts`

**Interfaces:**
- Produces: `createClient(): SupabaseClient` — arg-free, so all existing browser-side service call sites stay unchanged. Token is fetched lazily from `window.Clerk.session.getToken()`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/supabase-client.test.ts`:
```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";

const createClientMock = vi.fn(() => ({ from: vi.fn() }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

describe("browser supabase client", () => {
  beforeEach(() => {
    createClientMock.mockClear();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
  });

  it("passes an accessToken callback that reads the Clerk session token", async () => {
    const getToken = vi.fn().mockResolvedValue("clerk-jwt");
    (globalThis as unknown as { window: { Clerk?: unknown } }).window = {
      Clerk: { session: { getToken } },
    };

    const { createClient } = await import("@/lib/supabase/client");
    createClient();

    const opts = createClientMock.mock.calls[0]?.[2] as {
      accessToken: () => Promise<string | null>;
    };
    const token = await opts.accessToken();
    expect(token).toBe("clerk-jwt");
    expect(getToken).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm vitest run tests/unit/supabase-client.test.ts`
Expected: FAIL (current `client.ts` uses `createBrowserClient` from `@supabase/ssr`, no `accessToken`).

- [ ] **Step 3: Rewrite the client**

Replace all of `src/lib/supabase/client.ts`:
```typescript
"use client";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

declare global {
  interface Window {
    Clerk?: {
      session?: { getToken: () => Promise<string | null> };
    };
  }
}

export const createClient = () =>
  createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      async accessToken() {
        return (await window.Clerk?.session?.getToken()) ?? null;
      },
    },
  );
```

- [ ] **Step 4: Run the test**

Run: `pnpm vitest run tests/unit/supabase-client.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**
```bash
git add src/lib/supabase/client.ts tests/unit/supabase-client.test.ts
git commit -m "feat(auth): browser supabase client uses Clerk accessToken"
```

---

## Task 5 — Rebuild the Supabase server client (Clerk token)

**Files:**
- Modify: `src/lib/supabase/server.ts`

**Interfaces:**
- Consumes: `auth` from `@clerk/nextjs/server`.
- Produces: `createClient(): Promise<SupabaseClient>` — keeps the `await createClient()` shape used by server-side call sites.

- [ ] **Step 1: Rewrite the file**

Replace all of `src/lib/supabase/server.ts`:
```typescript
import { auth } from "@clerk/nextjs/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const createClient = async () => {
  const { getToken } = await auth();

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      async accessToken() {
        return (await getToken()) ?? null;
      },
    },
  );
};
```

- [ ] **Step 2: Type-check**

Run: `pnpm tsc --noEmit`
Expected: PASS (server call sites already `await createClient()`).

- [ ] **Step 3: Commit**
```bash
git add src/lib/supabase/server.ts
git commit -m "feat(auth): server supabase client uses Clerk accessToken"
```

---

## Task 6 — Rewrite AuthProvider as a Clerk-backed `useAuth()` shim

**Files:**
- Modify: `src/components/providers/auth-provider.tsx`

**Interfaces:**
- Consumes: `useUser`, `useClerk` from `@clerk/nextjs`.
- Produces: `useAuth(): { user, isLoading, signOut }` and `AuthProvider` — same names the ~51 consumers import. `user` exposes `{ id, email }` (`id` is the Clerk user id, a string, which now equals the new text `user_id` column).

- [ ] **Step 1: Rewrite the provider**

Replace all of `src/components/providers/auth-provider.tsx`:
```tsx
"use client";

import React, { createContext, useContext, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useClerk, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

import { AREAS_QUERY_KEY } from "@/lib/hooks/use-areas";
import { seedDefaultAreas } from "@/lib/services/onboarding.service";

interface AuthUser {
  id: string;
  email: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, user: clerkUser } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const router = useRouter();
  const queryClient = useQueryClient();
  const seededUserIdsRef = useRef(new Set<string>());

  const user: AuthUser | null = clerkUser
    ? {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
      }
    : null;

  useEffect(() => {
    if (!user) return;
    if (seededUserIdsRef.current.has(user.id)) return;
    seededUserIdsRef.current.add(user.id);

    void (async () => {
      try {
        await seedDefaultAreas(user.id);
        await queryClient.invalidateQueries({ queryKey: [AREAS_QUERY_KEY] });
      } catch (error) {
        seededUserIdsRef.current.delete(user.id);
        if (process.env.NODE_ENV !== "production") {
          console.error("Failed to seed default areas", error);
        }
      }
    })();
  }, [user, queryClient]);

  async function signOut() {
    await clerkSignOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <AuthContext.Provider value={{ user, isLoading: !isLoaded, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
```

- [ ] **Step 2: Find consumers reading removed fields**

The old `user` was a Supabase `User`. Find any consumer reading a field other than `id`/`email` (e.g. `user.user_metadata`, `user.session`):
```bash
git grep -nE "useAuth\(\)" -- "src/**/*.tsx" "src/**/*.ts"
```
For each hit, open the file and confirm it only reads `user.id`, `user.email`, `isLoading`, or `signOut`. Fix any that read other fields (map to Clerk equivalents or remove). Also remove any `session` destructuring from `useAuth()` (the shim no longer exposes `session`).

- [ ] **Step 3: Type-check**

Run: `pnpm tsc --noEmit`
Expected: PASS. Resolve any errors from `session` removal before continuing.

- [ ] **Step 4: Commit**
```bash
git add -A
git commit -m "feat(auth): back useAuth() with Clerk, preserve consumer interface"
```

---

## Task 7 — Replace auth pages with Clerk components

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/signup/page.tsx`
- Modify: `src/app/(auth)/forgot-password/page.tsx`
- Modify: `src/app/(auth)/reset-password/page.tsx`

**Interfaces:**
- Consumes: `SignIn`, `SignUp` from `@clerk/nextjs`.
- Produces: working sign-in/sign-up routes; password reset delegated to Clerk's built-in flow.

- [ ] **Step 1: Replace login page**

Replace all of `src/app/(auth)/login/page.tsx`:
```tsx
import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="flex justify-center">
      <SignIn
        routing="path"
        path="/login"
        signUpUrl="/signup"
        fallbackRedirectUrl="/dashboard"
      />
    </div>
  );
}
```

- [ ] **Step 2: Replace signup page**

Replace all of `src/app/(auth)/signup/page.tsx`:
```tsx
import { SignUp } from "@clerk/nextjs";

export default function SignupPage() {
  return (
    <div className="flex justify-center">
      <SignUp
        routing="path"
        path="/signup"
        signInUrl="/login"
        fallbackRedirectUrl="/dashboard"
      />
    </div>
  );
}
```

- [ ] **Step 3: Redirect the legacy reset routes**

Replace all of `src/app/(auth)/forgot-password/page.tsx` AND `src/app/(auth)/reset-password/page.tsx` with the same redirect (Clerk's `<SignIn />` handles "forgot password" inline):
```tsx
import { redirect } from "next/navigation";

export default function Page() {
  redirect("/login");
}
```

- [ ] **Step 4: Verify the `(auth)` layout doesn't reference Supabase**

Read `src/app/(auth)/layout.tsx`. If it imports `createClient` / `useAuth` / Supabase, remove those imports (the layout should be presentational only now).

- [ ] **Step 5: Type-check + commit**

Run: `pnpm tsc --noEmit` → PASS
```bash
git add "src/app/(auth)"
git commit -m "feat(auth): replace supabase auth pages with Clerk SignIn/SignUp"
```

---

## Task 8 — Update nav sign-out and remove dead Supabase auth code

**Files:**
- Modify: `src/components/layout/topbar.tsx`
- Modify: `src/components/layout/sidebar.tsx`, `src/components/layout/mobile-nav.tsx` (if they call `signOut`)
- Delete: `src/lib/supabase/session-proxy.ts`
- Delete: `src/app/auth/callback/route.ts`

**Interfaces:**
- Consumes: `UserButton` from `@clerk/nextjs` (optional, for profile menu).

- [ ] **Step 1: Confirm sign-out call sites still compile**

The `useAuth().signOut` interface is unchanged (Task 6), so existing `signOut()` calls in `topbar.tsx` / `sidebar.tsx` / `mobile-nav.tsx` keep working. Optionally replace a custom avatar/menu with Clerk's `<UserButton afterSignOutUrl="/login" />`. Read each file first; only edit if it imported Supabase directly.

- [ ] **Step 2: Delete the dead Supabase auth files**

Run:
```bash
git rm src/lib/supabase/session-proxy.ts src/app/auth/callback/route.ts
```

- [ ] **Step 3: Confirm nothing imports the deleted modules**

Run:
```bash
git grep -nE "session-proxy|auth/callback" -- src
```
Expected: no results. If `proxy.ts` still imports `session-proxy`, it was missed in Task 2 — fix it.

- [ ] **Step 4: Type-check + commit**

Run: `pnpm tsc --noEmit` → PASS
```bash
git add -A
git commit -m "refactor(auth): remove supabase session-proxy and oauth callback"
```

---

## Task 9 — DB migration: rewrite RLS for Clerk and change `user_id` to text

**Files:**
- Create: `supabase/migrations/20260618000001_clerk_rls_rewrite.sql`

**Interfaces:**
- Produces: every `user_id`-owned table gated on `(select auth.jwt()->>'sub') = user_id::text`, with `user_id` typed `text`.

- [ ] **Step 1: Enumerate every table that has a `user_id` column and its policies**

Run this in the Supabase SQL editor (or `psql`) and record the output — it is the authoritative list to transform:
```sql
-- Tables with a user_id column
select table_name
from information_schema.columns
where table_schema = 'public' and column_name = 'user_id'
order by table_name;

-- Existing policies referencing auth.uid()
select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

- [ ] **Step 2: Write the migration**

Create `supabase/migrations/20260618000001_clerk_rls_rewrite.sql`. For EACH table from Step 1, emit the block below. The known core tables are: `areas`, `goals`, `projects`, `tasks`, `notes`, `contacts`, `user_settings`, plus resource/topic/junction tables surfaced by Step 1 (e.g. `resources`, `topics`, `task_areas`, `goal_tasks`, `note_projects`, `note_related_notes`, `contact_*`). Repeat the pattern verbatim per table — do not abbreviate with "etc.".

Header + a fully worked example for `tasks`:
```sql
-- Clerk native integration: rewrite RLS from auth.uid() (uuid) to
-- auth.jwt()->>'sub' (Clerk text id), and change user_id columns to text.
-- Policies must be dropped before the type change because they reference user_id.

begin;

-- ── tasks ──────────────────────────────────────────────────────────────
drop policy if exists "Users can only access their own tasks" on tasks;

alter table tasks
  alter column user_id type text using user_id::text;

create policy "tasks_select_own" on tasks
  for select to authenticated
  using ((select auth.jwt()->>'sub') = user_id);

create policy "tasks_insert_own" on tasks
  for insert to authenticated
  with check ((select auth.jwt()->>'sub') = user_id);

create policy "tasks_update_own" on tasks
  for update to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);

create policy "tasks_delete_own" on tasks
  for delete to authenticated
  using ((select auth.jwt()->>'sub') = user_id);
```

For tables whose existing policy is a single `FOR ALL` (e.g. `areas`, `goals`, `projects` from `00011_create_rls_core.sql`), you may keep one `FOR ALL` policy instead of four:
```sql
-- ── areas (FOR ALL pattern) ────────────────────────────────────────────
drop policy if exists "Users can only access their own areas" on areas;

alter table areas
  alter column user_id type text using user_id::text;

create policy "areas_all_own" on areas
  for all to authenticated
  using ((select auth.jwt()->>'sub') = user_id)
  with check ((select auth.jwt()->>'sub') = user_id);
```

For tables with **indirect** ownership (policies that subquery a parent, e.g. `goals WHERE id = goal_id AND user_id = auth.uid()` in `00011_create_rls_core.sql`, and the `notes`-scoped junction policies in `20260503000001_create_note_related_notes.sql`), drop and recreate them swapping `auth.uid()` → `(select auth.jwt()->>'sub')` and casting the parent's `user_id` to text. Example for a `goal_tasks`-style child:
```sql
-- ── child table referencing goals.user_id ──────────────────────────────
drop policy if exists "<old indirect policy name>" on <child_table>;

create policy "<child_table>_all_own" on <child_table>
  for all to authenticated
  using (exists (
    select 1 from goals
    where goals.id = <child_table>.goal_id
      and goals.user_id = (select auth.jwt()->>'sub')
  ))
  with check (exists (
    select 1 from goals
    where goals.id = <child_table>.goal_id
      and goals.user_id = (select auth.jwt()->>'sub')
  ));
```
Note: change the parent table's `user_id` to `text` (in that parent's block) before any child policy compares against it.

Close the migration:
```sql
commit;
```

- [ ] **Step 3: Apply and verify the migration**

Run (Supabase CLI is a devDependency):
```bash
pnpm supabase db push
```
Then verify no policy still references `auth.uid()`:
```sql
select tablename, policyname from pg_policies
where schemaname = 'public' and (qual ilike '%auth.uid()%' or with_check ilike '%auth.uid()%');
```
Expected: zero rows.

- [ ] **Step 4: Commit**
```bash
git add supabase/migrations/20260618000001_clerk_rls_rewrite.sql
git commit -m "feat(db): rewrite RLS for Clerk jwt sub and change user_id to text"
```

---

## Task 10 — Data backfill: map Supabase UUIDs to Clerk ids

**Files:**
- Create: `supabase/migrations/20260618000002_clerk_user_backfill.sql`

**Interfaces:**
- Consumes: the text `user_id` columns from Task 9.
- Produces: every existing row re-owned by the correct Clerk user id.

- [ ] **Step 1: Build the old→new id mapping**

For each preserved user: get the **old Supabase UUID** (run `select id, email from auth.users;` before Clerk takes over, or read it from existing rows) and the **new Clerk id** (Clerk Dashboard → Users → the user → copy `user_...` id; create the Clerk account first by signing up through the app once Tasks 1-8 are live, or bulk-import via Clerk's user import). Record pairs.

- [ ] **Step 2: Write the backfill migration**

Create `supabase/migrations/20260618000002_clerk_user_backfill.sql`. Use a temp mapping table so it scales to N users and stays a single source of truth. Fill in one `('<old-uuid>', '<clerk-id>')` row per user:
```sql
begin;

create temporary table _clerk_user_map (
  old_id text not null,
  new_id text not null
) on commit drop;

-- One row per preserved user. Replace with real values from Step 1.
insert into _clerk_user_map (old_id, new_id) values
  ('00000000-0000-0000-0000-000000000000', 'user_REPLACE_ME');

-- Update every user_id-owned table. List MUST match the tables enumerated
-- in Task 9 Step 1. Repeat one update per table.
update areas        a set user_id = m.new_id from _clerk_user_map m where a.user_id = m.old_id;
update goals        g set user_id = m.new_id from _clerk_user_map m where g.user_id = m.old_id;
update projects     p set user_id = m.new_id from _clerk_user_map m where p.user_id = m.old_id;
update tasks        t set user_id = m.new_id from _clerk_user_map m where t.user_id = m.old_id;
update notes        n set user_id = m.new_id from _clerk_user_map m where n.user_id = m.old_id;
update contacts     c set user_id = m.new_id from _clerk_user_map m where c.user_id = m.old_id;
update resources    r set user_id = m.new_id from _clerk_user_map m where r.user_id = m.old_id;
update topics       tp set user_id = m.new_id from _clerk_user_map m where tp.user_id = m.old_id;
update user_settings s set user_id = m.new_id from _clerk_user_map m where s.user_id = m.old_id;
-- ... repeat for every remaining table from Task 9 Step 1 (junction tables
-- that store user_id directly; skip those that derive ownership via a parent).

commit;
```
> The mapping table uses `create temporary table ... on commit drop` so it disappears when the transaction commits — no cleanup needed.

- [ ] **Step 3: Apply and verify**

Run: `pnpm supabase db push`
Then confirm no rows retain a UUID-shaped `user_id`:
```sql
select 'tasks' as t, count(*) from tasks where user_id ~ '^[0-9a-f-]{36}$'
union all select 'areas', count(*) from areas where user_id ~ '^[0-9a-f-]{36}$';
-- repeat per table; all counts must be 0
```

- [ ] **Step 4: Commit**
```bash
git add supabase/migrations/20260618000002_clerk_user_backfill.sql
git commit -m "feat(db): backfill user_id rows from Supabase UUIDs to Clerk ids"
```

---

## Task 11 — Verify onboarding seeding works with Clerk ids

**Files:**
- Reference/Modify: `src/lib/services/onboarding.service.ts`

**Interfaces:**
- Consumes: `seedDefaultAreas(userId: string)` — now receives a Clerk id (text).

- [ ] **Step 1: Confirm the signature accepts a string id**

Read `src/lib/services/onboarding.service.ts`. Confirm `seedDefaultAreas` takes `userId: string` and inserts `user_id: userId` (no UUID validation/casting). If it casts to uuid or validates UUID format anywhere, remove that — Clerk ids are arbitrary strings.

- [ ] **Step 2: Type-check + commit (only if changed)**

Run: `pnpm tsc --noEmit` → PASS
```bash
git add src/lib/services/onboarding.service.ts
git commit -m "fix(onboarding): accept Clerk string user id when seeding areas"
```

---

## Task 12 — Update tests that referenced Supabase auth

**Files:**
- Modify: any test under `tests/` or `src/**/__tests__/` that mocked `supabase.auth.*` or imported the deleted `session-proxy` / `auth/callback`.

**Interfaces:**
- Produces: a green `pnpm vitest run`.

- [ ] **Step 1: Find affected tests**

Run:
```bash
git grep -nE "auth\.(getUser|getSession|signInWith|exchangeCodeForSession|onAuthStateChange)|session-proxy|auth/callback|createBrowserClient|createServerClient" -- tests "src/**/__tests__"
```

- [ ] **Step 2: Fix each hit**

For each: replace Supabase-auth mocks/assertions with the new model — services receive a ready Supabase client whose RLS is satisfied by the Clerk token; in unit tests, mock `@/lib/supabase/client`'s `createClient` to return a fake query builder (the token path is already covered by `tests/unit/supabase-client.test.ts`). Remove any test asserting redirect behavior of the deleted `session-proxy` (that logic now lives in `clerkMiddleware`, which is integration-tested manually).

- [ ] **Step 3: Run the full suite**

Run: `pnpm vitest run`
Expected: PASS.

- [ ] **Step 4: Commit**
```bash
git add -A
git commit -m "test(auth): update tests for Clerk-backed auth"
```

---

## Final Verification Gate

Run all four, fix every error until each passes:

- [ ] `pnpm tsc --noEmit` passes
- [ ] `pnpm vitest run` passes
- [ ] `pnpm lint` passes (fall back to `pnpm biome check .` if `lint` is unavailable)
- [ ] `pnpm build` passes

Then run the completion goal: `pwsh docs/superpowers/goals/2026-06-18-clerk-auth-migration.ps1` → must print `GOAL: PASS`.

---

## Self-Review

- **Spec coverage:** Auth shell (Tasks 1-3, 7-8), Supabase token bridge (Tasks 4-5), `useAuth` shim preserving consumers (Task 6), RLS rewrite + type change (Task 9), data backfill (Task 10), onboarding (Task 11), tests (Task 12), verification gate. The Clerk quickstart's six "Verify Before Responding" checks map to Tasks 2 (clerkMiddleware + matcher incl. `/__clerk/:path*`), 3 (ClerkProvider in body), 7 (App Router pages). The quickstart used `<Show>`/`<SignedIn>`; this repo instead routes auth via dedicated `(auth)` pages + middleware, which is the correct App-Router pattern for a multi-page app.
- **Type consistency:** `useAuth()` returns `{ user: {id, email} | null, isLoading, signOut }` in Task 6 and is consumed unchanged elsewhere. `createClient` stays arg-free (browser) / `await`-ed (server). `user_id` becomes `text` in Task 9 before any backfill (Task 10) writes Clerk ids to it.
- **Placeholder scan:** The only intentional fill-ins are the real Clerk publishable/secret keys (Task 1) and the old-UUID→Clerk-id pairs (Task 10) — these are operator secrets/data that cannot be hardcoded. Every code block is complete.

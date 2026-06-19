# LifeOS Core — AI Coding Rules

**This file is law.** Place it at the root of the repository as `.cursorrules`, `CLAUDE.md`, or `.github/copilot-instructions.md` depending on your AI tool. Every AI-generated line of code must comply with these rules. No exceptions, no "I'll fix it later," no clever workarounds.

You are a senior engineer on the LifeOS Core project. You write code that a junior engineer can read, a principal engineer would approve, and a production server won't choke on. You are not creative with architecture. You are creative with solutions within the architecture.

---

## 0. Project Context (Read This First)

LifeOS Core is a SaaS life management platform. It is **Project 1 of 2** — the data platform, REST API, and web dashboard. **Project 2** (LifeOS Agent) is a separate AI assistant that consumes this API. Everything you build must work for both human users (dashboard) and programmatic clients (Agent via API).

**Stack (non-negotiable):**
- Next.js 14 (App Router) + TypeScript (strict)
- Tailwind CSS v4 + shadcn/ui + Radix
- Zustand (client state) + TanStack Query v5 (server state)
- React Hook Form + Zod (forms + validation)
- Tiptap (rich text editor for Notes)
- Supabase (PostgreSQL + Auth + Storage + Realtime + Edge Functions)
- Stripe (billing), Resend (email), PostHog (analytics), Sentry (errors)
- Vercel (hosting)

**Architecture layers:**
```
Pages (thin) → Hooks (TanStack Query) → Services (business logic) → Supabase (data)
```
Never skip a layer. Never merge layers.

---

## 1. Approved Frameworks Only

### YOU MUST USE:
- **Next.js 14 App Router** — all routing via `/app` directory. Use `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx` conventions.
- **TypeScript strict mode** — `"strict": true` in `tsconfig.json`. No `any`. No `@ts-ignore`. No `@ts-expect-error` unless accompanied by a comment explaining the exact upstream bug with a link to the issue.
- **Tailwind CSS** — all styling via utility classes. No CSS files except `globals.css` for theme variables and base resets.
- **shadcn/ui** — all UI primitives (Button, Dialog, Input, Select, etc.) from the project's `/components/ui` directory. These are copied-in, not imported from a package.
- **Zustand** — client-side ephemeral state only (sidebar, modals, filters, theme). One store per concern. No nested state. No `immer` middleware.
- **TanStack Query v5** — all server data fetching. Every database read goes through a `useQuery` hook. Every write goes through `useMutation` with optimistic updates.
- **React Hook Form + Zod** — all forms. No `useState` for form fields. No manual `onChange` handlers for form inputs.
- **Supabase JS client** — all database operations. `createBrowserClient` in client components. `createServerClient` in server components and route handlers.
- **Zod** — all input validation, shared between frontend forms and API route handlers. One schema file per entity.

### YOU MUST NOT USE:
- ❌ **Redux, MobX, Recoil, Jotai** — Zustand + TanStack Query covers everything
- ❌ **Axios** — use native `fetch` (Next.js extends it with caching)
- ❌ **Styled-components, CSS Modules, Emotion, Sass** — Tailwind only
- ❌ **Material UI, Ant Design, Chakra UI** — shadcn/ui only
- ❌ **Prisma, Drizzle, Knex** — Supabase JS client only
- ❌ **Express, Fastify, Hono** — Next.js Route Handlers only
- ❌ **GraphQL, tRPC** — REST only (API must be consumable by external clients without special tooling)
- ❌ **Moment.js** — use `date-fns` or native `Intl.DateTimeFormat`
- ❌ **Lodash** — write the utility or use a native method. If you need `debounce`, write a 10-line hook.
- ❌ **Any package over 50KB gzipped** without explicit approval in this document
- ❌ **`npm install` for anything not on this list** without first checking if shadcn/ui, Radix, or a native API already solves it

---

## 2. UI Rules

### Layout
- The dashboard uses a **sidebar + main content** layout. Sidebar is collapsible on desktop, drawer on mobile.
- **Breakpoints:** `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`. Mobile-first: write base styles for mobile, use `md:` and `lg:` for larger screens.
- **Max content width:** `max-w-6xl` (1152px) for main content areas. Full-width for tables and kanban boards.
- Every page must be **usable at 375px width** (iPhone SE). Test this. No horizontal scrolling on any page.

### Dark Mode
- Dark mode is the **default**. Light mode is opt-in via toggle.
- Use `dark:` variant in Tailwind. Never hardcode colors. Always use CSS variables defined in `globals.css`:
  ```
  --background, --foreground, --card, --card-foreground,
  --primary, --primary-foreground, --muted, --muted-foreground,
  --border, --ring, --destructive
  ```
- Test every component in both themes before committing. If a component looks broken in light mode, it's a bug.

### Components
- Use shadcn/ui components for **every** primitive: Button, Input, Select, Dialog, Sheet, Popover, Tooltip, Badge, Card, Table, Tabs, Command (for Cmd+K), Toast.
- Never build a custom component if shadcn/ui has one. Check the [shadcn/ui docs](https://ui.shadcn.com) first.
- Every interactive element must have:
  - `aria-label` or visible label
  - Keyboard focus ring (`focus-visible:ring-2 ring-ring`)
  - Loading state (disabled + spinner for async actions)
  - Error state (destructive variant + error message)

### Empty States
- Every list/grid view **must** have a designed empty state. Never show a blank white area.
- Empty states include: an icon, a short message, and a primary action button (e.g., "No tasks yet. Create your first task.").

### Loading States
- Use `loading.tsx` skeleton files for page-level loading. Every route group that fetches data needs one.
- Use inline skeleton components (shadcn `Skeleton`) for component-level loading.
- **Never** show a blank screen while data loads. The user must always see either content or a skeleton.

### Toasts
- Use the shadcn toast component for **all** user-facing feedback after write operations.
- Pattern: action → optimistic update → toast with undo option → server confirmation.
- Toast duration: 5 seconds for success, 8 seconds for errors.
- **Never use `alert()` or `window.confirm()`.** Use Dialog for confirmations, Toast for feedback.

---

## 3. Code Style Rules

### TypeScript
```typescript
// ✅ DO: Explicit return types on exported functions
export function calculateSmartPriority(task: Task): number { ... }

// ❌ DON'T: Implicit return types on exports
export function calculateSmartPriority(task: Task) { ... }

// ✅ DO: Interface for object shapes, type for unions/primitives
interface Task { id: string; name: string; }
type Priority = "high" | "medium" | "low";
type TaskOrProject = Task | Project;

// ❌ DON'T: type for object shapes
type Task = { id: string; name: string; };

// ✅ DO: Discriminated unions for state
type QueryState<T> =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "success"; data: T };

// ❌ DON'T: Boolean flags for state
interface QueryState<T> { isLoading: boolean; isError: boolean; data?: T; error?: Error; }

// ✅ DO: Const assertions for enums
const PRIORITY = { HIGH: "high", MEDIUM: "medium", LOW: "low" } as const;

// ❌ DON'T: TypeScript enums
enum Priority { HIGH = "high", MEDIUM = "medium", LOW = "low" }
```

### Formatting (enforced by Biome, not Prettier)
- **Semicolons:** always
- **Quotes:** double quotes for strings
- **Indentation:** 2 spaces
- **Trailing commas:** all (ES5 style)
- **Line length:** 100 characters max
- **Imports:** sorted alphabetically, grouped: external → internal → types
- **No unused imports.** Biome flags these as errors.
- **No unused variables.** Prefix intentionally unused params with `_`.

### Function Rules
- **Max function length: 40 lines.** If a function exceeds 40 lines, extract sub-functions.
- **Max parameters: 3.** Use an options object for 4+ params:
  ```typescript
  // ❌ Bad
  function createTask(name: string, areaId: string, projectId: string, priority: Priority, dueDate: string) {}

  // ✅ Good
  function createTask(input: CreateTaskInput) {}
  ```
- **Pure functions preferred.** Services should be pure functions that take input and return output. No side effects except the Supabase call at the bottom of the chain.
- **No `console.log` in production code.** Use a logger wrapper that respects environment:
  ```typescript
  import { logger } from "@/lib/utils/logger";
  logger.info("Task created", { taskId, userId });  // Only outputs in dev or via Sentry in prod
  ```

### React Component Rules
- **Function components only.** No class components. No `React.FC` (it adds `children` implicitly).
  ```typescript
  // ✅ Correct
  export function TaskListItem({ task }: { task: Task }) { ... }

  // ❌ Wrong
  export const TaskListItem: React.FC<{ task: Task }> = ({ task }) => { ... }
  ```
- **Max component length: 150 lines** including imports. If larger, extract sub-components or hooks.
- **No prop drilling beyond 2 levels.** If component C needs data from grandparent A, use a hook or Zustand store.
- **`"use client"` only when needed.** Default to server components. Add `"use client"` only for: event handlers, hooks (useState, useEffect, etc.), browser APIs. If a component only renders data, it's a server component.
- **No `useEffect` for data fetching.** TanStack Query handles all data fetching. `useEffect` is only for: DOM measurements, event listeners, third-party library init.
- **No `useEffect` for derived state.** Use `useMemo` or compute inline:
  ```typescript
  // ❌ Bad
  const [fullName, setFullName] = useState("");
  useEffect(() => setFullName(`${first} ${last}`), [first, last]);

  // ✅ Good
  const fullName = `${first} ${last}`;
  ```

---

## 4. Naming Conventions

```
CATEGORY         CONVENTION          EXAMPLE
─────────────────────────────────────────────────────────────
Files            kebab-case          task-list-item.tsx
                                     use-tasks.ts
                                     task.service.ts
                                     task.schema.ts

React components PascalCase          TaskListItem
                                     GoalCard
                                     CommandPalette

Hooks            camelCase + "use"   useTasks
                                     useCompleteTask
                                     useDebounce

Zustand stores   camelCase + "use"   useUIStore
                                     useFilterStore

Services         camelCase           taskService.create()
                                     goalService.getActive()

Zod schemas      camelCase           createTaskSchema
                                     updateProjectSchema

Types/Interfaces PascalCase          Task, Project, Goal
                                     CreateTaskInput
                                     ApiResponse<T>

Enums (const)    SCREAMING_SNAKE     TASK_STATUS
                                     PRIORITY

API routes       kebab-case          /api/v1/tasks
                                     /api/v1/my-day

DB tables        snake_case          tasks, goal_projects
DB columns       snake_case          smart_priority, due_date
DB enums         snake_case          task_status, goal_term

Env variables    SCREAMING_SNAKE     NEXT_PUBLIC_SUPABASE_URL
                                     STRIPE_SECRET_KEY

CSS variables    kebab-case          --background
                                     --card-foreground

Test files       *.test.ts           task.service.test.ts
                                     smart-priority.test.ts

E2E tests        *.spec.ts           onboarding.spec.ts
```

### Naming principles:
- **Boolean variables/props:** prefix with `is`, `has`, `can`, `should`.
  ```typescript
  isLoading, hasError, canEdit, shouldFocus
  // NOT: loading, error, edit, focus
  ```
- **Event handlers in components:** prefix with `on` for props, `handle` for internal:
  ```typescript
  // Prop name: onComplete, onChange, onDelete
  // Handler: handleComplete, handleChange, handleDelete
  <TaskItem onComplete={handleComplete} />
  ```
- **Arrays:** plural nouns. `tasks`, `goals`, `selectedIds`. Never `taskList`, `goalArray`.
- **Single items from arrays:** singular. `task`, `goal`, `selectedId`.
- **Async functions:** named for what they return, not the mechanism.
  ```typescript
  // ✅ Good
  async function getActiveGoals(): Promise<Goal[]>
  async function createTask(input: CreateTaskInput): Promise<Task>

  // ❌ Bad
  async function fetchGoalsFromDatabase()
  async function postNewTask()
  ```

---

## 5. Security Rules

### Authentication
- **Every API route handler** starts with auth validation. No exceptions.
  ```typescript
  export async function GET(request: NextRequest) {
    const { user, error } = await authenticateRequest(request);
    if (error) return error; // Returns 401 Response
    // ... proceed with user.id
  }
  ```
- **Never trust client-provided `user_id`.** Always derive from JWT or API key server-side.
- **API keys are hashed** (SHA-256) before storage. Raw key is shown once on creation, never stored.
- **Refresh tokens** rotate on every use (Supabase handles this).

### Data Access
- **Row-Level Security is enforced at the database level.** Even if application code has a bug, RLS prevents cross-user data access.
- **Never use the Supabase `service_role` key in client-side code.** Only in server-side route handlers, and only when RLS bypass is explicitly needed (e.g., admin operations).
- **Soft delete everything.** Set `archive = true` instead of `DELETE`. Hard deletes only via explicit GDPR data export flow.

### Input Validation
- **Validate ALL input with Zod** before any database operation. Both in API routes and form submissions.
- **Strip unknown fields** from all input:
  ```typescript
  const parsed = createTaskSchema.strict().parse(body);
  // .strict() rejects any field not in the schema
  ```
- **Sanitize HTML content** in notes (Tiptap handles this, but double-check on API input).
- **Never interpolate user input into SQL.** Supabase JS client uses parameterized queries by default. If you ever write raw SQL (in migrations or functions), use `$1, $2` placeholders.

### Secrets
- **All secrets in environment variables.** Never hardcode API keys, database URLs, or tokens.
- **Prefix client-safe vars** with `NEXT_PUBLIC_`. Everything else is server-only.
- **`.env.local` is gitignored.** `.env.example` documents every required variable without values.
- **Never log secrets.** Not even partially. No `logger.info("Key: " + key.substring(0, 8))`.

### Password Manager
- **Client-side encryption ONLY.** The server never receives, processes, or stores plaintext passwords.
- **No Password Manager operations via API.** This module is web dashboard only, explicitly excluded from the Agent.
- **Master password never leaves the browser.** Derived key stays in memory, never in localStorage or cookies.

---

## 6. Performance Rules

### Bundle Size
- **No package over 50KB gzipped** without documented justification.
- **Dynamic imports** for heavy components:
  ```typescript
  const NoteEditor = dynamic(() => import("@/components/entities/note-editor"), {
    loading: () => <Skeleton className="h-64" />,
    ssr: false,
  });
  ```
- **Tree-shake icons.** Import individual icons, never the entire icon library:
  ```typescript
  // ✅ Good
  import { Check, X, ChevronDown } from "lucide-react";

  // ❌ Bad
  import * as Icons from "lucide-react";
  ```

### Data Fetching
- **`staleTime: 5 * 60 * 1000`** (5 min) is the default for all TanStack Query queries. Override per-query only with justification.
- **Optimistic updates for all mutations.** The user sees the change instantly; the server confirms asynchronously. Rollback on error.
- **Cursor-based pagination** for all list views. Never load all items at once. Default page size: 50.
- **No `SELECT *`.** Always specify columns in Supabase queries:
  ```typescript
  // ✅ Good
  supabase.from("tasks").select("id, name, status, priority, due_date, complete");

  // ❌ Bad
  supabase.from("tasks").select("*");
  ```
- **Prefetch adjacent data.** When a user opens the Tasks page, prefetch the first page of Projects and Goals (they'll likely navigate there next).

### Rendering
- **Server Components by default.** Only use `"use client"` when the component needs interactivity.
- **No unnecessary re-renders.** Use `React.memo` on list item components that receive objects as props. Use `useCallback` on handlers passed to memoized children.
- **Virtualize long lists.** Any list that can exceed 100 items must use `@tanstack/react-virtual`:
  ```typescript
  // Tasks list, Inbox, Search results → virtualized
  // Areas gallery (max ~15) → NOT virtualized
  ```
- **Images:** use `next/image` with `width`, `height`, and `loading="lazy"`. No raw `<img>` tags.

### Database
- **Every query must use an index.** Before writing a query, check that the WHERE clause matches an existing index in the schema. If it doesn't, create the index first.
- **Rollup counts are computed on write, not on read.** Use database triggers (already defined in architecture doc) to update `progress` on projects and `completion` on goals when tasks change.
- **Smart priority is a stored value, not a runtime computation.** Recalculated via PostgreSQL function on task insert/update.

---

## 7. Error Handling Rules

### API Routes
- **Every API route handler is wrapped in a try/catch** that returns standardized error responses:
  ```typescript
  export async function POST(request: NextRequest) {
    try {
      const { user } = await authenticateRequest(request);
      const body = await request.json();
      const input = createTaskSchema.strict().parse(body);
      const task = await taskService.create(user.id, input);
      return NextResponse.json({ data: task }, { status: 201 });
    } catch (error) {
      return handleApiError(error);
    }
  }
  ```
- **`handleApiError` maps errors to HTTP status codes:**
  - `ZodError` → 400 with field-level details
  - `AuthError` → 401
  - `ForbiddenError` → 403
  - `NotFoundError` → 404
  - `RateLimitError` → 429 with Retry-After header
  - `PostgrestError` → 500 (logged to Sentry, generic message to client)
  - Unknown → 500 (logged to Sentry, generic message to client)
- **Never expose internal error messages to the client.** Database errors, stack traces, and Supabase details are logged server-side only.

### Client Side
- **React Error Boundaries** on every route group. Use `error.tsx` files in each `(dashboard)` sub-folder.
- **TanStack Query `onError` callbacks** show toast notifications with user-friendly messages.
- **Retry policy:** TanStack Query retries failed queries 3 times with exponential backoff. Mutations retry once.
- **Offline handling:** detect `navigator.onLine` and show a persistent banner. Queue mutations for retry when back online (TanStack Query handles this with `networkMode: "offlineFirst"`).
- **Never swallow errors silently:**
  ```typescript
  // ❌ NEVER
  try { await something(); } catch (e) { /* ignore */ }

  // ✅ ALWAYS
  try { await something(); } catch (error) {
    logger.error("Failed to do something", { error, context });
    throw error; // or handle with user-facing feedback
  }
  ```

### Service Layer
- **Services throw typed errors.** Never return `null` to indicate failure:
  ```typescript
  // ✅ Good: throw specific error
  export async function getTaskById(userId: string, taskId: string): Promise<Task> {
    const { data, error } = await supabase
      .from("tasks")
      .select("id, name, status, priority, due_date, complete")
      .eq("id", taskId)
      .eq("user_id", userId)
      .single();

    if (error) throw new DatabaseError("Failed to fetch task", { cause: error });
    if (!data) throw new NotFoundError("Task not found");
    return data;
  }

  // ❌ Bad: return null
  export async function getTaskById(userId: string, taskId: string): Promise<Task | null> {
    const { data } = await supabase.from("tasks").select("*").eq("id", taskId).single();
    return data;
  }
  ```

---

## 8. File Organization Rules

### One concern per file
- One React component per file. No multi-component files.
- One hook per file. No file with 3 hooks in it.
- One service per file. `task.service.ts` handles tasks. `goal.service.ts` handles goals. Never a `utils.service.ts`.
- One Zod schema file per entity. Contains `createSchema`, `updateSchema`, `filterSchema` for that entity.

### Import hierarchy (enforced by Biome)
```typescript
// 1. External packages
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

// 2. Internal absolute imports (@/ alias)
import { Button } from "@/components/ui/button";
import { useTasks } from "@/lib/hooks/use-tasks";
import { taskService } from "@/lib/services/task.service";

// 3. Relative imports (co-located only)
import { TaskFilters } from "./task-filters";

// 4. Types (always last)
import type { Task, Priority } from "@/lib/types/domain.types";
```

### Co-location rules
- **Page-specific components** live next to their page (but in separate files):
  ```
  app/(dashboard)/tasks/
  ├── page.tsx              # Route (thin, imports below)
  ├── task-filters.tsx      # Only used on this page
  └── task-view-switcher.tsx
  ```
- **Shared components** live in `/components/entities/` or `/components/views/`.
- **If a component is used on 2+ pages, move it to `/components/`.** No duplication.

### What goes where
```
Folder                          Contains                          Does NOT contain
─────────────────────────────────────────────────────────────────────────────────────
/app/**/page.tsx                Route definition, layout comp     Business logic, data fetching logic
/components/ui/                 shadcn primitives                 Business-specific components
/components/entities/           Task card, goal card, etc.        Generic UI primitives
/components/views/              Kanban, calendar, data table      Entity-specific rendering
/lib/hooks/                     TanStack Query wrappers           UI state, business logic
/lib/services/                  Business logic + Supabase calls   React code, UI code
/lib/stores/                    Zustand stores                    Server state, API calls
/lib/validators/                Zod schemas                       Business logic
/lib/utils/                     Pure helper functions             Anything with side effects
/lib/types/                     TypeScript types/interfaces       Runtime code
/supabase/migrations/           SQL migration files               Application code
```

---

## 9. Things AI Must NEVER Do

This is the hard-stop list. If you catch yourself about to do any of these, stop, delete what you wrote, and start over.

1. **NEVER use `any` type.** Not even as a temporary placeholder. Use `unknown` and narrow, or define a proper type.

2. **NEVER use `@ts-ignore` or `@ts-expect-error`** without a linked GitHub issue explaining the upstream bug.

3. **NEVER import from Supabase in a React component.** Components call hooks. Hooks call services. Services call Supabase. That's the chain.

4. **NEVER put business logic in a page file.** Pages are routing glue: they import components and pass data. Zero computation.

5. **NEVER use `useEffect` for data fetching.** TanStack Query exists for this exact purpose.

6. **NEVER store server data in `useState` or Zustand.** Server data lives in TanStack Query's cache. Client state (modals, filters) lives in Zustand. These two never overlap.

7. **NEVER use `SELECT *` in any Supabase query.** Always list columns explicitly.

8. **NEVER write raw CSS.** Use Tailwind utilities. If Tailwind doesn't have it, extend the config. If you're writing a `style={{ }}` prop, you're doing it wrong (exception: dynamic values like `width: ${percentage}%`).

9. **NEVER hardcode colors.** Use CSS variables from the theme. `text-foreground`, not `text-gray-900`. `bg-card`, not `bg-white`.

10. **NEVER expose error internals to users.** API errors return `{ error: { code, message } }` with a generic user-friendly message. Stack traces, SQL errors, and Supabase details go to Sentry only.

11. **NEVER commit `.env.local` or any file with secrets.** Check `.gitignore` before every commit.

12. **NEVER use `dangerouslySetInnerHTML`.** Tiptap handles rich text rendering safely. If you think you need it elsewhere, you don't.

13. **NEVER add a package** without checking if the feature exists in: (a) the browser API, (b) Next.js built-in, (c) shadcn/ui, (d) an existing project utility. Install is the last resort.

14. **NEVER write an API endpoint without auth validation** as the first line of the handler.

15. **NEVER create a database migration that drops a column or table** without explicit product approval. We soft-delete everything. Destructive migrations are a separate review process.

16. **NEVER use `setTimeout` or `setInterval` for polling.** Use TanStack Query's `refetchInterval` or Supabase Realtime subscriptions.

17. **NEVER put API keys, tokens, or secrets in client-side code.** Not even `NEXT_PUBLIC_` prefixed ones for secret values. `NEXT_PUBLIC_` is only for truly public values (Supabase anon key, PostHog project key).

18. **NEVER write a component over 200 lines.** Extract sub-components or hooks.

19. **NEVER duplicate code across 2+ files.** Extract to a shared utility, hook, or component immediately. Not "TODO: refactor later."

20. **NEVER use `var`.** Use `const` by default, `let` only when reassignment is required.

---

## 10. Testing Requirements

### What must be tested

```
LAYER               TOOL            COVERAGE TARGET    WHAT TO TEST
─────────────────────────────────────────────────────────────────────────
Services            Vitest          90%+               Business logic, edge cases,
                                                       error paths, smart priority
                                                       algorithm

Validators          Vitest          100%               Every Zod schema: valid input
                                                       passes, invalid input fails
                                                       with correct error

Utilities           Vitest          90%+               Date formatting, encryption
                                                       helpers, pagination math

API Routes          Vitest +        80%+               Auth guard, validation,
                    supertest-like                     CRUD operations, error
                                                       responses, rate limiting

React Hooks         Vitest +        70%+               Data transformation,
                    @testing-lib                       loading/error states

Components          DO NOT TEST                        Components change too often.
                                                       Test the logic they consume
                                                       (services, hooks), not the
                                                       rendering.

E2E Flows           Playwright      Critical paths     Onboarding, task CRUD,
                                    only               auth flow, quick capture
```

### Test file naming and location
```
src/lib/services/task.service.ts       →  tests/unit/task.service.test.ts
src/lib/validators/task.schema.ts      →  tests/unit/task.schema.test.ts
src/lib/utils/smart-priority.ts        →  tests/unit/smart-priority.test.ts
src/app/api/v1/tasks/route.ts          →  tests/integration/tasks.api.test.ts
src/app/(dashboard)/onboarding         →  tests/e2e/onboarding.spec.ts
```

### Test patterns

```typescript
// Unit test pattern (services):
describe("taskService.create", () => {
  it("creates a task with valid input", async () => {
    const input = { name: "Call dentist", priority: "high" as const };
    const task = await taskService.create(mockUserId, input);
    expect(task.name).toBe("Call dentist");
    expect(task.status).toBe("inbox"); // default
    expect(task.smart_priority).toBeGreaterThanOrEqual(1);
  });

  it("throws ValidationError for empty name", async () => {
    await expect(
      taskService.create(mockUserId, { name: "", priority: "high" })
    ).rejects.toThrow(ValidationError);
  });

  it("throws NotFoundError for invalid area_id", async () => {
    await expect(
      taskService.create(mockUserId, { name: "Test", area_id: "nonexistent" })
    ).rejects.toThrow(NotFoundError);
  });
});

// API integration test pattern:
describe("POST /api/v1/tasks", () => {
  it("returns 201 with valid input and auth", async () => {
    const res = await fetch("/api/v1/tasks", {
      method: "POST",
      headers: { Authorization: `Bearer ${testJwt}`, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test task", priority: "medium" }),
    });
    expect(res.status).toBe(201);
    const { data } = await res.json();
    expect(data.id).toBeDefined();
  });

  it("returns 401 without auth", async () => {
    const res = await fetch("/api/v1/tasks", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 400 with invalid body", async () => {
    const res = await fetch("/api/v1/tasks", {
      method: "POST",
      headers: { Authorization: `Bearer ${testJwt}` },
      body: JSON.stringify({ name: "" }), // empty name
    });
    expect(res.status).toBe(400);
    const { error } = await res.json();
    expect(error.code).toBe("VALIDATION_ERROR");
  });
});
```

### Before every PR:
1. `biome check --apply` passes with zero errors
2. `tsc --noEmit` passes with zero errors
3. `vitest run` passes with zero failures
4. No `console.log` statements in production code
5. No `any` types anywhere
6. No `TODO` without an associated GitHub issue number

---

## Appendix: Quick Reference Card

```
WHEN YOU NEED TO...                    USE THIS
──────────────────────────────────────────────────────────
Fetch data from database               TanStack Query useQuery + service
Write data to database                 TanStack Query useMutation + service
Store UI state (modals, sidebar)       Zustand store
Store server data                      TanStack Query cache (NEVER Zustand)
Validate user input                    Zod schema (shared frontend + API)
Build a form                           React Hook Form + Zod resolver
Show a modal/dialog                    shadcn Dialog + Zustand trigger
Show user feedback                     shadcn Toast
Handle keyboard shortcut               useKeyboard hook
Add a new database table               SQL migration in /supabase/migrations
Add a new API endpoint                 Route handler in /app/api/v1/
Add a new page                         page.tsx in /app/(dashboard)/
Add a new component                    /components/entities/ or /components/views/
Add client-side interactivity          "use client" directive
Fetch on the server (RSC)              Server component + createServerClient
Log an error                           logger.error() → Sentry
Track an event                         PostHog capture()
Gate a feature                         PostHog feature flag
Style something                        Tailwind utility classes
Animate something                      Tailwind transition/animate utilities
                                       (framer-motion only if Tailwind can't do it)
Build an MCP tool                      packages/mcp-server/src/tools/
Test MCP tool                          Connect to Claude Desktop, invoke tool
Publish MCP server                     npm publish from packages/mcp-server/
```

---

## Appendix B: MCP Server Rules

The MCP server (`packages/mcp-server/`) is a separate TypeScript package within the monorepo. It wraps the LifeOS Core REST API as MCP tools. These rules apply when writing MCP server code.

### MCP Tool Rules
- **One file per entity category** in `src/tools/`. Tasks tools in `tasks.ts`, goals in `goals.ts`, etc.
- **Tool names are snake_case.** `create_task`, `list_goals`, `get_dashboard`. Not camelCase, not kebab-case.
- **Tool descriptions are written for AI models, not humans.** Be specific about what the tool does, when to use it, and what the parameters mean. The AI model reads this to decide which tool to call.
- **Every tool calls the typed API client** (`src/client.ts`). Never call the REST API directly with raw fetch. The client handles auth headers, error parsing, and response typing.
- **Never hardcode the API URL or API key.** Read from environment variables: `LIFEOS_API_KEY`, `LIFEOS_API_URL`.
- **Return structured data, not formatted text.** The AI model handles presentation. Return the raw API response data. Let the model decide how to display it to the user.
- **Handle errors gracefully.** A failed API call should return a clear error message ("Task not found" or "You don't have permission to access this project"), never a raw HTTP status code or stack trace.
- **No business logic in the MCP server.** The server is a thin translation layer: MCP tool call → REST API call → return result. All business logic lives in the Core API services.
- **Keep the client.ts in sync with the REST API.** If a new endpoint is added to the API, add the corresponding method to the client and the corresponding tool to the tools directory.

### MCP Testing Rules
- **Every tool gets a unit test** that mocks the API client and verifies correct parameter mapping.
- **Integration testing happens via Claude Desktop.** Connect, invoke each tool, verify the result matches the LifeOS dashboard.
- **Never ship a tool without testing it in a real MCP client.** Unit tests alone are insufficient — the tool description and schema must work with actual AI model reasoning.

---

*This document is version-controlled. Changes require PR review by the principal engineer. AI assistants must re-read this file at the start of every session.*

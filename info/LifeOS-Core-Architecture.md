# LifeOS Core — Software Architecture Document

**Project 1 of 2** · Based on LifeOS Core PRD v1.0 · April 2026

> This document is the engineering blueprint for building LifeOS Core. It turns the PRD into code structure, database tables, API contracts, and deployment decisions. Every section answers "how do we build this so it works at 100 users and still works at 100,000?"

---

## 1. Recommended Tech Stack

### Why Web App (Not Native Mobile)

The product has three interfaces at launch: the web dashboard for visual management, the REST API for programmatic access, and an MCP server for AI-assisted input via Claude Desktop, Claude Code, Cursor, or any MCP-compatible client. The web dashboard is the visual layer — used for deep planning, visualization, and power-user operations. Building native iOS + Android apps on top of this is premature. A responsive Next.js web app with PWA gives us:

- One codebase for desktop, tablet, and mobile
- Instant deploys (no app store review cycles)
- PWA install for homescreen access and push notifications
- SEO for the marketing site (same domain, same framework)

If mobile engagement data after launch proves a native app is needed, React Native is the escape hatch — the API-first architecture means the frontend is fully replaceable.

### Stack Decision Table

```
┌─────────────────────┬──────────────────────────────┬─────────────────────────────────┐
│ Layer               │ Technology                   │ Why this, not that              │
├─────────────────────┼──────────────────────────────┼─────────────────────────────────┤
│ Framework           │ Next.js 14 (App Router)      │ RSC for fast loads, API routes  │
│                     │                              │ for REST, one deploy target     │
│                     │                              │                                 │
│ Language            │ TypeScript (strict mode)     │ Non-negotiable for a codebase   │
│                     │                              │ this relational. Type safety    │
│                     │                              │ prevents 80% of bugs.           │
│                     │                              │                                 │
│ UI Components       │ shadcn/ui + Radix primitives │ Accessible, composable, no      │
│                     │                              │ vendor lock-in (you own the     │
│                     │                              │ code). Avoids Ant/MUI bloat.    │
│                     │                              │                                 │
│ Styling             │ Tailwind CSS v4              │ Utility-first. Co-locates       │
│                     │                              │ styles with markup. Excellent   │
│                     │                              │ responsive utilities.            │
│                     │                              │                                 │
│ State (client)      │ Zustand                      │ 1 KB, no boilerplate, works     │
│                     │                              │ with React 18 concurrent mode.  │
│                     │                              │ Stores: UI state, theme, modals │
│                     │                              │                                 │
│ State (server)      │ TanStack Query v5            │ Caching, background refetch,    │
│                     │                              │ optimistic mutations, stale-    │
│                     │                              │ while-revalidate. Handles all   │
│                     │                              │ Supabase data fetching.         │
│                     │                              │                                 │
│ Forms               │ React Hook Form + Zod        │ Best DX for complex forms.      │
│                     │                              │ Zod schemas shared between      │
│                     │                              │ frontend validation and API.    │
│                     │                              │                                 │
│ Rich Text Editor    │ Tiptap (ProseMirror)         │ Extensible, markdown support,   │
│                     │                              │ collaborative-ready for future. │
│                     │                              │                                 │
│ Backend / BaaS      │ Supabase                     │ PostgreSQL + Auth + Storage +   │
│                     │                              │ Realtime + Edge Functions.      │
│                     │                              │ One service replaces 5.         │
│                     │                              │                                 │
│ API Layer           │ Next.js Route Handlers       │ /app/api/* routes serve REST.   │
│                     │                              │ Supabase JS client for DB ops.  │
│                     │                              │ No separate backend server.     │
│                     │                              │                                 │
│ Auth                │ Supabase Auth                │ JWT + refresh tokens, Google    │
│                     │                              │ OAuth, email/password, RLS.     │
│                     │                              │                                 │
│ File Storage        │ Supabase Storage             │ S3-compatible, integrated with  │
│                     │                              │ auth. Warranty docs, avatars.   │
│                     │                              │                                 │
│ Realtime            │ Supabase Realtime            │ WebSocket subscriptions for     │
│                     │                              │ live updates when Agent writes. │
│                     │                              │                                 │
│ Billing             │ Stripe                       │ Checkout, Customer Portal,      │
│                     │                              │ webhooks. Industry standard.    │
│                     │                              │                                 │
│ Email               │ Resend                       │ Simple API, good deliverability │
│                     │                              │ React Email for templates.      │
│                     │                              │                                 │
│ Analytics           │ PostHog                      │ Privacy-friendly, self-hostable │
│                     │                              │ Feature flags included.         │
│                     │                              │                                 │
│ Error Tracking      │ Sentry                       │ Source maps, performance,       │
│                     │                              │ session replay.                 │
│                     │                              │                                 │
│ Hosting             │ Vercel                       │ Native Next.js. Edge network.   │
│                     │                              │ Preview deploys per PR.         │
│                     │                              │                                 │
│ CI/CD               │ GitHub Actions               │ Lint, test, deploy on push.     │
│                     │                              │ Supabase migrations in CI.      │
│                     │                              │                                 │
│ MCP Server          │ @modelcontextprotocol/sdk    │ Wraps REST API as MCP tools.    │
│                     │ + TypeScript + Node.js       │ Users connect LifeOS to Claude  │
│                     │                              │ Desktop, Claude Code, Cursor.   │
│                     │                              │ Published to npm. Stdio + SSE.  │
└─────────────────────┴──────────────────────────────┴─────────────────────────────────┘
```

---

## 2. Folder Structure

This is a monorepo structure using Next.js App Router conventions. Every folder has a single responsibility. A new engineer should be able to find any file in under 10 seconds.

```
lifeos-core/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint + test + type-check on PR
│       └── deploy.yml                # Deploy to Vercel on main push
│
├── packages/
│   └── mcp-server/                   # MCP server (published to npm)
│       ├── src/
│       │   ├── index.ts              # Entry point
│       │   ├── server.ts             # MCP server config + tool registration
│       │   ├── auth.ts               # API key validation
│       │   ├── client.ts             # Typed LifeOS REST API client
│       │   ├── tools/                # One file per entity category
│       │   │   ├── tasks.ts          # create_task, list_tasks, complete_task, etc.
│       │   │   ├── goals.ts          # create_goal, list_goals, get_goal_detail
│       │   │   ├── projects.ts       # create_project, list_projects, get_project
│       │   │   ├── areas.ts          # list_areas, create_area, archive_area
│       │   │   ├── notes.ts          # create_note, list_notes, get_note
│       │   │   ├── resources.ts      # save_resource, list_resources
│       │   │   ├── topics.ts         # list_topics, create_topic
│       │   │   ├── contacts.ts       # create_contact, log_interaction, link_to_project
│       │   │   ├── search.ts         # search, knowledge_search
│       │   │   └── dashboard.ts      # get_dashboard, get_my_day, get_inbox
│       │   ├── types.ts
│       │   └── utils.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── README.md                 # User setup instructions
│
├── supabase/
│   ├── migrations/                   # Sequential SQL migrations
│   │   ├── 00001_create_areas.sql
│   │   ├── 00002_create_goals.sql
│   │   ├── 00003_create_projects.sql
│   │   ├── 00004_create_tasks.sql
│   │   ├── 00005_create_notes.sql
│   │   ├── 00006_create_resources.sql
│   │   ├── 00007_create_topics.sql
│   │   ├── 00008_create_contacts.sql
│   │   ├── 00009_create_junction_tables.sql
│   │   ├── 00010_create_trackers.sql
│   │   ├── 00011_create_system_tables.sql
│   │   ├── 00012_create_rls_policies.sql
│   │   ├── 00013_create_indexes.sql
│   │   ├── 00014_create_functions.sql      # smart_priority(), rollups
│   │   └── 00015_seed_default_areas.sql
│   ├── seed.sql                      # Dev seed data
│   └── config.toml                   # Supabase local config
│
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth group (no sidebar layout)
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── layout.tsx            # Minimal auth layout
│   │   │
│   │   ├── (dashboard)/              # Main app group (sidebar layout)
│   │   │   ├── layout.tsx            # Sidebar + topbar + command palette
│   │   │   ├── page.tsx              # Dashboard home
│   │   │   ├── areas/
│   │   │   │   ├── page.tsx          # Areas gallery
│   │   │   │   └── [id]/page.tsx     # Area detail
│   │   │   ├── goals/page.tsx
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── tasks/page.tsx
│   │   │   ├── notes/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx     # Note editor
│   │   │   ├── resources/page.tsx
│   │   │   ├── knowledge/page.tsx    # Knowledge Hub
│   │   │   ├── inbox/page.tsx
│   │   │   ├── my-day/page.tsx
│   │   │   ├── time-tracker/page.tsx
│   │   │   ├── contacts/page.tsx
│   │   │   ├── archive/page.tsx
│   │   │   ├── trackers/
│   │   │   │   ├── bookmarks/page.tsx
│   │   │   │   ├── books/page.tsx
│   │   │   │   ├── movies/page.tsx
│   │   │   │   ├── supplements/page.tsx
│   │   │   │   ├── groceries/page.tsx
│   │   │   │   ├── wishlist/page.tsx
│   │   │   │   ├── orders/page.tsx
│   │   │   │   ├── warranties/page.tsx
│   │   │   │   └── passwords/page.tsx
│   │   │   └── settings/
│   │   │       ├── page.tsx          # General settings
│   │   │       ├── billing/page.tsx
│   │   │       ├── api-keys/page.tsx
│   │   │       └── integrations/page.tsx
│   │   │
│   │   ├── onboarding/page.tsx       # Post-signup guided setup
│   │   │
│   │   ├── api/                      # REST API routes
│   │   │   └── v1/
│   │   │       ├── areas/route.ts
│   │   │       ├── goals/route.ts
│   │   │       ├── projects/route.ts
│   │   │       ├── tasks/
│   │   │       │   ├── route.ts      # GET (list), POST (create)
│   │   │       │   ├── [id]/route.ts # GET, PUT, DELETE
│   │   │       │   ├── [id]/complete/route.ts
│   │   │       │   └── bulk/route.ts
│   │   │       ├── notes/route.ts
│   │   │       ├── resources/route.ts
│   │   │       ├── topics/route.ts
│   │   │       ├── contacts/route.ts
│   │   │       ├── search/route.ts
│   │   │       ├── dashboard/
│   │   │       │   ├── today/route.ts
│   │   │       │   └── summary/route.ts
│   │   │       ├── trackers/
│   │   │       │   ├── bookmarks/route.ts
│   │   │       │   ├── books/route.ts
│   │   │       │   ├── groceries/route.ts
│   │   │       │   └── ... (one per tracker)
│   │   │       ├── integrations/route.ts
│   │   │       ├── export/route.ts
│   │   │       ├── import/notion/route.ts
│   │   │       └── webhooks/
│   │   │           └── stripe/route.ts
│   │   │
│   │   ├── layout.tsx                # Root layout (providers, fonts)
│   │   └── globals.css               # Tailwind base + theme vars
│   │
│   ├── components/                   # Shared UI components
│   │   ├── ui/                       # shadcn/ui primitives (button, input, dialog, etc.)
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── topbar.tsx
│   │   │   ├── command-palette.tsx    # Cmd+K quick capture
│   │   │   └── mobile-nav.tsx
│   │   ├── entities/                 # Entity-specific components
│   │   │   ├── task-list-item.tsx
│   │   │   ├── task-inline-editor.tsx
│   │   │   ├── project-card.tsx
│   │   │   ├── goal-card.tsx
│   │   │   ├── area-card.tsx
│   │   │   ├── note-editor.tsx       # Tiptap wrapper
│   │   │   ├── resource-row.tsx
│   │   │   └── priority-badge.tsx
│   │   ├── views/                    # Reusable view patterns
│   │   │   ├── kanban-board.tsx
│   │   │   ├── calendar-view.tsx
│   │   │   ├── gallery-grid.tsx
│   │   │   ├── data-table.tsx        # Sortable, filterable table
│   │   │   └── empty-state.tsx
│   │   ├── charts/
│   │   │   ├── progress-ring.tsx
│   │   │   ├── completion-chart.tsx
│   │   │   └── activity-heatmap.tsx
│   │   └── providers/
│   │       ├── query-provider.tsx    # TanStack Query
│   │       ├── theme-provider.tsx    # Light/dark mode
│   │       └── auth-provider.tsx     # Supabase session context
│   │
│   ├── lib/                          # Core business logic
│   │   ├── supabase/
│   │   │   ├── client.ts             # Browser Supabase client
│   │   │   ├── server.ts             # Server-side Supabase client (RSC)
│   │   │   ├── admin.ts              # Service role client (API routes)
│   │   │   └── middleware.ts         # Auth middleware for API routes
│   │   ├── api/
│   │   │   ├── auth-guard.ts         # JWT + API key validation
│   │   │   ├── rate-limiter.ts       # Token bucket per user
│   │   │   ├── pagination.ts         # Cursor-based pagination helper
│   │   │   ├── error-handler.ts      # Standardized API error responses
│   │   │   └── webhook-emitter.ts    # Outbound webhook dispatcher
│   │   ├── services/                 # Business logic (no UI, no Supabase direct)
│   │   │   ├── task.service.ts       # Smart priority calc, repeat cycle
│   │   │   ├── project.service.ts    # Progress rollup
│   │   │   ├── goal.service.ts       # Completion rollup
│   │   │   ├── area.service.ts       # Activity counts
│   │   │   ├── search.service.ts     # Full-text search
│   │   │   └── onboarding.service.ts # Default area creation
│   │   ├── hooks/                    # Custom React hooks
│   │   │   ├── use-tasks.ts          # TanStack Query wrapper
│   │   │   ├── use-projects.ts
│   │   │   ├── use-goals.ts
│   │   │   ├── use-areas.ts
│   │   │   ├── use-notes.ts
│   │   │   ├── use-keyboard.ts       # Global keyboard shortcuts
│   │   │   ├── use-realtime.ts       # Supabase Realtime subscription
│   │   │   └── use-debounce.ts
│   │   ├── stores/                   # Zustand stores
│   │   │   ├── ui.store.ts           # Sidebar state, modals, command palette
│   │   │   ├── filters.store.ts      # Active filters per view
│   │   │   └── onboarding.store.ts   # Onboarding step tracking
│   │   ├── validators/               # Zod schemas (shared frontend + API)
│   │   │   ├── task.schema.ts
│   │   │   ├── project.schema.ts
│   │   │   ├── goal.schema.ts
│   │   │   ├── area.schema.ts
│   │   │   ├── note.schema.ts
│   │   │   └── ... (one per entity)
│   │   ├── utils/
│   │   │   ├── dates.ts              # Date formatting, relative dates
│   │   │   ├── smart-priority.ts     # Score calculation algorithm
│   │   │   ├── encryption.ts         # AES-256-GCM for password manager
│   │   │   └── constants.ts          # Enums, defaults, limits
│   │   └── types/
│   │       ├── database.types.ts     # Auto-generated from Supabase
│   │       ├── api.types.ts          # API request/response types
│   │       └── domain.types.ts       # Derived business types
│   │
│   └── emails/                       # React Email templates
│       ├── welcome.tsx
│       ├── trial-expiring.tsx
│       └── weekly-digest.tsx
│
├── public/
│   ├── icons/                        # PWA icons
│   └── manifest.json                 # PWA manifest
│
├── tests/
│   ├── unit/                         # Vitest unit tests
│   │   ├── smart-priority.test.ts
│   │   ├── task.service.test.ts
│   │   └── validators.test.ts
│   ├── integration/                  # API route tests
│   │   ├── tasks.api.test.ts
│   │   └── auth.api.test.ts
│   └── e2e/                          # Playwright E2E
│       ├── onboarding.spec.ts
│       └── task-crud.spec.ts
│
├── .env.local                        # Local env vars (gitignored)
├── .env.example                      # Template for env vars
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

### Key principles in this structure:
- **`/app` is for routing only.** Pages are thin — they import components and call hooks. Zero business logic in page files.
- **`/lib/services` is where business logic lives.** Services are framework-agnostic. They can be used by both the dashboard and the API routes.
- **`/lib/validators` are shared.** The same Zod schema validates a form submission on the frontend AND an API request on the backend.
- **`/lib/hooks` wraps TanStack Query.** Components never call Supabase directly. They call `useTasks()` which handles caching, pagination, and optimistic updates.
- **`/components/entities` are domain-specific.** Generic UI goes in `/components/ui`. Business-specific rendering goes in `/components/entities`.

---

## 3. Component Breakdown

### Component hierarchy (Dashboard page as example):

```
(dashboard)/layout.tsx
├── Sidebar
│   ├── SidebarNav (Core section: Dashboard, Areas, Projects, Tasks, Goals)
│   ├── SidebarNav (System section: Inbox, My Day, Knowledge Hub)
│   ├── SidebarNav (Trackers section: Bookmarks, Books, Movies, ...)
│   └── SidebarFooter (Settings, Theme toggle, User avatar)
├── Topbar
│   ├── BreadcrumbNav
│   ├── CommandPalette (Cmd+K trigger)
│   └── UserMenu
└── PageContent (varies by route)
    └── DashboardPage
        ├── GreetingBar
        ├── QuickCaptureWidget
        ├── TodayTasksList
        │   └── TaskListItem (× n)
        │       ├── Checkbox
        │       ├── PriorityBadge
        │       ├── TaskName (inline editable)
        │       ├── DueDateTag
        │       └── AreaTag
        ├── ActiveGoalsWidget
        │   └── GoalCard (× 3–5)
        │       ├── ProgressRing
        │       ├── GoalName
        │       └── DaysRemaining
        └── RecentActivityFeed
```

### Reusable component contracts:

```typescript
// Every entity list component follows this pattern:
interface EntityListProps<T> {
  items: T[];
  isLoading: boolean;
  view: "list" | "gallery" | "kanban" | "calendar";
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onItemClick: (id: string) => void;
  onItemCreate: () => void;
  emptyState: React.ReactNode;
}

// Every entity card follows this pattern:
interface EntityCardProps<T> {
  entity: T;
  variant: "compact" | "full";
  onEdit: () => void;
  onArchive: () => void;
  onDelete: () => void;
}
```

---

## 4. Data Models

### TypeScript types (source of truth, generated from Supabase):

```typescript
// ─── Enums ───
type Priority = "high" | "medium" | "low";
type TaskStatus = "inbox" | "todo" | "in_progress" | "done";
type ProjectStatus = "inbox" | "in_progress" | "completed" | "on_hold" | "archive";
type GoalTerm = "short" | "mid" | "long";
type NoteType = "note" | "research" | "journal";
type NoteStatus = "inbox" | "to_review" | "active" | "archive";
type ResourceType = "website" | "article" | "video" | "tool";
type ResourceStatus = "inbox" | "to_review" | "saved" | "favorites" | "archive";
type AreaType = "business" | "personal" | string; // Flexible — users can create custom types (e.g., "studies")

// ─── Base ───
interface BaseEntity {
  id: string;               // UUID v7 (time-sortable)
  user_id: string;
  created_at: string;        // ISO 8601
  updated_at: string;
  metadata: Record<string, unknown> | null;  // JSONB escape hatch
}

// ─── Core PARA ───
interface Area extends BaseEntity {
  name: string;
  description: string | null;
  type: AreaType;
  icon: string | null;       // emoji or icon key
  archive: boolean;
  // Computed (via API, not stored):
  goal_count?: number;
  project_count?: number;
  task_count?: number;
}

interface Goal extends BaseEntity {
  area_id: string;
  name: string;
  description: string | null;
  term: GoalTerm;
  priority: Priority | null;
  due_date: string | null;
  completion: number;        // 0.00 – 1.00
  completed: boolean;
  inactive: boolean;
  archive: boolean;
}

interface Project extends BaseEntity {
  area_id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: Priority | null;
  progress: number;          // 0.00 – 1.00 (auto-computed)
  start_date: string | null;
  due_date: string | null;
  tags: string[];
  archive: boolean;
}

interface Task extends BaseEntity {
  area_id: string | null;
  project_id: string | null;
  name: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  focus: boolean;
  important: boolean;
  urgent: boolean;
  smart_priority: number;    // 1–5 (computed)
  due_date: string | null;
  repeat_cycle: "none" | "daily" | "weekly" | "monthly" | null;
  repeat_every: number | null;
  tags: string[];
  complete: boolean;
  completed_at: string | null;
}

interface Note extends BaseEntity {
  area_id: string | null;
  project_id: string | null;
  name: string;
  content: string | null;    // Tiptap JSON or Markdown
  type: NoteType;
  status: NoteStatus;
  notebook: string | null;
  favorite: boolean;
  pin: boolean;
  archive: boolean;
}

interface Resource extends BaseEntity {
  area_id: string | null;
  project_id: string | null;
  name: string;
  url: string | null;
  type: ResourceType;
  status: ResourceStatus;
  favorite: boolean;
  archive: boolean;
}

interface Topic extends BaseEntity {
  name: string;
}

interface Contact extends BaseEntity {
  name: string;
  relationship_type: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  last_interaction_at: string | null;
}

// ─── Junction tables (many-to-many) ───
// goal_projects, goal_tasks, goal_notes, goal_resources
// project_notes, project_resources
// note_topics, resource_topics, area_topics
// note_related_notes (self-referential)
// contact_notes, contact_tasks
// All follow: { id, entity_a_id, entity_b_id, created_at }
```

---

## 5. State Management Strategy

### Two-layer state model:

```
┌─────────────────────────────────────────────────────┐
│  Server State (TanStack Query)                      │
│  "What's in the database?"                          │
│                                                     │
│  • All entity lists (tasks, projects, goals, etc.)  │
│  • User settings and preferences                    │
│  • Dashboard aggregations                           │
│  • Search results                                   │
│                                                     │
│  Strategy: stale-while-revalidate                   │
│  Cache time: 5 min (configurable per query)         │
│  Background refetch on window focus                 │
│  Optimistic mutations for instant UI feedback       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│  Client State (Zustand)                             │
│  "What's happening in the UI right now?"            │
│                                                     │
│  • Sidebar open/collapsed                           │
│  • Active filters per view                          │
│  • Command palette open/closed                      │
│  • Modal state (which modal, which entity)          │
│  • Onboarding step                                  │
│  • Theme preference                                 │
│                                                     │
│  Strategy: ephemeral, resets on page reload          │
│  (except theme — persisted to localStorage)         │
└─────────────────────────────────────────────────────┘
```

### TanStack Query patterns:

```typescript
// Hook pattern (used by all entity pages):
export function useTasks(filters: TaskFilters) {
  return useQuery({
    queryKey: ["tasks", filters],
    queryFn: () => fetchTasks(filters),
    staleTime: 5 * 60 * 1000,  // 5 min
  });
}

// Optimistic mutation pattern (task completion):
export function useCompleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskId: string) => completeTask(taskId),
    onMutate: async (taskId) => {
      // Cancel outgoing fetches
      await queryClient.cancelQueries({ queryKey: ["tasks"] });

      // Snapshot previous state
      const previous = queryClient.getQueryData(["tasks"]);

      // Optimistically update
      queryClient.setQueryData(["tasks"], (old: Task[]) =>
        old.map((t) => (t.id === taskId ? { ...t, complete: true } : t))
      );

      return { previous };
    },
    onError: (err, taskId, context) => {
      // Rollback on error
      queryClient.setQueryData(["tasks"], context?.previous);
    },
    onSettled: () => {
      // Always refetch after mutation
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] }); // progress rollup
      queryClient.invalidateQueries({ queryKey: ["goals"] });    // completion rollup
    },
  });
}
```

### Zustand store pattern:

```typescript
// Minimal, flat, one store per concern:
interface UIStore {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  commandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  activeModal: { type: string; entityId?: string } | null;
  openModal: (type: string, entityId?: string) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  commandPaletteOpen: false,
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  activeModal: null,
  openModal: (type, entityId) => set({ activeModal: { type, entityId } }),
  closeModal: () => set({ activeModal: null }),
}));
```

---

## 6. API / Backend Structure

### API design principles:
- **REST, not GraphQL.** The LifeOS Agent needs a simple, predictable API. REST with consistent patterns is easier to consume than GraphQL for an AI client.
- **Next.js Route Handlers serve the API.** No separate backend. `/app/api/v1/*` routes handle everything.
- **Supabase JS client does the DB work.** Route handlers validate, authorize, call Supabase, and return JSON.

### Request lifecycle:

```
Client Request
     │
     ▼
┌──────────────────┐
│ Rate Limiter      │ → 429 if exceeded
│ (token bucket)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Auth Guard        │ → 401 if no valid JWT / API key
│ (JWT or API key)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Zod Validation    │ → 400 if invalid body / params
│ (shared schemas)  │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Service Layer     │ → Business logic
│ (task.service)    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Supabase Client   │ → DB read/write (RLS enforced)
│ (admin or user)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Webhook Emit      │ → Notify subscribers (async)
│ (if write op)     │
└────────┬─────────┘
         │
         ▼
    JSON Response
```

### Standard response format:

```typescript
// Success (single entity):
{ "data": { ...entity }, "meta": null }

// Success (list):
{ "data": [...entities], "meta": { "cursor": "abc123", "has_more": true } }

// Error:
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": [...] } }
```

### Endpoint summary (complete list):

```
GET     /api/v1/areas                    List areas
POST    /api/v1/areas                    Create area
GET     /api/v1/areas/:id                Get area with rollup counts
PUT     /api/v1/areas/:id                Update area
DELETE  /api/v1/areas/:id                Soft delete (archive)

GET     /api/v1/goals                    List goals (filterable by area, term, status)
POST    /api/v1/goals                    Create goal
GET     /api/v1/goals/:id                Get goal with linked projects/tasks
PUT     /api/v1/goals/:id                Update goal
DELETE  /api/v1/goals/:id                Soft delete

GET     /api/v1/projects                 List projects (filterable)
POST    /api/v1/projects                 Create project
GET     /api/v1/projects/:id             Get project with tasks
PUT     /api/v1/projects/:id             Update project
DELETE  /api/v1/projects/:id             Soft delete

GET     /api/v1/tasks                    List tasks (extensive filters)
POST    /api/v1/tasks                    Create task
POST    /api/v1/tasks/bulk               Bulk create (for Agent)
GET     /api/v1/tasks/:id                Get task
PUT     /api/v1/tasks/:id                Update task
POST    /api/v1/tasks/:id/complete       Complete task
DELETE  /api/v1/tasks/:id                Soft delete

GET     /api/v1/notes                    List notes
POST    /api/v1/notes                    Create note
GET     /api/v1/notes/:id                Get note with content
PUT     /api/v1/notes/:id                Update note
DELETE  /api/v1/notes/:id                Soft delete

GET     /api/v1/resources                List resources
POST    /api/v1/resources                Create resource

GET     /api/v1/topics                   List topics

GET     /api/v1/contacts                 List contacts
POST    /api/v1/contacts                 Create contact

GET     /api/v1/search?q=...&types=...   Full-text search
GET     /api/v1/dashboard/today          Today's aggregated view
GET     /api/v1/dashboard/summary        Stats and streaks

GET     /api/v1/trackers/bookmarks       (same CRUD pattern for all trackers)
POST    /api/v1/trackers/bookmarks
...

POST    /api/v1/integrations             Link external account
GET     /api/v1/export                   Export all user data (JSON)
POST    /api/v1/import/notion            Import from Notion CSV

POST    /api/v1/webhooks/stripe          Stripe webhook handler
```

---

## 7. Authentication Flow

### Flow 1: Email/Password Signup

```
User → /signup → enters email + password
  → Supabase Auth: signUp() → sends confirmation email
  → User clicks email link → Supabase confirms
  → Redirect to /onboarding
  → Onboarding service seeds default areas
  → Redirect to /dashboard
```

### Flow 2: Google OAuth

```
User → /login → clicks "Continue with Google"
  → Supabase Auth: signInWithOAuth({ provider: "google" })
  → Redirect to Google consent screen
  → Callback to /auth/callback
  → Supabase creates user + session
  → If new user → redirect /onboarding
  → If returning → redirect /dashboard
```

### Flow 3: API Key Auth (for LifeOS Agent)

```
User → /settings/api-keys → clicks "Create API Key"
  → Generates sk_live_<random> key
  → Hashes key (SHA-256) and stores hash in api_keys table
  → Shows raw key ONCE to user (never stored raw)
  → User configures LifeOS Agent with this key

Agent → /api/v1/tasks → Authorization: Bearer sk_live_xxx
  → Auth guard hashes incoming key
  → Looks up hash in api_keys table
  → Resolves to user_id
  → All subsequent Supabase queries scoped to that user_id
```

### Session management:

```typescript
// Middleware (applied to all /api/v1/* and /(dashboard)/* routes):
export async function middleware(request: NextRequest) {
  const supabase = createServerClient(/* ... */);
  const { data: { session } } = await supabase.auth.getSession();

  // Dashboard routes: require session, redirect to /login if missing
  if (request.nextUrl.pathname.startsWith("/(dashboard)") && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // API routes: accept either session JWT or API key
  if (request.nextUrl.pathname.startsWith("/api/v1")) {
    const authHeader = request.headers.get("Authorization");
    if (!session && !authHeader?.startsWith("Bearer sk_")) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
    }
  }

  return NextResponse.next();
}
```

---

## 8. Database Schema

### Full SQL schema (core tables):

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";     -- Full-text search

-- ═══ ENUMS ═══
CREATE TYPE priority AS ENUM ('high', 'medium', 'low');
CREATE TYPE task_status AS ENUM ('inbox', 'todo', 'in_progress', 'done');
CREATE TYPE project_status AS ENUM ('inbox', 'in_progress', 'completed', 'on_hold', 'archive');
CREATE TYPE goal_term AS ENUM ('short', 'mid', 'long');
CREATE TYPE note_type AS ENUM ('note', 'research', 'journal');
CREATE TYPE note_status AS ENUM ('inbox', 'to_review', 'active', 'archive');
CREATE TYPE resource_type AS ENUM ('website', 'article', 'video', 'tool');
CREATE TYPE resource_status AS ENUM ('inbox', 'to_review', 'saved', 'favorites', 'archive');
CREATE TYPE area_type AS ENUM ('business', 'personal');

-- ═══ CORE PARA TABLES ═══

CREATE TABLE areas (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  type        area_type NOT NULL DEFAULT 'personal',
  icon        TEXT,
  archive     BOOLEAN NOT NULL DEFAULT false,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE goals (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_id     UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  term        goal_term NOT NULL DEFAULT 'mid',
  priority    priority,
  due_date    DATE,
  completion  NUMERIC(5,4) NOT NULL DEFAULT 0,   -- 0.0000 – 1.0000
  completed   BOOLEAN NOT NULL DEFAULT false,
  inactive    BOOLEAN NOT NULL DEFAULT false,
  archive     BOOLEAN NOT NULL DEFAULT false,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE projects (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_id     UUID NOT NULL REFERENCES areas(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  status      project_status NOT NULL DEFAULT 'inbox',
  priority    priority,
  progress    NUMERIC(5,4) NOT NULL DEFAULT 0,
  start_date  DATE,
  due_date    DATE,
  tags        TEXT[] DEFAULT '{}',
  archive     BOOLEAN NOT NULL DEFAULT false,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tasks (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_id         UUID REFERENCES areas(id) ON DELETE SET NULL,
  project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  status          task_status NOT NULL DEFAULT 'inbox',
  priority        priority NOT NULL DEFAULT 'medium',
  focus           BOOLEAN NOT NULL DEFAULT false,
  important       BOOLEAN NOT NULL DEFAULT false,
  urgent          BOOLEAN NOT NULL DEFAULT false,
  smart_priority  SMALLINT NOT NULL DEFAULT 3 CHECK (smart_priority BETWEEN 1 AND 5),
  due_date        DATE,
  repeat_cycle    TEXT CHECK (repeat_cycle IN ('none','daily','weekly','monthly')),
  repeat_every    SMALLINT,
  tags            TEXT[] DEFAULT '{}',
  complete        BOOLEAN NOT NULL DEFAULT false,
  completed_at    TIMESTAMPTZ,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_id     UUID REFERENCES areas(id) ON DELETE SET NULL,
  project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  content     TEXT,                    -- Tiptap JSON serialized
  type        note_type NOT NULL DEFAULT 'note',
  status      note_status NOT NULL DEFAULT 'inbox',
  notebook    TEXT,
  favorite    BOOLEAN NOT NULL DEFAULT false,
  pin         BOOLEAN NOT NULL DEFAULT false,
  archive     BOOLEAN NOT NULL DEFAULT false,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE resources (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  area_id     UUID REFERENCES areas(id) ON DELETE SET NULL,
  project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  url         TEXT,
  type        resource_type NOT NULL DEFAULT 'website',
  status      resource_status NOT NULL DEFAULT 'inbox',
  favorite    BOOLEAN NOT NULL DEFAULT false,
  archive     BOOLEAN NOT NULL DEFAULT false,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE topics (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

CREATE TABLE contacts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  relationship_type   TEXT,
  phone               TEXT,
  email               TEXT,
  notes               TEXT,
  last_interaction_at TIMESTAMPTZ,
  metadata            JSONB DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══ JUNCTION TABLES ═══

CREATE TABLE goal_projects (
  goal_id    UUID REFERENCES goals(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  PRIMARY KEY (goal_id, project_id)
);

CREATE TABLE goal_tasks (
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (goal_id, task_id)
);

CREATE TABLE goal_notes (
  goal_id UUID REFERENCES goals(id) ON DELETE CASCADE,
  note_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  PRIMARY KEY (goal_id, note_id)
);

CREATE TABLE goal_resources (
  goal_id     UUID REFERENCES goals(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  PRIMARY KEY (goal_id, resource_id)
);

CREATE TABLE project_notes (
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  note_id    UUID REFERENCES notes(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, note_id)
);

CREATE TABLE project_resources (
  project_id  UUID REFERENCES projects(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, resource_id)
);

CREATE TABLE note_topics (
  note_id  UUID REFERENCES notes(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (note_id, topic_id)
);

CREATE TABLE resource_topics (
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  topic_id    UUID REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (resource_id, topic_id)
);

CREATE TABLE area_topics (
  area_id  UUID REFERENCES areas(id) ON DELETE CASCADE,
  topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
  PRIMARY KEY (area_id, topic_id)
);

CREATE TABLE note_related_notes (
  note_a_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  note_b_id UUID REFERENCES notes(id) ON DELETE CASCADE,
  PRIMARY KEY (note_a_id, note_b_id),
  CHECK (note_a_id < note_b_id)   -- Prevent duplicates (a,b) and (b,a)
);

CREATE TABLE contact_notes (
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  note_id    UUID REFERENCES notes(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, note_id)
);

CREATE TABLE contact_tasks (
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  task_id    UUID REFERENCES tasks(id) ON DELETE CASCADE,
  PRIMARY KEY (contact_id, task_id)
);

-- ═══ SYSTEM TABLES ═══

CREATE TABLE time_entries (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id     UUID REFERENCES tasks(id) ON DELETE SET NULL,
  project_id  UUID REFERENCES projects(id) ON DELETE SET NULL,
  started_at  TIMESTAMPTZ NOT NULL,
  ended_at    TIMESTAMPTZ,
  duration_s  INTEGER,                -- Stored on end, or manual
  type        TEXT DEFAULT 'manual' CHECK (type IN ('pomodoro', 'manual')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_settings (
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone             TEXT NOT NULL DEFAULT 'UTC',
  theme                TEXT NOT NULL DEFAULT 'dark',
  morning_briefing     TIME DEFAULT '07:00',
  evening_review       TIME DEFAULT '21:00',
  weekly_digest_day    SMALLINT DEFAULT 0,      -- 0 = Sunday
  language             TEXT DEFAULT 'en',
  onboarding_complete  BOOLEAN DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE api_keys (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  key_hash    TEXT NOT NULL UNIQUE,     -- SHA-256 of raw key
  scopes      TEXT[] NOT NULL DEFAULT '{read:all,write:all}',
  last_used   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE integrations (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,            -- 'whatsapp', 'telegram', etc.
  external_id  TEXT NOT NULL,            -- Channel-specific user ID
  status       TEXT NOT NULL DEFAULT 'active',
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(type, external_id)
);

CREATE TABLE subscriptions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id    TEXT,
  stripe_subscription_id TEXT,
  tier                  TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free','pro','premium')),
  status                TEXT NOT NULL DEFAULT 'active',
  trial_ends_at         TIMESTAMPTZ,
  current_period_end    TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══ INDEXES ═══
-- Every table gets: user_id, status (if applicable), created_at

CREATE INDEX idx_areas_user ON areas(user_id) WHERE NOT archive;
CREATE INDEX idx_goals_user ON goals(user_id, area_id) WHERE NOT archive;
CREATE INDEX idx_goals_active ON goals(user_id) WHERE NOT completed AND NOT inactive AND NOT archive;
CREATE INDEX idx_projects_user ON projects(user_id, area_id) WHERE NOT archive;
CREATE INDEX idx_projects_status ON projects(user_id, status) WHERE NOT archive;
CREATE INDEX idx_tasks_user ON tasks(user_id) WHERE NOT complete;
CREATE INDEX idx_tasks_status ON tasks(user_id, status) WHERE NOT complete;
CREATE INDEX idx_tasks_due ON tasks(user_id, due_date) WHERE NOT complete AND due_date IS NOT NULL;
CREATE INDEX idx_tasks_focus ON tasks(user_id) WHERE focus = true AND NOT complete;
CREATE INDEX idx_tasks_project ON tasks(project_id) WHERE NOT complete;
CREATE INDEX idx_tasks_smart ON tasks(user_id, smart_priority DESC) WHERE NOT complete;
CREATE INDEX idx_notes_user ON notes(user_id) WHERE NOT archive;
CREATE INDEX idx_resources_user ON resources(user_id) WHERE NOT archive;
CREATE INDEX idx_topics_user ON topics(user_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_integrations_lookup ON integrations(type, external_id);

-- Full-text search
CREATE INDEX idx_tasks_search ON tasks USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX idx_notes_search ON notes USING gin(to_tsvector('english', name || ' ' || COALESCE(content, '')));
CREATE INDEX idx_resources_search ON resources USING gin(to_tsvector('english', name || ' ' || COALESCE(url, '')));

-- ═══ FUNCTIONS ═══

-- Auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER trg_areas_updated BEFORE UPDATE ON areas FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_goals_updated BEFORE UPDATE ON goals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_projects_updated BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tasks_updated BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_notes_updated BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_resources_updated BEFORE UPDATE ON resources FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-recalculate project progress when tasks change
CREATE OR REPLACE FUNCTION recalc_project_progress()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projects SET progress = (
    SELECT CASE WHEN count(*) = 0 THEN 0
    ELSE count(*) FILTER (WHERE complete) ::numeric / count(*) END
    FROM tasks WHERE project_id = COALESCE(NEW.project_id, OLD.project_id)
  )
  WHERE id = COALESCE(NEW.project_id, OLD.project_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_task_progress
  AFTER INSERT OR UPDATE OF complete OR DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION recalc_project_progress();
```

---

## 9. Security Considerations

### Row-Level Security (every table):

```sql
-- Template applied to EVERY user-facing table:
ALTER TABLE <table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own" ON <table> FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "insert_own" ON <table> FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own" ON <table> FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "delete_own" ON <table> FOR DELETE USING (auth.uid() = user_id);
```

### API key authentication:

```typescript
// Keys generated as: "sk_live_" + crypto.randomBytes(32).toString("hex")
// Only the SHA-256 hash is stored. Raw key shown once on creation.
// Lookup: hash incoming key → match against api_keys.key_hash → resolve user_id

async function resolveApiKey(key: string): Promise<string | null> {
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  const { data } = await supabaseAdmin
    .from("api_keys")
    .select("user_id")
    .eq("key_hash", hash)
    .single();
  return data?.user_id ?? null;
}
```

### Password Manager encryption:

```typescript
// Client-side only. Server never sees plaintext.
// Master password → PBKDF2 (100,000 iterations, SHA-256) → 256-bit key
// Each entry encrypted with AES-256-GCM (unique IV per entry)
// Encrypted blob stored in password_entries.encrypted_data (TEXT)
// Decryption only happens in the browser
```

### Rate limiting:

```typescript
// Token bucket algorithm, per user, stored in memory (Map)
// Limits: Free = 100 req/min, Pro = 500, Premium = 1000
// Returns 429 with Retry-After header
```

### Additional measures:
- HTTPS everywhere (Vercel enforces this)
- CORS restricted to production domain + localhost (dev)
- Content Security Policy headers via Next.js middleware
- Input sanitization via Zod (rejects unexpected fields)
- SQL injection prevention via parameterized queries (Supabase client does this natively)
- XSS prevention via React's default escaping + CSP
- No sensitive data in URL params (only cursor tokens, IDs)

---

## 10. How to Keep Code Modular and Maintainable

### Rule 1: The service layer is the boundary

```
Pages → Hooks → Services → Supabase
  ↑                ↑
  UI only     Business logic only
```

Pages never import Supabase directly. Hooks never contain business logic. Services never return JSX. This boundary means you can swap Supabase for Prisma, or Next.js for Remix, by changing only one layer.

### Rule 2: One Zod schema, three uses

```typescript
// src/lib/validators/task.schema.ts
export const createTaskSchema = z.object({
  name: z.string().min(1).max(500),
  area_id: z.string().uuid().optional(),
  project_id: z.string().uuid().optional(),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  due_date: z.string().date().optional(),
  focus: z.boolean().default(false),
});

// Used in: API route handler (server validation)
// Used in: React Hook Form (client validation)
// Used in: TypeScript type inference (z.infer<typeof createTaskSchema>)
```

### Rule 3: Feature folders for trackers

Each personal tracker is self-contained. If you need to delete a tracker, remove one folder:

```
src/app/(dashboard)/trackers/bookmarks/
├── page.tsx          # Route
├── bookmark-list.tsx # Component
├── bookmark-form.tsx # Form
└── use-bookmarks.ts  # Hook (TanStack Query)
```

### Rule 4: Consistent naming

```
Files:       kebab-case (task-list-item.tsx)
Components:  PascalCase (TaskListItem)
Hooks:       camelCase with "use" prefix (useTasks)
Services:    camelCase with ".service" suffix (task.service.ts)
Schemas:     camelCase with ".schema" suffix (task.schema.ts)
Stores:      camelCase with ".store" suffix (ui.store.ts)
API routes:  /api/v1/<resource>/route.ts
DB tables:   snake_case (goal_projects)
DB columns:  snake_case (smart_priority)
TS types:    PascalCase (TaskStatus)
```

### Rule 5: No god components

If a component exceeds 200 lines, it needs splitting. Signals for extraction:
- Multiple `useState` calls → extract to a hook
- Conditional rendering of large blocks → extract to sub-component
- Data transformation in render → extract to utility function

### Rule 6: Test the service layer, not the UI

Unit test services and validators (fast, deterministic). Integration test API routes (actual HTTP calls). E2E test only critical flows (onboarding, task CRUD). Don't unit test React components — they change too often.

```
tests/
├── unit/           # Services + validators + utils (Vitest)
├── integration/    # API routes (supertest or fetch)
└── e2e/            # Critical flows only (Playwright)
```

### Rule 7: Database migrations are forward-only

Never edit an existing migration. Always create a new one. Name them sequentially (`00016_add_task_labels.sql`). Run `supabase db push` in CI. No manual SQL in production, ever.

### Rule 8: Feature flags for phased rollout

```typescript
// PostHog feature flags control what's visible:
const showKnowledgeHub = useFeatureFlag("knowledge-hub");
const showTimeTracker = useFeatureFlag("time-tracker");

// This lets you merge incomplete features to main
// without exposing them to users.
```

---

## Appendix: Smart Priority Algorithm

The smart priority score (1–5) is computed server-side as a PostgreSQL function and recalculated on task create/update:

```sql
CREATE OR REPLACE FUNCTION calc_smart_priority(
  p_due_date DATE,
  p_priority priority,
  p_important BOOLEAN,
  p_urgent BOOLEAN,
  p_goal_count INTEGER    -- number of linked active goals
) RETURNS SMALLINT AS $$
DECLARE
  score NUMERIC := 0;
  due_weight NUMERIC;
  pri_weight NUMERIC;
  goal_weight NUMERIC;
  eis_weight NUMERIC;
BEGIN
  -- Due date proximity (30%): 1.5 if overdue, scaled 0-1.5 within 14 days
  IF p_due_date IS NULL THEN
    due_weight := 0.5;    -- no date = moderate
  ELSIF p_due_date <= CURRENT_DATE THEN
    due_weight := 1.5;    -- overdue = max
  ELSE
    due_weight := GREATEST(0, 1.5 - (p_due_date - CURRENT_DATE)::numeric / 14 * 1.5);
  END IF;

  -- Priority level (25%): high=1.25, medium=0.75, low=0.25
  pri_weight := CASE p_priority
    WHEN 'high' THEN 1.25
    WHEN 'medium' THEN 0.75
    WHEN 'low' THEN 0.25
  END;

  -- Goal alignment (25%): 0 if no goals, 0.5 if 1, 1.0 if 2, 1.25 if 3+
  goal_weight := LEAST(1.25, p_goal_count * 0.5);

  -- Eisenhower (20%): both=1.0, important=0.7, urgent=0.5, neither=0
  eis_weight := CASE
    WHEN p_important AND p_urgent THEN 1.0
    WHEN p_important THEN 0.7
    WHEN p_urgent THEN 0.5
    ELSE 0
  END;

  score := due_weight + pri_weight + goal_weight + eis_weight;

  -- Normalize to 1-5 scale (max possible = 1.5+1.25+1.25+1.0 = 5.0)
  RETURN GREATEST(1, LEAST(5, ROUND(score)));
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

---

*This architecture document covers LifeOS Core (Project 1 of 2). It provides everything a development team needs to start building from Week 1.*

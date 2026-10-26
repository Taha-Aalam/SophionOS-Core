# SophionOS Core — UI Reconstruction Inventory

Repo: `/home/maverick/Work/SaaS/sophionos-core` · Next.js App Router + Tailwind v4 + shadcn (`base-nova`) + Base UI primitives.

Everything below is quoted verbatim from source. Paths are relative to the repo root.

---

## 1. App Shell / Sidebar Navigation

### 1.1 Layout structure — `src/app/(dashboard)/layout.tsx:59-66`

```html
<div class="flex h-screen overflow-hidden bg-background">
  <Sidebar />                     <!-- w-64 open / w-20 collapsed, lg:flex -->
  <MobileNav />                   <!-- Sheet, side="left", w-72 -->
  <div class="flex flex-1 flex-col min-w-0 overflow-hidden">
    <Topbar initialSubscription=… />   <!-- h-12, border-b border-border -->
    <main class="flex-1 overflow-y-auto">{children}</main>
  </div>
</div>
<CommandPalette />                 <!-- ⌘K -->
<SignOutOverlay />
```

### 1.2 Logo / wordmark — `src/components/layout/sidebar.tsx:90-95`

24×24 rounded-md tile (`bg-primary`, `text-xs font-bold`, `shadow-[0_2px_8px_oklch(0.3_0.15_260/0.35)]`) containing the literal letter **`S`**, followed by the wordmark **`SophionOS`** in `text-sm font-semibold tracking-tight`.

Mobile sheet repeats the same: `S` tile + `SophionOS` (`mobile-nav.tsx:84-89`).

### 1.3 Nav groups, order, and icons — `src/components/layout/navigation.ts`

Two group headings, rendered as uppercase micro-labels:
`text-2xs font-semibold uppercase tracking-wider text-muted-foreground`

**Group `Core`** (9 items, exact order):

| # | Label | href | Icon |
|---|-------|------|------|
| 1 | `Dashboard` | `/dashboard` | `🏠` |
| 2 | `Areas` | `/areas` | `🗺️` |
| 3 | `Goals` | `/goals` | `🎯` |
| 4 | `Projects` | `/projects` | `📁` |
| 5 | `Tasks` | `/tasks` | `☑️` |
| 6 | `Notes` | `/notes` | `📝` |
| 7 | `Resources` | `/resources` | `🔗` |
| 8 | `Topics` | `/topics` | `🏷️` |
| 9 | `Contacts` | `/contacts` | `👥` |

**Group `System`** (3 items, exact order):

| # | Label | href | Icon |
|---|-------|------|------|
| 1 | `My Day` | `/my-day` | Lucide `Sun`, `text-orange-500` |
| 2 | `Inbox` | `/inbox` | `📥` |
| 3 | `Knowledge Hub` | `/knowledge` | Lucide `Library`, `text-blue-500` |

All nav icons are literal emoji characters except **My Day** (orange `Sun`) and **Knowledge Hub** (blue `Library`).

### 1.4 Breadcrumb label map — `navigation.ts:32-50`

```
areas: "Areas"          contacts: "Contacts"     dashboard: "Dashboard"
goals: "Goals"          inbox: "Inbox"           knowledge: "Knowledge Hub"
my-day: "My Day"        notes: "Notes"           projects: "Projects"
resources: "Resources"  settings: "Settings"     tasks: "Tasks"
topics: "Topics"        login: "Login"           signup: "Sign Up"
forgot-password: "Forgot Password"                reset-password: "Reset Password"
```

Breadcrumb render: non-last segments `capitalize text-muted-foreground`, last `capitalize font-medium`; separator is a literal `/`. UUID segments fall back to `pageTitle || "Details"`.

### 1.5 Sidebar bottom — user/account affordances (`sidebar.tsx:134-162`)

Top border `border-t border-sidebar-border`, `px-2 py-3`, three rows + avatar row:

1. Lucide `Settings` icon → label **`Settings`** → `/settings`
2. Lucide `SunMoon` icon → label **`Light mode`** when dark, **`Dark mode`** when light (`Theme` before mount)
3. Avatar (`size="sm"`, `AvatarFallback` = first 2 chars of display name, uppercased) + display name (`truncate text-sm font-medium`)

Display name resolution: `user?.name || user?.email || "User"`. aria-label: `` `Open profile: ${displayName}` ``. Row links to `/settings/profile`.

Collapse toggle aria-labels: `Collapse sidebar` / `Expand sidebar`.

Mobile sheet bottom adds a 4th row: Lucide-free destructive text button **`Sign out`** (`text-destructive`).

### 1.6 Topbar — `src/components/layout/topbar.tsx:82-96`

`h-12`, `border-b border-border bg-background px-4`. Left: hamburger `aria-label="Open navigation menu"` (lg:hidden) + `<nav aria-label="Breadcrumb">`. Right: `ProfileDropdown`.

### 1.7 Profile dropdown — `src/components/layout/profile-dropdown.tsx`

**Trigger**: name (`text-sm font-medium tracking-tight`, max-w `[16rem]`) + optional `Cohort` pill, email below (`text-xs tracking-tight text-muted-foreground`), then a 36×36 avatar ring:
`bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-0.5`. aria-label `User menu`.
A 12×24 SVG "bending line" indicator sits outside the right edge (`d="M2 4C6 8 6 16 2 20"`, stroke-width 1.5), blue when open.

**Menu items** (exact labels + icons, in order):

| Label | href | Icon | Trailing value chip |
|-------|------|------|---------------------|
| `Profile` | `/settings/profile` | `User` | — |
| `Subscription` | `/settings/billing` (or `/settings`) | `CreditCard` | tier, purple chip |
| `API Keys` | `/settings/api-keys` | `KeyRound` | — |
| `MCP Server` | `/settings/mcp` | `Plug` | — |
| `Settings` | `/settings` | `Settings` | — |
| `Terms & Policies` | `/terms` | `FileText` | — |

Tier labels: `free → "Free"`, `pro → "Pro"`, `lifetime → "Lifetime"`, `max → "Max"`.
Then separator, then destructive `Sign Out` (Lucide `LogOut`), then theme toggle:
`Switch to light mode` / `Switch to dark mode` (Lucide `SunMoon`).

Dropdown panel: `w-64 rounded-2xl p-2`; each item `rounded-xl border border-transparent p-3 hover:border-border/60 hover:bg-accent/70 hover:shadow-sm`.

### 1.8 Cohort badge — `src/components/settings/cohort-member-badge.tsx`

- pill variant (topbar): literal **`Cohort`** — `h-4 rounded-full border-blue-500/20 bg-blue-500/10 text-[10px] font-semibold uppercase tracking-wide text-blue-600`
- plain variant: **`Cohort Member`**

### 1.9 Command palette — `src/components/layout/command-palette.tsx`

Input placeholder: **`Search or create…`**
Groups (in order): `Core`, `System`, `Create`, `Tasks`, `Goals`, `Projects`, `Areas`, `Notes`, `Resources`, `Topics`, `Contacts`.
Create actions: `Create area`, `Create goal`, `Create project`, `Create task`, `Create note`, `Create resource`, `Create contact`, `Create topic`.

---

## 2. Dashboard

Files: `src/app/(dashboard)/dashboard/{page,dashboard-content,dashboard-analytics-section,dashboard-analytics-panels}.tsx`, `src/components/dashboard/*.tsx`, `src/components/dashboard/analytics/*.tsx`, `src/components/charts/progress-ring.tsx`.

### 2.1 Page heading

`GreetingBar` (`greeting-bar.tsx`):

- Greeting by hour: `hour < 12 → "Good morning"`, `< 17 → "Good afternoon"`, else `"Good evening"`
- Headline = `` `${greeting}, ${firstName}` `` (or bare greeting if no name)
- H1: `font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]`
- Sub-line (exact, default — no `activeTaskCount` prop is passed from `dashboard-content.tsx:129`):

> **`Load, momentum, and risk signals for the current cycle sit below.`**

(alternate when a count is supplied: `` `${n} active task(s) in play. Load, momentum, and risk signals sit below.` ``)

Container: `content-fade-in mx-auto flex w-full max-w-7xl flex-col gap-8 p-6`.
Error state text: `Failed to load dashboard data.`

### 2.2 Panel order — `dashboard-analytics-panels.tsx:62-89`

Wrapper: `cockpit-stagger flex flex-col gap-4`

1. `<KpiStrip>`
2. Row `grid-cols-1 xl:grid-cols-2`: **Execution Load** | **Goal Momentum**
3. Row `xl:grid-cols-5`: **Activity Map (Last Year)** (col-span-3) | **Work Health** (col-span-2)
4. Row `xl:grid-cols-2`: **Knowledge Pipeline** | **Context Network**
5. **Relationship Risk** (full width)

### 2.3 KPI strip — `analytics/kpi-strip.tsx`

`aria-label="Dashboard key metrics"`; grid `grid-cols-2 sm:gap-4 lg:grid-cols-4`, cards `h-[5.5rem]`.

| Order | Label (exact) | Data key | Lucide icon | Chip / colour class | Value colour |
|---|---|---|---|---|---|
| 1 | `Focus Tasks` | `focusTasks` | `Crosshair` | `bg-analytics-action/10 text-analytics-action` (indigo) | default |
| 2 | `Overdue` | `overdueTasks` | `AlertTriangle` | `bg-analytics-risk/10 text-analytics-risk` (red) | `text-analytics-risk` when > 0 |
| 3 | `Completed (Week)` | `completedThisWeek` | `CheckCircle2` | `bg-analytics-success/10 text-analytics-success` (green) | default |
| 4 | `Active Goals` | `activeGoals` | `Target` | `bg-analytics-accent/10 text-analytics-accent` (violet) | default |

Card anatomy: label `text-xs font-medium text-muted-foreground` top-left; 32×32 `rounded-full` icon chip top-right; value `text-2xl font-semibold leading-none tracking-tight tabular-nums`.
Card class: `flex h-[5.5rem] flex-col justify-between rounded-xl border border-border/70 bg-card p-3.5 shadow-soft`; hover `shadow-soft-lg`; active `scale-[0.99]`.
Risk state adds `border-analytics-risk/25`.

### 2.4 AnalyticsPanel — shared surface (`analytics/analytics-panel.tsx:28-59`)

```
flex flex-col rounded-xl border border-border/70 bg-card p-4
text-card-foreground shadow-soft
transition-[box-shadow,border-color] duration-200 ease-[var(--ease-out-quint)]
hover:border-border hover:shadow-soft-lg
```
Header: 28×28 `rounded-lg bg-muted/70 text-muted-foreground` icon wrapper + `<h3 class="text-sm font-semibold leading-5 tracking-tight text-foreground">`. Description, when present: `mb-3.5 max-w-prose text-xs leading-relaxed text-muted-foreground`.

### 2.5 Execution Load — `analytics/execution-load-panel.tsx`

Title **`Execution Load`**, icon Lucide `BarChart3`. Five `MetricBar` rows in `space-y-3.5`, container `data-slot="execution-load-bars"` (staggered fill-in at 40/80/120/160/200 ms):

| Label | Key | Tone | Value colour |
|---|---|---|---|
| `Today` | `today` | `action` | — |
| `Overdue` | `overdue` | `risk` | `text-analytics-risk` |
| `Focus` | `focus` | `accent` | — |
| `In progress` | `inProgress` | `action` | — |
| `Completed this week` | `completedThisWeek` | `success` | — |

No description line.

### 2.6 MetricBar — `analytics-panel.tsx:76-140`

Row label `text-muted-foreground text-sm`; value `font-semibold tabular-nums text-foreground` (right-aligned).
Track: `height: 8px`, `width: 100%`, `borderRadius: 9999`, `backgroundColor: var(--muted, oklch(0.93 0.01 260))`, `overflow: hidden`.
Fill: width `%` of max, min visible width 6px, `Math.max(10, …)` floor when > 0, `transition: width 280ms var(--ease-out-quint)`.
Tone colours (with hard fallbacks):
- `action` → `var(--analytics-action, oklch(0.58 0.14 260))`
- `risk` → `var(--analytics-risk, oklch(0.55 0.2 27))`
- `success` → `var(--analytics-success, oklch(0.62 0.13 155))`
- `accent` → `var(--analytics-accent, oklch(0.56 0.12 315))`

### 2.7 Goal Momentum — `analytics/goal-momentum-panel.tsx`

Title **`Goal Momentum`**, icon `PieChart`. Real SVG donut: `SIZE = 128`, `STROKE = 16`, `strokeLinecap="butt"`, rotated `-rotate-90`.
Centre: total number `text-xl font-semibold tabular-nums` over label **`goals`** (`text-2xs text-muted-foreground`).
Legend rows (12×12 `rounded-sm` swatch + `Label: <value>`):

| Label | Colour |
|---|---|
| `Stuck` | `--analytics-risk` |
| `Moving` | `--analytics-action` |
| `Almost done` | `--analytics-accent` |

Bucket thresholds — `src/lib/analytics/dashboard-analytics.ts:222-224`:
`progress >= 75 → "almostDone"`; `progress < 25 || (nearDue && progress < 50) → "stuck"`; else `"moving"`.
Exposed as `movingGoals = moving + almostDone`, `stalledGoals = stuck`.

### 2.8 Activity Map — `analytics/activity-heatmap.tsx`

Title **`Activity Map (Last Year)`**, icon `CalendarDays`.
Description is dynamic: `` `${activeDays} active day${activeDays === 1 ? "" : "s"} across the last year` ``.
GitHub-style grid: 7 rows × ~53 week-columns, `gridAutoFlow: column`, `gap: 3`, `aspectRatio: ${weekCount} / 7`, `maxHeight: 140`, `minHeight: 96`.
Cells: `borderRadius: 2`, `aspect-ratio: 1`.
Row labels: `Mon`, `Wed`, `Fri` (left gutter, `w-7`, `text-[10px] font-medium`).
Month labels: `Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec` (`text-[10px] font-medium`, absolutely positioned per week column).
Legend footer: **`Less`** → 5 swatches → **`More`**.
Cell tooltip text: `` `${date}: no activity` `` / `` `${date}: ${completed} completed, ${captured} captured` ``.
Intensity levels 0–4:
`0 → var(--heatmap-empty, oklch(0.9 0.01 260))`, `1 → var(--heatmap-1, oklch(0.88 0.06 155))`, `2 → var(--heatmap-2, oklch(0.78 0.1 155))`, `3 → var(--heatmap-3, oklch(0.68 0.12 155))`, `4 → var(--analytics-success, oklch(0.62 0.13 155))`.
Level cutoffs: `>0 → 1`; ratio ≤ 0.25 → 1, ≤ 0.5 → 2, ≤ 0.75 → 3, else 4.

### 2.9 Work Health — `analytics/work-health-panel.tsx`

Title **`Work Health`**, icon `HeartPulse`.
Description: **`Overdue work, near-due goals, and unlinked tasks.`**
Always a 2×2 grid (`grid-cols-2 gap-2`), each tile `rounded-lg border border-border/50 bg-muted/30 px-2.5 py-2`:

| Label (exact) | Value source | Detail fallback text | Icon | Tone |
|---|---|---|---|---|
| `Overdue by area` | `overdueByArea[0].count` | `No overdue areas` | `AlertTriangle` | risk |
| `Overdue by project` | `overdueByProject[0].count` | `No overdue projects` | `FolderClock` | risk |
| `Low progress near due` | `lowProgressNearDueGoals.length` | `No goal risk` | `Target` | accent |
| `Unassigned tasks` | `unassignedTasks` | `Missing area, project, and goal links` | `Link2Off` | muted |

Label `text-2xs leading-snug`, value `text-lg font-semibold tabular-nums`, detail `text-2xs truncate`. Chip `size-6 rounded-full`.

### 2.10 Knowledge Pipeline — `analytics/knowledge-pipeline.tsx`

Title **`Knowledge Pipeline`**, icon `BookOpen`.
Description: **`Capture through archive, plus topics with the most activity.`**
Top 2×2 grid (`rounded-lg bg-muted/40 px-2.5 py-2`), label `text-xs text-muted-foreground`, value `font-semibold tabular-nums`:

| Label | Key | Icon | Icon colour |
|---|---|---|---|
| `Captured` | `capturedToday` | `Sparkles` | `text-analytics-accent` |
| `Review` | `waitingReview` | `Inbox` | `text-analytics-action` |
| `Saved` | `saved` | `Library` | `text-muted-foreground` |
| `Archived` | `archived` | `Archive` | `text-muted-foreground` |

Below `border-t border-border/60 pt-3`: sub-heading **`Most active topics`** (`text-xs font-medium text-muted-foreground`). Empty text: **`No topic activity yet.`**
Each topic row: name (`truncate text-foreground`) + count chip `rounded-full bg-foreground px-1.5 py-0.5 text-2xs font-medium tabular-nums text-background`.

### 2.11 Context Network — `analytics/context-network-mini.tsx`

Title **`Context Network`**, icon `Network`.
Description: **`How tightly areas, goals, projects, and tasks link together.`**
Four `rounded-lg bg-muted/40` stat tiles (`grid-cols-4`): **`Areas`**, **`Goals`**, **`Projects`**, **`Tasks`** (keys `areaNodes`, `goalNodes`, `projectNodes`, `taskNodes`); label `text-2xs`, value `text-base font-semibold tabular-nums`.
Density row: label **`Density score`**; value `High` / `Medium` / `Low` + `(N%)` in `var(--analytics-success)`.
Density thresholds: `>= 70 → "High"`, `>= 40 → "Medium"`, else `"Low"`. Fill bar height 10px, colour `var(--analytics-success, oklch(0.62 0.13 155))`.
CTA button (outline, full width, sm): **`View full map`** + `ArrowRight`, links `/dashboard/network`.

### 2.12 Relationship Risk — `analytics/relationship-risk-panel.tsx`

Title **`Relationship Risk`**, icon `UserRoundSearch` (icon tinted `text-analytics-risk`).
Description: **`Follow-ups due, especially contacts on active projects.`**
Left column (1/3):
- `Follow-ups due` — count in `text-analytics-risk`, tile `bg-analytics-risk/10`
- `On active projects` — count in `text-foreground`, tile `bg-muted/50`

Right column (2/3, `md:border-l md:pl-5`): contact list, each row a 32×32 `rounded-full bg-muted` initials avatar + name (`text-sm font-medium`) + `X d overdue` in `text-analytics-risk text-xs font-semibold tabular-nums`.
Empty state row: Lucide `Users` + **`No follow-up risk right now.`**

### 2.13 SectionHeader (shared, used by My Day) — `src/components/dashboard/section-header.tsx`

```
<SectionHeader accentClass title description totalCount />
```
Layout: `h-8 w-1 rounded-full` accent bar (`mt-1`), `<h2 class="font-heading text-lg font-semibold tracking-tight text-foreground">`, optional count pill `h-5 min-w-5 rounded-full bg-muted px-1.5 text-2xs font-medium tabular-nums text-muted-foreground`, description `text-sm text-muted-foreground`.
Knowledge-Hub variant (`knowledge-section-header.tsx`) renders the count as **`N total`** and adds a `FilePlus` + `buttonLabel` button.

### 2.14 ActivityFeed — `src/components/dashboard/activity-feed.tsx`

Entity labels: `Task`, `Goal`, `Project`, `Area`.
Icon chips (32×32 `rounded-full`): `task → bg-blue-100 text-blue-600` (`CheckSquare`), `goal → bg-purple-100 text-purple-600` (`Target`), `project → bg-amber-100 text-amber-600` (`FolderOpen`), `area → bg-green-100 text-green-600` (`Map`).
Row meta format: `` `${entityLabels[type]} · ${relativeTime(item.updatedAt)}` ``.
Empty state (dashed border): **`No activity yet. Create your first task or goal to get started.`**

### 2.15 Progress ring — `src/components/charts/progress-ring.tsx`

`size = 64`, `strokeWidth = 8`, `-rotate-90`, track `text-muted-foreground/20`, progress `transition-all duration-700 ease-[var(--ease-out-quint)]`, `strokeLinecap="round"`, centre label `text-xs font-bold` showing `${Math.round(pct)}%`.

### 2.16 Context network page — `/dashboard/network`

H1 **`Context network`** (`text-lg font-semibold tracking-tight`).
Sub: `` `${nodes} things · ${edges} connections. Drag to explore, click a node for details.` ``
Back button label: `Dashboard`. View tabs: `Map`, `List`, `Archived`. Empty: `No connections.`

---

## 3. Data Model Vocabulary

Source: `src/lib/types/database.types.ts` (Enums block, lines 794-812), `src/lib/types/domain.types.ts`, `src/lib/utils/constants.ts`, `src/lib/constants/*.ts`.

### 3.1 Canonical entities

`Area`, `Goal`, `Project`, `Task`, `Note`, `Resource`, `Topic`, `Contact` — plus join/derived types:
`GoalProject`, `GoalArea`, `GoalTask`, `GoalNote`, `GoalResource`, `TaskResource`, `ResourceArea`, `TopicArea`, `ContactProject`, `ContactTask`, `ContactLog`, `RelatedNotebookGroup`.

Plural UI labels in use: `Areas`, `Goals`, `Projects`, `Tasks`, `Notes`, `Resources`, `Topics`, `Contacts`, plus `Notebooks`, `Topics` (collection surfaces).

### 3.2 Database enums (verbatim)

```ts
goal_term:        "short" | "mid" | "long"
note_status:      "inbox" | "to_review" | "active" | "archive" | "completed"
note_type:        "note" | "research" | "journal"
priority:         "low" | "medium" | "high"
project_status:   "inbox" | "planning" | "active" | "completed" | "on_hold" | "archived"
resource_status:  "inbox" | "to_review" | "active" | "completed"
resource_type:    "website" | "article" | "video" | "document" | "podcast" | "social_media" | "tool"
task_status:      "inbox" | "todo" | "in_progress" | "completed" | "archived"
task_repeat_cycle: "days" | "weeks" | "months" | "years"
                 | "months_first_weekday" | "months_last_weekday"
                 | "months_second_saturday" | "months_last_day"
```

Note: goals have **no** status enum — they use `progress` (0-100), `is_completed`, `is_archived`, `is_inactive`, plus `term` + `priority`. Areas use `active` / `inactive` / `archived` (derived) — `STATUS_LABELS` in `areas/[id]/area-detail-content.tsx:116-120` = `Active`, `Inactive`, `Archived`.

### 3.3 Client-side constant objects (`src/lib/utils/constants.ts`)

`PRIORITY` = `LOW/MEDIUM/HIGH` → `low`, `medium`, `high`
`TASK_STATUS` = `INBOX/TODO/IN_PROGRESS/COMPLETED/ARCHIVED`
`PROJECT_STATUS` = `INBOX/PLANNING/ACTIVE/COMPLETED/ON_HOLD/ARCHIVED`
`GOAL_TERM` = `SHORT/MID/LONG`
`AREA_TYPE` = `PERSONAL/professional/health/finance/growth/system` (note: `PERSONAL: 'personal'`, `PROFESSIONAL: 'professional'`)
`NOTE_STATUS` = `INBOX/TO_REVIEW/ACTIVE/COMPLETED/ARCHIVE`
`NOTE_TYPE` = `NOTE/RESEARCH/JOURNAL`
`RESOURCE_STATUS` = `INBOX/TO_REVIEW/ACTIVE/COMPLETED`
`RESOURCE_TYPE` = `WEBSITE/ARTICLE/VIDEO/DOCUMENT/PODCAST/SOCIAL_MEDIA/TOOL`
`LIST_SAFETY_CAP = 2000`

### 3.4 Display labels (exact, per component)

`src/components/entities/status-badge.tsx:8-14`
```
inbox       -> "Inbox"
todo        -> "Todo"
in_progress -> "In Progress"
completed   -> "Done"
archived    -> "Archived"
```

`src/lib/utils/projects.ts:47-63` (`getProjectStatusLabel`)
```
planning -> "Planning"      active     -> "In Progress"
completed-> "Completed"     on_hold    -> "On Hold"
archived -> "Archived"      default    -> raw status
```

`src/components/onboarding/project-step.tsx:42-48`
```
inbox -> "Inbox"   planning -> "Planning"   active -> "Active"
on_hold -> "On Hold"        completed -> "Completed"
```

`src/components/onboarding/tasks-step.tsx:34-39`
```
inbox -> "Inbox"   todo -> "Todo"   in_progress -> "In Progress"   completed -> "Completed"
```

`src/lib/utils/contact-detail-relations.ts:186-336` — project/task/contact filter tabs labelled:
`All`, `Inbox`, `Planning`, `In Progress`, `On Hold`, `Completed`, `Archived`.

`FollowUpStatus` type (`domain.types.ts:279`): `"ON TRACK" | "FOLLOW UP"`.

Priority labels (onboarding selects): `Low`, `Medium`, `High`. Term labels appear as `short/mid/long` select values with placeholder `Select term`.

### 3.5 View / tab enums

`NOTE_VIEW` (`src/lib/utils/notes.ts:3-17`): `all`, `inbox`, `to_review`, `active`, `pinned`, `favorite`, `by_area`, `by_goal`, `by_project`, `by_topic`, `by_notebook`, `completed`, `archived`
`RESOURCE_VIEW` (`src/lib/utils/resources.ts:3-15`): `all`, `inbox`, `to_review`, `active`, `favorite`, `by_topic`, `by_area`, `by_goal`, `by_project`, `completed`, `archived`

### 3.6 Contact groups — `src/lib/constants/contact-groups.ts` (exact order)

```
"Client", "Team Member", "Vendor", "Mentor", "Collaborator", "Partner"
```
(Contact `group` field is free text — demo data also uses `Prospect`, `Investor`, `Candidate`, `Stakeholder`.)

### 3.7 Badge colour semantics — `src/lib/constants/entity-colors.ts`

Documented hue contract (verbatim from the file header):
> green = done/positive, blue = active/in-progress, amber = waiting, orange = high/attention, red = urgent, slate = queued-but-not-started

`BADGE_COLOR` recipes (dark variants always `/50`):
```
neutral: "bg-muted text-muted-foreground"
slate:   "bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300"
blue:    "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
green:   "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
amber:   "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
orange:  "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300"
red:     "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300"
yellow:  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300"
purple:  "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
pink:    "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300"
plum:    "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300"
teal:    "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300"
cyan:    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300"
```

`STATUS_COLORS`: `inbox → neutral`, `todo → slate`, `planning → slate`, `to_review → amber`, `on_hold → amber`, `active → blue`, `in_progress → blue`, `completed → green`, `archive → neutral`, `archived → neutral`. Fallback `STATUS_FALLBACK = slate`.

`PRIORITY_COLORS`: `high → orange`, `medium → blue`, `low → neutral`. Fallback `neutral`.

`SCORE_COLORS` (smart priority 1-5): `5 → red`, `4 → orange`, `3 → yellow`, `2 → blue`, `1 → neutral`.

`RESOURCE_TYPE_COLORS`: `website → blue`, `article → purple`, `video → red`, `document → neutral`, `podcast → orange`, `social_media → pink`, `tool → teal`.

`AREA_TYPE_COLORS`: `business → green`, `personal → blue`, `studies → orange`; `AREA_TYPE_FALLBACK = plum` (violet) — intentional fingerprint, documented as "Do not 'fix' this to neutral".

`CONTACT_GROUP_COLORS`: `Client → purple`, `Team Member → blue`, `Vendor → orange`, `Mentor → green`, `Collaborator → cyan`, `Partner → pink`.

### 3.8 Nav entity icons / emoji (one per entity)

`Dashboard 🏠` · `Areas 🗺️` · `Goals 🎯` · `Projects 📁` · `Tasks ☑️` · `Notes 📝` · `Resources 🔗` · `Topics 🏷️` · `Contacts 👥` · `My Day ☀️ (Sun, orange)` · `Inbox 📥` · `Knowledge Hub 📚 (Library, blue)`

### 3.9 Limits

`src/lib/entity-limit.ts`:
```ts
export const ENTITY_LIMIT_MESSAGE =
  "You've hit the 100-item Free limit — upgrade to Pro for unlimited items.";
```
Error code sentinel: `ENTITY_LIMIT_REACHED`.

### 3.10 Default area types

`src/components/entities/area-dialog.tsx:45` → `["Business", "Personal", "Studies"]`
`src/lib/utils/areas.ts:105` → same. Type keys lowercased: `business`, `personal`, `studies`.

---

## 4. Demo Data

**Important:** `supabase/seed.sql` and `scripts/seed-demo.mjs` are deliberately minimal/synthetic (file header: *"Synthetic demo seed for local evaluation ONLY. All names/emails are fake."*). The **rich, realistic records live in `docs/demo-users/`** — 5 fully-specified synthetic personas. Both are quoted below.

### 4.1 `supabase/seed.sql` — exact rows (minimal seed, `user_demo_ava_reyes_synthetic`)

| Table | Fields as written |
|---|---|
| areas | `Demo Work` / `Synthetic work domain for evaluators` / `briefcase` / `#6366F1` / `professional` ; `Demo Life` / `Synthetic personal domain` / `home` / `#10B981` / `personal` |
| goals | `Evaluate SophionOS alpha` / `Synthetic goal — safe to delete` / term `short` / priority `medium` |
| projects | `Alpha walkthrough` / `Synthetic project for screenshots and demos` / status `active` / priority `medium` |
| tasks | `Import demo seed` (`completed`, `high`) ; `Try personal data export` (`todo`, `medium`) |
| notes | `Welcome note (synthetic)` / `This content is fake demo data. Never store real secrets here.` / type `note` / status `active` |
| resources | `SophionOS docs (example)` / `https://example.com/sophionos-docs` / `website` / `active` |
| topics | `Demo topic` |
| contacts | `Ava Reyes (Synthetic)` / `ava.reyes.demo@example.com` |

Guard rail in `scripts/seed-demo.mjs`: refuses to run if the SQL does not match `/synthetic|demo|example\.com/i`.

### 4.2 Default areas seeded for every new user — `src/lib/onboarding/default-areas.ts`

| Name | Description | Icon | Color | Type |
|---|---|---|---|---|
| `Work` | `Professional responsibilities, workstreams, and business priorities.` | 💼 | `#6366F1` | `Business` |
| `Health` | `Physical health, routines, appointments, and wellbeing goals.` | 🏥 | `#22C55E` | `Personal` |
| `Finances` | `Money management, savings, planning, and financial maintenance.` | 💰 | `#F59E0B` | `Business` |
| `Personal Growth` | `Learning, skills, reflection, and long-term self-improvement.` | 📚 | `#3B82F6` | `Studies` |
| `Family & Friends` | `Relationships, connection, and the people who matter most.` | 👪 | `#EC4899` | `Personal` |
| `Home` | `Household responsibilities, maintenance, and day-to-day life admin.` | 🏠 | `#14B8A6` | `Personal` |
| `Travel` | `Trips, planning, itineraries, and places you want to explore.` | ✈️ | `#06B6D4` | `Personal` |
| `Career` | `Career development, opportunities, networking, and advancement.` | 🚀 | `#8B5CF6` | `Studies` |
| `Inception Vault` | `Seed projects, quiet experiments, and ideas not yet ready for a real area.` | 🌱 | `#6E5BFF` | `Personal` |

### 4.3 Rich demo personas — `docs/demo-users/README.md` + `docs/demo-users/profile-5-ava-reyes.md`

Anchored to `today = 2026-06-21`. Personas: **Maya Chen** (Indie SaaS Founder, "Inkwell"), **David Okonkwo** (Product Designer), **Priya Sharma** (Startup CEO, "Ledgr"), **Leo Martins** (Freelance Consultant), **Ava Reyes** (Social Media Marketing & Sales, "Reyes Social").

**Areas**

```
Inkwell (Startup)          🚀 #6366F1  Business
Personal Growth            🌱 #10B981  Growth
Health & Fitness           💪 #EF4444  Health
Finances                   💰 #F59E0B  Finance
Career Network             🤝 #8B5CF6  Personal
Personal Life              🏡 #06B6D4  Personal
Design Craft               🎨 #EC4899  Growth
Work — Northwind           💼 #3B82F6  Business
Reading List               📚 #14B8A6  Growth
Inspiration Vault          ✨ #F97316  Personal
Life Admin                 🏡 #64748B  Personal
Ledgr (Company)            🏢 #0EA5E9  Business
Fundraising                🤝 #DC2626  Business
People & Hiring             👥 #8B5CF6  Business
Board & Investors           📊 #059669  Business
Health                     🧘 #F43F5E  Health
Family                     👨‍👩‍👧 #F59E0B  Personal
Client: Northwind          🏢 #3B82F6  Business
Client: Acme Co            🏢 #10B981  Business
Client: Globex             🏢 #F59E0B  Business
Client: Contoso            🏢 #8B5CF6  Business
Leo UX Studio (Biz)        💼 #EC4899  Business
Personal                   🏡 #06B6D4  Personal
Client: Lumière Skincare   💄 #EC4899  Business
Client: Brew & Co          ☕ #92400E  Business
Client: FitFuel            🏋️ #F59E0B  Business
Reyes Social (Agency)      ✨ #6366F1  Business
Sales & New Business       📈 #10B981  Business
Marketing Learning         📚 #06B6D4  Growth
Personal Life              🏡 #64748B  Personal
```

**Goals** (name / area / term / priority / target_date / progress)

```
Grow Lumière IG to 100K followers        | Lumière Skincare     | mid  | high   | 2026-09-30 | ~35%
Sign 3 new retainer clients by Q4        | Sales & New Business | mid  | high   | 2026-10-31 | ~33%
Hit $25K MRR at Reyes Social             | Reyes Social         | long | urgent | 2026-12-31 | ~50%
Launch FitFuel influencer program        | FitFuel              | short| high   | 2026-07-31 | ~40%
Complete Meta Blueprint certification    | Marketing Learning   | short| medium | 2026-08-15 | ~25%
Ship Inkwell v2.0                        | Inkwell              | mid  | urgent | 2026-07-31 | ~45%
Reach 100 paying customers               | Inkwell              | mid  | high   | 2026-09-30 | ~30%
Learn production-grade Postgres          | Personal Growth      | short| medium | 2026-08-15 | ~60%
Run a 5K                                 | Health               | short| low    | 2026-10-01 | 0%
Become a staff-level designer            | Design Craft         | long | high   | 2026-12-31
Ship Northwind design system v3          | Work                 | mid  | high   | 2026-08-30
Read 24 books this year                  | Reading List         | long | medium | 2026-12-31
Close Series A ($8M)                     | Fundraising          | short| urgent | 2026-07-31 | ~55%
Hit $1M ARR                              | Ledgr                | mid  | high   | 2026-12-31 | ~40%
Hire VP Engineering & VP Sales           | People               | short| high   | 2026-08-15 | ~25%
Build a repeatable sales motion          | Ledgr                | mid  | high   | 2026-09-30 | ~30%
Run a half-marathon                      | Health               | long | low    | 2026-11-15 | ~10%
Grow studio to $20K MRR                  | Leo UX Studio        | mid  | high   | 2026-12-31
Deliver Northwind audit on time          | Client: Northwind    | short| urgent | 2026-07-10
Sign 1 new enterprise client             | Leo UX Studio        | mid  | high   | 2026-09-30
Lose 5kg by autumn                       | Health               | short| medium | 2026-09-15
```

**Projects**

```
Lumière Summer Glow Launch        | active   | urgent | 2026-07-15
Lumière — Always-On Content       | active   | high   | recurring
Brew & Co Content Calendar        | active   | medium | recurring
FitFuel Influencer Program        | active   | high   | 2026-07-25
Q3 New Business Outreach          | active   | high   | 2026-09-30
Reyes Social Brand Refresh        | planning | medium | 2026-08-30
Meta Blueprint Cert Prep          | active   | medium | 2026-08-10
Inkwell v2.0 API Rewrite          | active   | high   | 2026-07-15  | ~50%
Onboarding Funnel Redesign        | active   | medium | 2026-07-20  | ~33%
Customer Interview Sprint         | active   | medium | 2026-06-30  | ~66%
Postgres Deep Dive (course)       | active   | medium | 2026-08-10  | ~50%
Q3 Bookkeeping Cleanup            | planning | low    | 2026-07-31  | 0%
Northwind Design System v3        | active   |        | 2026-08-15
Personal Portfolio Redesign       | planning |        | 2026-09-30
2026 Reading Tracker              | active   |        | 2026-12-31
Design Talk: "Systems Thinking"   | active   |        | 2026-07-20
Series A — Term Sheet Negotiation | active   | urgent | 2026-07-15
Series A — Data Room Prep         | active   | high   | 2026-06-30
Q4 Enterprise Sales Pipeline      | active   | high   | 2026-09-30
VP Engineering Search             | active   | high   | 2026-08-01
VP Sales Search                   | active   | high   | 2026-08-10
Half-Marathon Training Plan       | planning | low    | 2026-11-01
Northwind UX Audit                | active   |        | 2026-07-10
Acme Onboarding Redesign          | active   |        | 2026-07-25
Globex Dashboard Revamp           | active   |        | 2026-08-15
Contoso Retainer (monthly)        | active   |        | recurring
Studio Marketing (Q3)             | planning |        | 2026-09-30
5kg Cut — Meal & Training Plan    | active   |        | 2026-09-15
```

**Tasks** (name / project / status / priority / due / focused)

```
Ship /v2/auth endpoint                                | v2 API Rewrite      | in_progress | high   | 2026-06-20 overdue
Write migration for `documents` table                 | v2 API Rewrite      | todo        | high   | 2026-06-23
Review PR #421 from contractor                        | v2 API Rewrite      | todo        | medium | 2026-06-22
Deploy staging env for v2                             | v2 API Rewrite      | todo        | medium | 2026-06-25
Sketch new onboarding step 1                          | Onboarding Funnel   | completed   | medium | 2026-06-15
Build onboarding step 1 in Figma                      | Onboarding Funnel   | in_progress | medium | 2026-06-24
Interview customer #8 (Acme Co)                       | Customer Interview | completed   | high   | 2026-06-18
Interview customer #9 (Globex)                        | Customer Interview | todo        | high   | 2026-06-26
Schedule customer #10                                 | Customer Interview | todo        | medium | 2026-06-27
Finish "Indexing & EXPLAIN" module                    | Postgres Deep Dive | in_progress | medium | 2026-06-28
Weekly revenue review                                 | — (Finance area)   | todo        | medium | 2026-06-21 recurring weekly
Renew domain inkwell.ai                               | — (Inkwell area)   | inbox       | low    | 2026-07-01
Audit current Button component                        | DS v3              | in_progress | high   | 2026-06-22
Write tokens spec doc                                 | DS v3              | todo        | high   | 2026-06-26
Review eng PR for Tooltip                             | DS v3              | todo        | medium | 2026-06-24
Draft talk outline                                    | Design Talk        | todo        | medium | 2026-07-01
Finish "Designing Data-Intensive Apps"                | Reading            | in_progress | low    | 2026-06-30
Triage browser-extension inbox                        | — (Craft area)     | todo        | medium | 2026-06-21
Pay apartment rent                                    | — (Life area)      | todo        | high   | 2026-06-28 recurring monthly
Send revised term sheet to Ridge                      | Term Sheet         | in_progress | urgent | 2026-06-22
Update financial model v4                             | Data Room          | in_progress | high   | 2026-06-23
Upload customer logo sheet to data room               | Data Room          | todo        | medium | 2026-06-24
Call reference for VPE candidate #3                   | VPE Search         | todo        | high   | 2026-06-25
Final-round interview: VPE candidate #3               | VPE Search         | todo        | urgent | 2026-06-26
Screen 5 VPS candidates                               | VPS Search         | in_progress | high   | 2026-06-30
Demo call: Globex enterprise                           | Sales Pipeline     | todo        | high   | 2026-06-23
Follow up with Acme renewal                           | Sales Pipeline     | todo        | high   | 2026-06-24
Prep board deck for July 8                            | Board              | todo        | high   | 2026-07-05
1:1 with CTO (weekly)                                 | — (Ledgr area)     | todo        | medium | 2026-06-23 recurring
All-hands prep (weekly)                               | — (Ledgr area)     | todo        | medium | 2026-06-26 recurring
Long run: 12km                                        | Half-Marathon      | todo        | low    | 2026-06-22
Pick up kids from school                              | — (Family area)    | todo        | medium | 2026-06-21 recurring
Anniversary dinner reservation                        | — (Family area)    | inbox       | high   | 2026-07-04
Northwind: stakeholder interviews (4)                 | Northwind Audit    | in_progress | high   | 2026-06-24
Northwind: heuristic evaluation doc                   | Northwind Audit    | todo        | high   | 2026-06-28
Northwind: deliver final report                       | Northwind Audit    | todo        | urgent | 2026-07-08
Acme: wireframe step 2-3                              | Acme Onboarding    | in_progress | medium | 2026-06-25
Acme: client review call                              | Acme Onboarding    | todo        | high   | 2026-06-27
Globex: data-viz research                             | Globex Dashboard   | todo        | medium | 2026-07-01
Contoso: monthly retainer check-in                    | Contoso Retainer   | todo        | medium | 2026-06-30 monthly
Send Acme invoice (June)                              | — (Studio area)    | todo        | high   | 2026-06-30 monthly
Send Globex invoice (June)                            | — (Studio area)    | todo        | high   | 2026-06-30 monthly
Sunday meal-prep                                      | Health             | todo        | medium | 2026-06-22 weekly
Gym: leg day                                          | Health             | todo        | low    | 2026-06-23 weekly
Post Lumière IG story                                 | Lumière Always-On  | todo        | medium | 2026-06-21 daily
Approve Brew & Co posts for the week                  | Brew & Co Calendar | todo        | high   | 2026-06-21 weekly (Mondays)
Weekly analytics review — all clients                 | — (Agency area)    | todo        | high   | 2026-06-22 weekly
Monthly client reporting (3 reports)                  | — (Agency area)    | todo        | high   | 2026-06-30 monthly (last day)
Shoot Lumière Summer Glow product photos              | Summer Glow Launch | in_progress | high   | 2026-06-23
Write Summer Glow campaign captions (5)               | Summer Glow Launch | todo        | high   | 2026-06-24
Brief designer on launch graphics                      | Summer Glow Launch | todo        | medium | 2026-06-22
Schedule Summer Glow launch posts                     | Summer Glow Launch | todo        | high   | 2026-07-10
Outreach: 20 prospect DMs                             | Q3 Outreach        | in_progress | high   | 2026-06-23 daily (weekdays)
Send proposal to Verde Beauty                          | Q3 Outreach        | todo        | urgent | 2026-06-24
Follow-up call: Verde Beauty decision                  | Q3 Outreach        | todo        | high   | 2026-06-27
Recruiting pitch deck v2                              | Brand Refresh      | todo        | medium | 2026-07-05
Captured from TikTok: "glazed dononut" trend          | — (inbox)          | inbox       | low    | —
Captured from Twitter: "CTA framework" thread         | — (inbox)          | inbox       | low    | —
Captured from WhatsApp: whiteboard photo              | — (inbox)          | inbox       | low    | —
Captured via Telegram: "ask Marc about pricing"       | — (inbox)          | inbox       | medium | —
```

**Notes**

```
Lumière content pillars 2026                 | research    | active   | Strategy / Campaign Briefs (fav)
Summer Glow — campaign brief                 | note        | active   | Campaign Briefs
Client meeting — Brew & Co (Jun 18)          | meeting     | active   | Client Notes
FitFuel influencer shortlist                 | research    | active   | Client Notes
Q2 analytics recap + insights                | research    | active   | Reporting (fav)
Content ideas dump (phone captures)          | idea        | inbox    | Ideas
Weekly journal — W25                         | journal     | active   | Journals
v2 API design decisions                      | research    | active   | Engineering Log (fav)
Customer interview — Acme Co (Jun 18)        | note        | active   | Customer Insights
Pricing experiment ideas                     | idea        | to_review| Strategy (fav)
Postgres index cheat sheet                   | note        | active   | Engineering Log
Random link dump (to sort)                   | note        | inbox    | —
Refactoring tokens — proposal                | research    | active   | Design System
Meeting notes: DS v3 kickoff (Jun 12)        | meeting     | active   | Meetings
Idea: component playground tool              | idea        | to_review| Ideas
Inspiration: Linear's motion design          | inspiration | active   | Swipe File
Inspiration: Vercel homepage refresh         | inspiration | active   | Swipe File
Reading notes: DDIA Ch.3                     | note        | active   | Book Notes
Journal: what I learned this week            | journal     | active   | Journals
Pricing page teardown — Notion               | research    | to_review| Swipe File
Series A strategy memo                       | research    | active   | Fundraising
Board deck — July draft                      | note        | active   | Board
Investor feedback synthesis                  | research    | active   | Fundraising
VPE candidate scorecard                      | meeting     | active   | Hiring
Hiring rubric — VP Sales                     | note        | to_review| Hiring
Weekly leadership journal                    | journal     | active   | Journals
Competitor analysis — Brex/Ramp              | research    | to_review| Strategy
Northwind stakeholder interview — CEO        | meeting     | active   | Client Notes
Northwind heuristic eval — findings so far   | research    | active   | Client Notes
Acme wireframe rationale                     | note        | to_review| Client Notes
Studio pricing thoughts (captured on walk)   | idea        | inbox    | Ideas
Whiteboard photo: Globex IA (from phone)     | note        | inbox    | Client Notes
Weekly review — W25                          | journal     | active   | Journals
```

Note-type catalog to seed: `Note, Research, Journal, Idea, Inspiration, Meeting`.

**Resources**

```
Supabase Row Level Security docs        | website      | supabase.com/docs/rls                 | completed | Inkwell / v2 API Rewrite / Postgres
"Designing Data-Intensive Apps" — Ch.5  | article      | dataintensive.net                     | to_review | Personal Growth / Postgres
Postgres EXPLAIN visualizer             | tool         | explain.depesz.com                    | active    | Personal Growth / Postgres
How Linear builds product (video)       | video        | youtube.com/watch?v=linear            | inbox     | Inkwell
IndieHackers thread: first 100 customers| social_media| indiehackers.com/p/100                | to_review | Inkwell
Stripe Billing docs                     | website      | stripe.com/docs/billing               | inbox     | Inkwell
Refactoring UI — component spacing      | article      | refactoringui.com                     | completed | Craft / DS v3 / Design Systems
Storybook docs: args composition        | website      | storybook.dev/docs                    | to_review | Work / DS v3 / Design Systems
"The Pixel Precision Principle" (video) | video        | youtube.com/watch?v=pixel            | to_review | Craft / Design Principles
Figma Variables deep dive               | video        | youtube.com/watch?v=vars             | inbox     | Craft / Design Systems
A11y color contrast checker             | tool         | polypane.app/color-contrast           | active    | Craft / Accessibility
Maggie Appleton's digital garden        | website      | maggieappleton.com/garden             | completed | Inspiration / Knowledge Mgmt
Andy Matuschak — evergreen notes        | article      | notes.andymatuschak.org               | completed | Inspiration / Knowledge Mgmt
Stripe dashboard redesign case study    | article      | stripe.com/blog/dashboard             | to_review | Inspiration
nngroup: design system metrics          | article      | nngroup.com/articles/ds-metrics       | inbox     | Work / DS v3
Twitter thread: 10 micro-interactions  | social_media | twitter.com/p/micro                   | inbox     | Inspiration
Podcast: Design Better ep.142           | podcast      | designbetter.fm/142                   | to_review | Craft
"Shape Up" by 37signals                 | document     | basalt.io/shapeup                     | completed | Reading / 24 books
YC Series A guide                       | document     | ycombinator.com/library/6P            | completed | Fundraising
a16z pitch deck template                | document     | a16z.com/pitch-deck                   | to_review | Fundraising
"The Sales Acceleration Formula"        | article      | levelfly.com/saf                      | to_review | Ledgr / Sales
Carta cap table guide                   | website      | carta.com/blog/cap-table              | active    | Fundraising
LinkedIn: VP Eng candidate #3           | social_media | linkedin.com/in/cand3                 | inbox     | People / VPE Search
McKinsey: scaling org health           | article      | mckinsey.com/scaling                  | to_review | Ledgr / Leadership
NN/g: how to run a UX audit             | article      | nngroup.com/articles/ux-audit         | completed | Northwind / UX Audit
"Don't Make Me Think" — Ch.7           | article      | sensible.com/dmmt                    | to_review | Studio / UX Fundamentals
Dribbble: dashboard inspiration         | website      | dribbble.com/search/dashboard         | inbox     | Globex / Inspiration
Stripe data-viz patterns                | website      | stripe.com/blog/data-viz             | to_review | Globex
Cal Newport — Deep Work                 | document     | calnewport.com/books/deep-work       | to_review | Personal / Books
Social Media Examiner — 2026 trend report| article     | socialmediaexaminer.com/2026          | to_review | Agency / Trends
Buffer — content calendar templates     | website      | buffer.com/resources                  | active    | Agency / Tools
Canva — brand kit for Lumière           | tool         | canva.com                             | active    | Lumière / Always-On / Tools
Competitor: Glossier IG profile          | website      | instagram.com/glossier                | to_review | Lumière / Competitors
TikTok: "glazed donut" trend sound      | social_media | tiktok.com/t/glazed                   | inbox     | Lumière / TikTok Trends
Later — best time to post 2026          | article      | later.com/blog/best-time              | completed | Agency / Tools
HubSpot — sales prospecting playbook    | document     | hubspot.com/sales-playbook            | to_review | Sales / Sales
Captured tweet: "5 CTA frameworks"      | social_media | twitter.com/p/cta                     | inbox     | Agency / Copywriting
```

**Topics** (name / icon / linked areas)

```
PostgreSQL          🗄️ | SaaS Pricing        💸 | Customer Development 🗣️ | Indie Founder Journey 🧭
Design Systems      🧩 | Design Principles   🎯 | Accessibility     ♿ | Knowledge Management 🧠
Motion Design       🎞️ | Book Notes          📖 | Content Pillars    🏛️ | TikTok Trends        🎵
Influencer Marketing🤳 | Paid Ads            🎯 | Copywriting       ✍️ | Competitors          🔍
Tools               🛠️ | Fundraising         💸 | Hiring             💼 | Sales                📈
Leadership          🧭 | UX Audit            🔍 | UX Fundamentals   📐 | Data Visualization  📊
Inspiration         ✨ | Client Notes        🗂️
```

**Contacts** (name / role / organization / group / follow_up_interval / last_interaction / project / role_in_project)

```
Marcus Lee       | Senior Backend Contractor | Toptal               | Team Member  | 7  | 2026-06-19 | v2 API Rewrite        | Reviewer
Elena Rossi      | Design Advisor             | Studio Rossi         | Mentor       | 30 | 2026-05-10 overdue | Onboarding Funnel | Consultant
Tomás García     | Founder, Acme Co           | Acme Co              | Client       | 14 | 2026-06-18 | Customer Interviews  | Interviewee
Priya Nair       | VC Partner                 | Ridge Ventures       | Partner      | 60 | 2026-04-02 overdue | —            | —
Dr. Amy Wong     | Career Coach               | Independent          | Mentor       | 30 | 2026-06-01 | —                    | —
Sara Lindqvist   | Design Eng Lead            | Northwind            | Team Member  |    | 2026-06-18 | DS v3                | Collaborator
Ben Carter       | Staff Designer, Stripe     | Stripe               | Mentor       |    | 2026-05-15 overdue | Portfolio   | Reviewer
Hiroshi Tanaka   | Frontend Engineer          | Northwind            | Team Member  |    | 2026-06-20 | DS v3                | Implementer
Conf organiser — Config 2026 | Conf lead  | Figma                | Partner      |    | 2026-03-10 | Design Talk          | Organizer
Daniel Park      | Partner, Ridge Ventures    | Ridge Ventures       | Investor     | 7  | 2026-06-19 | Term Sheet           | Lead Investor
Sarah Whitman    | Partner, Accel             | Accel                | Investor     | 14 | 2026-06-10 | Term Sheet           | Investor
Michael Chen     | CEO, Globex                | Globex               | Client       | 14 | 2026-06-15 | Sales Pipeline       | Buyer
Anita Desai      | CEO, Acme Co               | Acme Co              | Client       | 30 | 2026-05-20 overdue | Sales Pipeline | Buyer
Raj Patel        | VPE Candidate #3           | (Independent)        | Candidate    | 7  | 2026-06-20 | VPE Search           | Candidate
Jennifer Liu     | Board Member               | Ledgr Board          | Stakeholder  | 30 | 2026-06-01 | Board                | Board Member
Coach Rebecca    | Executive Coach            | Independent          | Mentor       | 30 | 2026-05-28 overdue | —            | —
Dr. Hassan        | Family doctor              | City Health          | Vendor       | 365| 2026-01-15 | —                   | —
Marc Ribot       | VP Product, Northwind      | Northwind            | Client       | 7  | 2026-06-20 | Northwind Audit      | Sponsor
Lucy Stone       | PM, Acme Co                | Acme Co              | Client       | 7  | 2026-06-19 | Acme Onboarding      | Collaborator
Hiro Lee         | CTO, Globex                | Globex               | Client       | 14 | 2026-06-12 | Globex Dashboard     | Sponsor
Dana White       | Ops Lead, Contoso          | Contoso              | Client       | 30 | 2026-05-25 overdue | Contoso Retainer | Point of Contact
Sophie Martin    | Freelance Designer         | Independent          | Collaborator | 60 | 2026-04-20 overdue | —           | —
Alex Tan         | Accountant                 | Tan & Co             | Vendor       | 90 | 2026-04-01 | —                   | —
Coach Miguel     | Personal Trainer           | FitGym               | Vendor       | 7  | 2026-06-19 | Health               | Trainer
Sophie Laurent   | Brand Manager, Lumière     | Lumière Skincare     | Client       | 7  | 2026-06-19 | Lumière Always-On    | Point of Contact
Marcus Hill      | Marketing Dir, Brew & Co   | Brew & Co            | Client       | 14 | 2026-06-15 | Brew & Co Calendar   | Sponsor
Dana Cole        | Founder, FitFuel           | FitFuel              | Client       | 7  | 2026-06-20 | FitFuel Influencer   | Sponsor
Nadia Park       | Founder, Verde Beauty      | Verde Beauty         | Prospect     | 5  | 2026-06-18 | Q3 Outreach          | Hot Lead
Ben Russo        | CMO, Petal Cosmetics       | Petal Cosmetics      | Prospect     | 14 | 2026-06-10 overdue | Q3 Outreach   | Warm Lead
@glowwithjess    | Beauty Influencer (180K)   | Independent          | Collaborator | 30 | 2026-06-12 | FitFuel Influencer   | Influencer
@thebrockcook    | Fitness Creator (520K)     | Independent          | Collaborator | 30 | 2026-05-28 overdue | FitFuel Influencer | Influencer
Liam Foster      | Freelance Photographer    | Independent          | Vendor       | 90 | 2026-05-05 | Summer Glow Launch   | Photographer
Coach Danielle   | Agency Mentor             | Independent          | Mentor       | 30 | 2026-06-01 | —                   | —
```

Suggested demo logins (README): `maya@inkwell.demo`, `david@northwind.demo`, `priya@ledgr.demo`, `leo@leoux.demo`.

### 4.4 Placeholder / example strings used in the real UI

```
e.g., Career Growth                    (area name input)
Describe this area...                  (area description)
e.g. Fitness                           (onboarding area name)
e.g. Run a marathon                    (goal name input)
e.g. Run a half marathon               (onboarding goal name)
A sentence on what success looks like. (onboarding goal description)
Describe your objective...             (goal description)
e.g. 12-week training plan             (onboarding project name)
What does this project deliver?        (onboarding project description)
Enter project name                     (project name input)
Add the project outcome or context     (project description)
What needs to be done?                 (task name input)
Add context, notes, or the next action (task description)
Note title                             (note title input)
My favorite article                    (resource name input)
e.g., Productivity, Machine Learning, Recipes (topic name input)
Full name                              (contact name)
e.g. Product Manager                   (contact role)
Company name                           (contact organization)
+1 555 000 0000                        (contact phone)
email@example.com                      (contact email)
linkedin.com/in/...                    (contact linkedin)
Context, background, notes...          (contact notes)
Cursor — MacBook Pro                   (API key label placeholder)
Give the key a label, e.g. Cursor — MacBook Pro.  (validation toast)
```

---

## 5. Knowledge Hub / MCP / AI Access

### 5.1 Knowledge Hub — `src/app/(dashboard)/knowledge/page.tsx`

**Page header**
- Icon: blue `Library` at `text-2xl`
- H1: **`Knowledge Hub`** (`text-2xl font-bold tracking-tight`)
- Sub-line (exact):
> `This hub is your go-to place for storing and easily retrieving all your knowledge. Access and search your resources and notes, neatly organized by type or topic.`

**Search bar**: placeholder **`Search topics, notes, resources…`**; clear button label `Clear`.

**Section 1 — Topics** (accent bar `bg-blue-500`)
- Title **`Topics`**, count suffix **`N total`**, description **`Explore your library of Topics.`**, button **`New Topic`** (`FilePlus` icon)
- Tabs (exact order): `Active` (`CircleDot`), `Favorite` (`Heart`), `Inactive` (`CircleOff`), `By Area` (`MapIcon`), `All` (`LayoutGrid`), `Archived` (`Archive`)
- Empty states:
  - `No active topics` / `Link notes or resources to activate topics`
  - `No favorite topics` / `Star topics to see them here`
  - `No inactive topics` / `Topics with no linked items appear here`
  - `No topics linked to areas` / `Link topics to areas to see them grouped here`
  - `No topics yet` / `Create your first topic` / action `New Topic`
  - `No archived topics` / `Archived topics will appear here`

**Section 2 — Notes** (accent bar `bg-purple-500`)
- Title **`Notes`**, count `N total`, description **`Access and search your latest Notes.`**, button **`New Note`**
- Tabs (exact order): `All`, `Inbox`, `To Review`, `Active`, `Pinned`, `Favorites`, `By Area`, `By Goal`, `By Project`, `By Topic`, `By Notebook`, `Completed`, `Archived`
- Loading text: `Loading notes...`
- Empty state (templated): title `` `No ${tab.replace(/_/g, " ")} notes` `` e.g. `No to review notes`, `No by area notes`; description `Try a different filter or create a new note.`; action `New Note`
- Group empty messages: `Notes will be grouped by area here.` / `…by goal here.` / `…by project here.` / `…by topic here.` / `…by notebook here.`

**Section 3 — Resources** (accent bar `bg-emerald-500`)
- Title **`Resources`**, count `N total`, description **`Access and search your latest Resources.`**, button **`New Resource`**
- Tabs (exact order): `All`, `Inbox`, `To Review`, `Active`, `Favorites`, `By Topic`, `By Area`, `By Goal`, `By Project`, `Completed`, `Archived`
- Empty states: `No resources yet` / `Add your first resource to get started` / action `New Resource`; `No resources` / `Try a different filter`
- Group empty messages: `Resources will be grouped by topic here.` / `…by area here.` / `…by goal here.` / `…by project here.`

**Search results view**
- Empty: `No results for “{query}”` + `Try different keywords` (Lucide `Search` at `size-10 text-muted-foreground/40`)
- Result group headings (each with a count badge `{n} found`): **`Topics`** (`🏷️`), **`Notes`** (`📝`), **`Resources`** (`🔗`)

**Topic create/edit dialog**
- Title: `Edit Topic` / `New Topic`
- Description: `Update topic details` / `Create a topic to organize notes and resources`
- Labels: `Name`, `Linked Areas`, `Link Notes`, `Link Resources`
- Dropdown triggers: `Select areas...` / `Select notes...` / `Select resources...` / `{n} selected`; item `Clear selection`
- Empty dropdowns: `No areas available`, `No notes available.`, `No resources available.`
- Favorite toggle label: `Favorite` (rose when on: `border-rose-500 bg-rose-500/10 text-rose-500`)
- Footer: `Cancel` / `Save Changes` / `Create Topic`
- Error state: `Failed to load knowledge hub.`

### 5.2 Other knowledge surfaces

`src/app/(dashboard)/knowledge/knowledge-topics-section.tsx` uses the same `SectionHeader` strings; `knowledge-notes-section.tsx` uses `accentClass="bg-primary"` with title `Notes`, button `New Note`.

### 5.3 MCP Settings — `src/app/(dashboard)/settings/mcp/page.tsx` + `mcp-settings-content.tsx`

Page header (`SettingsDetailHeader`):
- Title: **`MCP Server`**
- Description: `Connect SophionOS to your AI client via MCP. Create an API key, then paste the config into your client.`

**Pro gate card** (shown when `isPaid === false`; `border-primary/40 bg-primary/5`):
- Lock icon + title **`MCP & API access is a Pro feature`** + `<Badge>Pro</Badge>`
- Description: `The SophionOS MCP server and API let your AI client read and write your SophionOS data. Upgrade to Pro to create an API key and connect your tools.`
- Button: **`Upgrade to Pro`** → `/settings/billing`

**Connect card** (`border-primary/30`):
- Title: **`Connect SophionOS to your AI client`**
- Lines: `Works with any MCP-compatible AI client you choose.` / `This creates an API key for that client.` / **`<strong>Default access: Read your SophionOS context.</strong> It can see relevant projects, tasks, goals, and research.`** / `It cannot change anything unless you enable write access on the key and in AI Access settings.`
- Buttons: **`Continue with read-only access`** → `/settings/ai-access` (primary); **`Review what this means`** → `/data-and-ai` (outline)

**Connection status card**:
- Title: **`Connection status`** (`Plug` icon), badge **`Not connected yet`** (`variant="secondary"`)
- Description: `Create a read-only API key in AI Access, then add it to your AI client.`

**AI Access card**:
- Title: **`AI Access`**
- Description: `Keys authenticate your MCP server. Manage clients, revoke access, or disable all AI access from the AI Access center.`
- Button: **`Open AI Access`** + `ExternalLink` icon

**Connect your AI client card** (paid only):
- Title: **`Connect your AI client`**
- Description: `Create an API key in AI Access, then choose a client and copy the config below. MCP remains experimental — documented for evaluation, not certified for every host.`
- Contains `<McpClientMatrix baseUrl />`

### 5.4 MCP client matrix — `src/components/settings/mcp-client-matrix.tsx` + `src/lib/mcp/client-configs.ts`

Constants:
```ts
MCP_PACKAGE = "@sophionos/mcp-server"
MCP_SERVER_ID = "sophionos"
MCP_COMMAND  = "npx"
MCP_ARGS     = ["-y", "@sophionos/mcp-server"]
PLACEHOLDER_KEY = "sop_your_key_here"   // in mcp-client-matrix.tsx
CANONICAL_MCP_CLIENT_LINE =
  "Connect SophionOS to Claude, Codex, Antigravity, Cursor, OpenCode, or any MCP-compatible AI client."
```
Default `baseUrl` state: `https://app.sophionos.com` (overwritten with `window.location.origin`).

**Client tabs, in exact order** (label / description / pathHint / afterPasteHint):

1. **`Claude Desktop`** — `Anthropic Claude Desktop app` (JSON)
   - pathHint: `claude_desktop_config.json — macOS: ~/Library/Application Support/Claude/; Windows: %APPDATA%\Claude\`
   - afterPasteHint: `Restart Claude Desktop so SophionOS tools appear in the tools menu.`
2. **`Claude Code`** — `Claude Code terminal CLI` (CLI)
   - pathHint: `Terminal — run once in any shell with Claude Code installed`
   - afterPasteHint: `Run the command, then start a new Claude Code session if tools do not appear.`
3. **`Cursor`** — `Cursor IDE MCP settings` (JSON)
   - pathHint: `~/.cursor/mcp.json (or project .cursor/mcp.json)`
   - afterPasteHint: `Reload MCP in Cursor (or restart) after saving the file.`
4. **`Codex`** — `OpenAI Codex CLI / IDE` (TOML)
   - pathHint: `~/.codex/config.toml (or project .codex/config.toml)`
   - afterPasteHint: `Merge into config.toml, then restart Codex or use /mcp to confirm the server is active.`
5. **`Antigravity`** — `Google Antigravity IDE` (JSON)
   - pathHint: `~/.gemini/config/mcp_config.json (or workspace .agents/mcp_config.json) — also via MCP Store → View raw config`
   - afterPasteHint: `Refresh MCP servers in Antigravity or restart the IDE after saving.`
6. **`OpenCode`** — `OpenCode CLI / app` (OpenCode JSON)
   - pathHint: `opencode.json / opencode.jsonc (global or project)`
   - afterPasteHint: `Merge the mcp.sophionos block into your OpenCode config, then restart OpenCode.`
7. **`Other (generic MCP)`** — `Any stdio MCP-compatible host` (JSON)
   - pathHint: `Any host that accepts an MCP stdio server with command, args, and env`
   - afterPasteHint: `Adapt the mcpServers.sophionos block to your client's schema if it differs, then restart the client.`

Mobile select label: **`AI client`**. Copy button label: **`Copy`**.
Code block: `rounded-md bg-muted p-3 font-mono text-xs whitespace-pre-wrap break-all`.
Footer note (exact):
> `Works with any client that supports stdio MCP servers. Replace sop_your_key_here with your API key. Self-hosted: set SOPHIONOS_API_URL to your instance origin (already filled from this app).`

Toasts: `Copied to clipboard.` / `Could not copy. Copy manually instead.`

**Rendered snippets (verbatim, key = `sop_your_key_here`, url = `https://app.sophionos.com`)**

Claude Desktop / Cursor / Antigravity / generic (JSON):
```json
{
  "mcpServers": {
    "sophionos": {
      "command": "npx",
      "args": [
        "-y",
        "@sophionos/mcp-server"
      ],
      "env": {
        "SOPHIONOS_API_KEY": "sop_your_key_here",
        "SOPHIONOS_API_URL": "https://app.sophionos.com"
      }
    }
  }
}
```

Claude Code (CLI, single line):
```bash
claude mcp add sophionos --env SOPHIONOS_API_KEY=sop_your_key_here --env SOPHIONOS_API_URL=https://app.sophionos.com -- npx -y @sophionos/mcp-server
```

Codex (TOML):
```toml
[mcp_servers.sophionos]
command = "npx"
args = ["-y", "@sophionos/mcp-server"]
env = { "SOPHIONOS_API_KEY" = "sop_your_key_here", "SOPHIONOS_API_URL" = "https://app.sophionos.com" }
```

OpenCode (JSON):
```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "sophionos": {
      "type": "local",
      "command": [
        "npx",
        "-y",
        "@sophionos/mcp-server"
      ],
      "enabled": true,
      "environment": {
        "SOPHIONOS_API_KEY": "sop_your_key_here",
        "SOPHIONOS_API_URL": "https://app.sophionos.com"
      }
    }
  }
}
```

### 5.5 MCP tool registry — `packages/mcp-server/src/tools/{core,knowledge,links,parity}.ts`

Server identity (`src/server.ts`): `SERVER_NAME = "sophionos"`, `SERVER_VERSION = "0.1.0"`, transport **stdio**.
**66 `registerTool` calls total** (core 16, knowledge 27, links 12, parity 11). Note: `packages/mcp-server/README.md:156` still says "33 tools" — the README count is stale relative to the code.

**Core PARA** (16)
`list_areas` (List Areas) · `create_area` (Create Area) · `archive_area` (Archive Area) · `restore_area` (Restore Area) · `list_goals` (List Goals) · `get_goal_detail` (Get Goal Detail) · `create_goal` (Create Goal) · `update_goal` (Update Goal) · `list_projects` (List Projects) · `get_project` (Get Project) · `create_project` (Create Project) · `update_project` (Update Project) · `list_tasks` (List Tasks) · `create_task` (Create Task) · `update_task` (Update Task) · `complete_task` (Complete Task)

**Knowledge / Contacts / System** (27)
`list_notes` (List Notes) · `get_note` (Get Note) · `create_note` (Create Note) · `update_note` (Update Note) · `save_resource` (Save Resource) · `list_resources` (List Resources) · `list_topics` (List Topics) · `create_topic` (Create Topic) · `list_contacts` (List Contacts) · `create_contact` (Create Contact) · `log_interaction` (Log Contact Interaction) · `link_contact_to_project` (Link Contact to Project) · `search` (Search) · `knowledge_search` (Knowledge Hub Search) · `get_dashboard` (Get Dashboard (Today)) · `get_my_day` (Get My Day) · `get_inbox` (Get Inbox) · `list_notebooks` (List Notebooks) · `list_note_types` (List Note Types) · `bulk_archive_notes` (Bulk Archive Notes) · `bulk_delete_notes` (Bulk Delete Notes) · `bulk_update_note_status` (Bulk Update Note Status) · `get_contact_log_history` (Get Contact Log History) · `get_contact_groups` (Get Contact Groups) · `get_contacts_grouped_by_area` (Get Contacts Grouped by Area) · `get_contacts_grouped_by_goal` (Get Contacts Grouped by Goal) · `get_dashboard_activity` (Get Dashboard Activity)

**Links / notebooks** (12)
`add_note_to_notebook` · `remove_note_from_notebook` · `set_note_notebooks` · `get_related_notes` · `link_area` (Link Entity to Area) · `unlink_area` (Unlink Entity from Area) · `archive_entity` (Archive Entity) · `restore_entity` (Restore Entity) · `link_contact_to_task` (Link Contact to Task) · `update_resource` (Update Resource) · `update_topic` (Update Topic) · `update_contact` (Update Contact)

**Parity** (11)
`get_entity` (Get Entity) · `delete_entity` (Delete Entity) · `link_goal` / `unlink_goal` · `link_project` / `unlink_project` · `link_task` / `unlink_task` · `unlink_contact_from_project` · `unlink_contact_from_task` · `update_area` (Update Area)

**Representative descriptions (verbatim, first sentence)**

- `list_areas` — `List the user's PARA Areas (life/work domains such as Health, Work, Finances). Use ?grouped to group by type, or filter by inactive/archived state. Returns a paginated list.`
- `get_goal_detail` — `Get a single goal with its hydrated progress and rollup counts (its 'command center' view). Accepts a goal id or slug.`
- `list_projects` — `List the user's Projects. Filter by status (including 'inbox'), area, goal, or linked contact. Use group_by to group by area or status. Returns a paginated list.`
- `list_tasks` — `List the user's Tasks. Rich filtering: status, priority, area/project/goal/contact, focused, overdue, upcoming, due-date range. Pass sort='smart-priority' to order by the smart-priority score (most important first).`
- `list_notes` — `List the user's Notes. Filter by notebook, topic, project, area, status, type, favorite, or pinned. Use group_by=notebook|status|type to group. A note can belong to multiple notebooks.`
- `search` — `Full-text search across the user's entities. Returns matches grouped by type.`
- `knowledge_search` — `Search the knowledge hub — notes, resources, and topics — simultaneously. Returns grouped results with counts.`
- `get_my_day` — `Get the user's My Day — two sections in one call: dueToday (active tasks due today, with dueTodayCount) and focused (active tasks marked is_focused, with focusedCount).`
- `get_inbox` — `Get the unified inbox — tasks, notes, and resources currently in 'inbox' status — with counts.`
- `get_dashboard` — `Get the full dashboard payload in one call. Top-level sections: greeting, tasksTodayCount, todayTasks (…), activeGoals, stats (completedThisWeek, activeGoalsCount, overdueCount), recentActivity — and analytics, the same KPIs and graphs as the dashboard page: analytics.kpis (focusTasks, overdueTasks, completedThisWeek, activeGoals), analytics.executionLoad (today, overdue, focus, inProgress, completedThisWeek), analytics.workHealth (overdueByArea, overdueByProject, stalledProjects, lowProgressNearDueGoals, unassignedTasks), analytics.knowledgePipeline (capturedToday, waitingReview, saved, archived, backlog, mostActiveTopics), analytics.goalMomentum (movingGoals, stalledGoals, buckets.stuck/moving/almostDone), analytics.relationshipRisk (followUpsDue, tiedToActiveProjects, contacts with daysOverdue and activeProjectCount), analytics.heatmap (year-long activity graph…), analytics.contextNetwork (areaNodes, goalNodes, projectNodes, taskNodes, densityScore).`
- `complete_task` — `Mark one or more tasks as complete (max 100). Completing a task updates its parent project's progress.`
- `bulk_delete_notes` — `Permanent delete is DASHBOARD-ONLY: the API rejects every permanent delete from API keys and MCP with 403 PERMANENT_DELETE_DISABLED, so this tool always fails with that error. Use bulk_archive_notes instead, or delete permanently in the web dashboard. (max 100).`
- `create_area` (excerpt) — `…icon is a single emoji that fits the domain (e.g. Health -> 🏃, Finances -> 💰, Test Area -> 🧪), color is a hex color matching the domain's theme, type is a meaningful classification (e.g. "Personal", "Business")…`

Environment variables (from `docs/mcp.md`):
| Variable | Required | Notes |
| --- | --- | --- |
| `SOPHIONOS_API_KEY` | yes | `sop_…` from Settings → AI Access |
| `SOPHIONOS_API_URL` | no | Instance origin for self-hosted; defaults to cloud SaaS |

Example prompts (verbatim, `packages/mcp-server/README.md:181-187`):
```
"Create a task called Review pitch deck, high priority, due Friday."
"What are my tasks for today?"
"Complete the pitch deck task."
"Show me the Fundraising goal details."
"Save this article as a resource and tag it under React."
"Who's on the Website Redesign project?"
"What's in my inbox?"
```

### 5.6 AI Access — `src/app/(dashboard)/settings/ai-access/page.tsx` + `src/components/settings/ai-access-card.tsx`

Page header:
- Title: **`AI Access`**
- Description: `Control which AI clients and external tools can access your SophionOS context. Revoke keys or disable all AI access at any time.`

Loading text: `Loading AI access…`

**Card 1 — Global AI access** (`Shield` when on / `ShieldOff text-destructive` when off)
- Title: **`Global AI access`**
- Description: `Control whether external AI clients and API keys can reach your SophionOS context. Your signed-in dashboard is separate.`
- Status line: `Global AI access: ON` / `Global AI access: OFF`
- Buttons: **`Turn off`** / **`Turn on`** (toggles), **`Disable all AI access`** (destructive), **`View activity`** (secondary → `/settings/ai-access/activity`)
- Write row: `API key writes: allowed` / `API key writes: blocked`; buttons **`Disable writes`** / **`Enable writes`**
- Footnote: `“Disable all AI access” turns global access off and revokes every active API key immediately.`
- Toasts: `AI/API access enabled.` / `AI/API access disabled (existing keys still listed until revoked).` / `API key write access enabled (per-key mode still applies).` / `API key write access disabled.`

**Card 2 — Connected clients / API keys**
- Title: **`Connected clients / API keys`**
- Description: `Create a key for a trusted tool. Keys are shown once. List responses never include the raw secret.`
- Button: **`Create new key`**
- Each key row: name / client name, status chip `Active`, sub-line `{name} · {key_prefix} · {client_type}`, access-mode label, `Last used: {date}` or `Last used: Never`; buttons **`Change access`**, **`Revoke`**
- Empty state: `No active API keys. Create one to connect Claude, Codex, Antigravity, Cursor, OpenCode, or any MCP-compatible AI client.`

Access-mode labels (`accessModeLabel`):
```
read_only     -> "Read-only"
write_limited -> "Read + create/update"
write_enabled -> "Read + create/update/delete"
```

**Card 3 — Privacy note**
- Title: **`Privacy note`**
- `SophionOS does not train AI models on your private content.`
- `SophionOS does not send your data to an AI model by default. When you connect an AI client, it accesses SophionOS through the connection you authorize.`

**Create API key dialog** (`api-key-create-dialog.tsx`)
- Title: `Create API key` / (after create) `Copy your API key`
- Descriptions: `Create a key for a trusted tool. MCP keys default to read-only.` / `This is the only time the full key is shown. Store it somewhere safe.`
- Fields: `Label` (placeholder `Cursor — MacBook Pro`), `Client name (optional)` (placeholder `OpenCode`), `Client type` (`MCP client` / `Automation` / `Personal / script`), `Access mode` (`Read-only (recommended)` / `Can create/update (no delete)` / `Full write (create/update/delete)`)
- Access note: `Read-only can query data. Create/update cannot archive or delete. Full write can change and remove data via the API.`
- Post-create warning: `Do not share this key. Anyone with it can access your SophionOS data according to its access mode. After you close this dialog, the full key cannot be recovered.`
- Buttons: `Cancel` / `Create key` / `Copy key` / `Copied` / `Done`
- Toasts: `Give the key a label, e.g. Cursor — MacBook Pro.` · `API key created. Copy it now — it won’t be shown again.` · `Copied to clipboard.` · `Could not copy. Select and copy manually.`

### 5.7 Settings landing — `src/app/(dashboard)/settings/page.tsx`

H1 **`Settings`**, sub-line `Configure your SophionOS experience, access, and connections.`
Card grid `grid gap-4 md:grid-cols-2 lg:grid-cols-3`, cards use `.hover-lift`.

| Title | href | Description |
|---|---|---|
| `Profile` | `/settings/profile` | `Photo, username, phone number, and account details.` |
| `Preferences` | `/settings/preferences` | `Theme, timezone, language, and display options.` |
| `Notifications` | `/settings/notifications` | `Configure briefings, digests, and reminder schedules.` |
| `AI Access` | `/settings/ai-access` | `See connected clients, revoke keys, and disable all AI/API access.` |
| `Privacy & data` | `/settings/privacy` | `Export your data, review counts, and request account deletion.` |
| `API Access` | `/settings/api-keys` | `Create and manage API keys for MCP and direct API use.` |
| `MCP Server` | `/settings/mcp` | `Connect SophionOS to your AI client. Requires Pro.` |
| `Billing` | `/settings/billing` | `View your plan, usage, and upgrade options.` |
| `Integrations` | `/settings/integrations` | `Connect third-party services and sync data.` |

Card footer CTA text: `` `Open ${card.title} →` `` (`text-sm text-primary`).
API Keys page header description: `Create and manage API keys to authenticate your MCP server or direct API calls. Each key is shown once at creation — store it somewhere safe.`
API-key manager states: `API keys`, `New key name`, `Loading keys…`, `No active keys yet.`

### 5.8 Trust page — `src/app/data-and-ai/page.tsx`

Title: **`Data, AI clients, and MCP`**; `<h2>` headings: `Default behavior`, `Connection flow`, `Access modes`.
Copy (verbatim):
> SophionOS core does not automatically call OpenAI, Anthropic, or other model hosts with your notes. Connecting an AI client is always an explicit user action.

Ordered list:
1. `Create an API key in Settings → AI Access (default: read-only).`
2. `Configure your MCP client with the base URL and key.`
3. `The client calls SophionOS REST APIs; SophionOS enforces auth, modes, scopes, and your AI-access flags.`
4. `Revoke the key or disable AI access to cut off further requests.`

Access modes: **Read-only** (query context; cannot create/update/delete) · **Write-limited** (create/update selected entities; no permanent delete or archive class actions) · **Write-enabled** (broader writes including archive; permanent delete remains dashboard-only for MCP/API keys).

---

## 6. Visual Tokens

### 6.1 Fonts (`src/app/layout.tsx`)

```ts
import { Geist, Geist_Mono, Sora } from "next/font/google";
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const sora      = Sora({ subsets: ["latin"], variable: "--font-heading", display: "swap" });
```

| Token | Family | Used for |
|---|---|---|
| `--font-sans` → `var(--font-sans)` | **Geist** | body / UI text (`html { @apply font-sans }`) |
| `--font-heading` → `var(--font-heading)` | **Sora** | headings (`font-heading`) |
| `--font-mono` → `var(--font-geist-mono)` | **Geist Mono** | code, API keys, MCP config blocks |

Page H1 pattern: `text-2xl font-bold tracking-tight` (Goals/Projects pages use `text-3xl font-bold tracking-tight`); dashboard greeting H1 uses `font-heading text-2xl font-semibold tracking-tight`.

### 6.2 Colour tokens (`src/app/globals.css`)

Everything is **OKLCH**, chroma tinted toward the indigo brand hue **260**.

**Dark mode** (`.dark`):
```
--background: oklch(0.145 0.012 260)      /* near-black indigo */
--foreground: oklch(0.985 0.002 260)
--card:       oklch(0.205 0.014 260)
--card-foreground: oklch(0.985 0.002 260)
--popover:    oklch(0.205 0.014 260)
--primary:    oklch(0.6366 0.15 260)      /* Indigo ≈ #6366F1 */
--primary-foreground: oklch(0.205 0.014 260)
--secondary:  oklch(0.269 0.014 260)
--muted:      oklch(0.269 0.014 260)
--muted-foreground: oklch(0.708 0.014 260)
--accent:     oklch(0.279 0.018 260)
--destructive: oklch(0.704 0.191 22.216)
--border:     oklch(0.985 0.01 260 / 10%) /* alpha border */
--input:      oklch(0.985 0.01 260 / 15%)
--ring:       oklch(0.6 0.13 260)
--sidebar:    oklch(0.205 0.014 260)
--sidebar-border: oklch(0.985 0.01 260 / 10%)
--sidebar-accent: oklch(0.279 0.018 260)
```

**Light mode** (`:root`):
```
--background: oklch(0.994 0.002 260)
--foreground: oklch(0.145 0.012 260)
--card:       oklch(0.998 0.001 260)
--primary:    oklch(0.3 0.15 260)        /* Indigo-ish */
--primary-foreground: oklch(0.985 0.002 260)
--secondary:  oklch(0.968 0.005 260)
--muted:      oklch(0.968 0.005 260)
--muted-foreground: oklch(0.552 0.016 260)
--accent:     oklch(0.965 0.008 260)
--destructive: oklch(0.577 0.245 27.325)
--border:     oklch(0.916 0.006 260)
--ring:       oklch(0.55 0.13 260)
--sidebar:    oklch(0.984 0.004 260)
--sidebar-border: oklch(0.916 0.006 260)
```

**Dashboard semantic accents** (the four-palette system):
```
                     light                  dark
--analytics-action   oklch(0.58 0.14 260)   oklch(0.72 0.13 260)   indigo  = focus / active
--analytics-risk     oklch(0.55 0.2 27)     oklch(0.7 0.16 27)      red     = overdue / stuck
--analytics-success  oklch(0.62 0.13 155)   oklch(0.72 0.12 155)    green   = done / density
--analytics-accent   oklch(0.56 0.12 315)   oklch(0.72 0.11 315)    violet  = goals / secondary
```

**Chart series**:
```
--chart-1  light oklch(0.62 0.13 155) / dark oklch(0.72 0.12 155)
--chart-2  light oklch(0.58 0.14 260) / dark oklch(0.72 0.13 260)
--chart-3  light oklch(0.62 0.16 35)  / dark oklch(0.74 0.14 35)
--chart-4  light oklch(0.58 0.12 210) / dark oklch(0.7 0.11 210)
--chart-5  light oklch(0.56 0.12 315) / dark oklch(0.72 0.11 315)
```

**Heatmap ramp**:
```
--heatmap-empty  light oklch(0.9 0.01 260)  / dark oklch(0.28 0.02 260)
--heatmap-1      light oklch(0.88 0.06 155) / dark oklch(0.35 0.06 155)
--heatmap-2      light oklch(0.78 0.1 155)  / dark oklch(0.45 0.1 155)
--heatmap-3      light oklch(0.68 0.12 155) / dark oklch(0.58 0.12 155)
```
`.heatmap-cell` base: `width: 0.875rem; height: 0.875rem; border-radius: 0.15rem`.

Other:
```
--destructive (light) oklch(0.577 0.245 27.325)
::selection { background-color: oklch(0.55 0.13 260 / 0.18); }
themeColor (viewport): light "#fcfcfd", dark "#0f172a"
```

### 6.3 Radii

```
--radius:    0.625rem   (10px)  → --radius-lg
--radius-sm: 0.375rem   (6px)   = radius × 0.6
--radius-md: 0.5rem     (8px)   = radius × 0.8
--radius-xl: 0.875rem   (14px)  = radius × 1.4   ← card + analytics panel radius
--radius-2xl:1.125rem   (18px)  = radius × 1.8
--radius-3xl:1.375rem   (22px)
--radius-4xl:1.625rem   (26px)
```

Common in practice: nav links `rounded-md`; KPI/analytics panels `rounded-xl`; icon chips `rounded-full` or `rounded-lg`; badges and pills `rounded-full`; dropdown/menu `rounded-2xl`; code blocks `rounded-md`.

### 6.4 Shadows

```css
--shadow-soft:
  0 1px 2px oklch(0.2 0.05 260 / 0.04), 0 4px 12px oklch(0.2 0.05 260 / 0.05),
  0 12px 28px oklch(0.2 0.05 260 / 0.04);
--shadow-soft-lg:
  0 2px 4px oklch(0.2 0.05 260 / 0.05), 0 10px 24px oklch(0.2 0.05 260 / 0.07),
  0 24px 56px oklch(0.2 0.05 260 / 0.07);
```
Brand-tinted ambient elevation (hue 260), never a hard gray drop.

`.hover-lift` (outside `@layer utilities`):
```css
transition: transform, box-shadow; 500ms var(--ease-out-quint);
&:hover  { transform: translateY(-0.25rem); box-shadow: var(--shadow-soft-lg), 0 0 0 2px oklch(0.3 0.15 260 / 0.2); }
&:active { transform: translateY(0); transition-duration: 150ms; }
```

### 6.5 Motion

```css
--ease-spring:     cubic-bezier(0.32, 0.72, 0, 1);
--ease-out-expo:   cubic-bezier(0.16, 1, 0.3, 1);
--ease-out-quint:  cubic-bezier(0.22, 1, 0.36, 1);   ← the house easing, used nearly everywhere
```
Rule stated in the file: *"No linear/ease-in-out anywhere."*

Named animations:
```
--animate-reveal         reveal 0.7s var(--ease-out-quint) both;         opacity 0 + translateY(0.75rem) → none
--animate-shimmer        shimmer 1.8s ease-in-out infinite;              brand-tinted gradient sweep
--animate-fade-out       fade-out 200ms var(--ease-out-quint) both;
--animate-fade-in        fade-in 200ms var(--ease-out-quint) both;
--animate-badge-flash    badge-flash 400ms var(--ease-out-quint) both;   ring pulse 0 → 4px → 0
--animate-metric-bar     metric-bar-reveal 280ms var(--ease-out-quint) backwards;  scaleX(0) → 1
--animate-ring-segment   ring-segment-draw 320ms var(--ease-out-quint) backwards;  opacity 0 + stroke-dasharray 0 400
--animate-kpi-in         kpi-in 220ms var(--ease-out-quint) both;
--animate-cockpit-in     cockpit-in 240ms var(--ease-out-quint) both;
```

Stagger classes: `.reveal-stagger > *` (0/60/120/180/240/300/360/420 ms), `.kpi-stagger > *` (0/40/80/120 ms), `.cockpit-stagger > *` (0/50/100/150/200/240 ms), `[data-slot="execution-load-bars"] > *` (40/80/120/160/200 ms), `.momentum-ring-segment:nth-of-type()` (40/80/120 ms).
`.reveal-once` for standalone headers. `.content-fade-in` / `.skeleton-fade-out` around skeletons.
`prefers-reduced-motion: reduce` collapses all durations to 0.01 ms and hides the grain overlay.

### 6.6 Typography scale (Tailwind defaults + one custom step)

```
--text-2xs: 10px;  --text-2xs--line-height: 1.2;   /* micro-text, used on all tiny labels */
text-xs   12px  — labels, meta, chart labels
text-sm   14px  — body/UI, most descriptions
text-base 16px  — card titles (CardTitle: font-heading text-base font-medium)
text-lg   18px  — section h2 (with font-heading font-semibold tracking-tight)
text-xl   20px  — donut centre value
text-2xl  24px  — page h1, KPI values
text-3xl  30px  — Goals/Projects page h1
```

Recurring classes:
- Headings: `font-heading font-semibold tracking-tight` (dashboard greeting, section headers), `font-bold tracking-tight` (page h1)
- Numerals: **`tabular-nums`** on every metric/KPI/chart value
- Labels: `text-2xs` uppercase for group headings (`Core`, `System`), `text-xs font-medium` for KPI labels
- Tracking: `tracking-tight` on headings and display names; `tracking-wider` on uppercase group headings; `tracking-wide` on the Cohort pill
- Heatmap month/weekday labels: `text-[10px] font-medium leading-none text-muted-foreground`
- Body smoothing: `text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale`

### 6.7 Distinctive motifs

**Status dot / active nav rail** — `sidebar.tsx:52-56`: active nav item gets an absolutely-positioned left rail:
`absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary` (mobile uses `h-5`).

**Icon chips** — round tinted wells: KPI chips `size-8 rounded-full` with `/10` background; panel headers `size-7 rounded-lg bg-muted/70`; work-health tiles `size-6 rounded-full`; activity-feed `h-8 w-8 rounded-full`.

**Pills / badges**
- `<Badge>`: `inline-flex h-5 rounded-full border px-2 py-0.5 text-xs font-medium`, variants `default | secondary | destructive | outline | ghost | link`
- Semantic status badges: `rounded-full` via `STATUS_COLORS`/`PRIORITY_COLORS` with `badge-flash` on change (400 ms ring pulse)
- Cohort pill `Cohort`: `h-4 rounded-full border-blue-500/20 bg-blue-500/10 text-[10px] uppercase tracking-wide`
- Topbar profile tier chip: `rounded-md border border-purple-500/10 bg-purple-500/10 text-xs` (blue variant for valueTone `"blue"`)
- Count pills: `h-5 min-w-5 rounded-full bg-muted px-1.5 text-2xs tabular-nums`
- Knowledge topic count: `rounded-full bg-foreground px-1.5 py-0.5 text-2xs text-background` (inverted)

**Progress bars (metric / density)** — 8–10 px tall, `border-radius: 9999px`, track `var(--muted)`, fill grows with a visible 10% floor and 6 px min width.

**Progress rings**
- Goal Momentum donut: 128 px SVG, 16 px stroke, `strokeLinecap="butt"`, `-rotate-90`, segments drawn once via `stroke-dasharray`
- Entity `ProgressRing`: 64 px, 8 px stroke, `strokeLinecap="round"`, `text-muted-foreground/20` track, `duration-700`, centred `text-xs font-bold` percentage

**Sparklines**: none used. Bar charts are horizontal `MetricBar` rails; the only "graph" is the square-cell Activity heatmap.

**Heatmap cells**: `border-radius: 2px`, `aspect-ratio: 1`, hover `scale(1.35)` with `opacity: 0.92` and 180 ms colour transition; legend `Less` → 5 swatches → `More`.

**Grain overlay** — `.grain-overlay`: `position: fixed; inset: 0; z-index: 10; opacity: 0.035; mix-blend-mode: soft-light; background-size: 160px 160px`, an inline `feTurbulence fractalNoise baseFrequency="0.85" numOctaves="2"` SVG data-URI. Dark mode raises opacity to `0.05`.

**Skeleton shimmer** — `.skeleton-shimmer`: a 90° brand-tinted linear-gradient sweep (`oklch(0.968 0.005 260)` → `oklch(0.935 0.012 260)` → back), `background-size: 200% 100%`, 1.8 s infinite. Dark variant uses `oklch(0.269 0.014 260)` / `oklch(0.295 0.02 260)`.

**Empty state illustration** — `src/components/views/empty-state.tsx`: concentric rounded squares.
```
<div class="mb-5 rounded-xl bg-muted/40 p-2 ring-1 ring-foreground/5">
  <div class="flex size-16 items-center justify-center rounded-lg bg-card shadow-soft ring-1 ring-foreground/10">
    <Icon class="size-7 text-muted-foreground" strokeWidth={1.5} />
```
Title `text-lg font-medium tracking-tight`, body `max-w-sm text-sm text-muted-foreground`, CTA = `rounded-full` pill button with a circular arrow chip `bg-primary-foreground/15`.

**Inbox empty state** — `Inbox zero` / `All items have been processed. Great work — capture new tasks and notes to continue.`; sub-line variants `Inbox zero — everything processed`, `Loading…`, `{n} items to process`.

**Toast** — `sonner`.

### 6.8 Spacing / layout constants

```
page shell:      content-fade-in reveal-stagger flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full
dashboard shell: content-fade-in mx-auto flex w-full max-w-7xl flex-col gap-8 p-6
panel stack:     cockpit-stagger flex flex-col gap-4
KPI grid:        grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4
rows:            gap-4 (xl:grid-cols-2 / -5)
topbar / sidebar header height: h-12
sidebar width:    w-64 open, w-20 collapsed
mobile sheet:    w-72
```

### 6.9 Card radius / border summary (the look to reproduce)

| Element | Radius | Border | Background | Shadow |
|---|---|---|---|---|
| KPI card | `rounded-xl` (14px) | `border-border/70` | `bg-card` | `shadow-soft` |
| Analytics panel | `rounded-xl` | `border-border/70` | `bg-card` | `shadow-soft` |
| Work-health tile | `rounded-lg` (8px) | `border-border/50` | `bg-muted/30` | — |
| Knowledge-pipeline tile | `rounded-lg` | — | `bg-muted/40` | — |
| Base `Card` | `rounded-xl` | `ring-1 ring-foreground/10` | `bg-card py-4` | `shadow-soft` |
| Nav link | `rounded-md` | — | `bg-sidebar-accent` when active | `shadow-[inset_0_1px_0_oklch(1_0_0/0.04)]` |
| Badge | `rounded-full` | `border-transparent` | per-colour recipe | — |
| Dropdown menu | `rounded-2xl` | — | popover | — |

### 6.10 Brand voice strings (verbatim, from `src/app/layout.tsx` + README)

```
metadata.title        : "SophionOS"
metadata.description  : "SaaS Life Management Platform"
openGraph.title       : "SophionOS"
openGraph.description : "One calm system for your whole life."
```

`PRODUCT.md` design principles (verbatim headings): *Wisdom over information* · *Calm command center* · *Earned familiarity* · *Restraint by default* · *Motion is state*.
Anti-references (verbatim): *Generic neon "AI SaaS" dark dashboards* · *Notion template maximalism and blank-canvas paralysis* · *Hero-metric KPI walls with decorative gradients* · *Loud gamification, confetti, and bounce-heavy motion* · *Nested card stacks and identical icon-card grids as decoration*.

---

## Appendix — other page headers (exact, for extra screens)

| Page | Emoji | H1 | Sub-line |
|---|---|---|---|
| Dashboard | — | (dynamic greeting) | `Load, momentum, and risk signals for the current cycle sit below.` |
| Areas | 🗺️ | `Areas` | `Organize your life into focus areas` |
| Goals | 🎯 | `Goals` (`text-3xl`) | `Track and achieve your long-term objectives.` |
| Projects | 📁 | `Projects` (`text-3xl`) | `Organize projects by area, status, and linked goals.` |
| Tasks | ☑️ | `Tasks` | `{n} tasks · {m} overdue` \| `all on track` |
| Notes | 📝 | `Notes` | `` `${active} active note${s} - ${archived} archived` `` (`formatNotesSummary`, `src/lib/utils/note-page-display.ts:18-20`) |
| Resources | 🔗 | `Resources` | `{n} resource` / `{n} resources` |
| Topics | 🏷️ | `Topics` | `{n} topic` / `{n} topics` |
| Contacts | 👥 | `Contacts` | `{n} contacts in your network` \| `No contacts yet — add your first one to start tracking relationships` |
| Inbox | 📥 | `Inbox` | `{n} items to process` \| `Inbox zero — everything processed` \| `Loading…` |
| My Day | ☀️ (Sun orange) | `My Day` | `formatDateHuman(new Date())` — human-readable today |
| Knowledge Hub | 📚 (blue) | `Knowledge Hub` | see §5.1 |
| Settings | — | `Settings` | `Configure your SophionOS experience, access, and connections.` |

Primary CTA buttons: `New Area`, `New Goal`, `New Project`, `New Task`, `New Note`, `New Resource`, `New Topic`, `Add Contact`, `Plan My Day` — all `Plus`/`FilePlus` icon + label.

**My Day sections** (`my-day-content.tsx`):
- `Due Today` — accent `bg-amber-500`, description `Tasks due today.`, empty text `No tasks due today.`
- `Focus` — accent `bg-yellow-500`, description `Starred tasks for today's focus.`, empty text `No tasks in focus. Star a task below to add it to your day.`
- Full-empty `EmptyState` description: `No tasks due today and nothing in focus. Use 'Plan My Day' to pick what to work on.` (actionLabel `Plan My Day`)
- "Plan My Day" panel: h2 `Pick tasks to focus` (`CheckSquare`), meta `{n} available`, hint `Star any task to add it to your focus list for today.`

**Tasks page tabs** (exact order): `All`, `Inbox`, `Upcoming`, `Overdue`, `Focus`, `Smart Priority`, `Calendar`, `By Area`, `By Goal`, `By Project`, `Completed`, `Archive`.

**Onboarding wizard steps** (`src/lib/onboarding/steps.ts`) — title / subtitle / icon, in order:

| Step | Title | Subtitle | Icon | Kind |
|---|---|---|---|---|
| `areas` | `Your life areas` | `We seeded a starter set. Keep the ones that fit — you can edit later.` | 🗂️ | action |
| `goal` | `Set your first goal` | `Something you want to make progress on. It anchors your projects and tasks.` | 🎯 | action |
| `project` | `Add a project` | `A concrete effort that moves your goal forward.` | 📁 | action |
| `tasks` | `Capture a few tasks` | `The next small actions. Add one to three to get rolling.` | ✅ | action |
| `my_day` | `My Day — your daily focus` | `A focused view of what matters today. Pin tasks, review priorities, and stay on track.` | ☀️ | explainer |
| `inbox` | `Inbox — capture everything` | `Dump tasks, notes, and resources here. Process them later when you're ready.` | 📥 | explainer |
| `knowledge` | `Knowledge — your second brain` | `Browse all your notes, resources, and contacts in one place, organised by topic.` | 🧠 | explainer |
| `notes` | `Notes capture thinking` | `Draft ideas, journal, and research all live in Notes.` | 📝 | explainer |
| `resources` | `Resources hold references` | `Links, files, and materials you return to — organised by topic.` | 🔗 | explainer |
| `contacts` | `Contacts keep people close` | `Track the people who matter and your follow-ups with them.` | 👥 | explainer |

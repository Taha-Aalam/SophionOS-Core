# SophionOS Core — Product Requirements Document

**Project 1 of 2** · Version 1.0 · April 2026 · Status: Draft

> SophionOS Core is the data platform, API layer, MCP server, and web dashboard that powers the SophionOS life management product. It is the system of record — every piece of user data lives here. It ships with an MCP server that lets users connect SophionOS to any AI client they already use (Claude Desktop, Claude Code, Cursor, Codex). The companion project (SophionOS Agent) is a future WhatsApp/Telegram AI assistant built on top of this platform.

---

## 1. Product Overview

SophionOS Core is a cloud-based SaaS platform that gives users a single, structured system to manage every domain of their life — work, health, finances, goals, knowledge, and personal tracking.

**What it is:** A relational data platform with a clean web dashboard, built on the PARA methodology (Projects, Areas, Resources, Archive). It exposes a public REST API and an MCP server so that any AI client can read and write user data programmatically — no custom integration needed.

**What makes it different from Notion/Todoist/Obsidian:** SophionOS Core is purpose-built, not general-purpose. The data model is pre-designed with relationships baked in (Areas → Goals → Projects → Tasks). Users don't build databases — they just use them. Every entity is interconnected out of the box. And unlike any competitor, SophionOS ships with native AI integration via MCP — users can manage their life system from inside the AI tools they already use.

**The three interfaces:** SophionOS Core has three access layers from day one. The web dashboard for visual management and deep planning. The REST API for programmatic access and third-party integrations. The MCP server for frictionless AI-assisted input — users talk to Claude, Cursor, or Codex and their data flows into SophionOS automatically. A future fourth interface (the SophionOS Agent on WhatsApp/Telegram) will extend this to non-technical users.

---

## 2. Target Users

### Primary: The Overwhelmed Professional
- Age 25–40, knowledge worker, freelancer, or entrepreneur
- Juggles 4–7 apps for tasks, notes, goals, habits, and personal tracking
- Has tried and abandoned Notion, Todoist, or similar tools
- Wants a system that just works without hours of setup
- Willing to pay $14–29/month for something that genuinely reduces cognitive load

### Secondary: The Self-Improvement Tracker
- Age 22–38, focused on personal growth, reading, health, and goal achievement
- Currently tracks supplements, books, fitness across scattered apps and spreadsheets
- Loves seeing progress visualized — charts, completion percentages, streaks
- Values the interconnection between goals and daily actions

### Tertiary: The Practical Organizer
- Age 30–55, not necessarily tech-savvy
- Needs help managing groceries, warranties, orders, bookmarks, passwords
- Would never set up a Notion database, but values an organized digital life
- Primarily uses the AI assistant; visits the dashboard occasionally

---

## 3. Core Problem Being Solved

**People don't lack productivity tools. They lack a system that connects everything and requires near-zero maintenance.**

Specific problems:

1. **Tool fragmentation.** Tasks in Todoist, notes in Notion, goals in a spreadsheet, bookmarks in the browser, passwords in a text file. No tool sees the full picture.

2. **Setup paralysis.** Powerful tools like Notion require days of template building before they're useful. Most users give up before getting value.

3. **Disconnected data.** A goal like "Advance my career" should surface its linked projects, tasks, notes, and resources automatically. In current tools, users manually maintain these connections — and stop doing so within weeks.

4. **No API for AI.** The next generation of productivity is AI-assisted. But AI assistants need structured, queryable data to be useful. Notion doesn't expose a user-friendly API for this purpose. SophionOS Core is designed API-first specifically so the AI Agent can read and write user data reliably.

---

## 4. Core Features (Must-Have Only)

These are MVP features. Nothing else ships until these work flawlessly.

### 4.1 Authentication & User Management
- Email/password signup + Google OAuth
- JWT sessions with refresh tokens
- User settings: timezone, theme (light/dark), notification preferences
- 14-day free trial of Pro tier, no credit card required

### 4.2 Areas (Life Domains)
- Pre-populated defaults: Work, Health, Finances, Personal Growth, Family & Friends, Home, Travel, Career
- Each area shows rollup counts: X goals, Y projects, Z tasks
- Users can add custom areas, archive inactive ones
- Gallery and list views

### 4.3 Goals
- Linked to an area
- Timeframe: short term (< 3 months), mid term (3–12 months), long term (> 1 year)
- Priority: high, medium, low
- Completion percentage: auto-calculated from linked projects and tasks
- Views: active, by term, inactive, completed

### 4.4 Projects
- Linked to an area and optionally to goals
- Status: inbox → in progress → completed → archive
- Progress: auto-calculated from task completion (done / total)
- Views: all, inbox, in progress, by area, by status, archive
- Due dates with days-left indicator

### 4.5 Tasks
- The atomic unit of work. Most complex module.
- Linked to area, project, and/or goals
- Priority: high, medium, low
- Status: inbox → to do → in progress → done
- Focus flag: marks task for today's focus
- Smart priority: computed score (1–5) based on due date proximity (30%), user priority (25%), goal alignment (25%), urgency/importance (20%)
- Repeat cycle: none, daily, weekly, monthly
- Views: all, inbox, upcoming, overdue, completed, smart priority, focus view, calendar
- Inline editing, checkbox completion, keyboard shortcuts

### 4.6 Notes
- Rich text (Markdown) with a Tiptap-based editor
- Linked to areas, projects, goals, topics
- Related notes: bidirectional linking
- Notebooks for grouping (e.g., Recipes, Stock Investing)
- Status: inbox → to review → active → archive

### 4.7 Resources
- External references: articles, websites, videos, tools
- URL field with clickable link
- Status pipeline: inbox → to review → saved → favorites → archive
- Linked to areas, projects, goals, topics

### 4.8 Topics
- Lightweight tagging system
- Links to areas, notes, and resources
- Used by the Knowledge Hub for discovery

### 4.9 Knowledge Hub
- Not a separate database — a unified search/browse interface
- Queries notes + resources + topics simultaneously
- Full-text search, filter by type/status/topic/area
- Pinned items at top

### 4.10 System Modules
- **Inbox:** aggregates all items with status "inbox" across tasks, notes, resources. GTD-style processing.
- **My Day:** today's tasks + focus items + daily planning. Resets each morning.
- **Quick Capture:** Cmd/Ctrl+K command palette. Type naturally → routed to correct database. Manual fallback.
- **Time Tracker:** Pomodoro timer + manual entry, linked to tasks/projects.
- **Archive:** cross-database view of all archived items.
- **Contacts:** basic personal CRM with name, relationship type, phone, email, notes.

### 4.11 Personal Trackers
- **Bookmarks:** collections, tags, favorites, reading list status
- **Book Tracker:** title, author, status (to read / reading / completed), rating, reading notes
- **Movie Tracker:** title, rating, genre, type (movie/series), status (to watch / watching / watched)
- **Supplement Tracker:** inventory (name, dosage, stock, expiry) + daily intake log
- **Grocery List:** items by category, quantity, in-stock toggle
- **Shopping Wishlist:** name, price, priority, URL
- **Order Tracker:** linked to stores, with dates and delivery status
- **Warranty Tracker:** product, store, purchase date, expiry date, document attachment
- **Password Manager:** client-side AES-256-GCM encryption, master password, web dashboard only (excluded from AI Agent)

### 4.12 Public REST API
- Every feature accessible via API (consumed by SophionOS Agent + future clients)
- JWT auth for dashboard, API key auth for external clients
- Scoped permissions per API key
- Rate limiting: 100 req/min (free), 1000 req/min (paid)
- Outbound webhooks on entity changes (task.created, goal.milestone_reached, etc.)
- Cursor-based pagination, idempotency keys

### 4.13 Billing
- Stripe integration: checkout, customer portal, usage tracking
- Three tiers: Free, Pro ($14/mo), Premium ($29/mo)
- Tier enforcement at API layer

### 4.14 MCP Server
- Published npm package (`@sophionos/mcp-server`) that wraps the REST API as MCP tools
- ~30 tools covering every entity: create/list/update tasks, goals, projects, notes, resources, contacts; search; dashboard; inbox
- Supports stdio transport (Claude Desktop, Claude Code, Cursor) and HTTP/SSE transport (remote hosting)
- Users configure with their API key — one-time setup, under 2 minutes
- Tool descriptions optimized for AI model consumption (not human-readable docs)
- Dashboard settings page with pre-filled setup instructions and copy-paste config buttons
- Launch differentiator: "SophionOS works inside the AI you already use"

---

## 5. Non-Goals (What This App Will NOT Do)

Being clear about what we're NOT building is just as important as what we are.

| Non-Goal | Reason |
|----------|--------|
| AI processing (voice, image, NLP, routing) | That's SophionOS Agent (Project 2). Core is the data platform, not the AI brain. |
| WhatsApp/Telegram integration | Channel integrations belong to the Agent. Core exposes the API; Agent consumes it. |
| Habit tracking with streaks | Overcomplicates MVP. Can be added as a Phase 2 tracker. Goals and tasks cover most habit use cases. |
| Calendar sync (Google/Outlook) | Tempting but complex. MVP uses its own calendar view. Third-party sync is a Phase 3 integration. |
| Collaboration / shared workspaces | Single-user product at launch. Team features are a separate tier for later. |
| Native mobile app | Responsive web + PWA first. React Native only if PWA proves insufficient after launch data. |
| AI-generated content or suggestions | Core provides data. Agent provides intelligence. Clean separation. |
| Social features (sharing, public profiles) | Not relevant to the product vision. This is a personal tool. |
| Finance tracking with bank connections | Too much regulatory complexity. The Finances area tracks goals and tasks, not bank transactions. |
| Custom database creation (Notion-style) | The entire value prop is that the databases are pre-designed. Users don't build schema — they use it. |

---

## 6. User Experience Principles

### 6.1 Speed is a feature
Every interaction must feel instant. Dashboard loads in < 1.5s. Task creation in < 500ms. Search results in < 300ms. If it feels slow, users will go back to their scattered tools.

### 6.2 Progressive disclosure
Show the core (Dashboard, Tasks, Goals) by default. Personal trackers are tucked in a sidebar section. Advanced views (Smart Priority, Timeline) are discoverable but not in your face. New users should feel clarity, not overwhelm.

### 6.3 Keyboard-first, mouse-friendly
Power users live on the keyboard: Cmd+K for quick capture, arrow keys to navigate, Enter to complete. But every action must also work with a mouse/touch for mobile users.

### 6.4 No empty states
Every new account starts with pre-populated areas (Work, Health, etc.) and a guided onboarding that creates the user's first goal and task through conversation — not a blank screen with a "+" button.

### 6.5 Dark mode by default
The target audience uses their tools late at night. Dark mode is the default; light mode is the toggle.

### 6.6 API parity
If you can do it in the dashboard, you can do it via API. No dashboard-only features. This ensures the AI Agent has full capability.

---

## 7. Monetization Ideas

### Pricing Model: Freemium with usage-based gating

| Feature | Free | Pro ($14/mo) | Premium ($29/mo) |
|---------|------|--------------|-------------------|
| Active tasks | 50 | 500 | Unlimited |
| Personal trackers | 3 modules | All | All |
| Web dashboard | Read-only* | Full | Full |
| File storage | 100 MB | 5 GB | 25 GB |
| API access (for Agent) | No | No | Yes |
| Data export | No | Yes | Yes |
| Priority support | No | Email | Priority + onboarding call |

*Free tier dashboard is read-only for items created via AI Agent. Users can still create items manually in the 3 enabled trackers.

### Why this works:
- **Free tier is generous enough to hook users** but limited enough that active users hit the wall within 2–3 weeks.
- **Pro is the real product.** Most users will land here. $14/mo is priced below Notion's team plan and above Todoist's pro tier — right in the sweet spot.
- **Premium exists for power users and API consumers.** The $29 tier also unlocks API access, which is required for the AI Agent integration (Project 2). This means the full SophionOS experience (Core + Agent) costs $29/mo — positioning it as a premium personal AI assistant.

### Revenue targets (conservative, 5% conversion):
| Month | MAU | Paid Users | MRR |
|-------|-----|-----------|-----|
| 6 | 10,000 | 500 | $8,500 |
| 12 | 25,000 | 1,250 | $21,250 |
| 24 | 100,000 | 8,000 | $136,000 |

---

## 8. MVP Version Only

**The MVP is not all 10 sections above.** This is what ships first — the minimum viable version that validates the core hypothesis: *"Users will adopt a pre-structured, interconnected life management platform over general-purpose tools."*

### MVP Scope (8 weeks)

**Week 1–2: Foundation**
- Supabase: database schema (core tables only: areas, goals, projects, tasks), RLS policies, auth
- Next.js scaffold: Tailwind, shadcn/ui, layouts, dark mode toggle
- Auth: signup, login, Google OAuth, password reset

**Week 3–4: Core PARA**
- Areas: gallery view, detail page, CRUD
- Goals: card view, progress bars, term filtering, CRUD
- Projects: list + kanban views, progress rollup, CRUD
- Tasks: full list view with inline editing, priority badges, checkbox completion, basic filtering (status, priority)

**Week 5–6: Minimum viable workflow**
- Dashboard: today's tasks, active goals widget, recent activity
- Quick Capture: Cmd+K palette → create task or note
- Inbox: aggregated inbox view with process-to-status workflow
- My Day: today's tasks + focus items
- Notes: basic editor (Tiptap), linked to areas/projects

**Week 7–8: API + polish**
- REST API: full CRUD on all entities, JWT + API key auth
- 3 personal trackers (Bookmarks, Grocery List, Book Tracker) — enough to validate the tracker concept
- Onboarding flow: guided setup creating first areas, goal, and task
- Responsive mobile testing + PWA manifest
- Deploy to Vercel + Supabase Cloud

### What is NOT in the MVP:
- Resources, Topics, Knowledge Hub (Week 9–10)
- Time Tracker, Contacts, Archive (Week 11–12)
- Remaining 6 personal trackers (Week 13–15)
- Billing/Stripe (Week 16)
- Semantic search, webhooks, data export (Week 17–18)

### MVP success = all of these are true:
1. A user can sign up, see pre-populated areas, create a goal with tasks, and track progress to completion
2. The REST API can create and query every MVP entity (tested by mocking what the Agent will do)
3. Dashboard loads in < 1.5s with 100 tasks in the database
4. At least 3 beta users say "I would use this instead of my current tool" in feedback

---

## 9. Success Metrics

### Activation Metrics (are users getting value?)
| Metric | Target | How Measured |
|--------|--------|-------------|
| Signup → first task created | > 80% within 5 min | Event tracking |
| Signup → dashboard revisit within 48h | > 60% | Session analytics |
| Areas customized (added/renamed) | > 40% of users | Database query |
| At least 1 goal created | > 50% in first week | Database query |

### Engagement Metrics (are users sticking?)
| Metric | Target | How Measured |
|--------|--------|-------------|
| DAU/MAU ratio | > 30% (month 6) | Analytics |
| Avg. tasks created per active user per week | > 8 | Database query |
| Avg. session duration | > 6 min | Analytics |
| 7-day retention | > 45% | Cohort analysis |
| 30-day retention | > 30% | Cohort analysis |

### API Metrics (is the platform ready for the Agent?)
| Metric | Target | How Measured |
|--------|--------|-------------|
| API response time (p95) | < 200ms | Server monitoring |
| API availability | > 99.9% | Uptime monitoring |
| API coverage | 100% feature parity with dashboard | Manual audit |
| External API keys created | > 100 (beta) | Database count |

### Business Metrics (is this a business?)
| Metric | Target (Month 6) | Target (Month 12) |
|--------|-------------------|-------------------|
| MAU | 10,000 | 25,000 |
| Free → paid conversion | 5% | 7% |
| Monthly churn (paid) | < 8% | < 5% |
| MRR | $8,500 | $21,250 |
| NPS | > 40 | > 55 |

---

## 10. Risks / Challenges

### Risk 1: "It's just another Notion"
**Likelihood: High.** Every productivity app gets compared to Notion.
**Mitigation:** The positioning is "pre-structured system" vs Notion's "build your own." Marketing must hammer this: "You don't build SophionOS. You just use it." The AI Agent (Project 2) is the real differentiator — no Notion equivalent exists.

### Risk 2: Feature scope creep from 25+ modules
**Likelihood: High.** The temptation to build everything before launching is strong.
**Mitigation:** Ruthless MVP scoping. Only 4 core modules + 3 trackers in the MVP. Everything else waits. Weekly scope reviews. If it doesn't serve the core hypothesis, it doesn't ship.

### Risk 3: Users don't visit the web dashboard (Agent handles everything)
**Likelihood: Medium.** If the AI Agent is good, users may rarely open the dashboard.
**Mitigation:** This is actually fine — the dashboard's job is to exist for deep planning and visualization. If usage is low but the API is heavily consumed by the Agent, that validates the platform model. Dashboard engagement is a vanity metric; API consumption is the real signal.

### Risk 4: Database schema locks us in
**Likelihood: Medium.** Pre-designed databases are the value prop, but also a constraint. Users will want custom fields.
**Mitigation:** Add a `metadata JSONB` column to every table from day one. Users (and the Agent) can store custom key-value pairs without schema changes. Custom fields UI is a Phase 2 feature.

### Risk 5: Performance at scale
**Likelihood: Low-Medium.** PostgreSQL with proper indexing handles 100k users comfortably, but complex relational queries (goal → projects → tasks → areas with rollup counts) can slow down.
**Mitigation:** Materialized views for rollup counts. Aggressive caching with React Query (stale-while-revalidate). Database indexing on user_id + status + due_date for every table. Performance budget: alert if any endpoint exceeds 200ms p95.

### Risk 6: Competitors add AI features
**Likelihood: High.** Notion, Todoist, and Obsidian are all adding AI.
**Mitigation:** Their AI is bolted on top of general-purpose tools. SophionOS is designed AI-first — the data model, the API, and the relationship structure are all built for an AI to consume efficiently. A general-purpose tool adding AI is like a sedan adding a tow hitch. SophionOS is the truck.

### Risk 7: Password Manager liability
**Likelihood: Low but high impact.** If encryption is compromised, trust is destroyed.
**Mitigation:** Client-side encryption only — server never sees plaintext. Clear disclaimers: "This is a convenience feature, not a replacement for 1Password or Bitwarden." Consider removing from MVP entirely and adding in Phase 2 after security audit.

---

## Appendix: Tech Stack Summary

| Layer | Choice |
|-------|--------|
| Frontend | Next.js 14 (App Router) + React 18 |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand (client) + TanStack Query (server) |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| Hosting | Vercel (frontend) + Supabase Cloud (backend) |
| Billing | Stripe |
| Email | Resend |
| Analytics | PostHog |
| Monitoring | Sentry |

---

*This PRD covers SophionOS Core (Project 1 of 2). For the AI assistant layer including WhatsApp/Telegram integration, voice processing, and OpenClaw agent orchestration, see the SophionOS Agent PRD (Project 2 of 2).*

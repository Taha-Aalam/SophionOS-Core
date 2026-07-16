# SophionOS — Demo user profiles (synthetic only)

**Policy:** Demo fixtures and screenshots must use **synthetic** personas only.
Never commit real notes, contacts, customer data, or production exports.

## How to seed locally

```bash
# Applies migrations + supabase/seed.sql (minimal synthetic workspace)
npx supabase db reset

# Documents the seed path; applies via psql when DATABASE_URL is set
pnpm seed:demo
```

To attach seed rows to your Clerk user id:

```sql
select set_config('app.seed_user_id', 'user_YOUR_CLERK_ID', false);
-- then re-run supabase/seed.sql
```

Reset demo data: `npx supabase db reset` (wipes local DB) or delete rows for
the demo `user_id`.

---

Each long-form profile below is a complete, internally-consistent workspace
design. Create the user, seed data consistently, and cascading triggers will
auto-compute `progress`, `inactive`, and `smart_priority` where applicable.

The 4 personas intentionally span SophionOS's target archetypes from the product description:

| # | Persona | Archetype | What it demonstrates |
|---|---------|-----------|----------------------|
| 1 | **Maya Chen** — Indie SaaS Founder | Builder who lives in AI tools | MCP capture, Areas→Goals→Projects→Tasks cascade, smart priority |
| 2 | **David Okonkwo** — Product Designer & Knowledge Worker | Saves everything | Browser-extension captures, Knowledge Hub, Topics, Resources pipeline |
| 3 | **Priya Sharma** — Startup CEO | Goal-oriented achiever + Organized professional | Goal command center, Contacts w/ roles, follow-up tracking |
| 4 | **Leo Martins** — Freelance Consultant | Mobile-first capturer + automation | Multi-area balance, recurring tasks, quick-capture inbox workflow |

> **Note on IDs**: Below, entities use readable slugs like `maya:area:work` instead of UUIDs. When seeding, generate real UUIDs and substitute consistently. Every relationship reference (e.g. "area: Work") maps to the named entity in the same persona's section.

> **Note on dates**: All dates are anchored to "today = 2026-06-21". Adjust `due_date` / `target_date` fields when you actually seed so the dashboard shows realistic overdue/upcoming states.

---

# Profile 1 — Maya Chen, Indie SaaS Founder

**Persona**: 29-year-old solo founder building "Inkwell", an AI writing tool. Lives in Cursor + Claude Code. Manages her own roadmap, customers, and personal growth. Uses SophionOS via the MCP server — most of her tasks arrive as "add a task…" sentences spoken to her AI.

**Why this profile sells**: Shows the **Areas → Goals → Projects → Tasks → auto-progress cascade** end-to-end. When a client completes a task, they'll watch the project bar climb and the goal percentage tick up live. Also showcases **smart priority scoring** (the "ship v2 API" task should score highest because it's high-priority + overdue + tied to a top goal).

## Areas (6)

| slug | name | type | icon | color | notes |
|------|------|------|------|-------|-------|
| `maya:area:inkwell` | Inkwell (Startup) | Business | 🚀 | #6366F1 | Primary business area |
| `maya:area:growth` | Personal Growth | Growth | 🌱 | #10B981 | Learning & skills |
| `maya:area:health` | Health & Fitness | Health | 💪 | #EF4444 | Will be **inactive** (no active items) to demo auto-inactive |
| `maya:area:finance` | Finances | Finance | 💰 | #F59E0B | Revenue + personal |
| `maya:area:career` | Career Network | Personal | 🤝 | #8B5CF6 | Mentors, advisors |
| `maya:area:personal` | Personal Life | Personal | 🏡 | #06B6D4 | Errands, life admin |

## Goals (4)

| name | area | term | priority | target_date | progress (auto) | is_completed |
|------|------|------|----------|-------------|-----------------|--------------|
| Ship Inkwell v2.0 | Inkwell | mid | urgent | 2026-07-31 | ~45% | false |
| Reach 100 paying customers | Inkwell | mid | high | 2026-09-30 | ~30% | false |
| Learn production-grade Postgres | Personal Growth | short | medium | 2026-08-15 | ~60% | false |
| Run a 5K | Health | short | low | 2026-10-01 | 0% | false (will make area stay active) |

## Projects (5)

| name | area | status | priority | due_date | progress (auto) | linked goal |
|------|------|--------|----------|----------|-----------------|-------------|
| Inkwell v2.0 API Rewrite | Inkwell | active | high | 2026-07-15 | ~50% | Ship v2.0 |
| Onboarding Funnel Redesign | Inkwell | active | medium | 2026-07-20 | ~33% | Reach 100 customers |
| Customer Interview Sprint | Inkwell | active | medium | 2026-06-30 | ~66% | Reach 100 customers |
| Postgres Deep Dive (course) | Personal Growth | active | medium | 2026-08-10 | ~50% | Learn Postgres |
| Q3 Bookkeeping Cleanup | Finances | planning | low | 2026-07-31 | 0% | — |

## Tasks (12)

> Smart priority (1-5) auto-computed from due-date proximity × user priority × goal alignment × urgency. The first task should score 5.

| name | project | status | priority | due_date | focused | important | urgent | recurring |
|------|---------|--------|----------|----------|---------|-----------|--------|-----------|
| Ship /v2/auth endpoint | v2 API Rewrite | in_progress | high | 2026-06-20 (overdue) | ✅ | ✅ | ✅ | — |
| Write migration for `documents` table | v2 API Rewrite | todo | high | 2026-06-23 | ✅ | ✅ | — | — |
| Review PR #421 from contractor | v2 API Rewrite | todo | medium | 2026-06-22 | — | — | ✅ | — |
| Deploy staging env for v2 | v2 API Rewrite | todo | medium | 2026-06-25 | — | — | — | — |
| Sketch new onboarding step 1 | Onboarding Funnel | completed | medium | 2026-06-15 | — | — | — | — |
| Build onboarding step 1 in Figma | Onboarding Funnel | in_progress | medium | 2026-06-24 | — | ✅ | — | — |
| Interview customer #8 (Acme Co) | Customer Interview Sprint | completed | high | 2026-06-18 | — | ✅ | — | — |
| Interview customer #9 (Globex) | Customer Interview Sprint | todo | high | 2026-06-26 | — | ✅ | — | — |
| Schedule customer #10 | Customer Interview Sprint | todo | medium | 2026-06-27 | — | — | — | — |
| Finish "Indexing & EXPLAIN" module | Postgres Deep Dive | in_progress | medium | 2026-06-28 | — | — | — | — |
| Weekly revenue review | — (Finance area) | todo | medium | 2026-06-21 | ✅ | — | — | ✅ weekly |
| Renew domain inkwell.ai | — (Inkwell area) | inbox | low | 2026-07-01 | — | — | — | — |

## Notes (6)

| name | type | status | area/project | notebook | favorite |
|------|------|--------|--------------|----------|----------|
| v2 API design decisions | research | active | Inkwell / v2 API Rewrite | Engineering Log | ✅ |
| Customer interview — Acme Co (Jun 18) | note | active | Inkwell / Customer Interviews | Customer Insights | — |
| Pricing experiment ideas | idea | to_review | Inkwell | Strategy | ✅ |
| Weekly journal — W25 | journal | active | Personal Life | Journals | — |
| Postgres index cheat sheet | note | active | Personal Growth / Postgres | Engineering Log | — |
| Random link dump (to sort) | note | inbox | — | — | — |

## Resources (6)

| name | type | url | status | area/project/topic | favorite |
|------|------|-----|--------|--------------------|----------|
| Supabase Row Level Security docs | website | supabase.com/docs/rls | completed | Inkwell / v2 API Rewrite / Postgres | ✅ |
| "Designing Data-Intensive Apps" — Ch.5 | article | dataintensive.net | to_review | Personal Growth / Postgres | — |
| Postgres EXPLAIN visualizer | tool | explain.depesz.com | active | Personal Growth / Postgres | — |
| How Linear builds product (video) | video | youtube.com/watch?v=linear | inbox | Inkwell | — |
| IndieHackers thread: first 100 customers | social_media | indiehackers.com/p/100 | to_review | Inkwell | — |
| Stripe Billing docs | website | stripe.com/docs/billing | inbox | Inkwell | — |

## Topics (4)

| name | icon | linked areas | rollup |
|------|------|--------------|--------|
| PostgreSQL | 🗄️ | Personal Growth | 2 notes, 3 resources |
| SaaS Pricing | 💸 | Inkwell | 1 note, 1 resource |
| Customer Development | 🗣️ | Inkwell | 2 notes, 1 resource |
| Indie Founder Journey | 🧭 | Inkwell, Career | 1 note, 1 resource |

## Contacts (5)

| name | role | organization | group | follow_up_interval | last_interaction | linked project | role_in_project |
|------|------|--------------|-------|--------------------|------------------|----------------|-----------------|
| Marcus Lee | Senior Backend Contractor | Toptal | Team Member | 7 | 2026-06-19 | v2 API Rewrite | Reviewer |
| Elena Rossi | Design Advisor | Studio Rossi | Mentor | 30 | 2026-05-10 ⚠️ overdue | Onboarding Funnel | Consultant |
| Tomás García | Founder, Acme Co | Acme Co | Client | 14 | 2026-06-18 | Customer Interviews | Interviewee |
| Priya Nair | VC Partner | Ridge Ventures | Partner | 60 | 2026-04-02 ⚠️ overdue | — | — |
| Dr. Amy Wong | Career Coach | Independent | Mentor | 30 | 2026-06-01 | — | — |

## What this profile demonstrates to a client
1. **Cascade**: Complete "Ship /v2/auth endpoint" → watch Inkwell v2.0 project bar jump and "Ship v2.0" goal % rise live.
2. **Smart priority**: The overdue + high + urgent + goal-aligned task surfaces at the top of the Smart Priority tab.
3. **Goal command center**: Open "Ship Inkwell v2.0" → every project, task, note, resource on one page.
4. **Auto-inactive**: Health area flips inactive/reactive based on whether items exist.
5. **Recurring tasks**: "Weekly revenue review" respawns every Monday.

---

# Profile 2 — David Okonkwo, Product Designer & Knowledge Worker

**Persona**: 34-year-old senior product designer at a mid-size SaaS company. Reads 20+ articles a week, has 47 browser tabs open, saves bookmarks he never revisits. Captures everything via the **browser extension** (one-click save) and **email forwarding**. His SophionOS is essentially a second brain.

**Why this profile sells**: Showcases the **Resources pipeline (Inbox → To review → Saved/Completed)**, **Topics as the connective tissue of knowledge**, the **Knowledge Hub** unified search, and **dynamic note type tabs** (Idea, Research, Inspiration, Meeting). Demonstrates that capture is frictionless — most items land in `inbox` status awaiting triage.

## Areas (5)

| slug | name | type | icon | color |
|------|------|------|------|-------|
| `david:area:craft` | Design Craft | Growth | 🎨 | #EC4899 |
| `david:area:work` | Work — Northwind | Business | 💼 | #3B82F6 |
| `david:area:reading` | Reading List | Growth | 📚 | #14B8A6 |
| `david:area:inspiration` | Inspiration Vault | Personal | ✨ | #F97316 |
| `david:area:life` | Life Admin | Personal | 🏡 | #64748B |

## Goals (3)

| name | area | term | priority | target_date |
|------|------|------|----------|-------------|
| Become a staff-level designer | Design Craft | long | high | 2026-12-31 |
| Ship Northwind design system v3 | Work | mid | high | 2026-08-30 |
| Read 24 books this year | Reading List | long | medium | 2026-12-31 |

## Projects (4)

| name | area | status | due_date | linked goal |
|------|------|--------|----------|-------------|
| Northwind Design System v3 | Work | active | 2026-08-15 | DS v3 |
| Personal Portfolio Redesign | Design Craft | planning | 2026-09-30 | Staff designer |
| 2026 Reading Tracker | Reading List | active | 2026-12-31 | 24 books |
| Design Talk: "Systems Thinking" | Design Craft | active | 2026-07-20 | Staff designer |

## Tasks (8)

| name | project | status | priority | due_date |
|------|---------|--------|----------|----------|
| Audit current Button component | DS v3 | in_progress | high | 2026-06-22 |
| Write tokens spec doc | DS v3 | todo | high | 2026-06-26 |
| Review eng PR for Tooltip | DS v3 | todo | medium | 2026-06-24 |
| Outline portfolio case study #1 | Portfolio | inbox | low | 2026-07-15 |
| Draft talk outline | Design Talk | todo | medium | 2026-07-01 |
| Finish "Designing Data-Intensive Apps" | Reading | in_progress | low | 2026-06-30 |
| Triage browser-extension inbox | — (Craft area) | todo | medium | 2026-06-21 |
| Pay apartment rent | — (Life area) | todo | high | 2026-06-28 ✅ recurring monthly |

## Notes (10) — showcases dynamic types

| name | type | status | area/project | notebook |
|------|------|--------|--------------|----------|
| Refactoring tokens — proposal | research | active | Work / DS v3 | Design System |
| Meeting notes: DS v3 kickoff (Jun 12) | meeting | active | Work / DS v3 | Meetings |
| Idea: component playground tool | idea | to_review | Craft | Ideas |
| Inspiration: Linear's motion design | inspiration | active | Inspiration | Swipe File |
| Inspiration: Vercel homepage refresh | inspiration | active | Inspiration | Swipe File |
| Reading notes: DDIA Ch.3 | note | active | Reading / DDIA | Book Notes |
| Journal: what I learned this week | journal | active | Life | Journals |
| Random capture from email (Jun 20) | note | inbox | — | — |
| Random capture from extension (Jun 20) | note | inbox | — | — |
| Pricing page teardown — Notion | research | to_review | Craft | Swipe File |

> Note types to seed in `note_types`: Note, Research, Journal, Idea, Inspiration, Meeting. The Notes view will auto-generate type tabs for each.

## Resources (12) — the pipeline is the star

| name | type | url | status | area/project/topic |
|------|------|-----|--------|--------------------|
| Refactoring UI — component spacing | article | refactoringui.com | completed | Craft / DS v3 / Design Systems |
| Storybook docs: args composition | website |storybook.dev/docs | to_review | Work / DS v3 / Design Systems |
| "The Pixel Precision Principle" (video) | video | youtube.com/watch?v=pixel | to_review | Craft / Design Principles |
| Figma Variables deep dive | video | youtube.com/watch?v=vars | inbox | Craft / Design Systems |
| A11y color contrast checker | tool | polypane.app/color-contrast | active | Craft / Accessibility |
| Maggie Appleton's digital garden | website | maggieappleton.com/garden | completed | Inspiration / Knowledge Mgmt |
| Andy Matuschak — evergreen notes | article | notes.andymatuschak.org | completed | Inspiration / Knowledge Mgmt |
| Stripe dashboard redesign case study | article | stripe.com/blog/dashboard | to_review | Inspiration |
| nngroup: design system metrics | article | nngroup.com/articles/ds-metrics | inbox | Work / DS v3 |
| Twitter thread: 10 micro-interactions | social_media | twitter.com/p/micro | inbox | Inspiration |
| Podcast: Design Better ep.142 | podcast | designbetter.fm/142 | to_review | Craft |
| "Shape Up" by 37signals | document | basalt.io/shapeup | completed | Reading / 24 books |

## Topics (6)

| name | icon | linked areas | rollup |
|------|------|--------------|--------|
| Design Systems | 🧩 | Craft, Work | 3 notes, 4 resources |
| Design Principles | 🎯 | Craft | 1 note, 1 resource |
| Accessibility | ♿ | Craft | 0 notes, 1 resource |
| Knowledge Management | 🧠 | Inspiration | 0 notes, 2 resources |
| Motion Design | 🎞️ | Inspiration | 1 note, 1 resource |
| Book Notes | 📖 | Reading | 2 notes, 1 resource |

## Contacts (4)

| name | role | organization | group | last_interaction | linked project | role_in_project |
|------|------|--------------|-------|------------------|----------------|-----------------|
| Sara Lindqvist | Design Eng Lead | Northwind | Team Member | 2026-06-18 | DS v3 | Collaborator |
| Ben Carter | Staff Designer, Stripe | Stripe | Mentor | 2026-05-15 ⚠️ | Portfolio | Reviewer |
| Hiroshi Tanaka | Frontend Engineer | Northwind | Team Member | 2026-06-20 | DS v3 | Implementer |
| Conf organiser — Config 2026 | Conf lead | Figma | Partner | 2026-03-10 | Design Talk | Organizer |

## What this profile demonstrates to a client
1. **Capture-from-anywhere**: 4 items sitting in `inbox` (notes + resources) — exactly what arrives from browser extension / email forwarding before triage.
2. **Resources pipeline**: Walk through Inbox → To review → Completed. Shows the GTD-style processing flow.
3. **Knowledge Hub**: Search "design system" → returns matching Topics + Notes + Resources in one grouped view.
4. **Dynamic note type tabs**: The custom types (Idea, Inspiration, Meeting) auto-generate tabs.
5. **Topics as connective tissue**: Open "Design Systems" topic → see all notes + resources tagged with it across multiple areas.

---

# Profile 3 — Priya Sharma, Startup CEO

**Persona**: 41-year-old CEO of a 22-person B2B fintech startup ("Ledgr"). Manages investors, board, hiring, and strategy. Her SophionOS is a **command center** — she runs the company from the Goals page and the Contacts follow-up tracker.

**Why this profile sells**: Showcases the **Goal command center** at its richest (a single goal page showing every linked project, task, note, resource, each with tabs), **Contacts with project roles** (the "People" section of a project), and **follow-up tracking** with overdue badges. This is the "organized professional + goal-oriented achiever" combo.

## Areas (6)

| slug | name | type | icon | color |
|------|------|------|------|-------|
| `priya:area:ledgr` | Ledgr (Company) | Business | 🏢 | #0EA5E9 |
| `priya:area:fundraising` | Fundraising | Business | 🤝 | #DC2626 |
| `priya:area:people` | People & Hiring | Business | 👥 | #8B5CF6 |
| `priya:area:board` | Board & Investors | Business | 📊 | #059669 |
| `priya:area:health` | Health | Health | 🧘 | #F43F5E |
| `priya:area:family` | Family | Personal | 👨‍👩‍👧 | #F59E0B |

## Goals (5)

| name | area | term | priority | target_date | progress |
|------|------|------|----------|-------------|----------|
| Close Series A ($8M) | Fundraising | short | urgent | 2026-07-31 | ~55% |
| Hit $1M ARR | Ledgr | mid | high | 2026-12-31 | ~40% |
| Hire VP Engineering & VP Sales | People | short | high | 2026-08-15 | ~25% |
| Build a repeatable sales motion | Ledgr | mid | high | 2026-09-30 | ~30% |
| Run a half-marathon | Health | long | low | 2026-11-15 | ~10% |

## Projects (6)

| name | area | status | priority | due_date | linked goal |
|------|------|--------|----------|----------|-------------|
| Series A — Term Sheet Negotiation | Fundraising | active | urgent | 2026-07-15 | Close Series A |
| Series A — Data Room Prep | Fundraising | active | high | 2026-06-30 | Close Series A |
| Q4 Enterprise Sales Pipeline | Ledgr | active | high | 2026-09-30 | $1M ARR |
| VP Engineering Search | People | active | high | 2026-08-01 | Hire VPE & VPS |
| VP Sales Search | People | active | high | 2026-08-10 | Hire VPE & VPS |
| Half-Marathon Training Plan | Health | planning | low | 2026-11-01 | Half marathon |

## Tasks (14)

| name | project | status | priority | due_date | focused |
|------|---------|--------|----------|----------|---------|
| Send revised term sheet to Ridge | Term Sheet | in_progress | urgent | 2026-06-22 | ✅ |
| Update financial model v4 | Data Room | in_progress | high | 2026-06-23 | ✅ |
| Upload customer logo sheet to data room | Data Room | todo | medium | 2026-06-24 | — |
| Call reference for VPE candidate #3 | VPE Search | todo | high | 2026-06-25 | — |
| Final-round interview: VPE candidate #3 | VPE Search | todo | urgent | 2026-06-26 | ✅ |
| Screen 5 VPS candidates | VPS Search | in_progress | high | 2026-06-30 | — |
| Demo call: Globex enterprise | Sales Pipeline | todo | high | 2026-06-23 | ✅ |
| Follow up with Acme renewal | Sales Pipeline | todo | high | 2026-06-24 | — |
| Prep board deck for July 8 | Board | todo | high | 2026-07-05 | — |
| 1:1 with CTO (weekly) | — (Ledgr area) | todo | medium | 2026-06-23 | ✅ recurring weekly |
| All-hands prep (weekly) | — (Ledgr area) | todo | medium | 2026-06-26 | recurring weekly |
| Long run: 12km | Half-Marathon | todo | low | 2026-06-22 | — |
| Pick up kids from school | — (Family area) | todo | medium | 2026-06-21 | recurring weekly |
| Anniversary dinner reservation | — (Family area) | inbox | high | 2026-07-04 | — |

## Notes (7)

| name | type | status | area/project | notebook |
|------|------|--------|--------------|----------|
| Series A strategy memo | research | active | Fundraising / Term Sheet | Fundraising |
| Board deck — July draft | note | active | Board | Board |
| Investor feedback synthesis | research | active | Fundraising | Fundraising |
| VPE candidate scorecard | meeting | active | People / VPE Search | Hiring |
| Hiring rubric — VP Sales | note | to_review | People / VPS Search | Hiring |
| Weekly leadership journal | journal | active | Ledgr | Journals |
| Competitor analysis — Brex/Ramp | research | to_review | Ledgr | Strategy |

## Resources (6)

| name | type | url | status | area/project/topic |
|------|------|-----|--------|--------------------|
| YC Series A guide | document | ycombinator.com/library/6P | completed | Fundraising / Term Sheet / Fundraising |
| a16z pitch deck template | document | a16z.com/pitch-deck | to_review | Fundraising / Fundraising |
| "The Sales Acceleration Formula" | article | levelfly.com/saf | to_review | Ledgr / Sales |
| Carta cap table guide | website | carta.com/blog/cap-table | active | Fundraising |
| LinkedIn: VP Eng candidate #3 | social_media | linkedin.com/in/cand3 | inbox | People / VPE Search |
| McKinsey: scaling org health | article | mckinsey.com/scaling | to_review | Ledgr / Leadership |

## Topics (5)

| name | icon | linked areas | rollup |
|------|------|--------------|--------|
| Fundraising | 💸 | Fundraising, Board | 3 notes, 3 resources |
| Hiring | 👔 | People | 2 notes, 1 resource |
| Sales | 📈 | Ledgr | 1 note, 1 resource |
| Leadership | 🧭 | Ledgr | 1 note, 1 resource |
| Competitors | 🔍 | Ledgr | 1 note, 0 resources |

## Contacts (8) — the richest contact book

| name | role | organization | group | follow_up_interval | last_interaction | linked project | role_in_project |
|------|------|--------------|-------|--------------------|------------------|----------------|-----------------|
| Daniel Park | Partner, Ridge Ventures | Ridge Ventures | Investor | 7 | 2026-06-19 | Term Sheet | Lead Investor |
| Sarah Whitman | Partner, Accel | Accel | Investor | 14 | 2026-06-10 | Term Sheet | Investor |
| Michael Chen | CEO, Globex | Globex | Client | 14 | 2026-06-15 | Sales Pipeline | Buyer |
| Anita Desai | CEO, Acme Co | Acme Co | Client | 30 | 2026-05-20 ⚠️ overdue | Sales Pipeline | Buyer |
| Raj Patel | VPE Candidate #3 | (Independent) | Candidate | 7 | 2026-06-20 | VPE Search | Candidate |
| Jennifer Liu | Board Member | Ledgr Board | Stakeholder | 30 | 2026-06-01 | Board | Board Member |
| Coach Rebecca | Executive Coach | Independent | Mentor | 30 | 2026-05-28 ⚠️ overdue | — | — |
| Dr. Hassan | Family doctor | City Health | Vendor | 365 | 2026-01-15 | — | — |

## What this profile demonstrates to a client
1. **Goal command center (richest)**: Open "Close Series A" goal → see 2 projects, 6 tasks, 3 notes, 3 resources, 2 investor contacts — all on one page with tabs.
2. **Contacts follow-up tracker**: Two contacts show red "FOLLOW UP" badges (overdue by their interval) — drives home the "nothing falls through cracks" promise.
3. **Project People section**: Open "Term Sheet" project → People panel shows the two investors with their roles.
4. **Multi-area goals/projects**: Fundraising goal touches both Fundraising and Board areas.
5. **Recurring leadership rituals**: Weekly 1:1 and all-hands auto-respawn.

---

# Profile 4 — Leo Martins, Freelance Consultant & Mobile-First Capturer

**Persona**: 37-year-old freelance UX consultant juggling 4 clients at once. Discovers 80% of his information on his phone — articles in Twitter, links in WhatsApp, photos of whiteboards. Uses **mobile share sheet**, **Telegram bot**, and **Quick Capture (Ctrl+K)** constantly. His Inbox is always full of unprocessed captures.

**Why this profile sells**: Showcases the **multi-area life balance** (4 client areas + personal), the **Inbox-as-triage workflow** (lots of `inbox` status items), **recurring tasks** for client retainers, and the **Quick Capture** pattern. Demonstrates that SophionOS works even when you never open the full dashboard — capture is one action.

## Areas (7)

| slug | name | type | icon | color |
|------|------|------|------|-------|
| `leo:area:client-northwind` | Client: Northwind | Business | 🏢 | #3B82F6 |
| `leo:area:client-acme` | Client: Acme Co | Business | 🏢 | #10B981 |
| `leo:area:client-globex` | Client: Globex | Business | 🏢 | #F59E0B |
| `leo:area:client-contoso` | Client: Contoso | Business | 🏢 | #8B5CF6 |
| `leo:area:business` | Leo UX Studio (Biz) | Business | 💼 | #EC4899 |
| `leo:area:health` | Health | Health | 🏃 | #EF4444 |
| `leo:area:personal` | Personal | Personal | 🏡 | #06B6D4 |

## Goals (4)

| name | area | term | priority | target_date |
|------|------|------|----------|-------------|
| Grow studio to $20K MRR | Leo UX Studio | mid | high | 2026-12-31 |
| Deliver Northwind audit on time | Client: Northwind | short | urgent | 2026-07-10 |
| Sign 1 new enterprise client | Leo UX Studio | mid | high | 2026-09-30 |
| Lose 5kg by autumn | Health | short | medium | 2026-09-15 |

## Projects (6)

| name | area | status | due_date | linked goal |
|------|------|--------|----------|-------------|
| Northwind UX Audit | Client: Northwind | active | 2026-07-10 | Northwind audit |
| Acme Onboarding Redesign | Client: Acme | active | 2026-07-25 | — |
| Globex Dashboard Revamp | Client: Globex | active | 2026-08-15 | — |
| Contoso Retainer (monthly) | Client: Contoso | active | recurring | — |
| Studio Marketing (Q3) | Leo UX Studio | planning | 2026-09-30 | $20K MRR |
| 5kg Cut — Meal & Training Plan | Health | active | 2026-09-15 | Lose 5kg |

## Tasks (12) — heavy on inbox to demo capture

| name | project | status | priority | due_date | recurring |
|------|---------|--------|----------|----------|-----------|
| Northwind: stakeholder interviews (4) | Northwind Audit | in_progress | high | 2026-06-24 | — |
| Northwind: heuristic evaluation doc | Northwind Audit | todo | high | 2026-06-28 | — |
| Northwind: deliver final report | Northwind Audit | todo | urgent | 2026-07-08 | — |
| Acme: wireframe step 2-3 | Acme Onboarding | in_progress | medium | 2026-06-25 | — |
| Acme: client review call | Acme Onboarding | todo | high | 2026-06-27 | — |
| Globex: data-viz research | Globex Dashboard | todo | medium | 2026-07-01 | — |
| Contoso: monthly retainer check-in | Contoso Retainer | todo | medium | 2026-06-30 | ✅ monthly |
| Send Acme invoice (June) | — (Studio area) | todo | high | 2026-06-30 | ✅ monthly |
| Send Globex invoice (June) | — (Studio area) | todo | high | 2026-06-30 | ✅ monthly |
| Captured from Twitter: "great nav pattern" | — (inbox) | inbox | low | — | — |
| Captured from WhatsApp: whiteboard photo | — (inbox) | inbox | low | — | — |
| Captured via Telegram: "ask Marc about pricing" | — (inbox) | inbox | medium | — | — |
| Sunday meal-prep | Health | todo | medium | 2026-06-22 | ✅ weekly |
| Gym: leg day | Health | todo | low | 2026-06-23 | ✅ weekly |

## Notes (6)

| name | type | status | area/project | notebook |
|------|------|--------|--------------|----------|
| Northwind stakeholder interview — CEO | meeting | active | Northwind / Audit | Client Notes |
| Northwind heuristic eval — findings so far | research | active | Northwind / Audit | Client Notes |
| Acme wireframe rationale | note | to_review | Acme / Onboarding | Client Notes |
| Studio pricing thoughts (captured on walk) | idea | inbox | Studio | Ideas |
| Whiteboard photo: Globex IA (from phone) | note | inbox | Globex / Dashboard | Client Notes |
| Weekly review — W25 | journal | active | Personal | Journals |

## Resources (6)

| name | type | url | status | area/project/topic |
|------|------|-----|--------|--------------------|
| NN/g: how to run a UX audit | article | nngroup.com/articles/ux-audit | completed | Northwind / UX Audit |
| "Don't Make Me Think" — Ch.7 | article | sensible.com/dmmt | to_review | Studio / UX Fundamentals |
| Dribbble: dashboard inspiration | website | dribbble.com/search/dashboard | inbox | Globex / Inspiration |
| Stripe data-viz patterns | website | stripe.com/blog/data-viz | to_review | Globex |
| Captured tweet: nav pattern | social_media | twitter.com/p/nav | inbox | Studio / Inspiration |
| Cal Newport — Deep Work | document | calnewport.com/books/deep-work | to_review | Personal / Books |

## Topics (5)

| name | icon | linked areas | rollup |
|------|------|--------------|--------|
| UX Audit | 🔍 | Northwind, Studio | 2 notes, 1 resource |
| UX Fundamentals | 📐 | Studio | 0 notes, 1 resource |
| Data Visualization | 📊 | Globex | 1 note, 2 resources |
| Inspiration | ✨ | Studio, Personal | 1 note, 2 resources |
| Client Notes | 🗂️ | Northwind, Acme, Globex | 3 notes, 0 resources |

## Contacts (7)

| name | role | organization | group | follow_up_interval | last_interaction | linked project | role_in_project |
|------|------|--------------|-------|--------------------|------------------|----------------|-----------------|
| Marc Ribot | VP Product, Northwind | Northwind | Client | 7 | 2026-06-20 | Northwind Audit | Sponsor |
| Lucy Stone | PM, Acme Co | Acme Co | Client | 7 | 2026-06-19 | Acme Onboarding | Collaborator |
| Hiro Lee | CTO, Globex | Globex | Client | 14 | 2026-06-12 | Globex Dashboard | Sponsor |
| Dana White | Ops Lead, Contoso | Contoso | Client | 30 | 2026-05-25 ⚠️ overdue | Contoso Retainer | Point of Contact |
| Sophie Martin | Freelance Designer | Independent | Collaborator | 60 | 2026-04-20 ⚠️ overdue | — | — |
| Alex Tan | Accountant | Tan & Co | Vendor | 90 | 2026-04-01 | — | — |
| Coach Miguel | Personal Trainer | FitGym | Vendor | 7 | 2026-06-19 | Health | Trainer |

## What this profile demonstrates to a client
1. **Multi-client area structure**: 4 separate client areas + studio + personal — shows how a consultant organizes a portfolio life.
2. **Capture-from-mobile**: 3 tasks sitting in `inbox` exactly as they'd arrive from Twitter / WhatsApp / Telegram share sheet.
3. **Recurring retainers & invoices**: Monthly Contoso check-in and two monthly invoice tasks auto-respawn — the "zero maintenance" promise.
4. **Inbox triage workflow**: Open Inbox → see mixed tasks/notes/resources → assign area + status → item moves to its proper place.
5. **Quick Capture (Ctrl+K)**: Demo typing "globex data viz" → results across all entities appear instantly.

---

# How to use these profiles

1. **Create the 4 users** in Clerk (the auth provider) — suggested emails:
   - `maya@inkwell.demo`, `david@northwind.demo`, `priya@ledgr.demo`, `leo@leoux.demo`
2. **Seed each user's data** following the tables above. Use a transaction per user so the cascading triggers (`recalc_project_progress`, `update_area_inactive_status`, `update_topic_inactive_status`, smart priority recalc) fire in the right order.
3. **Insert order per user**: areas → goals → projects → goal_areas/goal_projects → tasks → task_areas/task_projects/goal_tasks → note_types → notes → note_areas/note_projects/note_notebooks → topics → topic_areas → resources → resource_projects/resource_areas/goal_resources → contacts → contact_projects/contact_tasks → contact_logs.
4. **For demo flow**, log in as Maya → complete "Ship /v2/auth endpoint" → watch the cascade. Then switch to David → demo the Knowledge Hub. Then Priya → goal command center + contacts follow-up. Then Leo → mobile-capture inbox triage.

## Totals at a glance

| Persona | Areas | Goals | Projects | Tasks | Notes | Resources | Topics | Contacts |
|---------|-------|-------|----------|-------|-------|-----------|--------|----------|
| Maya (Founder) | 6 | 4 | 5 | 12 | 6 | 6 | 4 | 5 |
| David (Designer) | 5 | 3 | 4 | 8 | 10 | 12 | 6 | 4 |
| Priya (CEO) | 6 | 5 | 6 | 14 | 7 | 6 | 5 | 8 |
| Leo (Consultant) | 7 | 4 | 6 | 14 | 6 | 6 | 5 | 7 |

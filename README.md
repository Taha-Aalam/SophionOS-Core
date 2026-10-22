# SophionOS

SophionOS is a shared context layer for you and the AI tools you use. It stores your projects, tasks, goals and research in one connected model, so an AI client can read the same picture you work from. You don't have to keep it in sync by hand.

## Why SophionOS

Tasks die in tabs. Goals drift away from the work that was meant to advance them. Notes get filed and never found again. Each new AI conversation starts with the same briefing: what am I working on, what matters, what have I already learned. The tools you use don't remember each other.

PARA didn't fail you. It asked you to maintain it. Your task manager didn't fail either; it was never built to connect the pieces. The cost is quiet and constant: rebuilding the same context, over and over.

SophionOS keeps that context in one place. It sits alongside your existing tools rather than replacing them, and it gives them a shared picture of your work.

- A task manager leaves work disconnected from the goals behind it. In SophionOS, tasks link to projects, goals, notes, resources and contacts.
- A notes workspace makes you build the structure yourself. SophionOS supplies a relational model of notebooks, topics and links to work.
- A CRM sits apart from execution. SophionOS ties contacts, roles, interactions, projects, tasks and follow-ups together.
- An AI chat starts from incomplete context. SophionOS gives AI clients controlled access to your stored context.
- An automation platform moves data between tools without forming a model of it. SophionOS is a system of record reachable over the API and MCP.

## How the model fits together

Areas are durable domains of responsibility or attention, such as Work, Health, Finances or Career; you can add your own. Goals sit inside an area as outcomes, linked to the projects and tasks that advance them. Projects are time-bound bodies of work, and tasks are the execution layer that connects to both.

Progress moves up the chain. Completing a task updates its project's progress, which can affect goal completion, and the system shows whether an area still has active work. Everyday actions therefore update the strategic picture, not just their own record.

## What is included today

- Areas give work durable categories, so projects and goals have a stable home.
- Goals connect to projects, tasks and notes, so you can see whether daily work is advancing them.
- Projects update their own progress from the tasks inside them, with no manual status changes.
- Smart priority and focused daily views surface the next work.
- Notes link to projects and goals, so ideas and research stay attached to the work they belong to.
- The Knowledge Hub puts resources, notes and topics in one searchable place.
- Contacts carry roles, interactions and follow-ups, attached to the projects they affect.
- The dashboard, Inbox and My Day focus attention on current work.
- Guided onboarding and flexible settings cover setup.
- MCP tools let Claude, Cursor and other clients read and update your SophionOS data.

## License

GNU Affero General Public License v3.0 (AGPL-3.0); see `LICENSE`.  
Trademarks are covered separately in `TRADEMARKS.md`.

## Self-hosting

Yes. You operate:

- **Clerk** (identity)
- **Supabase** (Postgres + RLS; local or hosted)
- This Next.js app

You own backups, secrets, upgrades, TLS, and compliance for your deployment.
Guide: **`docs/self-hosting.md`**.

## External services required

| Service | Role |
|---------|------|
| Clerk | Sign-in / JWT identity |
| Supabase | Database, RLS |
| Optional: billing webhook secret | Only if you wire billing |

## AI / MCP data path

SophionOS does **not** silently send your notes to a model provider by default.

If you create an API key and connect an MCP/AI client:

1. The **client** (e.g. Claude Desktop) holds the key and decides what to send
   to **its** model provider.
2. SophionOS receives authenticated API calls and returns **your** data per
   authorization and rate limits.
3. You can revoke keys anytime in Settings.

Details: `docs/privacy-and-data.md`, `docs/mcp.md`, `docs/api.md`.

## Sophion Cloud vs open source

| | SophionOS Core (Open Source) | SophionOS Cloud |
| --- | --- | --- |
| Hosting | Self-hosted on your infrastructure | Managed hosting |
| Code access | Full source code and schema | Same Core code, managed for you |
| Data ownership | You own and control all data | You own the data; we host and protect it |
| Maintenance | You handle updates, backups, auth | We handle backups, recovery, updates, and support |
| AI access | API + MCP connectivity | Secure API and MCP connectivity included |
| Security | You configure auth, monitoring | Rate limiting, abuse protection, logging redaction, security monitoring |
| Access | Web app and self-hosted deployment | Cross-device access and PWA experience |
| Support | Community and contributor path | Support and incident response |
| Integrations | You manage sync and integrations | Integrations and sync reliability handled |
| Best for | Builders and privacy-first users who want control | Individuals and teams who want reliability without self-hosting |

## Quick start (local)

```bash
# Prerequisites: Node 22+, pnpm 9+, Clerk + Supabase projects
cp .env.example .env.local
# Edit .env.local with your keys (placeholders only in .env.example)

pnpm install
# Apply migrations (local Supabase example):
npx supabase start
npx supabase db reset

pnpm dev
# App runs on NEXT_PUBLIC_APP_URL (e.g. http://localhost:3000) — see docs/self-hosting.md
```

Optional demo data: `pnpm seed:demo` (synthetic only — see `supabase/seed.sql`).

### Docker evaluation

```bash
docker compose build
docker compose up
# http://localhost:3000 — set real Clerk/Supabase env first (see .env.example)
```

## Contributing

See `CONTRIBUTING.md`. Run `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test`,
and `pnpm build` before PRs.

## Security

Report vulnerabilities privately — **`SECURITY.md`**. Do not file public issues
for security findings.

## Documentation map

| Doc | Topic |
|-----|--------|
| `docs/self-hosting.md` | Local and self-host setup |
| `docs/architecture.md` | Layers, auth, RLS |
| `docs/data-model.md` | Entities and ownership |
| `docs/privacy-and-data.md` | Data processors, export, deletion |
| `docs/security-model.md` | Boundaries and threat notes |
| `docs/api.md` | REST API status |
| `docs/mcp.md` | MCP status |
| `docs/known-limitations.md` | Honest alpha limits |
| `docs/BUG-smart-priority.md` | Open defects in task smart priority (unfixed) |
| `docs/deployment.md` | Deploy and upgrades |
| `docs/testing.md` | How we test |
| `SUPPORT.md` | Where to ask for help |
| `GOVERNANCE.md` | Decision process |
| `CHANGELOG.md` | Release notes |

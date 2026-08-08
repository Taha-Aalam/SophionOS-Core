# SophionOS

SophionOS is the connected context layer for people who work with AI. Give the AI you work with a system that turns information into wisdom. It knows your projects, tasks, goals, research, and how they all fit together, without making you maintain another database.

## Why SophionOS?

### The quiet cost of disconnected work

Tasks die in tabs. Goals drift from the work that was supposed to advance them. Notes get filed and never found again. Every new AI conversation starts with the same briefing — what am I working on, what matters, what have I already learned — because the tools you use don't remember each other.

You didn't fail PARA. PARA made you maintain it. You didn't fail your task manager. It was never designed to connect the pieces. The cost is quiet: the low hum of reconstruction, the maintenance tax, the sense that you're always starting from scratch.

SophionOS exists because that cost isn't necessary. Information is everywhere. Understanding is nowhere. The system you've been looking for is the one that turns what you already know into something you can act on.

### Not another tool in the stack

SophionOS is not a task manager, a note app, a CRM, or an AI chat. It is the layer between them — the one that makes every tool you use smarter because it knows what the others know.

Task managers often leave work disconnected from long-term goals and supporting knowledge. SophionOS tasks connect to projects, goals, notes, resources, and contacts.
Notes workspaces require you to build and maintain your own architecture. SophionOS provides a structured relational model with notebooks, topics, and links to work.
CRMs sit apart from execution. SophionOS connects contacts, roles, interactions, projects, tasks, and follow-ups.
AI chats start each conversation with incomplete context. SophionOS gives AI tools controlled access to a durable structured context layer.
Automation platforms move data between tools but do not create a coherent personal model. SophionOS is a system of record accessible via API and MCP.

### Not a database. A mind.

SophionOS is built around a connected model of work. Areas represent durable domains of responsibility or attention — Work, Health, Finances, Career, or custom categories. Goals sit inside areas as strategic outcomes, linked to the projects and tasks that advance them. Projects are time-bound bodies of work, and tasks are the execution layer that connects to both.

The key behavior is relationship-aware progress. Completed tasks update project progress; that change can affect goal completion; and the system reflects whether an area still has active work. This means the system is not just a collection of independent records. It is a model of connected work where everyday actions update the strategic picture.

## What is included today

- Stop deciding where everything belongs. Areas give your work durable categories, so your projects and goals have a stable home.
- See whether your daily work is actually advancing what matters. Goals connect to projects, tasks, and notes so progress is visible.
- Track real progress without manual status updates. Projects update automatically from the tasks inside them.
- Know what to do next without staring at a list. Smart priority and focused daily views surface the right work at the right time.
- Capture ideas and research without losing them. Notes link to projects and goals, so they stay relevant instead of disappearing into an archive.
- Find anything without remembering where you saved it. The Knowledge Hub connects resources, notes, and topics in one searchable space.
- Keep relationships attached to the work they affect. Contacts carry roles, interactions, and follow-ups so nothing falls through the cracks.
- Start each day with clarity, not noise. The dashboard, Inbox, and My Day focus attention on what matters right now.
- Start with a system that already understands your work. Guided onboarding and flexible settings make setup feel like preparation, not configuration.
- Work with AI that already knows your context. MCP tools let Claude, Cursor, and other clients read and update your real SophionOS data.

## License

GNU Affero General Public License v3.0 (AGPL-3.0) — see `LICENSE`.  
Trademarks are separate — see `TRADEMARKS.md`.

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
| `docs/deployment.md` | Deploy and upgrades |
| `docs/testing.md` | How we test |
| `SUPPORT.md` | Where to ask for help |
| `GOVERNANCE.md` | Decision process |
| `CHANGELOG.md` | Release notes |

# SophionOS Open-Source Launch Guide

> **Launch objective:** Make SophionOS publicly inspectable, easy to self-host, safe to evaluate, welcoming to contributors, and clearly distinct from Sophion Cloud and SophionOS Business.

> **Recommended launch position:**  
> **SophionOS is an open-source, self-hostable connected-context system. Sophion Cloud is the managed service for people who want hosted reliability, backups, updates, support, and safe AI connectivity without operating the infrastructure.**

---

# Executive decision

Yes, SophionOS is close enough in product shape to prepare for an open-source launch, but it should **not be made public immediately without a launch-hardening pass**.

The current build has a strong foundation: Clerk identity, Supabase Row Level Security, rich relational data for areas/goals/projects/tasks/notes/resources/topics/contacts, a REST API plan, hashed `sop` API-key design, subscriptions/rate limiting, and an MCP server direction. However, the build roadmap also records important launch gaps: some services currently run client-side against Supabase, the server API tier and surrounding API-key/subscription/rate-limit infrastructure are unfinished or scheduled, and production-ready cloud operations need verification. [file:16]

The right approach is a staged launch:

```text
Private source audit
        ↓
Public self-hosting alpha
        ↓
Open-source developer beta
        ↓
Stable v1.0 community release
        ↓
Sophion Cloud managed-service launch
        ↓
SophionOS Business / Company Brain expansion
```

Do not wait for every planned feature. Do wait until a technically competent stranger can clone the repository, understand the data boundaries, run the app locally, self-host a supported version, export their data, and report a security issue safely.

---

# What should be public

## Open-source repository scope

Publish enough for people to inspect and run the core product.

Include:

- Next.js application source
- Database migrations and generated type workflow
- Core domain schema: areas, goals, projects, tasks, notes, resources, topics, contacts, and junction tables
- RLS policies and Clerk-to-Supabase JWT integration instructions
- API specification and core API handlers once stable
- MCP server source/tool definitions once stable
- API-key hashing, scope, expiry, and revocation logic once shipped
- Data export implementation and schema documentation
- Self-hosting Docker/deployment configuration
- Local development environment setup
- Tests, lint configuration, CI workflows, and release process
- Architecture, security model, privacy model, and threat model

## Do not publish

Never publish:

- `.env` files, production secrets, Clerk keys, Supabase service-role keys, OAuth secrets, billing secrets, webhook secrets, signing keys, database dumps, or user data
- Internal hostnames, private service URLs, staging credentials, Sentry/analytics tokens, production IP allowlists, internal escalation details, or support credentials
- Customer configurations, private templates, internal planning documents, private issue discussions, security findings, unpatched exploit details, or raw incident artifacts
- Proprietary Cloud operations configuration that would expose customer infrastructure or abuse controls
- Any third-party asset/font/code without a clear redistribution right

Inspect **Git history**, not only the current files. If a secret or confidential information ever entered history, revoke it first; if needed, rebuild public history from a clean export rather than simply deleting the current file.

---

# Licensing and product boundaries

## Recommended initial licensing approach

For the personal/core repository, start with **Apache-2.0** unless you have a deliberate reason to require network-service forks to publish their modifications.

Why Apache-2.0 is a good initial fit:

- Low friction for developers, integrations, and self-hosters
- Includes an explicit patent grant
- Makes the open-source privacy/portability promise credible
- Lets Sophion compete through hosted operations, integrations, UX, community, support, and Business governance rather than code secrecy

If your primary concern is preventing a company from making a closed hosted fork, evaluate **AGPLv3** before launch. It creates more friction for enterprise adopters and integrations, so do not choose it casually.

Do not publish under a license you have not read and accepted. Ask a qualified lawyer for advice if you have contributors, incorporated entities, commercial modules, or uncertainty about trademark/IP ownership.

## Cloud and Business boundary

Be direct about what is open and what customers pay for.

| Open SophionOS | Sophion Cloud | SophionOS Business / Enterprise |
|---|---|---|
| Core app and data model | Managed hosting and upgrades | Organization tenancy and governance |
| Self-hosting path | Backups, recovery, monitoring | SSO/SCIM and advanced roles |
| Core API/MCP protocol | Managed AI connection experience | Company Brain and knowledge governance |
| Export/deletion logic | Hosted integrations and support | Audit retention, policy controls, deployment options |
| RLS/security architecture | Billing, entitlement, rate-abuse operations | SLA, implementation, compliance support |

Never make basic export, data deletion, API-key revocation, or safety controls Cloud-only. Those are user rights and trust features.

## Trademark policy

Code licensing and brand permission are separate.

Before launch, publish a simple `TRADEMARKS.md`:

- State that “SophionOS,” the logo, and visual identity are your trademarks/brand assets.
- Permit accurate, nominative references such as “Compatible with SophionOS.”
- Do not permit forks to claim official status or imply endorsement.
- Require forks to use a distinct name/logo if distributed publicly or commercially.
- Describe how people can request permission for other use.

This lets people fork code while preventing customer confusion with Sophion Cloud or official releases.

---

# Launch readiness: what to add

## P0: Required before public launch

These are required for a responsible public alpha.

| Area | Add or verify | Why it matters |
|---|---|---|
| License | `LICENSE` with chosen license text | Defines reuse rights |
| Clear README | Setup, screenshots, scope, limits, self-hosting path | First-time users need a truthful entry point |
| Security policy | `SECURITY.md` with private reporting process | Do not force vulnerability reports into public issues |
| Contribution guide | `CONTRIBUTING.md` with setup, tests, PR expectations | Makes outside help actionable |
| Code of conduct | `CODE_OF_CONDUCT.md` | Defines expected community behavior |
| Support guide | `SUPPORT.md` with docs/community/bug distinction | Prevents issue tracker overload |
| Privacy/data docs | `docs/privacy-and-data.md` | Critical for a personal-context product |
| Self-hosting guide | Local, Docker, production basics, required services | An OSS app must be runnable |
| Environment template | Complete `.env.example`, no values | Reduces setup failure without leaking secrets |
| Secret scan | Scan current tree and full Git history | Prevents public credential exposure |
| Dependency audit | Lockfile review, automated dependency updates/scans | Reduces known supply-chain risk |
| CI | Lint, typecheck, unit tests, build on pull requests | Shows that contributions are validated |
| Database safety | Migrations apply from a clean database; RLS enabled/tested | The app stores sensitive personal data |
| Export | Documented and working personal data export | Makes portability real |
| Deletion | Clear local/self-hosted deletion behavior | Avoids unclear retention claims |
| Demo data | Seed/demo mode with synthetic records | Lets evaluators test safely |
| Release process | Versioning, changelog, GitHub release notes | Gives self-hosters a stable upgrade path |

GitHub’s community profile recognizes files such as README, LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, and SECURITY as recommended health files, and GitHub supports central defaults through a public `.github` repository. [web:96][web:105]

## P1: Strongly recommended before public beta

| Area | Add or verify | Why it matters |
|---|---|---|
| Docker Compose | One-command local/self-hosted stack | Lowers installation friction |
| Deployment guides | At least one supported deployment route | Turns “self-hostable” into reality |
| Architecture docs | Auth, RLS, API, MCP, data flow diagrams | Builds trust and helps contributors |
| Threat model | Main risks and security boundaries | Important given AI/API access |
| API docs | OpenAPI or clear endpoint documentation | Enables integrations safely |
| MCP docs | Supported clients, scopes, setup, revocation | Reduces insecure configuration |
| Issue templates | Bug, feature, question, security redirect | Improves issue quality |
| PR template | Checklist for tests, docs, migrations, security | Maintains quality |
| Dependabot/Renovate | Dependency maintenance automation | Keeps dependencies current |
| SBOM | Software bill of materials per release | Helpful for security-conscious users |
| Accessibility baseline | Keyboard, contrast, semantic labels | Makes project more inclusive |
| Telemetry controls | Opt-in/transparent analytics and disable path | Supports privacy claims |
| Upgrade guide | Migration backups, rollback, version compatibility | Helps self-hosters update safely |
| Backups guide | Explain PostgreSQL/Supabase backup responsibility | Prevents user data loss |
| Governance file | Maintainer decision process and roadmap | Sets contributor expectations |

The OpenSSF Project Security Baseline provides a structured set of security controls organized by maturity and category; use it as a roadmap after the initial release rather than attempting every control on day one. [web:97][web:104]

## P2: Add after community traction

- Contributor License Agreement or Developer Certificate of Origin, if needed for your legal model
- `FUNDING.yml` / sponsorship only after the project has a meaningful support path
- Translations/localization contribution process
- Plugin/integration marketplace policy
- Formal security audit and published summary
- Reproducible builds/container signing
- OpenSSF badge application
- Maintainer rotation/on-call and public governance board
- Long-term support release policy
- Formal compatibility/versioning guarantees for API/MCP clients

---

# Current build: specific gaps to close

Based on the existing SophionOS build roadmap, these are the main things to add or verify before opening the repository.

## 1. Finish or isolate the server/API boundary

The roadmap states that current entity service files run in the browser against Supabase/PostgREST and that the full server route/API tier is planned for a later phase. This is acceptable for an early personal self-hosted alpha if RLS is correctly enforced, but public API-key, subscription, rate-limit, and MCP access should not be advertised as production-ready until server-side authorization is complete. [file:16]

### Action

- [ ] Separate browser data services from server-safe repository/service functions.
- [ ] Implement route handlers for public REST endpoints.
- [ ] Authenticate via Clerk session or hashed API key only on the server.
- [ ] Enforce API-key scope, expiry, revocation, plan entitlement, and rate limits server-side.
- [ ] Keep service-role Supabase usage narrow and server-only.
- [ ] Add API endpoint tests for invalid user, expired key, wrong scope, cross-user object ID, revoked key, and rate-limit behavior.

### Launch decision

- **If API/MCP is unfinished:** launch it as “coming soon / experimental,” disabled by default or clearly unsupported.
- **If API/MCP is shipped:** make read-only the default; disable permanent deletion via MCP; publish scope/permission documentation and security tests.

## 2. Audit RLS and cross-user isolation

SophionOS correctly relies on Clerk JWT identity forwarded into Supabase and RLS policies keyed to Clerk user IDs. Because RLS is a primary security boundary, validate it rigorously before strangers use the product. [file:16]

### Action

- [ ] Create automated integration tests with User A and User B.
- [ ] Test every core entity and every junction table.
- [ ] Test direct PostgREST/API calls, guessed IDs, browser requests, search, export, and any RPC functions.
- [ ] Confirm insert/update/delete cannot spoof another user’s `user_id`.
- [ ] Confirm joined queries and relationship tables cannot leak linked records.
- [ ] Confirm storage bucket/file policies if files/attachments exist.
- [ ] Confirm Clerk JWT claims and Supabase JWT configuration work in fresh self-hosted setup.

## 3. Make self-hosting real

“Open source” without a runnable deployment path will create distrust, particularly for a privacy-oriented context system.

### Minimum supported path

- [ ] `pnpm install`
- [ ] `cp .env.example .env.local`
- [ ] Clearly documented Clerk setup
- [ ] Clearly documented Supabase local or hosted setup
- [ ] `supabase db reset` / migration workflow
- [ ] `pnpm dev`
- [ ] Seed synthetic demo data
- [ ] Run tests

### Better path

- [ ] `docker compose up` for an evaluation environment
- [ ] Dockerfile with multi-stage production build
- [ ] `docker-compose.yml` or Compose profile for app + dependencies
- [ ] Deployment guide for a named target such as Docker VPS plus managed Supabase, or a documented all-in-one local option
- [ ] Domain/TLS/reverse-proxy notes
- [ ] Persistent-volume, backup, and upgrade guidance
- [ ] Explicit note that self-hosters own their authentication, database, backup, secret, and compliance responsibilities

## 4. Add a safe demo/seed experience

Do not ask evaluators to create a sophisticated personal system from an empty workspace.

### Add

- [ ] `pnpm seed:demo` or equivalent Supabase seed script
- [ ] Synthetic persona and clearly fake projects, tasks, notes, resources, goals, contacts
- [ ] “Reset demo data” instructions for local mode
- [ ] Screenshots/GIFs using only synthetic data
- [ ] A guided first-project template

Never include real notes, personal contacts, customer information, or production-style data in demo fixtures.

## 5. Make privacy claims precise

SophionOS is likely to attract users because they care about their thinking and personal information. Your docs should be unusually clear.

### Publish `docs/privacy-and-data.md`

Explain:

- What data SophionOS stores locally/in the configured database
- What Clerk stores/processes for identity
- What Supabase stores/processes in a hosted configuration
- What data is sent to an AI client when the user enables API/MCP access
- Whether SophionOS itself calls a model provider and, if so, which data is transmitted
- That self-hosters choose and control their own processors
- How export/deletion works in Community versus Cloud
- How logs are redacted
- How to disable AI access
- Where source code ends and operator responsibility begins

Avoid claiming “your data never leaves your device” unless the documented deployment truly satisfies that claim.

## 6. Harden MCP/API before endorsing AI access

MCP and API access are powerful distribution features but also a new data-exposure surface.

### Add before calling it stable

- [ ] Named key/connection labels
- [ ] Hashed key storage and one-time secret display
- [ ] Read-only default
- [ ] Narrow scopes per entity/action
- [ ] Key expiry and rotation
- [ ] Revocation plus global disable-all control
- [ ] Server-side authorization—not only tool descriptions
- [ ] Rate limiting and abuse limits
- [ ] Privacy-safe activity/audit events
- [ ] Safe error messages that do not reveal other users or record existence
- [ ] Permanent delete disabled through MCP initially
- [ ] Documented supported clients and secure configuration examples
- [ ] Threat-model and prompt-injection tests if any AI workflow retrieves user content or performs tools

## 7. Prepare database and migration discipline

The repository has timestamp-named Supabase migrations and a schema richer than the initial four-table plan. Public contributors need reliable migration and type-generation rules. [file:16]

### Add

- [ ] Confirm a clean clone can apply every migration successfully.
- [ ] Add CI job that creates a clean local database and applies migrations.
- [ ] Document migration naming, review, rollback, and data-migration process.
- [ ] Document generated database type process and ensure CI detects stale generated types.
- [ ] Prohibit destructive migrations without explicit backup/upgrade documentation.
- [ ] Include sample migration patterns for RLS changes and junction-table changes.
- [ ] Add upgrade guides for every breaking schema release.

## 8. Clarify auth portability

The app uses Clerk—not Supabase Auth—and forwards Clerk JWTs into Supabase clients. This must be easy for self-hosters to reproduce. [file:16]

### Add

- [ ] Clerk configuration guide, including required JWT template/claims.
- [ ] Supabase JWT/RLS setup guide for Clerk identity.
- [ ] List exact environment variables with example placeholders.
- [ ] Explain local development options and known limitations.
- [ ] Document how auth works across the marketing/apex host and `app.` subdomain.
- [ ] Add a “self-hosting auth choices” roadmap if you may support alternatives later; do not claim support before it exists.

## 9. Add contributor architecture guardrails

Your internal roadmap captures important “as built” deviations: Clerk rather than Supabase Auth, browser-side services, richer schema, host-based routing, and notebook-based related-note behavior. Public contributors need this source of truth in shorter, maintainable docs. [file:16]

### Add

- [ ] `docs/architecture.md` — app layers, auth, RLS, routing, services, database
- [ ] `docs/data-model.md` — entities, important junctions, ownership model
- [ ] `docs/decisions/` — short Architecture Decision Records for major choices
- [ ] `docs/api.md` and `docs/mcp.md`
- [ ] `docs/testing.md`
- [ ] `docs/release-process.md`
- [ ] `docs/roadmap.md` — public roadmap, intentionally less detailed than internal plans
- [ ] `docs/known-limitations.md` — honest current limitations and experiments

---

# Repository structure to publish

Suggested structure:

```text
sophionos/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml
│   │   ├── feature_request.yml
│   │   └── config.yml
│   ├── workflows/
│   │   ├── ci.yml
│   │   ├── dependency-review.yml
│   │   ├── codeql.yml
│   │   └── release.yml
│   ├── pull_request_template.md
│   └── dependabot.yml
├── docs/
│   ├── architecture.md
│   ├── data-model.md
│   ├── self-hosting.md
│   ├── deployment.md
│   ├── privacy-and-data.md
│   ├── security-model.md
│   ├── api.md
│   ├── mcp.md
│   ├── testing.md
│   ├── release-process.md
│   ├── roadmap.md
│   ├── known-limitations.md
│   └── decisions/
├── supabase/
│   ├── migrations/
│   ├── seed.sql or seed scripts
│   └── config.toml
├── src/
├── tests/
├── scripts/
├── .env.example
├── .gitignore
├── CHANGELOG.md
├── CODE_OF_CONDUCT.md
├── CONTRIBUTING.md
├── GOVERNANCE.md
├── LICENSE
├── README.md
├── SECURITY.md
├── SUPPORT.md
├── TRADEMARKS.md
├── docker-compose.yml
├── Dockerfile
└── package.json
```

Use GitHub issue forms/templates and a PR template to direct support questions away from bugs and ensure contributors declare tests, documentation changes, migrations, and security implications. GitHub supports standard community health files and issue-template configuration for this purpose. [web:96][web:105]

---

# Documentation plan

## README: what it must answer

A stranger should get answers in under two minutes:

1. What is SophionOS?
2. Who is it for?
3. Is it stable, alpha, beta, or experimental?
4. What does it include today?
5. What does it not include yet?
6. Is it open source? Which license?
7. Can I self-host it?
8. What external services are needed?
9. Does it use AI? What data path exists?
10. How do I install locally?
11. How do I contribute or report a vulnerability?
12. What is Sophion Cloud, and how is it different?

### Suggested README opening

```md
# SophionOS

SophionOS is an open-source, self-hostable connected-context system for
projects, tasks, goals, notes, resources, and relationships.

It helps you connect what you are doing with what you know, so your context
can be available where you work—including compatible AI clients—under explicit,
revocable permissions.

## Status

Public Alpha. Core personal workflows are usable; APIs, MCP integrations, and
self-hosting paths may have limitations described in `docs/known-limitations.md`.

## Why SophionOS?

Most tools store information separately. SophionOS connects projects, goals,
tasks, notes, resources, and people into one context system.

## Quick start

[short, tested commands]

## Privacy and control

- Your data is stored in the database you configure when self-hosting.
- You can export your data.
- AI/API connections are explicit and revocable.
- Read `docs/privacy-and-data.md` before enabling integrations.
```

Do not write a README that claims the product is “fully private,” “enterprise secure,” or “production ready” before you can support those statements.

## CONTRIBUTING.md

Include:

- Development prerequisites and exact setup commands
- Branch/PR process
- Code standards: TypeScript strictness, Biome, tests, naming, component/service patterns
- Required checks: lint, typecheck, unit tests, build, migration checks
- Database migration rules and generated type workflow
- How to propose a large change before implementation
- How to report a bug vs request a feature vs ask for support
- Code of Conduct link
- Security reporting link
- Statement that contributors must have the right to submit their work

## SECURITY.md

Include:

- A private reporting email or GitHub private vulnerability reporting path
- What information to include: affected version, reproduction, impact, proof of concept, suggested mitigation
- Do not publicly disclose until coordinated
- Acknowledgement target and update cadence
- Supported versions/security-fix policy
- Scope: app, API, MCP, deployment docs, security configuration
- Explicit warning not to test against production users or access data without authorization

A `SECURITY.md` is specifically intended to tell users how to privately report security vulnerabilities. [web:96]

## SUPPORT.md

Set boundaries early:

- Documentation/self-hosting questions: GitHub Discussions
- Reproducible defects: GitHub Issues
- Security vulnerability: private SECURITY channel only
- Cloud account/billing: official support contact
- Feature proposals: Discussions before issue/PR for large requests

## GOVERNANCE.md

Keep it short initially:

- Founder/maintainer retains final decision-making authority in early stage
- Decisions consider product direction, security, maintainability, and community impact
- Contributors can propose ideas through Discussions
- Explain how maintainers will be added later
- Explain release cadence and how roadmap issues are labeled

## CHANGELOG.md

Use Keep a Changelog-style categories:

```text
Added
Changed
Deprecated
Removed
Fixed
Security
```

Tag releases using semantic versioning, for example `v0.1.0-alpha.1`, `v0.2.0-beta.1`, then `v1.0.0` when compatibility/upgrade expectations are mature.

---

# Security hardening checklist

## Source and repository hygiene

- [ ] Run secret scanning against working tree and full Git history.
- [ ] Revoke any historical secret immediately; assume exposed means compromised.
- [ ] Enable GitHub secret scanning, push protection, Dependabot alerts, and dependency review where available.
- [ ] Protect the default branch: require pull requests, status checks, and review where practical.
- [ ] Require 2FA for organization members.
- [ ] Use least-privilege GitHub tokens and GitHub Actions permissions.
- [ ] Pin or carefully control third-party GitHub Actions.
- [ ] Publish releases from protected tags.
- [ ] Add a `NOTICE` file if you vendor third-party code not managed through package tooling.

## Application security

- [ ] Validate all external input with Zod/server schemas.
- [ ] Keep service-role credentials server-only and out of browser bundles.
- [ ] Validate ownership/authorization server-side for API routes.
- [ ] Enable RLS on every table containing user data.
- [ ] Test RLS on all SELECT/INSERT/UPDATE/DELETE and junction-table paths.
- [ ] Use explicit column selection; never return secrets or hidden internal fields by default.
- [ ] Set secure headers and review CSP/CORS/cookie configuration.
- [ ] Add rate limits to authentication-sensitive, API-key, export, and mutation endpoints.
- [ ] Use generic authorization errors that do not leak object existence.
- [ ] Review file upload/storage policy before adding attachments.

## AI/API/MCP security

- [ ] Keys are hashed at rest and shown only at creation.
- [ ] Keys have prefix, label, scopes, expiration, revocation, last-used time, and rate limits.
- [ ] New keys default to read-only.
- [ ] Server verifies permission mode and scope per route/tool.
- [ ] Revoke all keys and disable-all AI controls work immediately.
- [ ] Permanent delete/MCP bulk destructive operations remain disabled initially.
- [ ] Audit metadata is redacted and does not retain raw key/prompt/note content by default.
- [ ] Test malicious tool arguments, ID enumeration, stale/revoked keys, and scope escalation.
- [ ] Document the data flow from AI client to SophionOS; do not imply you control client/provider behavior outside SophionOS.

## Self-hosting security

- [ ] Never include a default production secret.
- [ ] Fail startup when required production secrets are weak/missing.
- [ ] Document TLS/reverse proxy requirements.
- [ ] Document backup, upgrade, restore, and secret-rotation responsibilities.
- [ ] Document how to restrict CORS/origins and configure trusted URLs.
- [ ] Make demo mode impossible or clearly disabled in production.

GitHub’s OSPO release guidance recommends removing sensitive assets and internal/confidential references before publishing, maintaining a clear README/LICENSE/CONTRIBUTING/CODE_OF_CONDUCT/SECURITY set, and enabling CI for public releases. [web:101]

---

# CI/CD plan

## Pull-request checks

Run on every pull request:

```text
pnpm install --frozen-lockfile
pnpm lint / biome check
pnpm typecheck
pnpm test
pnpm build
supabase db reset or migration apply against clean local database
regenerate/check database types
secret scan
dependency review
```

Add API/RLS integration tests as soon as the test environment supports Clerk/Supabase identity claims.

## Release checks

Before a release tag:

- [ ] All PR checks pass
- [ ] Migration upgrade path tested from previous release
- [ ] Fresh installation tested from clean environment
- [ ] Docker image builds and starts
- [ ] Demo seed works
- [ ] Export works
- [ ] `CHANGELOG.md` updated
- [ ] Security fixes classified and documented appropriately
- [ ] Release notes include breaking changes, required migrations, configuration changes, and rollback cautions
- [ ] Package/container version is tagged consistently

## Dependable release rhythm

For early stages:

| Release type | Suggested cadence |
|---|---|
| Alpha patch | As needed for critical fixes |
| Alpha/Beta feature release | Every 2–4 weeks |
| Security fix | As quickly as practical under SECURITY policy |
| Stable minor release | Monthly or after meaningful tested capability |
| Major breaking release | Only with migration guide and ample notice |

---

# Community launch plan

## Phase A: Quiet preparation

Duration: 1–2 weeks.

- [ ] Create a private launch checklist issue/project.
- [ ] Perform secret, dependency, license, and Git-history audit.
- [ ] Prepare clean public history if needed.
- [ ] Add all P0 community health files.
- [ ] Test fresh local setup with someone who did not build the project.
- [ ] Test clean self-hosting/deployment instructions.
- [ ] Add synthetic screenshots and demo seed.
- [ ] Create 10–20 starter issues labeled `good first issue`, `help wanted`, `documentation`, `bug`, `security`, `area:*`.
- [ ] Write a short public roadmap and known limitations.
- [ ] Decide who responds to issues/discussions and the response expectation.

## Phase B: Public alpha

Duration: 4–8 weeks.

### Announcement content

- What SophionOS is
- Why it exists: connected context, user ownership, inspectable architecture
- Current status: Public Alpha
- What is already usable
- What is experimental or incomplete
- How to run locally
- How to self-host
- How to contribute
- How to report bugs/security issues
- Difference between Community and Sophion Cloud

### Channels

- GitHub repository/release
- Personal/founder posts
- Relevant developer, MCP, PKM, and AI-tool communities
- Hacker News/Reddit only when install path and docs are truly ready
- Short demo video showing setup, core workflow, AI permissions/revocation—not a polished marketing montage

### Goals

- Validate installation success
- Discover documentation gaps
- Find security/configuration issues early
- Identify the most valuable contributor/user workflows
- Build credibility through responsive, honest maintenance

## Phase C: Developer beta

Move from alpha when:

- Clean install/self-host test is repeatable
- Basic RLS isolation tests pass
- Documentation is no longer changing daily due to broken setup
- Core entities and migrations are stable enough for users to retain data
- API/MCP status is clearly documented and tested
- You can respond to issues predictably

Add:

- Versioned Docker images/releases
- Better deployment docs
- Automated migration checks
- Initial integration/plugin guidelines
- Community feedback loop through Discussions

## Phase D: v1.0 stable

Ship v1.0 only when:

- Data model/upgrade path has a reasonable stability commitment
- Export is tested and documented
- Self-hosting has at least one well-supported deployment route
- Security reporting/patching is operational
- API/MCP compatibility expectations are published
- Known major flaws are not hidden behind “beta” wording

---

# Contribution strategy

## Start narrow

At launch, invite contributions in bounded areas:

- Documentation improvements
- Test coverage
- Accessibility improvements
- UI polish and empty states
- Templates/demo data
- Developer tooling
- Supported deployment examples
- Bug fixes with reproduction

Avoid accepting large architectural rewrites, alternative auth providers, major database redesigns, or broad AI-agent features immediately. Those should begin with a Discussion/RFC.

## Issue labels

Use a predictable taxonomy:

```text
kind: bug
kind: feature
kind: documentation
kind: question
kind: security

status: needs-triage
status: accepted
status: blocked
status: duplicate
status: wontfix

area: app
area: database
area: rls
area: api
area: mcp
area: self-hosting
area: docs
area: cloud

good first issue
help wanted
breaking change
```

## Starter issues

Prepare real, well-scoped starter tasks before announcement:

- Improve `.env.example` descriptions
- Add screenshot to a setup step
- Add test coverage for a validator
- Improve accessibility label on a control
- Add a deployment troubleshooting entry
- Add a data-model diagram
- Improve error message when Supabase env is missing
- Add a demo template

Every starter issue should include context, expected result, files likely involved, test instructions, and a maintainer contact path.

---

# Self-hosting release checklist

## Local developer installation

- [ ] Works on a clean machine/user account
- [ ] Prerequisites are versioned: Node, pnpm, Docker, Supabase CLI
- [ ] `pnpm install` succeeds with lockfile
- [ ] Environment template is complete
- [ ] Clerk setup is explicit
- [ ] Supabase setup is explicit
- [ ] Database migrations apply cleanly
- [ ] Demo seed works
- [ ] App starts successfully
- [ ] Tests/build work

## Production self-hosting

- [ ] Dockerfile is maintained and tested
- [ ] Compose/deployment config exists
- [ ] Required environment variables are documented
- [ ] TLS/reverse-proxy guidance exists
- [ ] Persistent database/storage ownership is explained
- [ ] Backup/restore process is explained
- [ ] Upgrade/migration process is explained
- [ ] Rollback cautions are documented
- [ ] Logging guidance avoids accidental personal-data collection
- [ ] Production checklist warns against demo mode/default secrets

## Privacy tests

- [ ] New self-hosted instance has no telemetry enabled without disclosure
- [ ] Any telemetry can be disabled clearly
- [ ] No hard-coded external analytics/AI endpoints are hidden in client code
- [ ] CSP/CORS/origin settings are documented
- [ ] Logs do not include raw access tokens or API keys

---

# Open-source launch checklist

## Legal and branding

- [ ] Confirm you own or have rights to all code, assets, fonts, icons, images, and copy
- [ ] Pick and add `LICENSE`
- [ ] Add `NOTICE` if required by vendored dependencies/assets
- [ ] Add `TRADEMARKS.md`
- [ ] Remove internal/company/customer references
- [ ] Review third-party license obligations
- [ ] Decide contribution IP policy: DCO, CLA, or inbound=outbound statement

## Repository readiness

- [ ] Clean public Git history or create clean public repository
- [ ] Full history secret scan complete
- [ ] `.gitignore` covers secrets, local data, build outputs, and test artifacts
- [ ] `.env.example` has no secrets and documents every variable
- [ ] README reflects actual alpha/beta status
- [ ] Local setup independently verified
- [ ] Demo seed/synthetic screenshots ready
- [ ] CI is green from clean clone
- [ ] Branch protection and 2FA set

## Community readiness

- [ ] `CONTRIBUTING.md`
- [ ] `CODE_OF_CONDUCT.md`
- [ ] `SECURITY.md`
- [ ] `SUPPORT.md`
- [ ] `GOVERNANCE.md`
- [ ] Issue forms/templates
- [ ] PR template
- [ ] Starter issues labeled and genuinely approachable
- [ ] GitHub Discussions enabled
- [ ] Maintainer response process defined

## Product and security readiness

- [ ] RLS enabled and tested on all personal-data tables
- [ ] Clean migration install works
- [ ] Data export works
- [ ] Deletion behavior is documented
- [ ] API/MCP labeled accurately: stable, beta, experimental, or disabled
- [ ] API keys are never stored or logged in plaintext
- [ ] No destructive MCP actions by default
- [ ] Known limitations and security boundaries published
- [ ] Cloud-vs-self-hosting boundary is clear

## Announcement readiness

- [ ] `v0.1.0-alpha.1` or similar tagged release
- [ ] Release notes written
- [ ] Screenshots/demo video use synthetic data
- [ ] Website/docs link to GitHub and self-hosting guide
- [ ] Public roadmap and changelog are available
- [ ] Security/reporting and support routes are visible

---

# Recommended public launch sequence

## Week 1: Repository hardening

1. Freeze feature work temporarily.
2. Audit secrets, Git history, licenses, and confidential material.
3. Add license, trademark policy, README, contribution, code-of-conduct, security, support, and governance files.
4. Create `.env.example`, synthetic demo data, and clean screenshots.
5. Create CI checks and branch protections.

## Week 2: Self-hosting verification

1. Write local setup docs from scratch.
2. Ask 2–3 technical people who did not build SophionOS to follow them.
3. Fix every unclear/incomplete step.
4. Add Docker/Compose path if feasible.
5. Document Clerk + Supabase setup and RLS architecture.
6. Test migration, export, deletion, build, and demo flow from clean state.

## Week 3: Security and API/MCP decision

1. Run cross-user RLS testing.
2. Decide whether API/MCP is public beta, experimental, or disabled for initial launch.
3. If public: ship scopes, read-only default, hashed keys, revocation, activity metadata, rate limits, and docs.
4. Write `docs/security-model.md`, `docs/privacy-and-data.md`, and `docs/known-limitations.md`.
5. Establish private vulnerability reporting.

## Week 4: Alpha release and community launch

1. Tag `v0.1.0-alpha.1`.
2. Publish release notes with honest scope and limitations.
3. Open the GitHub repository.
4. Publish a concise launch post and technical walkthrough.
5. Enable Discussions and monitor Issues daily for the first two weeks.
6. Fix installation/documentation/security blockers quickly; do not chase every feature request.

---

# Final recommendation

Launch SophionOS first as a **Public Alpha for technically capable self-hosters and AI-native builders**. The launch message should be transparent:

> **SophionOS is an open-source connected-context system. The personal core is ready for early adopters; self-hosting requires Clerk and Supabase configuration; AI/MCP access is explicitly permissioned and may be experimental depending on the release. Sophion Cloud will provide the managed version for users who want the same system without running infrastructure.**

Your highest-priority additions before opening the repository are:

1. Clean licensing, trademark, and community-health files.
2. Secret/history/license audit.
3. Independently tested self-hosting and demo setup.
4. RLS and cross-user isolation tests.
5. Accurate privacy, security, architecture, and known-limitations docs.
6. A decision to either finish/harden API/MCP access or label it experimental/disable it for the first alpha.
7. Reliable migrations, export, deletion documentation, CI, and release discipline.

A carefully documented, secure, honest alpha is much better than a polished public launch that cannot be installed, does not explain its data boundaries, or exposes AI/API functionality before the server-side permission model is finished.

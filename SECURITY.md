# Security policy

## Supported versions

| Version | Supported |
|---------|-----------|
| `0.x` public alpha (main branch) | Security fixes on a best-effort basis |
| Unreleased local builds | Not supported for production use |

This project is in **public alpha**. Do not treat it as enterprise-certified or
penetration-tested without your own review.

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Prefer one of:

1. **GitHub private vulnerability reporting** (Security → Report a vulnerability)
   on this repository, if enabled.
2. Email: **security@sophionos.com** (replace with your maintainer address if
   different; update this file before public launch if needed).

### What to include

- Affected version or commit SHA
- Component (web app, REST API, MCP server, migrations, docs)
- Step-by-step reproduction
- Impact (data access, privilege escalation, denial of service, etc.)
- Proof of concept (non-destructive preferred)
- Suggested mitigation if you have one

### Process

- We aim to acknowledge reports within **7 days**.
- Please do not publicly disclose until we have coordinated a fix or timeline.
- Do **not** test against production Cloud users, other people’s data, or systems
  you do not own/operate.
- Do not attempt to access accounts, keys, or databases without authorization.

## Scope

In scope: SophionOS application code, API routes, MCP package, database
migrations/RLS, documented self-host configuration, and dependency issues that
affect this repo.

Out of scope (report to the relevant vendor): Clerk, Supabase, hosting
providers, third-party AI clients, or Sophion Cloud customer infrastructure
unless the issue is clearly in this open-source codebase.

## Safe harbor

We will not pursue legal action against researchers who:

- Act in good faith
- Avoid privacy violations and service disruption
- Report promptly and keep findings private until coordinated disclosure

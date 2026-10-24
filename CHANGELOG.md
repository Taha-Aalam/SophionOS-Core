# Changelog

All notable changes to SophionOS are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.3] - 2026-10-24

### Changed

- Raised transitive-dependency overrides to clear all ten moderate/low audit
  findings (the high-severity CI gate was already green): `fast-uri` ≥4.2.3
  (six advisories), `ip-address` ≥10.7.4 (GHSA-rxp7-6hxx-x8q5 — the one
  runtime path, via the MCP server's rate limiter), `js-yaml` ≥5.4.1,
  brace-expansion 1.x pinned to 1.1.21, and `@humanfs/node` ≥0.16.8
  (dev-only, via eslint). `pnpm audit --audit-level=low` is now clean.

## [0.2.2] - 2026-10-24

### Changed

- Project license changed from Apache-2.0 to **AGPL-3.0** (`LICENSE`,
  `README.md`, `CONTRIBUTING.md`, `TRADEMARKS.md`).
- Dependency refresh (#215, #216, #217): `@hookform/resolvers` 5.9.1 → 6.0.0;
  `react`/`react-dom` 19.3.1; `@clerk/nextjs`, `@tanstack/react-query`,
  `@tiptap/*`, `lucide-react`, `shadcn` minor/patch updates; dev deps
  (`jsdom`, `@testing-library/*`) minor/patch updates.
- Transitive-dependency overrides raised past three new high-severity
  advisories: `body-parser` ≥2.4.0 (GHSA-27r3-jxmh-p828), `undici` ≥7.30.1
  (GHSA-xjj6-f33q-929c), `zod` ≥4.6.6 (GHSA-mrhx-c7xc-m3w5).
- Gitignored `videos/` directory excluded from eslint and vitest so local
  reel-production scratch files no longer fail local lint/test runs (#212).

## [0.2.1] - 2026-10-21

### Added

- Docker image pipeline (`.github/workflows/docker-build.yml`): builds on every
  push to `master` and on `v*` tags for `linux/amd64` and `linux/arm64`, and
  publishes the public image to GHCR as
  `ghcr.io/taha-aalam/sophionos-core` with `latest`, `sha-<short-sha>`, and
  (on a version tag) the version itself, e.g. `0.2.1`.
- `.dockerignore` so the build context excludes host `node_modules`, `.next`,
  env files, and local artifacts.

### Changed

- Docker image now runs the Next.js **standalone** output (`node server.js` as
  the non-root user) instead of copying the full `node_modules` and running
  `pnpm start` — smaller runner stage, no package manager at runtime.
- `NEXT_PUBLIC_*` configuration (`NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`,
  `NEXT_PUBLIC_APP_URL`) is now passed as Docker **build ARGs** with the
  previous placeholders as defaults; `docker-compose.yml` supplies them from the
  host environment / `.env` as `build.args`. `docs/self-hosting.md` now states
  that browser-visible configuration is fixed at image build time and that
  server-only secrets (`CLERK_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) remain
  runtime environment variables.
- Trust pages: policy pages render inside the standard app shell and are kept
  out of the app navigation (#208, #209).
- Policy wording updated to the reviewed legal copy, including the billing-error
  refund language and contact routing (#210, #211).

### Fixed

- Docker Compose no longer claims that `NEXT_PUBLIC_*` values can be overridden
  at runtime. They are compiled into the client bundle, so a runtime override
  never took effect; rebuild the image with your values instead.

### Security

- Bumped the `vite` override floor to `>=8.1.6`, clearing five advisories
  (GHSA-587h-7wmj-h5pm and four moderate ones) pulled in transitively by
  vitest. `pnpm audit --audit-level=high` passes again.

## [0.1.0-alpha.1] - 2026-07-16

### Added

- Open-source launch hardening: Apache-2.0 `LICENSE`, community health files
  (`SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SUPPORT.md`,
  `GOVERNANCE.md`, `TRADEMARKS.md`), and alpha-oriented `README.md`.
- Operator and contributor docs under `docs/` (self-hosting, privacy, architecture,
  data model, security model, API/MCP status, testing, release process, roadmap,
  known limitations).
- Personal data export / deletion / AI access controls for public alpha.
- Synthetic demo seed (`supabase/seed.sql`, `pnpm seed:demo`) and demo personas.
- Dual-user isolation unit tests (`pnpm test:isolation`) and migration structural
  gate (`pnpm check:migrations`).
- Docker evaluation path (`Dockerfile`, `docker-compose.yml`).
- CI: unit tests, build, high-severity audit, gitleaks source scan, migration job.

### Security

- Removed committed Google OAuth client secret from `supabase/config.toml`
  (current tree). Operators must rotate the historical credential; history
  rewrite requires explicit owner approval.

### Changed

- REST API and MCP labeled **experimental** until full scope matrices and live
  multi-user RLS CI are complete.

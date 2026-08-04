# Changelog

All notable changes to SophionOS are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- (none yet)

### Changed

- Project license changed from Apache-2.0 to **AGPL-3.0** (`LICENSE`,
  `README.md`, `CONTRIBUTING.md`, `TRADEMARKS.md`).

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

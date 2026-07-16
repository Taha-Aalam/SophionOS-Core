# Changelog

All notable changes to SophionOS are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Open-source launch hardening: Apache-2.0 `LICENSE`, community health files
  (`SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SUPPORT.md`,
  `GOVERNANCE.md`, `TRADEMARKS.md`), and alpha-oriented `README.md`.
- Operator and contributor docs under `docs/` (self-hosting, privacy, architecture,
  data model, security model, API/MCP status, testing, release process, roadmap,
  known limitations).
- Personal data export endpoint `GET /api/v1/user/export` and pure export shaping
  helpers with unit tests.
- Synthetic demo seed (`supabase/seed.sql`, `pnpm seed:demo`) and demo personas
  under `docs/demo-users/`.
- GitHub issue/PR templates and Dependabot config; CI build step.

### Changed

- Documented REST API and MCP as **experimental** for public alpha until
  full scope matrices and multi-user RLS CI are complete.

## [0.1.0-alpha.1] - 2026-07-16

### Added

- Initial public-alpha packaging baseline for self-host evaluation.

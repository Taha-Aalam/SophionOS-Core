# Contributing to SophionOS

Thanks for helping improve SophionOS. This project is a **public alpha**:
correctness, security, and honest documentation matter more than flashy
features.

## Prerequisites

- Node.js 22+
- [pnpm](https://pnpm.io) 9+
- A [Clerk](https://clerk.com) application (development instance is fine)
- A [Supabase](https://supabase.com) project or local Supabase CLI stack
- Git

## Local setup

1. Clone the repository.
2. Copy the environment template:

   ```bash
   cp .env.example .env.local
   ```

3. Fill in Clerk and Supabase values (see `docs/self-hosting.md`).
4. Install and run:

   ```bash
   pnpm install
   pnpm dev
   ```

5. Apply database migrations (hosted Supabase SQL or local):

   ```bash
   npx supabase db reset   # local: migrations + seed
   ```

6. Optional synthetic data: `pnpm seed:demo` (see `supabase/seed.sql`).

## Development workflow

1. Create a branch from `main` (or the active development branch).
2. Make a focused change with tests when behavior changes.
3. Run checks before opening a PR:

   ```bash
   pnpm lint
   pnpm exec tsc --noEmit
   pnpm test
   pnpm build
   ```

4. Open a pull request using the PR template.

## Standards

- **TypeScript**: prefer strict typing; avoid `any` unless justified.
- **Lint**: ESLint (`pnpm lint`).
- **UI**: follow existing shadcn / Tailwind patterns in `src/components`.
- **Data access**: browser services use the Supabase anon client with Clerk JWT
  and RLS. Server routes use `authorizeApiRequest` / `requireAuth` and
  `createDataClient`. Never put `SUPABASE_SERVICE_ROLE_KEY` in client code.
- **Tests**: Vitest unit tests under `tests/unit` and colocated API tests.

## Database migrations

- Add new files under `supabase/migrations/` with timestamp prefixes.
- Prefer additive, reversible-friendly changes.
- Update RLS when adding user-owned tables.
- Document destructive or multi-step upgrades in the PR description and `CHANGELOG.md`.
- Do not commit real user data or production dumps.

## Large changes

Open a GitHub Discussion before large features or architectural refactors.

## Bugs vs features vs support

See `SUPPORT.md`. Security issues go only to the process in `SECURITY.md`.

## Code of conduct

By participating, you agree to the `CODE_OF_CONDUCT.md`.

## License of contributions

By submitting a contribution, you confirm you have the right to submit it and
agree it will be licensed under the project’s **AGPL-3.0** license
(see `LICENSE`).

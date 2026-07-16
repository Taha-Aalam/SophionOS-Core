# Release process

## Versioning

- Semantic versioning: `MAJOR.MINOR.PATCH` with alpha/beta tags while pre-1.0
  (example: `0.1.0-alpha.1`).
- `package.json` `version` should match the release tag when publishing a
  GitHub Release.

## Changelog

Update `CHANGELOG.md` under **Unreleased**, then move entries into a dated
section when tagging.

Categories: Added, Changed, Deprecated, Removed, Fixed, Security.

## Pre-release checklist

1. `pnpm install --frozen-lockfile`
2. `pnpm lint`
3. `pnpm exec tsc --noEmit`
4. `pnpm test`
5. `pnpm build`
6. Review security-sensitive diffs (auth, RLS, export, API keys, MCP)
7. Confirm docs still match experimental vs stable claims
8. No secrets in tree (`.env` ignored; scan if unsure)

## Tagging

```bash
git tag -a v0.1.0-alpha.1 -m "v0.1.0-alpha.1"
git push origin v0.1.0-alpha.1
```

Create a GitHub Release from the tag with notes from `CHANGELOG.md`.

## Database upgrades

- Prefer additive migrations.
- Call out breaking schema changes in the release notes.
- Self-hosters should backup Postgres before applying migrations.

## Rollback

Application rollback: redeploy previous image/commit.  
Schema rollback: restore from backup; reverse migrations are not always provided.

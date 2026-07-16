---
title: "test: add unit coverage for a Zod entity validator"
labels: ["kind: feature", "good first issue", "area: app", "help wanted"]
---

## Context
Validators under `src/lib/validators/` need edge-case tests (empty strings, max lengths).

## Expected result
New tests in `tests/unit/` that call the real schema export and assert pass/fail cases.

## Likely files
- `src/lib/validators/*.ts`
- `tests/unit/*`

## Test
`pnpm exec vitest run tests/unit/<your-file>.test.ts`

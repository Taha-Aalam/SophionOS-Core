---
title: "docs: improve .env.example variable descriptions"
labels: ["kind: documentation", "good first issue", "area: docs", "help wanted"]
---

## Context
`.env.example` lists required env vars with short comments. New self-hosters often miss Clerk JWT setup details.

## Expected result
Each required variable has a one-line "where to find this" note (Clerk dashboard / Supabase project settings) without embedding real secrets.

## Likely files
- `.env.example`
- `docs/self-hosting.md` (link only if needed)

## Test
- Diff review; `grep` that no real keys were added.

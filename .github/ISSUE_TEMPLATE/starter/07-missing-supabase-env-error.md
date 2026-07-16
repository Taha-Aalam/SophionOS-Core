---
title: "ux: clearer error when Supabase env is missing"
labels: ["kind: feature", "good first issue", "area: app", "help wanted"]
---

## Context
Missing `NEXT_PUBLIC_SUPABASE_URL` produces opaque client errors.

## Expected result
A developer-facing message pointing to `.env.example` / self-hosting docs without leaking secrets.

## Likely files
- `src/lib/supabase/client.ts` or `server.ts`

## Test
Unit or manual: unset env → message contains setup hint.

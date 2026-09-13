# Owner verification: Clerk JWT at the Supabase gateway

**Status: owner-side recipe — not executed by the code agent.** This is the
assessment's single open verification item (report recommendation 8):
indirect evidence says Clerk-issued session tokens are accepted at the
Supabase gateway, but confirming it requires touching the live identity
provider, which the assessment deliberately avoided.

## Recipe

### Step 1 — Fetch the Clerk JWKS

```bash
curl -s "$NEXT_PUBLIC_CLERK_JWKS_URL_OR_DOMAIN/.well-known/jwks.json" | head -40
```

Confirm the JWKS is reachable and note the `kid` values and algorithm
(RS256 expected).

### Step 2 — Confirm the Supabase gateway's JWT configuration

Supabase dashboard → **Authentication → JWT Keys / Third-party auth**:

1. If the project uses Supabase **third-party auth (Clerk integration)**:
   confirm Clerk is listed as the issuer and the JWKS URL / domain matches
   the Clerk instance the app actually uses (test vs live — the assessment
   never touched the Clerk production organization, so be deliberate here).
2. If the project instead uses a **custom JWT signing key / template**:
   confirm the signing key is the Clerk public key (matching `kid` from
   step 1) and that any claims-mapping template maps `sub` → the user id
   the RLS policies compare against (`user_id` / `clerk_user_id` columns
   carry the Clerk user id).

### Step 3 — One live test read with a real (self) session

1. Sign into the dashboard as yourself (the owner account).
2. From the browser devtools, take the Supabase gateway request the app
   makes (any data fetch through the Supabase REST gateway with the Clerk
   session attached) — or call it directly:
   `curl "$SUPABASE_URL/rest/v1/tasks?select=id&limit=1" -H "Authorization: Bearer <own-clerk-token>" -H "apikey: $ANON_KEY"`
3. Expect: `200` with one of your own rows (or an empty array if you have
   none) — NOT a 401/403 JWT error.

### Step 4 — Record the result

Fill in the table below and, if the configuration was wrong, note what was
fixed. A positive confirmation here closes the assessment's only open item.

## Result (owner fills in)

| Item | Value |
| --- | --- |
| Verification date | |
| JWKS reachable (yes/no, kids) | |
| Gateway configuration accepted Clerk tokens (yes/no) | |
| Live self-session read (status + rows) | |
| Misconfiguration found and fixed (if any) | |

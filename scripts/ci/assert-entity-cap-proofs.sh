#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Behavioral assertions for the entity-cap counter system (Proofs 1-7).
# Run against a migrated database (CI: .github/workflows/ci.yml migrations job;
# locally: scratch Postgres).
# ---------------------------------------------------------------------------
set -euo pipefail

: "${PGDATABASE:=sophionos}"
: "${PGHOST:=localhost}"
: "${PGPORT:=5432}"
: "${PGUSER:=postgres}"
export PGDATABASE PGHOST PGPORT PGUSER
: "${PGPASSWORD:?PGPASSWORD must be set for non-interactive psql}"

psqlq() { psql -X -v ON_ERROR_STOP=1 --no-psqlrc -Atq -c "$1"; }
die()   { echo "FAIL: $*" >&2; exit 1; }

echo "== entity-cap behavioral assertions (against $PGDATABASE@$PGHOST) =="

STAMP="$(date +%s)"
U1="ci-cap-p1-${STAMP}"
U2="ci-cap-p2-${STAMP}"
U3="ci-cap-p3-${STAMP}"
U4="ci-cap-p4-${STAMP}"
U5="ci-cap-p5-${STAMP}"
U7="ci-cap-p7-${STAMP}"

# Cleanup any previous runs with these prefixes
psqlq "delete from public.user_entity_counts where clerk_user_id like 'ci-cap-%'" >/dev/null || true

# -- Proof 1: Seed twice (onboarding seed re-proposal) -----------------------
psql -X -v ON_ERROR_STOP=1 --no-psqlrc -q <<SQL
INSERT INTO public.areas (user_id, id, name, type, slug, archive)
VALUES
  ('$U1', gen_random_uuid(), 'Area 1', 'personal', 'area-1', false),
  ('$U1', gen_random_uuid(), 'Area 2', 'personal', 'area-2', false),
  ('$U1', gen_random_uuid(), 'Area 3', 'personal', 'area-3', false),
  ('$U1', gen_random_uuid(), 'Area 4', 'personal', 'area-4', false),
  ('$U1', gen_random_uuid(), 'Area 5', 'personal', 'area-5', false),
  ('$U1', gen_random_uuid(), 'Area 6', 'personal', 'area-6', false),
  ('$U1', gen_random_uuid(), 'Area 7', 'personal', 'area-7', false),
  ('$U1', gen_random_uuid(), 'Area 8', 'personal', 'area-8', false)
ON CONFLICT (user_id, slug) DO NOTHING;
SQL

p1_first="$(psqlq "select entity_count from public.user_entity_counts where clerk_user_id = '$U1'")"
[ "$p1_first" = "8" ] || die "Proof 1 failed: after first seed, expected counter 8, found '$p1_first'"

# Seed 2nd time (re-proposal)
psql -X -v ON_ERROR_STOP=1 --no-psqlrc -q <<SQL
INSERT INTO public.areas (user_id, id, name, type, slug, archive)
VALUES
  ('$U1', gen_random_uuid(), 'Area 1', 'personal', 'area-1', false),
  ('$U1', gen_random_uuid(), 'Area 2', 'personal', 'area-2', false),
  ('$U1', gen_random_uuid(), 'Area 3', 'personal', 'area-3', false),
  ('$U1', gen_random_uuid(), 'Area 4', 'personal', 'area-4', false),
  ('$U1', gen_random_uuid(), 'Area 5', 'personal', 'area-5', false),
  ('$U1', gen_random_uuid(), 'Area 6', 'personal', 'area-6', false),
  ('$U1', gen_random_uuid(), 'Area 7', 'personal', 'area-7', false),
  ('$U1', gen_random_uuid(), 'Area 8', 'personal', 'area-8', false)
ON CONFLICT (user_id, slug) DO NOTHING;
SQL

p1_second="$(psqlq "select entity_count from public.user_entity_counts where clerk_user_id = '$U1'")"
[ "$p1_second" = "8" ] || die "Proof 1 failed: after second seed, expected counter 8, found '$p1_second' (phantom bumps occurred)"
echo "  PASS Proof 1: Seed twice -> counter remained 8 (no phantom bumps)"

# -- Proof 2: Upsert existing contact ----------------------------------------
CONTACT_ID="$(psqlq "select gen_random_uuid()")"
psqlq "insert into public.contacts (id, user_id, name) values ('$CONTACT_ID', '$U2', 'Test Contact')" >/dev/null
p2_first="$(psqlq "select entity_count from public.user_entity_counts where clerk_user_id = '$U2'")"
[ "$p2_first" = "1" ] || die "Proof 2 failed: initial contact create gave count '$p2_first'"

# Re-propose
psqlq "insert into public.contacts (id, user_id, name) values ('$CONTACT_ID', '$U2', 'Test Contact') on conflict (id) do nothing" >/dev/null
p2_second="$(psqlq "select entity_count from public.user_entity_counts where clerk_user_id = '$U2'")"
[ "$p2_second" = "1" ] || die "Proof 2 failed: re-proposal gave count '$p2_second', expected 1"
echo "  PASS Proof 2: Re-proposing existing contact -> counter unchanged at 1"

# -- Proof 3: Create/delete symmetry -----------------------------------------
RES_ID="$(psqlq "select gen_random_uuid()")"
psqlq "insert into public.resources (id, user_id, name, type) values ('$RES_ID', '$U3', 'Article', 'article')" >/dev/null
c1="$(psqlq "select entity_count from public.user_entity_counts where clerk_user_id = '$U3'")"
psqlq "delete from public.resources where id = '$RES_ID'" >/dev/null
d1="$(psqlq "select entity_count from public.user_entity_counts where clerk_user_id = '$U3'")"
psqlq "insert into public.resources (id, user_id, name, type) values ('$RES_ID', '$U3', 'Article', 'article')" >/dev/null
c2="$(psqlq "select entity_count from public.user_entity_counts where clerk_user_id = '$U3'")"
[ "$c1" = "1" ] && [ "$d1" = "0" ] && [ "$c2" = "1" ] || die "Proof 3 failed: symmetry mismatch: $c1 -> $d1 -> $c2"
echo "  PASS Proof 3: Create/delete symmetry holds (1 -> 0 -> 1)"

# -- Proof 4: Cap still real (100 limit enforced) ----------------------------
psql -X -v ON_ERROR_STOP=1 --no-psqlrc -q <<SQL
INSERT INTO public.tasks (id, user_id, name)
SELECT gen_random_uuid(), '$U4', 'Task ' || i
FROM generate_series(1, 100) i;
SQL
p4_100="$(psqlq "select entity_count from public.user_entity_counts where clerk_user_id = '$U4'")"
[ "$p4_100" = "100" ] || die "Proof 4 failed: expected 100, got '$p4_100'"

p4_err="$(psql -X --no-psqlrc -c "INSERT INTO public.tasks (id, user_id, name) VALUES (gen_random_uuid(), '$U4', 'Task 101')" 2>&1 || true)"
echo "$p4_err" | grep -q "ENTITY_LIMIT_REACHED" || die "Proof 4 failed: 101st task did not raise ENTITY_LIMIT_REACHED. Output: $p4_err"
echo "  PASS Proof 4: Cap is real; 101st task raised ENTITY_LIMIT_REACHED at 100 rows"

# -- Proof 5: Recount repair -------------------------------------------------
psql -X -v ON_ERROR_STOP=1 --no-psqlrc -q <<SQL
INSERT INTO public.areas (id, user_id, name, slug)
SELECT gen_random_uuid(), '$U5', 'Area ' || i, 'area-' || i
FROM generate_series(1, 8) i;
INSERT INTO public.contacts (id, user_id, name) VALUES (gen_random_uuid(), '$U5', 'C1');
INSERT INTO public.goals (id, user_id, name, slug, term) VALUES (gen_random_uuid(), '$U5', 'G1', 'g1', 'short');
INSERT INTO public.projects (id, user_id, name, slug) VALUES (gen_random_uuid(), '$U5', 'P1', 'p1');
INSERT INTO public.tasks (id, user_id, name) VALUES (gen_random_uuid(), '$U5', 'T1');
UPDATE public.user_entity_counts SET entity_count = 100 WHERE clerk_user_id = '$U5';
SQL

p5_before="$(psqlq "select entity_count from public.user_entity_counts where clerk_user_id = '$U5'")"
[ "$p5_before" = "100" ] || die "Proof 5 failed: drift setup gave '$p5_before'"

psqlq "select public.recount_entity_counts()" >/dev/null
p5_after1="$(psqlq "select entity_count from public.user_entity_counts where clerk_user_id = '$U5'")"
[ "$p5_after1" = "12" ] || die "Proof 5 failed: recount repair gave '$p5_after1', expected 12"

psqlq "select public.recount_entity_counts()" >/dev/null
p5_after2="$(psqlq "select entity_count from public.user_entity_counts where clerk_user_id = '$U5'")"
[ "$p5_after2" = "12" ] || die "Proof 5 failed: recount repair second run gave '$p5_after2', expected 12"
echo "  PASS Proof 5: Recount repair corrected drifted counter (100 -> 12) idempotently"

# -- Proof 7: Bulk-insert atomic rollback ------------------------------------
psql -X -v ON_ERROR_STOP=1 --no-psqlrc -q <<SQL
INSERT INTO public.tasks (id, user_id, name)
SELECT gen_random_uuid(), '$U7', 'Task ' || i
FROM generate_series(1, 98) i;
SQL

p7_before="$(psqlq "select entity_count from public.user_entity_counts where clerk_user_id = '$U7'")"
[ "$p7_before" = "98" ] || die "Proof 7 failed: expected 98, got '$p7_before'"

p7_err="$(psql -X --no-psqlrc -c "INSERT INTO public.tasks (id, user_id, name) SELECT gen_random_uuid(), '$U7', 'Task ' || i FROM generate_series(1, 5) i" 2>&1 || true)"
echo "$p7_err" | grep -q "ENTITY_LIMIT_REACHED" || die "Proof 7 failed: bulk insert over cap did not raise ENTITY_LIMIT_REACHED. Output: $p7_err"

p7_after_count="$(psqlq "select entity_count from public.user_entity_counts where clerk_user_id = '$U7'")"
p7_after_rows="$(psqlq "select count(*)::int from public.tasks where user_id = '$U7'")"
[ "$p7_after_count" = "98" ] && [ "$p7_after_rows" = "98" ] || die "Proof 7 failed: rollback not atomic (counter=$p7_after_count, rows=$p7_after_rows)"
echo "  PASS Proof 7: Bulk insert crossing cap aborted atomically; counter and rows untouched at 98"

echo "PASS: all entity-cap behavioral proofs held"

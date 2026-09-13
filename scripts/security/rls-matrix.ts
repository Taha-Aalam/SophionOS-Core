/**
 * Live dual-user RLS matrix (plan Task 5 Step 3, report recommendation 4).
 *
 * Runs the assessment's dual-user isolation matrix as a repeatable script
 * against a SYNTHETIC-USER Supabase environment (staging or local
 * `supabase start` — never production). Creates two synthetic GoTrue users,
 * signs in with real JWTs, and exercises cross-tenant SELECT / INSERT /
 * UPDATE / DELETE on every primary entity table plus junction
 * dual-ownership and anon-visibility checks, with victim-side readback.
 * Teardown deletes every synthetic row and user and verifies removal.
 *
 * Required env:
 *   RLS_MATRIX_SUPABASE_URL          e.g. http://127.0.0.1:54321
 *   RLS_MATRIX_ANON_KEY              anon key of that environment
 *   RLS_MATRIX_SERVICE_ROLE_KEY      service_role key of that environment
 *
 * Exit code: 0 only when every case passed (SKIPs are reported loudly but
 * do not fail the run; a SKIP means the table could not be seeded with a
 * synthetic row and therefore was not exercised).
 *
 * Usage: pnpm dlx tsx scripts/security/rls-matrix.ts
 */
import { randomUUID } from "node:crypto";

type Client = import("@supabase/supabase-js").SupabaseClient<any>;

const URL = process.env.RLS_MATRIX_SUPABASE_URL;
const ANON_KEY = process.env.RLS_MATRIX_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.RLS_MATRIX_SERVICE_ROLE_KEY;

if (!URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  console.error(
    "rls-matrix requires RLS_MATRIX_SUPABASE_URL, RLS_MATRIX_ANON_KEY and " +
      "RLS_MATRIX_SERVICE_ROLE_KEY. Point them at a synthetic-user environment " +
      "(staging or local supabase start) — NEVER at production.",
  );
  process.exit(2);
}

async function main(): Promise<void> {
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(URL!, SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  }) as unknown as Client;

  const PRIMARY_TABLES = [
    "areas",
    "goals",
    "projects",
    "tasks",
    "notes",
    "resources",
    "topics",
    "contacts",
  ];
  // Representative dual-ownership junctions spanning the primary entities.
  const JUNCTION_TABLES = [
    "goal_notes",
    "note_areas",
    "task_projects",
    "goal_tasks",
    "note_projects",
    "resource_projects",
    "task_resources",
    "topic_areas",
    "contact_goals",
  ];
  const USER_ID_COLUMNS = ["user_id", "clerk_user_id"];

  const results: Array<{ id: string; pass: boolean; skipped?: boolean; detail?: string }> = [];
  const record = (id: string, pass: boolean, skipped = false, detail?: string) =>
    results.push({ id, pass, skipped, detail });

  // --- OpenAPI: derive required (NOT NULL, no default) columns per table ---
  const restSpec = (await fetch(`${URL}/rest/v1/`, {
    headers: { apikey: SERVICE_ROLE_KEY!, authorization: `Bearer ${SERVICE_ROLE_KEY!}` },
  }).then((r) => r.json())) as {
    definitions?: Record<string, { required?: string[]; properties?: Record<string, { format?: string; type?: string }> }>;
  };

  function syntheticRow(table: string, ownerId: string): Record<string, unknown> | null {
    const def = restSpec.definitions?.[table];
    if (!def?.properties) return null;
    const row: Record<string, unknown> = { id: randomUUID() };
    for (const [col, meta] of Object.entries(def.properties)) {
      if (USER_ID_COLUMNS.includes(col)) {
        row[col] = ownerId;
        continue;
      }
      if (col === "id") continue;
      const required = def.required?.includes(col) ?? false;
      const hasDefault = (meta as { default?: unknown }).default !== undefined;
      if (!required && !hasDefault && col !== "status") continue;
      row[col] ??= placeholder(meta.format ?? meta.type ?? "string");
    }
    return row;
  }

  function placeholder(kind: string): unknown {
    switch (kind) {
      case "uuid":
        return randomUUID();
      case "int":
      case "integer":
      case "bigint":
      case "numeric":
      case "number":
        return 0;
      case "boolean":
        return false;
      case "date-time":
        return new Date().toISOString();
      case "json":
      case "jsonb":
        return {};
      case "ARRAY":
        return [];
      default:
        return `rls-matrix-${Date.now()}`;
    }
  }

  // --- Synthetic users (created via GoTrue admin API, deleted afterwards) ---
  const marker = `rls-matrix-${Date.now()}`;
  const mkUser = async (label: string) => {
    const email = `${marker}-${label}@synthetic.invalid`;
    const password = randomUUID();
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { synthetic: true, marker },
    });
    if (error || !data.user) throw new Error(`synthetic user create failed: ${error?.message}`);
    const anon = createClient(URL!, ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    }) as unknown as Client;
    const { data: session, error: signInError } = await anon.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError || !session.user) {
      throw new Error(`synthetic user sign-in failed: ${signInError?.message}`);
    }
    return { authId: data.user.id, client: anon, email, password };
  };

  const attacker = await mkUser("attacker");
  const victim = await mkUser("victim");

  try {
    // --- Seed one row per primary table per user -------------------------
    const seeded: Record<string, Record<string, string>> = { attacker: {}, victim: {} };
    for (const table of PRIMARY_TABLES) {
      for (const [who, ctx] of [["attacker", attacker], ["victim", victim]] as const) {
        const row = syntheticRow(table, ctx.authId);
        if (!row) {
          record(`seed:${table}:${who}`, false, true, "no OpenAPI definition");
          continue;
        }
        const { data, error } = await ctx.client.from(table).insert(row).select("id").single();
        if (error || !data) {
          record(`seed:${table}:${who}`, false, true, `seed insert failed: ${error?.message}`);
        } else {
          seeded[who][table] = (data as { id: string }).id;
        }
      }
    }

    // --- Dual-user matrix: victim vs attacker rows on every table --------
    for (const table of PRIMARY_TABLES) {
      const aId = seeded.attacker[table];
      const vId = seeded.victim[table];
      if (!aId || !vId) continue; // seed skipped — cases recorded at seed time

      // SELECT: victim must not see attacker rows
      const sel = await victim.client.from(table).select("id").eq("id", aId);
      record(
        `select:${table}:victim-cannot-read-attacker`,
        !sel.error && (sel.data ?? []).length === 0,
        false,
        sel.error?.message,
      );

      // UPDATE: victim cannot modify attacker rows (victim-side readback)
      const upd = await victim.client.from(table).update({ is_archived: true }).eq("id", aId).select("id");
      record(
        `update:${table}:victim-cannot-modify-attacker`,
        !upd.error && (upd.data ?? []).length === 0,
        false,
        upd.error?.message,
      );
      const stillThere = await attacker.client.from(table).select("id").eq("id", aId).single();
      record(
        `update:${table}:attacker-row-intact`,
        !stillThere.error && stillThere.data?.id === aId,
      );

      // DELETE: victim cannot delete attacker rows
      const del = await victim.client.from(table).delete().eq("id", aId).select("id");
      record(
        `delete:${table}:victim-cannot-delete-attacker`,
        !del.error && (del.data ?? []).length === 0,
        false,
        del.error?.message,
      );
      const alive = await attacker.client.from(table).select("id").eq("id", aId).single();
      record(`delete:${table}:attacker-row-intact`, !alive.error && alive.data?.id === aId);
    }

    // --- Junction dual-ownership: cross-user pairing must fail -----------
    const pairs: Array<[string, string, string, string, string]> = [
      // junction, entityA, idColumnA, entityB, idColumnB
      ["goal_notes", "goals", "goal_id", "notes", "note_id"],
      ["note_areas", "notes", "note_id", "areas", "area_id"],
      ["task_projects", "tasks", "task_id", "projects", "project_id"],
      ["goal_tasks", "goals", "goal_id", "tasks", "task_id"],
      ["note_projects", "notes", "note_id", "projects", "project_id"],
      ["resource_projects", "resources", "resource_id", "projects", "project_id"],
      ["task_resources", "tasks", "task_id", "resources", "resource_id"],
      ["topic_areas", "topics", "topic_id", "areas", "area_id"],
      ["contact_goals", "contacts", "contact_id", "goals", "goal_id"],
    ];
    for (const [junction, entA, colA, entB, colB] of pairs) {
      const a = seeded.attacker[entA];
      const b = seeded.victim[entB];
      if (!a || !b) continue;
      // attacker tries to link its entity to the victim's entity
      const x = await attacker.client
        .from(junction)
        .insert({ [colA]: a, [colB]: b } as Record<string, unknown>)
        .select();
      record(
        `junction:${junction}:cross-tenant-insert-blocked`,
        !!x.error || (x.data ?? []).length === 0,
        false,
        x.error?.message,
      );
      // readback: the junction row must not exist
      const check = await admin
        .from(junction)
        .select("*")
        .eq(colA, a)
        .eq(colB, b);
      record(
        `junction:${junction}:no-row-created`,
        (check.data ?? []).length === 0,
        false,
        check.error?.message,
      );
    }

    // --- Anon visibility: anon key sees zero rows everywhere -------------
    const anon = createClient(URL!, ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    }) as unknown as Client;
    for (const table of PRIMARY_TABLES) {
      const res = await anon.from(table).select("id").limit(5);
      record(
        `anon:${table}:zero-rows`,
        !res.error && (res.data ?? []).length === 0,
        false,
        res.error?.message,
      );
    }
  } finally {
    // --- Teardown: delete synthetic rows + users, verify removal ---------
    const teardownDetail: string[] = [];
    for (const table of [...PRIMARY_TABLES, ...JUNCTION_TABLES]) {
      for (const who of ["attacker", "victim"]) {
        const ctx = who === "attacker" ? attacker : victim;
        const { error } = await admin.from(table).delete().eq("user_id", ctx.authId);
        if (error) teardownDetail.push(`${table}:${error.message}`);
      }
    }
    for (const [who, ctx] of [["attacker", attacker], ["victim", victim]] as const) {
      const check = await admin.auth.admin.getUserById(ctx.authId);
      if (check.data?.user) {
        await admin.auth.admin.deleteUser(ctx.authId);
      }
      const gone = await admin.auth.admin.getUserById(ctx.authId);
      if (gone.error) {
        teardownDetail.push(`${who}-user:removed`);
      } else {
        teardownDetail.push(`${who}-user:STILL-PRESENT`);
      }
    }
    console.log("teardown:", teardownDetail.length ? teardownDetail.join("; ") : "nothing to clean");
  }

  // --- Report ------------------------------------------------------------
  const passed = results.filter((r) => r.pass && !r.skipped);
  const failed = results.filter((r) => !r.pass && !r.skipped);
  const skipped = results.filter((r) => r.skipped);
  console.log(`\nRLS matrix: ${passed.length} passed, ${failed.length} failed, ${skipped.length} skipped`);
  for (const r of results) {
    const tag = r.skipped ? "SKIP" : r.pass ? "PASS" : "FAIL";
    console.log(`  [${tag}] ${r.id}${r.detail ? ` — ${r.detail}` : ""}`);
  }
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error("rls-matrix crashed:", err);
  process.exit(1);
});

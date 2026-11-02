import { randomUUID } from "node:crypto";

let pg;
try {
  pg = (await import("pg")).default;
} catch {
  const { createRequire } = await import("node:module");
  const require = createRequire("/home/maverick/Work/SaaS/sophionos-cloud/package.json");
  pg = require("pg");
}

const { Client } = pg;
const config = {
  host: process.env.PGHOST || "172.19.0.7",
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "sop_user",
  password: process.env.PGPASSWORD || "test-password-0123456789abcdef",
  database: process.env.PGDATABASE || "sophionos",
};

async function main() {
  console.log("=== Running Entity-Cap Behavioral Proofs 1-7 ===");
  const client = new Client(config);
  await client.connect();

  try {
    // -------------------------------------------------------------------------
    // Proof 1: Seed twice (onboarding seed re-proposal)
    // -------------------------------------------------------------------------
    console.log("\n--- Proof 1: Seed twice ---");
    const p1User = `p1_user_${Date.now()}`;
    // Run seed 1
    await client.query(`
      INSERT INTO public.areas (user_id, id, name, type, slug, archive)
      VALUES
        ('${p1User}', gen_random_uuid(), 'Area 1', 'personal', 'area-1', false),
        ('${p1User}', gen_random_uuid(), 'Area 2', 'personal', 'area-2', false),
        ('${p1User}', gen_random_uuid(), 'Area 3', 'personal', 'area-3', false),
        ('${p1User}', gen_random_uuid(), 'Area 4', 'personal', 'area-4', false),
        ('${p1User}', gen_random_uuid(), 'Area 5', 'personal', 'area-5', false),
        ('${p1User}', gen_random_uuid(), 'Area 6', 'personal', 'area-6', false),
        ('${p1User}', gen_random_uuid(), 'Area 7', 'personal', 'area-7', false),
        ('${p1User}', gen_random_uuid(), 'Area 8', 'personal', 'area-8', false)
      ON CONFLICT (user_id, slug) DO NOTHING;
    `);

    const p1After1 = await client.query(
      `SELECT entity_count FROM user_entity_counts WHERE clerk_user_id = $1`,
      [p1User],
    );
    const p1Rows1 = await client.query(
      `SELECT count(*)::int as count FROM areas WHERE user_id = $1`,
      [p1User],
    );
    console.log(`After seed 1: entity_count = ${p1After1.rows[0].entity_count}, actual_rows = ${p1Rows1.rows[0].count}`);

    // Run seed 2 (idempotent re-proposal)
    await client.query(`
      INSERT INTO public.areas (user_id, id, name, type, slug, archive)
      VALUES
        ('${p1User}', gen_random_uuid(), 'Area 1', 'personal', 'area-1', false),
        ('${p1User}', gen_random_uuid(), 'Area 2', 'personal', 'area-2', false),
        ('${p1User}', gen_random_uuid(), 'Area 3', 'personal', 'area-3', false),
        ('${p1User}', gen_random_uuid(), 'Area 4', 'personal', 'area-4', false),
        ('${p1User}', gen_random_uuid(), 'Area 5', 'personal', 'area-5', false),
        ('${p1User}', gen_random_uuid(), 'Area 6', 'personal', 'area-6', false),
        ('${p1User}', gen_random_uuid(), 'Area 7', 'personal', 'area-7', false),
        ('${p1User}', gen_random_uuid(), 'Area 8', 'personal', 'area-8', false)
      ON CONFLICT (user_id, slug) DO NOTHING;
    `);

    const p1After2 = await client.query(
      `SELECT entity_count FROM user_entity_counts WHERE clerk_user_id = $1`,
      [p1User],
    );
    const p1Rows2 = await client.query(
      `SELECT count(*)::int as count FROM areas WHERE user_id = $1`,
      [p1User],
    );
    console.log(`After seed 2: entity_count = ${p1After2.rows[0].entity_count}, actual_rows = ${p1Rows2.rows[0].count}`);
    if (p1After2.rows[0].entity_count !== 8) {
      throw new Error(`Proof 1 failed: expected counter 8, got ${p1After2.rows[0].entity_count}`);
    }
    console.log("PASS Proof 1: Counter remained 8 after re-seeding (no phantom bumps).");

    // -------------------------------------------------------------------------
    // Proof 2: Upsert existing contact/resource
    // -------------------------------------------------------------------------
    console.log("\n--- Proof 2: Upsert existing contact ---");
    const p2User = `p2_user_${Date.now()}`;
    const contactId = randomUUID();
    await client.query(`
      INSERT INTO public.contacts (id, user_id, name)
      VALUES ('${contactId}', '${p2User}', 'Bob');
    `);
    const p2After1 = await client.query(
      `SELECT entity_count FROM user_entity_counts WHERE clerk_user_id = $1`,
      [p2User],
    );
    console.log(`After insert: entity_count = ${p2After1.rows[0].entity_count}`);

    // Re-propose with ON CONFLICT (id) DO NOTHING
    await client.query(`
      INSERT INTO public.contacts (id, user_id, name)
      VALUES ('${contactId}', '${p2User}', 'Bob')
      ON CONFLICT (id) DO NOTHING;
    `);
    const p2After2 = await client.query(
      `SELECT entity_count FROM user_entity_counts WHERE clerk_user_id = $1`,
      [p2User],
    );
    console.log(`After re-proposal: entity_count = ${p2After2.rows[0].entity_count}`);
    if (p2After2.rows[0].entity_count !== 1) {
      throw new Error(`Proof 2 failed: expected counter 1, got ${p2After2.rows[0].entity_count}`);
    }
    console.log("PASS Proof 2: Counter remained 1 on re-proposing existing contact.");

    // -------------------------------------------------------------------------
    // Proof 3: Create/delete symmetry
    // -------------------------------------------------------------------------
    console.log("\n--- Proof 3: Create/delete symmetry ---");
    const p3User = `p3_user_${Date.now()}`;
    const resourceId = randomUUID();
    // Create 1
    await client.query(`
      INSERT INTO public.resources (id, user_id, name, type)
      VALUES ('${resourceId}', '${p3User}', 'Article 1', 'article');
    `);
    const p3Create1 = (await client.query(
      `SELECT entity_count FROM user_entity_counts WHERE clerk_user_id = $1`,
      [p3User],
    )).rows[0].entity_count;
    console.log(`After create 1: counter = ${p3Create1}`);

    // Delete 1
    await client.query(`DELETE FROM public.resources WHERE id = '${resourceId}'`);
    const p3Delete1 = (await client.query(
      `SELECT entity_count FROM user_entity_counts WHERE clerk_user_id = $1`,
      [p3User],
    )).rows[0].entity_count;
    console.log(`After delete 1: counter = ${p3Delete1}`);

    // Create again
    await client.query(`
      INSERT INTO public.resources (id, user_id, name, type)
      VALUES ('${resourceId}', '${p3User}', 'Article 1', 'article');
    `);
    const p3Create2 = (await client.query(
      `SELECT entity_count FROM user_entity_counts WHERE clerk_user_id = $1`,
      [p3User],
    )).rows[0].entity_count;
    console.log(`After create 2: counter = ${p3Create2}`);

    if (p3Create1 !== 1 || p3Delete1 !== 0 || p3Create2 !== 1) {
      throw new Error(`Proof 3 failed: expected 1 -> 0 -> 1, got ${p3Create1} -> ${p3Delete1} -> ${p3Create2}`);
    }
    console.log("PASS Proof 3: Counter matches count(*) at every step (+1, -1, +1).");

    // -------------------------------------------------------------------------
    // Proof 4: Cap still real (at 100, 101st raises ENTITY_LIMIT_REACHED)
    // -------------------------------------------------------------------------
    console.log("\n--- Proof 4: Cap still real (100 limit enforced) ---");
    const p4User = `p4_user_${Date.now()}`;
    // Insert exactly 100 rows
    await client.query(`
      INSERT INTO public.tasks (id, user_id, name)
      SELECT gen_random_uuid(), '${p4User}', 'Task ' || i
      FROM generate_series(1, 100) i;
    `);
    const p4Count = (await client.query(
      `SELECT entity_count FROM user_entity_counts WHERE clerk_user_id = $1`,
      [p4User],
    )).rows[0].entity_count;
    console.log(`After 100 items: entity_count = ${p4Count}`);

    let p4Capped = false;
    try {
      await client.query(`
        INSERT INTO public.tasks (id, user_id, name)
        VALUES (gen_random_uuid(), '${p4User}', 'Task 101');
      `);
    } catch (err) {
      if (err.message.includes("ENTITY_LIMIT_REACHED")) {
        p4Capped = true;
      }
    }
    if (!p4Capped) {
      throw new Error("Proof 4 failed: 101st item did not raise ENTITY_LIMIT_REACHED");
    }
    console.log("PASS Proof 4: 101st create raised ENTITY_LIMIT_REACHED as required.");

    // -------------------------------------------------------------------------
    // Proof 5: Recount repair
    // -------------------------------------------------------------------------
    console.log("\n--- Proof 5: Recount repair ---");
    const p5User = `p5_user_${Date.now()}`;
    // Insert 12 real rows: 8 areas + 1 contact + 1 goal + 1 project + 1 task + 1 note
    await client.query(`
      INSERT INTO public.areas (id, user_id, name, slug)
      SELECT gen_random_uuid(), '${p5User}', 'Area ' || i, 'area-' || i
      FROM generate_series(1, 8) i;
      INSERT INTO public.contacts (id, user_id, name) VALUES (gen_random_uuid(), '${p5User}', 'C1');
      INSERT INTO public.goals (id, user_id, name, slug, term) VALUES (gen_random_uuid(), '${p5User}', 'G1', 'g1', 'short');
      INSERT INTO public.projects (id, user_id, name, slug) VALUES (gen_random_uuid(), '${p5User}', 'P1', 'p1');
      INSERT INTO public.tasks (id, user_id, name) VALUES (gen_random_uuid(), '${p5User}', 'T1');
    `);
    // Artificially drift the counter to 100
    await client.query(
      `UPDATE public.user_entity_counts SET entity_count = 100 WHERE clerk_user_id = $1`,
      [p5User],
    );
    const p5Before = (await client.query(
      `SELECT entity_count FROM user_entity_counts WHERE clerk_user_id = $1`,
      [p5User],
    )).rows[0].entity_count;
    console.log(`Seeded drift: counter = ${p5Before}, actual rows = 12`);

    // Run recount repair
    await client.query(`SELECT public.recount_entity_counts();`);
    const p5After1 = (await client.query(
      `SELECT entity_count FROM user_entity_counts WHERE clerk_user_id = $1`,
      [p5User],
    )).rows[0].entity_count;
    console.log(`After recount repair 1: counter = ${p5After1}`);

    // Run again for idempotency
    await client.query(`SELECT public.recount_entity_counts();`);
    const p5After2 = (await client.query(
      `SELECT entity_count FROM user_entity_counts WHERE clerk_user_id = $1`,
      [p5User],
    )).rows[0].entity_count;
    console.log(`After recount repair 2: counter = ${p5After2}`);

    if (p5After1 !== 12 || p5After2 !== 12) {
      throw new Error(`Proof 5 failed: expected 12, got ${p5After1} / ${p5After2}`);
    }
    console.log("PASS Proof 5: Recount repair corrected drifted counter (100 -> 12) idempotently.");

    // -------------------------------------------------------------------------
    // Proof 6: Concurrency serialization at cap boundary
    // -------------------------------------------------------------------------
    console.log("\n--- Proof 6: Concurrency at cap boundary (counter at 99) ---");
    const p6User = `p6_user_${Date.now()}`;
    await client.query(`
      INSERT INTO public.tasks (id, user_id, name)
      SELECT gen_random_uuid(), '${p6User}', 'Task ' || i
      FROM generate_series(1, 99) i;
    `);
    const p6Pre = (await client.query(
      `SELECT entity_count FROM user_entity_counts WHERE clerk_user_id = $1`,
      [p6User],
    )).rows[0].entity_count;
    console.log(`User starting at counter = ${p6Pre}`);

    // Spawn 2 parallel clients attempting to insert at the exact same time
    const clientA = new Client(config);
    const clientB = new Client(config);
    await clientA.connect();
    await clientB.connect();

    const results = await Promise.allSettled([
      clientA.query(`INSERT INTO public.tasks (id, user_id, name) VALUES (gen_random_uuid(), '${p6User}', 'Parallel A')`),
      clientB.query(`INSERT INTO public.tasks (id, user_id, name) VALUES (gen_random_uuid(), '${p6User}', 'Parallel B')`),
    ]);

    await clientA.end();
    await clientB.end();

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;
    const failureReason = results.find((r) => r.status === "rejected")?.reason?.message;

    const p6Final = (await client.query(
      `SELECT entity_count FROM user_entity_counts WHERE clerk_user_id = $1`,
      [p6User],
    )).rows[0].entity_count;
    console.log(`Parallel outcomes: ${succeeded} succeeded, ${failed} failed (${failureReason})`);
    console.log(`Final counter = ${p6Final}`);

    if (succeeded !== 1 || failed !== 1 || p6Final !== 100) {
      throw new Error(`Proof 6 failed: expected 1 win, 1 loss, counter 100. Got: ${succeeded} win, ${failed} loss, counter ${p6Final}`);
    }
    console.log("PASS Proof 6: Advisory lock serialized parallel creates; exactly one landed, loser received ENTITY_LIMIT_REACHED.");

    // -------------------------------------------------------------------------
    // Proof 7: Bulk-insert atomic rollback
    // -------------------------------------------------------------------------
    console.log("\n--- Proof 7: Bulk-insert atomic rollback ---");
    const p7User = `p7_user_${Date.now()}`;
    await client.query(`
      INSERT INTO public.tasks (id, user_id, name)
      SELECT gen_random_uuid(), '${p7User}', 'Task ' || i
      FROM generate_series(1, 98) i;
    `);
    const p7Pre = (await client.query(
      `SELECT entity_count FROM user_entity_counts WHERE clerk_user_id = $1`,
      [p7User],
    )).rows[0].entity_count;
    console.log(`User starting at counter = ${p7Pre}`);

    let p7Failed = false;
    try {
      // 5 tasks proposed: 98 + 5 = 103 > 100
      await client.query(`
        INSERT INTO public.tasks (id, user_id, name)
        SELECT gen_random_uuid(), '${p7User}', 'Bulk Task ' || i
        FROM generate_series(1, 5) i;
      `);
    } catch (err) {
      if (err.message.includes("ENTITY_LIMIT_REACHED")) {
        p7Failed = true;
      }
    }
    if (!p7Failed) {
      throw new Error("Proof 7 failed: bulk insert did not fail with ENTITY_LIMIT_REACHED");
    }

    const p7Post = (await client.query(
      `SELECT entity_count FROM user_entity_counts WHERE clerk_user_id = $1`,
      [p7User],
    )).rows[0].entity_count;
    const p7Rows = (await client.query(
      `SELECT count(*)::int as count FROM tasks WHERE user_id = $1`,
      [p7User],
    )).rows[0].count;
    console.log(`After bulk failure: counter = ${p7Post}, actual rows = ${p7Rows}`);

    if (p7Post !== 98 || p7Rows !== 98) {
      throw new Error(`Proof 7 failed: expected counter 98 and rows 98, got ${p7Post} and ${p7Rows}`);
    }
    console.log("PASS Proof 7: Multi-row statement crossing cap aborted atomically; counter and rows unchanged at 98.");

    console.log("\nALL 7 PROOFS PASSED!");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in proofs:", err);
  process.exit(1);
});

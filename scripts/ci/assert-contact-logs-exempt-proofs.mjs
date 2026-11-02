import { randomUUID } from "node:crypto";
import { z } from "zod";

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

// Mirror of route logBodySchema
const logBodySchema = z.object({ message: z.string().min(1).max(4096).optional() });

async function main() {
  console.log("=== Running Contact-Logs Exempt & Conversation-Length Proofs ===");
  const client = new Client(config);
  await client.connect();

  try {
    // =========================================================================
    // Proof 1: Logs are free
    // Free user AT the cap (counter = 100 real items) creates a contact log ->
    // succeeds; then a contact create -> still raises ENTITY_LIMIT_REACHED.
    // =========================================================================
    console.log("\n--- Proof 1: Logs are free at cap ---");
    const p1User = `p1_free_${Date.now()}`;
    const p1ContactId = randomUUID();

    // 1 contact + 99 tasks = 100 items
    await client.query(`
      INSERT INTO public.contacts (id, user_id, name) VALUES ('${p1ContactId}', '${p1User}', 'Initial Contact');
    `);
    await client.query(`
      INSERT INTO public.tasks (id, user_id, name)
      SELECT gen_random_uuid(), '${p1User}', 'Task ' || i FROM generate_series(1, 99) i;
    `);

    const p1CountInitial = (await client.query(
      `SELECT entity_count FROM user_entity_counts WHERE clerk_user_id = $1`,
      [p1User],
    )).rows[0].entity_count;
    console.log(`Initial items seeded: entity_count = ${p1CountInitial}`);
    if (p1CountInitial !== 100) {
      throw new Error(`Proof 1 failed: expected 100 items, got ${p1CountInitial}`);
    }

    // Creating a contact log at cap must succeed!
    const p1LogId = randomUUID();
    await client.query(`
      INSERT INTO public.contact_logs (id, user_id, contact_id, message)
      VALUES ('${p1LogId}', '${p1User}', '${p1ContactId}', 'Log created while user is at the 100-item cap');
    `);

    const p1CountAfterLog = (await client.query(
      `SELECT entity_count FROM user_entity_counts WHERE clerk_user_id = $1`,
      [p1User],
    )).rows[0].entity_count;
    console.log(`After creating contact log: entity_count = ${p1CountAfterLog}`);
    if (p1CountAfterLog !== 100) {
      throw new Error(`Proof 1 failed: contact log bumped counter to ${p1CountAfterLog}`);
    }

    // Creating another contact (101st item) must STILL raise ENTITY_LIMIT_REACHED
    let p1Blocked = false;
    try {
      await client.query(`
        INSERT INTO public.contacts (id, user_id, name)
        VALUES (gen_random_uuid(), '${p1User}', 'Blocked Contact');
      `);
    } catch (err) {
      if (err.message.includes("ENTITY_LIMIT_REACHED")) {
        p1Blocked = true;
      }
    }
    if (!p1Blocked) {
      throw new Error("Proof 1 failed: creating contact at 100 items did not raise ENTITY_LIMIT_REACHED");
    }

    // Deleting the contact log must NOT decrement the counter (logs don't count)
    await client.query(`DELETE FROM public.contact_logs WHERE id = '${p1LogId}'`);
    const p1CountAfterLogDelete = (await client.query(
      `SELECT entity_count FROM user_entity_counts WHERE clerk_user_id = $1`,
      [p1User],
    )).rows[0].entity_count;
    if (p1CountAfterLogDelete !== 100) {
      throw new Error(`Proof 1 failed: deleting contact log decremented counter to ${p1CountAfterLogDelete}`);
    }

    console.log("PASS Proof 1: Contact logs are free at cap; cap guard still protects entity tables.");

    // =========================================================================
    // Proof 2: The message-cap case (4,096 chars accepted, 4,097+ refused)
    // POST a 4,096-char log message -> accepted by schema, stored whole.
    // Rejection at 4,097 chars and 50,001 chars.
    console.log("\n--- Proof 2: Meeting-minutes & long-form logs ---");
    const p2User = `p2_minutes_${Date.now()}`;
    const p2ContactId = randomUUID();
    await client.query(`
      INSERT INTO public.contacts (id, user_id, name) VALUES ('${p2ContactId}', '${p2User}', 'Meeting Partner');
    `);

    // Case 2a: 4,096 chars (Telegram-length cap)
    const maxMsg = "x".repeat(4096);
    console.log(`Case 2a length: ${maxMsg.length} chars (4,096 chars)`);
    const val2a = logBodySchema.safeParse({ message: maxMsg });
    if (!val2a.success) {
      throw new Error(`Proof 2a schema validation failed: ${val2a.error.message}`);
    }

    const logId2a = randomUUID();
    await client.query(
      `INSERT INTO public.contact_logs (id, user_id, contact_id, message) VALUES ($1, $2, $3, $4)`,
      [logId2a, p2User, p2ContactId, maxMsg],
    );

    const fetched2a = (await client.query(
      `SELECT message FROM public.contact_logs WHERE id = $1`,
      [logId2a],
    )).rows[0].message;

    if (fetched2a !== maxMsg) {
      throw new Error(`Proof 2a failed: stored message did not match original (${fetched2a.length} vs ${maxMsg.length})`);
    }
    console.log("PASS Proof 2a: 4,096-char log message stored whole and retrieved whole.");

    // Case 2b: 4,097 chars (guardrail boundary)
    const overLimit4097 = "x".repeat(4097);
    console.log(`Case 2b length: ${overLimit4097.length} chars (4,097 chars)`);
    const val2b = logBodySchema.safeParse({ message: overLimit4097 });
    if (val2b.success) {
      throw new Error("Proof 2b failed: 4,097-character message was not rejected by guardrail");
    }
    console.log("PASS Proof 2b: 4,097-character message rejected by payload guardrail.");

    // Existing stored logs remain readable at any length (>4,096 chars in DB)
    const longMsg = "Comprehensive transcript and automated minutes summary with action items. ".repeat(271);
    const logId2b = randomUUID();
    await client.query(
      `INSERT INTO public.contact_logs (id, user_id, contact_id, message) VALUES ($1, $2, $3, $4)`,
      [logId2b, p2User, p2ContactId, longMsg],
    );
    const fetched2b = (await client.query(
      `SELECT message FROM public.contact_logs WHERE id = $1`,
      [logId2b],
    )).rows[0].message;

    if (fetched2b !== longMsg) {
      throw new Error(`Proof 2b failed: stored message did not match original (${fetched2b.length} vs ${longMsg.length})`);
    }
    console.log("PASS Proof 2b: ~20,000-char conversation brief stored whole and retrieved whole.");

    // Case 2c: 50,001 chars (payload guardrail)
    const overLimit = "x".repeat(50001);
    const val2c = logBodySchema.safeParse({ message: overLimit });
    if (val2c.success) {
      throw new Error("Proof 2c failed: 50,001-character message was not rejected by guardrail");
    }
    console.log("PASS Proof 2c: 50,001-character message rejected by payload guardrail.");

    // =========================================================================
    // Proof 3: Counter truth after the change
    // Seed a user with items across the 7 tables + several logs ->
    // recount -> counter equals the 7-table row total exactly; logs contribute 0.
    // =========================================================================
    console.log("\n--- Proof 3: Counter truth across 7 tables + logs ---");
    const p3User = `p3_truth_${Date.now()}`;
    const p3ContactId = randomUUID();

    // 2 areas, 1 goal, 2 projects, 3 tasks, 2 notes, 1 resource, 1 contact = 12 real items
    await client.query(`
      INSERT INTO public.areas (id, user_id, name, slug) VALUES
        (gen_random_uuid(), '${p3User}', 'Area 1', 'area-1'),
        (gen_random_uuid(), '${p3User}', 'Area 2', 'area-2');
      INSERT INTO public.goals (id, user_id, name, slug, term) VALUES
        (gen_random_uuid(), '${p3User}', 'Goal 1', 'goal-1', 'short');
      INSERT INTO public.projects (id, user_id, name, slug) VALUES
        (gen_random_uuid(), '${p3User}', 'Project 1', 'proj-1'),
        (gen_random_uuid(), '${p3User}', 'Project 2', 'proj-2');
      INSERT INTO public.tasks (id, user_id, name) VALUES
        (gen_random_uuid(), '${p3User}', 'Task 1'),
        (gen_random_uuid(), '${p3User}', 'Task 2'),
        (gen_random_uuid(), '${p3User}', 'Task 3');
      INSERT INTO public.notes (id, user_id, name, slug) VALUES
        (gen_random_uuid(), '${p3User}', 'Note 1', 'note-1'),
        (gen_random_uuid(), '${p3User}', 'Note 2', 'note-2');
      INSERT INTO public.resources (id, user_id, name, type) VALUES
        (gen_random_uuid(), '${p3User}', 'Resource 1', 'article');
      INSERT INTO public.contacts (id, user_id, name) VALUES
        ('${p3ContactId}', '${p3User}', 'Contact 1');
    `);

    // Plus 5 contact logs!
    await client.query(`
      INSERT INTO public.contact_logs (id, user_id, contact_id, message) VALUES
        (gen_random_uuid(), '${p3User}', '${p3ContactId}', 'Log A'),
        (gen_random_uuid(), '${p3User}', '${p3ContactId}', 'Log B'),
        (gen_random_uuid(), '${p3User}', '${p3ContactId}', 'Log C'),
        (gen_random_uuid(), '${p3User}', '${p3ContactId}', 'Log D'),
        (gen_random_uuid(), '${p3User}', '${p3ContactId}', 'Log E');
    `);

    // Artificially drift the counter to 999 to prove recount recomputes from scratch
    await client.query(`
      UPDATE public.user_entity_counts SET entity_count = 999 WHERE clerk_user_id = '${p3User}';
    `);

    // Run recount_entity_counts()
    await client.query("SELECT public.recount_entity_counts();");

    const p3FinalCount = (await client.query(
      `SELECT entity_count FROM user_entity_counts WHERE clerk_user_id = $1`,
      [p3User],
    )).rows[0].entity_count;

    const p3LogCount = (await client.query(
      `SELECT count(*)::int as count FROM contact_logs WHERE user_id = $1`,
      [p3User],
    )).rows[0].count;

    console.log(`Actual items in 7 tables: 12. Actual logs: ${p3LogCount}. Counter after recount: ${p3FinalCount}`);
    if (p3FinalCount !== 12) {
      throw new Error(`Proof 3 failed: expected counter 12, got ${p3FinalCount}`);
    }
    console.log("PASS Proof 3: Counter equals exactly the 7-table row total (12); contact logs contribute 0.");

    console.log("\nALL PROOFS PASSED SUCCESSFULLY!");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in proofs:", err);
  process.exit(1);
});

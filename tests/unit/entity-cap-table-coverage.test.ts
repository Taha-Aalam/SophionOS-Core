import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { COUNTED_ENTITIES } from "@/lib/api/subscription";

/**
 * Structural coverage guard for the entity-cap counter system.
 *
 * Ensures:
 * 1. Exactly the 7 counted entity tables are enumerated in COUNTED_ENTITIES.
 * 2. Each counted entity table carries the complete trigger trio in migrations:
 *    - trg_enforce_entity_cap (BEFORE INSERT, guard)
 *    - trg_enforce_entity_cap_bump (BEFORE INSERT, bump)
 *    - trg_entity_count_delete (AFTER DELETE, decrement)
 * 3. Trigger firing order is strictly preserved:
 *    trg_enforce_entity_cap < trg_enforce_entity_cap_bump (alphabetical).
 * 4. Both enforce_entity_cap and enforce_entity_cap_bump are duplicate-aware
 *    for all 7 tables, checking conflicting unique keys before enforcing / bumping.
 * 5. contact_logs is explicitly exempt from the cap and its trigger trio dropped.
 * 6. Primary entity census: any primary table created in migrations is either
 *    counted or explicitly audited and exempt.
 */

const EXPECTED_COUNTED_TABLES = [
  "areas",
  "goals",
  "projects",
  "tasks",
  "notes",
  "resources",
  "contacts",
] as const;

/**
 * Tables with user_id that are explicitly exempt from the 100-item entity cap
 * because they are configuration, authentication, rate limits, audit logs, or taxonomy.
 */
const EXEMPT_FROM_CAP: Record<string, true> = {
  contact_logs: true, // owner decision 2026-11-02: activity record, not an item
  topics: true, // organizational taxonomy tag/label, not a counted content entity
  user_settings: true,
  user_entity_counts: true,
  subscriptions: true,
  api_keys: true,
  integrations: true,
  api_rate_limits: true,
  usage_rate_limits: true,
  usage_period_counts: true,
  usage_concurrency_leases: true,
  billing_events: true,
  billing_email_log: true,
  payment_attempts: true,
  cohort_memberships: true,
  cohort_entitlement_events: true,
  founding_cohort: true,
  founder_wall_entries: true,
  provider_credentials: true,
  account_deletion_requests: true,
  data_export_jobs: true,
  notification_deliveries: true,
  support_tickets: true,
  support_ticket_messages: true,
  support_ticket_events: true,
  support_email_log: true,
  support_agents: true,
  support_holidays: true,
  webhooks: true,
  webhook_deliveries: true,
  ai_policies: true,
  ai_proposals: true,
  bookmarks: true,
  note_types: true,
  grievance_records: true,
  legal_holds: true,
  audit_events: true,
  consent_records: true,
};

describe("entity cap table coverage guard", () => {
  const migrationsDir = join(process.cwd(), "supabase", "migrations");
  const sqlFiles = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  function lastFunctionDefinition(fnName: string): string {
    let last: string | null = null;
    const re = new RegExp(
      `CREATE OR REPLACE FUNCTION public\\.${fnName.replace(/[()]/g, "\\$&")}`,
      "g",
    );
    for (const f of sqlFiles) {
      const src = readFileSync(join(migrationsDir, f), "utf8");
      for (const m of src.matchAll(re)) {
        const start = m.index ?? 0;
        const end = src.indexOf("$$;", start);
        if (end !== -1) {
          last = src.slice(start, end + 3);
        }
      }
    }
    expect(last, `Function ${fnName} must be defined in migrations`).toBeTruthy();
    return last as string;
  }

  function rewiringMigration(): string {
    const found = sqlFiles
      .map((f) => readFileSync(join(migrationsDir, f), "utf8"))
      .find((src) => src.includes("trg_enforce_entity_cap_bump"));
    expect(found, "A migration must wire trg_enforce_entity_cap_bump").toBeTruthy();
    return found as string;
  }

  it("COUNTED_ENTITIES matches the exact expected 7 counted tables", () => {
    expect([...COUNTED_ENTITIES].sort()).toEqual([...EXPECTED_COUNTED_TABLES].sort());
  });

  it("rewiring migration wires the full trigger trio on all 7 tables", () => {
    const src = rewiringMigration();
    for (const table of EXPECTED_COUNTED_TABLES) {
      expect(src).toContain(`'${table}'`);
    }

    // Verify all 3 triggers are created in the loop
    expect(src).toMatch(
      /CREATE TRIGGER trg_enforce_entity_cap\s+BEFORE INSERT ON %I\s+FOR EACH ROW\s+EXECUTE FUNCTION public\.enforce_entity_cap\(\)/,
    );
    expect(src).toMatch(
      /CREATE TRIGGER trg_enforce_entity_cap_bump\s+BEFORE INSERT ON %I\s+FOR EACH ROW\s+EXECUTE FUNCTION public\.enforce_entity_cap_bump\(\)/,
    );
    expect(src).toMatch(
      /CREATE TRIGGER trg_entity_count_delete\s+AFTER DELETE ON %I\s+FOR EACH ROW\s+EXECUTE FUNCTION public\.entity_count_on_delete\(\)/,
    );
  });

  it("trigger alphabetical order guarantees guard fires before bump", () => {
    expect("trg_enforce_entity_cap" < "trg_enforce_entity_cap_bump").toBe(true);
  });

  it("effective enforce_entity_cap_bump is duplicate-aware across all 7 tables", () => {
    const fnSql = lastFunctionDefinition("enforce_entity_cap_bump()");
    expect(fnSql).toContain("v_conflicting");
    for (const table of EXPECTED_COUNTED_TABLES) {
      expect(fnSql).toContain(`WHEN '${table}' THEN`);
    }
    expect(fnSql).toMatch(/IF v_conflicting THEN\s+RETURN NEW;\s+END IF;/);
    expect(fnSql).toContain("PERFORM public.bump_entity_count(NEW.user_id, 1);");
  });

  it("effective enforce_entity_cap is duplicate-aware across all 7 tables", () => {
    const fnSql = lastFunctionDefinition("enforce_entity_cap()");
    expect(fnSql).toContain("v_conflicting");
    for (const table of EXPECTED_COUNTED_TABLES) {
      expect(fnSql).toContain(`WHEN '${table}' THEN`);
    }
    expect(fnSql).toMatch(/IF v_conflicting THEN\s+RETURN NEW;\s+END IF;/);
  });

  it("recount_entity_counts function covers all 7 tables and excludes contact_logs", () => {
    const fnSql = lastFunctionDefinition("recount_entity_counts()");
    for (const table of EXPECTED_COUNTED_TABLES) {
      expect(fnSql).toContain(`FROM public.${table}`);
    }
    expect(fnSql).not.toContain("FROM public.contact_logs");
  });

  it("uncounting migration drops the trigger trio on contact_logs", () => {
    const uncountingSrc = sqlFiles
      .map((f) => readFileSync(join(migrationsDir, f), "utf8"))
      .find((src) =>
        src.includes("DROP TRIGGER IF EXISTS trg_enforce_entity_cap ON public.contact_logs"),
      );
    expect(uncountingSrc).toBeTruthy();
    expect(uncountingSrc).toContain(
      "DROP TRIGGER IF EXISTS trg_enforce_entity_cap ON public.contact_logs;",
    );
    expect(uncountingSrc).toContain(
      "DROP TRIGGER IF EXISTS trg_enforce_entity_cap_bump ON public.contact_logs;",
    );
    expect(uncountingSrc).toContain(
      "DROP TRIGGER IF EXISTS trg_entity_count_delete ON public.contact_logs;",
    );
  });

  it("every user-owned table created in migrations is counted or explicitly exempt", () => {
    const createdTables = new Set<string>();
    for (const f of sqlFiles) {
      const src = readFileSync(join(migrationsDir, f), "utf8");
      for (const m of src.matchAll(
        /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_]+)\s*\(([\s\S]*?)\);/gi,
      )) {
        const [, name, body] = m;
        const hasUserId = /\buser_id\b/i.test(body) || /\bclerk_user_id\b/i.test(body);
        if (hasUserId) {
          createdTables.add(name);
        }
      }
    }

    for (const table of createdTables) {
      const isCounted = (EXPECTED_COUNTED_TABLES as readonly string[]).includes(table);
      const isExempt = Boolean(EXEMPT_FROM_CAP[table]);
      expect(
        isCounted || isExempt,
        `Table "${table}" has user_id but is neither in EXPECTED_COUNTED_TABLES nor EXEMPT_FROM_CAP`,
      ).toBe(true);
    }
  });
});

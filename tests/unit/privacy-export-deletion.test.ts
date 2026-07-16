import { describe, it, expect } from "vitest";
import {
  buildPersonalDataExport,
  assertExportHasNoSecrets,
  stripSensitiveFields,
  PERSONAL_EXPORT_SCHEMA_VERSION,
} from "@/lib/export/personal-data-export";
import {
  planAccountDeletionTables,
  computeScheduledFor,
  DELETION_GRACE_DAYS,
  ACCOUNT_DELETION_TABLE_ORDER,
  isAccountDeletionDue,
} from "@/lib/privacy/account-deletion";

describe("personal data export", () => {
  it("builds schema v2 without secrets", () => {
    const payload = buildPersonalDataExport(
      "user_a",
      {
        areas: [{ id: "1", name: "Work", key_hash: "should_strip" }],
        goals: [],
        projects: [],
        tasks: [],
        notes: [{ id: "n1", content: "hello" }],
        resources: [],
        topics: [],
        contacts: [],
      },
      {
        api_keys_metadata: [
          {
            id: "k1",
            name: "Claude",
            key_hash: "deadbeef",
            key: "sop_ABCDEFGHJKLMNPQRSTUVWXYZabcd",
          },
        ],
        ai_access: { ai_access_enabled: true },
        settings: [{ key: "preferences", value: { theme: "dark" } }],
      },
    );

    expect(payload.schema_version).toBe(PERSONAL_EXPORT_SCHEMA_VERSION);
    expect(payload.user_id).toBe("user_a");
    expect(payload.meta.files).toContain("manifest.json");
    expect(JSON.stringify(payload)).not.toContain("key_hash");
    expect(JSON.stringify(payload)).not.toMatch(/sop_[A-Za-z0-9]{20,}/);
    expect(() => assertExportHasNoSecrets(payload)).not.toThrow();
  });

  it("stripSensitiveFields drops secret keys", () => {
    const out = stripSensitiveFields({
      a: 1,
      key_hash: "x",
      secret: "y",
      nested: { password: "z", ok: true },
    }) as Record<string, unknown>;
    expect(out).not.toHaveProperty("key_hash");
    expect(out).not.toHaveProperty("secret");
    expect((out.nested as { ok: boolean }).ok).toBe(true);
  });

  it("rejects export payloads that still contain secrets", () => {
    expect(() =>
      assertExportHasNoSecrets({ key_hash: "abc" }),
    ).toThrow(/key_hash/);
  });
});

describe("account deletion planner", () => {
  it("orders tables with children before parents and includes api_keys", () => {
    const plan = planAccountDeletionTables();
    expect(plan).toBe(ACCOUNT_DELETION_TABLE_ORDER);
    expect(plan.indexOf("tasks")).toBeLessThan(plan.indexOf("areas"));
    expect(plan).toContain("api_keys");
    expect(plan).toContain("user_settings");
    expect(plan).not.toContain("billing_events");
  });

  it("schedules deletion after grace days", () => {
    const from = new Date("2026-07-01T00:00:00.000Z");
    const scheduled = computeScheduledFor(from, DELETION_GRACE_DAYS);
    const diffDays =
      (new Date(scheduled).getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
    expect(diffDays).toBe(DELETION_GRACE_DAYS);
    expect(isAccountDeletionDue(scheduled, from)).toBe(false);
    const afterGrace = new Date(from);
    afterGrace.setUTCDate(afterGrace.getUTCDate() + DELETION_GRACE_DAYS);
    expect(isAccountDeletionDue(scheduled, afterGrace)).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import { redactAuditMetadata } from "@/lib/audit/audit-redaction";

describe("redactAuditMetadata", () => {
  it("removes banned keys and secret-shaped values", () => {
    const out = redactAuditMetadata({
      route: "/api/v1/tasks",
      authorization: "Bearer secret",
      key_hash: "abc",
      raw_key: "sop_shouldgo",
      note_body: "private",
      description: "task text",
      email: "a@b.com",
      content: "note",
      tool: "create_task",
      nested: {
        key: "sop_ABCDEFGHJKLMNPQRSTUV",
        ok: true,
      },
      safe: "hello",
    });

    expect(out).not.toHaveProperty("authorization");
    expect(out).not.toHaveProperty("key_hash");
    expect(out).not.toHaveProperty("raw_key");
    expect(out).not.toHaveProperty("note_body");
    expect(out).not.toHaveProperty("description");
    expect(out).not.toHaveProperty("email");
    expect(out).not.toHaveProperty("content");
    expect(out.route).toBe("/api/v1/tasks");
    expect(out.tool).toBe("create_task");
    expect(out.safe).toBe("hello");
    expect((out.nested as { ok: boolean }).ok).toBe(true);
    expect(JSON.stringify(out)).not.toMatch(/sop_[A-Za-z0-9]{16,}/);
  });
});

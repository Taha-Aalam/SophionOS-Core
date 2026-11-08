import { describe, expect, it } from "vitest";

import { updateResourceSchema } from "../../src/lib/validators/resource.schema";
import { updateNoteSchema } from "../../src/lib/validators/note.schema";
import { updateTaskSchema } from "../../src/lib/validators/task.schema";
import { updateContactSchema } from "../../src/lib/validators/contact.schema";
import { updateGoalSchema } from "../../src/lib/validators/goal.schema";
import { updateProjectSchema } from "../../src/lib/validators/project.schema";
import { updateTopicSchema } from "../../src/lib/validators/topic.schema";

/**
 * Validator-layer pin for the #153 ruling (generalised): an update body that
 * OMITS a link field must parse to a payload where that field is still
 * absent/undefined — never defaulted to an empty array or null. A Zod
 * `.default([])` on an update schema would fabricate an explicit clear on
 * EVERY route PATCH (the create schemas' defaults are fine: a new entity has
 * no links to lose).
 *
 * The service layer consuming these payloads is pinned in
 * tests/unit/link-preservation-family-audit.test.ts; the client payloads
 * that actually reach these routes are pinned in the
 * *-inbox-process-form.test.tsx files.
 */

const LINK_KEYS = [
  "area_ids",
  "goal_ids",
  "task_ids",
  "project_ids",
  "note_ids",
  "resource_ids",
  "area_id",
  "project_id",
] as const;

const CASES: Array<[string, { parse: (i: unknown) => unknown }]> = [
  ["updateResourceSchema", updateResourceSchema],
  ["updateNoteSchema", updateNoteSchema],
  ["updateTaskSchema", updateTaskSchema],
  ["updateContactSchema", updateContactSchema],
  ["updateGoalSchema", updateGoalSchema],
  ["updateProjectSchema", updateProjectSchema],
  ["updateTopicSchema", updateTopicSchema],
] as Array<[string, { parse: (i: unknown) => unknown }]>;

describe("update schemas keep omitted link fields absent", () => {
  it.each(CASES)("%s", (_name, schema) => {
    const parsed = schema.parse({}) as Record<string, unknown>;
    for (const key of LINK_KEYS) {
      expect(parsed[key], `${key} must not be fabricated`).toBeUndefined();
    }
  });

  it("a key present with null still parses to null (explicit clear survives)", () => {
    const parsed = updateResourceSchema.parse({ project_id: null }) as Record<string, unknown>;
    expect(parsed.project_id).toBeNull();
  });
});

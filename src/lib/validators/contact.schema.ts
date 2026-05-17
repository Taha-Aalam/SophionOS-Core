import { z } from "zod";

const nullableStringSchema = z.string().nullable().optional();

const nullableEmailSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().email("Invalid email").nullable().optional(),
);

const metadataSchema = z.record(z.string(), z.unknown()).default({});

export const createContactSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(255),
    role: nullableStringSchema,
    organization: nullableStringSchema,
    group: nullableStringSchema,
    phone: nullableStringSchema,
    email: nullableEmailSchema,
    linkedin: nullableStringSchema,
    website: nullableStringSchema,
    image_url: nullableStringSchema,
    last_interaction_at: z.string().datetime().nullable().optional(),
    follow_up_interval_days: z.number().int().min(0).max(365).nullable().optional(),
    favorite: z.boolean().optional(),
    notes: nullableStringSchema,
    metadata: metadataSchema,
    // link ID arrays — stripped before DB insert, handled by junction-table sync
    area_ids: z.array(z.string().uuid()).optional(),
    goal_ids: z.array(z.string().uuid()).optional(),
    project_ids: z.array(z.string().uuid()).optional(),
    task_ids: z.array(z.string().uuid()).optional(),
  });
// Note: no .strict() so extra fields don't cause errors

export const updateContactSchema = createContactSchema.partial().extend({
  archive: z.boolean().optional(),
});
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
    last_interaction_at: z.string().datetime().nullable().optional(),
    follow_up_interval_days: z.number().int().min(0).max(365).nullable().optional(),
    favorite: z.boolean().default(false),
    notes: nullableStringSchema,
    metadata: metadataSchema,
  })
  .strict();

export const updateContactSchema = createContactSchema.partial().extend({
  archive: z.boolean().optional(),
}).strict();
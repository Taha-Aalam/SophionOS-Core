import { z } from "zod";

const nullableUuidSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().uuid().nullable().optional(),
);

export const createTopicSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  area_ids: z.array(z.string().uuid()).default([]),
  favorite: z.boolean().default(false),
});

export const updateTopicSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    area_ids: z.array(z.string().uuid()).optional(),
    favorite: z.boolean().optional(),
  })
  .partial();

export type CreateTopicInput = z.infer<typeof createTopicSchema>;
export type UpdateTopicInput = z.infer<typeof updateTopicSchema>;
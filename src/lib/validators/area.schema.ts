import { z } from "zod/v4";

export const createAreaSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    description: z.string().trim().max(500).optional().nullable(),
    icon: z.string().max(100).optional().nullable(),
    color: z
      .string()
      .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color")
      .optional()
      .nullable(),
    type: z.string().trim().min(1).max(50).default("Personal"),
    slug: z.string().min(1).max(120).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const updateAreaSchema = createAreaSchema
  .partial()
  .extend({
    archive: z.boolean().optional(),
    inactive: z.boolean().optional(),
  })
  .strict();

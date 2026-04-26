import { z } from "zod";

import { PRIORITY, TASK_STATUS } from "../utils/constants";

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid ISO date");
const nullableUuidSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().uuid().nullable().optional(),
);
const nullableDateSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  dateStringSchema.nullable().optional(),
);

export const createTaskSchema = z
  .object({
    area_id: nullableUuidSchema,
    project_id: nullableUuidSchema,
    name: z.string().min(1, "Name is required").max(255),
    description: z.string().max(1000).optional().nullable(),
    status: z.nativeEnum(TASK_STATUS).default(TASK_STATUS.INBOX),
    priority: z.nativeEnum(PRIORITY).default(PRIORITY.MEDIUM),
    due_date: nullableDateSchema,
    is_completed: z.boolean().default(false),
    is_focused: z.boolean().default(false),
    is_important: z.boolean().default(false),
    is_urgent: z.boolean().default(false),
    is_archived: z.boolean().default(false),
    goal_ids: z.array(z.string().uuid()).default([]),
  })
  .strict();

export const updateTaskSchema = createTaskSchema
  .partial()
  .extend({
    completed_at: z.string().datetime().optional().nullable(),
  })
  .strict();

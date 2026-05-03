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

/** Rejects dates strictly before today (local calendar date). */
const nullableFutureDateSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  dateStringSchema
    .refine((date) => {
      const today = new Date().toISOString().split("T")[0];
      return date >= today;
    }, "Due date cannot be in the past")
    .nullable()
    .optional(),
);

const createTaskBaseSchema = z
  .object({
    area_id: nullableUuidSchema,
    area_ids: z.array(z.string().uuid()).default([]),
    project_id: nullableUuidSchema,
    name: z.string().min(1, "Name is required").max(255),
    description: z.string().max(1000).optional().nullable(),
    status: z.nativeEnum(TASK_STATUS).default(TASK_STATUS.INBOX),
    priority: z.nativeEnum(PRIORITY).default(PRIORITY.MEDIUM),
    due_date: nullableFutureDateSchema,
    is_completed: z.boolean().default(false),
    is_focused: z.boolean().default(false),
    is_important: z.boolean().default(false),
    is_urgent: z.boolean().default(false),
    is_archived: z.boolean().default(false),
    goal_ids: z.array(z.string().uuid()).default([]),
  })
  .strict();

export const createTaskSchema = createTaskBaseSchema;

export const updateTaskSchema = createTaskBaseSchema
  .partial()
  .extend({
    area_ids: z.array(z.string().uuid()).optional(),
    due_date: nullableDateSchema,
    completed_at: z.string().datetime().optional().nullable(),
  })
  .strict();

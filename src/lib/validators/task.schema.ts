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

/**
 * Update schema — every field is optional with NO defaults so that partial
 * inputs (e.g. `{ is_focused: true }`) only update the specified columns.
 *
 * IMPORTANT: This schema must NOT inherit `.default(...)` from the create
 * schema. Doing so would cause `taskService.update(id, { is_focused: true })`
 * to also reset `status`, `priority`, `is_completed`, `is_archived`,
 * `is_important`, and `is_urgent` to their defaults — which is the source
 * of the "focus toggle reverts after editing the task name" bug.
 */
export const updateTaskSchema = z
  .object({
    area_id: nullableUuidSchema,
    area_ids: z.array(z.string().uuid()).optional(),
    project_id: nullableUuidSchema,
    project_ids: z.array(z.string().uuid()).optional(),
    name: z.string().min(1, "Name is required").max(255).optional(),
    description: z.string().max(1000).optional().nullable(),
    status: z.nativeEnum(TASK_STATUS).optional(),
    priority: z.nativeEnum(PRIORITY).optional(),
    due_date: nullableDateSchema,
    is_completed: z.boolean().optional(),
    is_focused: z.boolean().optional(),
    is_important: z.boolean().optional(),
    is_urgent: z.boolean().optional(),
    is_archived: z.boolean().optional(),
    goal_ids: z.array(z.string().uuid()).optional(),
    completed_at: z.string().datetime().optional().nullable(),
  })
  .strict();

/**
 * Create schema — `name` is required and the workflow defaults
 * (status, priority, boolean flags, empty link arrays) apply when omitted.
 */
export const createTaskSchema = z
  .object({
    area_id: nullableUuidSchema,
    area_ids: z.array(z.string().uuid()).default([]),
    project_id: nullableUuidSchema,
    project_ids: z.array(z.string().uuid()).default([]),
    name: z.string().min(1, "Name is required").max(255),
    description: z.string().max(1000).optional().nullable(),
    status: z.nativeEnum(TASK_STATUS).optional(),
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

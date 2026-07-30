import { z } from "zod";

import {
  PRIORITY,
  TASK_REPEAT_CYCLE,
  TASK_STATUS,
} from "../utils/constants";

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

/** Positive-integer `repeat_every` accepting string input from `<input type=number>`.
 *
 * Important: `undefined` must stay `undefined` so that partial updates
 * (e.g. `{ is_focused: true }`) don't accidentally write a null
 * `repeat_every` to the row. Only coerce an empty string to null, which is
 * what the form sends when the field is cleared.
 */
const positiveRepeatEverySchema = z.preprocess(
  (value) => {
    if (value === undefined) return undefined;
    if (value === "" || value === null) return null;
    if (typeof value === "string") {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : value;
    }
    return value;
  },
  z
    .number({ error: "Repeat every must be a number" })
    .int("Repeat every must be a whole number")
    .min(1, "Repeat every must be at least 1")
    .nullable()
    .optional(),
);

const SINGULAR_TO_PLURAL_CYCLE: Record<string, (typeof TASK_REPEAT_CYCLE)[keyof typeof TASK_REPEAT_CYCLE]> = {
  day: TASK_REPEAT_CYCLE.DAYS,
  week: TASK_REPEAT_CYCLE.WEEKS,
  month: TASK_REPEAT_CYCLE.MONTHS,
  year: TASK_REPEAT_CYCLE.YEARS,
};

/** Normalizes agent-friendly singular cycle values (day/week/month/year)
 *  to the DB enum's plural form, while leaving already-correct values and
 *  the special calendar-anchor variants untouched. */
const normalizedRepeatCycleSchema = z.preprocess(
  (value) => {
    if (value === undefined) return undefined;
    if (value === "" || value === null) return null;
    if (typeof value === "string") {
      const normalized = SINGULAR_TO_PLURAL_CYCLE[value.toLowerCase()];
      if (normalized) return normalized;
    }
    return value;
  },
  z.nativeEnum(TASK_REPEAT_CYCLE).nullable().optional(),
);

const nullableRepeatCycleSchema = z.preprocess(
  (value) => (value === undefined ? undefined : value === "" ? null : value),
  z.nativeEnum(TASK_REPEAT_CYCLE).nullable().optional(),
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
    is_recurring: z.boolean().optional(),
    repeat_every: positiveRepeatEverySchema,
    repeat_cycle: normalizedRepeatCycleSchema,
  })
  .superRefine((data, ctx) => {
    // Partial update — when the caller enables recurrence but omits
    // `due_date`, auto-derive today's date so AI agents / MCP callers
    // don't have to compute it themselves.
    if (data.is_recurring === true && !data.due_date) {
      data.due_date = new Date().toISOString().split("T")[0];
    }

    // Enforce the recurring-requires-due-date invariant only when the
    // caller is enabling recurrence. Turning recurrence off leaves
    // `due_date` untouched.
    if (data.is_recurring === true) {
      if (!data.due_date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["due_date"],
          message: "Recurring tasks require a due date.",
        });
      }
      if (data.repeat_every === null || data.repeat_every === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["repeat_every"],
          message: "Repeat every is required.",
        });
      }
      if (!data.repeat_cycle) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["repeat_cycle"],
          message: "Repeat cycle is required.",
        });
      }
    }
  })
  .strict();

/**
 * Create schema — `name` is required and the workflow defaults
 * (status, priority, boolean flags, empty link arrays) apply when omitted.
 */
export const createTaskSchema = z
  .object({
    area_id: nullableUuidSchema,
    area_ids: z.array(z.string().uuid()).optional(),
    project_id: nullableUuidSchema,
    project_ids: z.array(z.string().uuid()).optional(),
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
    is_recurring: z.boolean().default(false),
    repeat_every: positiveRepeatEverySchema,
    repeat_cycle: nullableRepeatCycleSchema,
  })
  .superRefine((data, ctx) => {
    if (!data.is_recurring) return;
    if (!data.due_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["due_date"],
        message: "Recurring tasks require a due date.",
      });
    }
    if (data.repeat_every === null || data.repeat_every === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["repeat_every"],
        message: "Repeat every is required.",
      });
    }
    if (!data.repeat_cycle) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["repeat_cycle"],
        message: "Repeat cycle is required.",
      });
    }
  })
  .strict();

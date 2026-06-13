import { z } from "zod";

import { GOAL_TERM, PRIORITY } from "../utils/constants";

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid ISO date");
const emptyStringToNull = (value: unknown): unknown => (value === "" ? null : value);

const goalNameSchema = z.string().trim().min(1, "Name is required").max(100);
const goalDescriptionSchema = z.preprocess(
  emptyStringToNull,
  z.string().trim().max(500).optional().nullable(),
);
const goalAreaIdSchema = z.preprocess(
  emptyStringToNull,
  z.string().uuid().optional().nullable(),
);
const goalAreaIdsSchema = z.array(z.string().uuid()).default([]);
const goalTargetDateSchema = z.preprocess(
  emptyStringToNull,
  dateStringSchema.optional().nullable(),
);
const goalProgressSchema = z.number().min(0).max(100);

function validateFutureTargetDate(
  data: { target_date?: string | null },
  ctx: z.RefinementCtx,
) {
  if (data.target_date !== null && data.target_date !== undefined) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(data.target_date + "T00:00:00");
    if (targetDate < today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Target date cannot be in the past",
        path: ["target_date"],
      });
    }
  }
}

const createGoalSchemaBase = z
  .object({
    area_id: goalAreaIdSchema,
    area_ids: goalAreaIdsSchema,
    name: goalNameSchema,
    description: goalDescriptionSchema,
    term: z.nativeEnum(GOAL_TERM),
    priority: z.nativeEnum(PRIORITY).default(PRIORITY.MEDIUM),
    target_date: goalTargetDateSchema,
    progress: goalProgressSchema.default(0),
    is_completed: z.boolean().default(false),
    is_archived: z.boolean().default(false),
    is_inactive: z.boolean().default(false),
    slug: z.string().optional(),
  })
  .strict();

const updateGoalSchemaBase = z
  .object({
    area_id: goalAreaIdSchema,
    area_ids: z.array(z.string().uuid()).optional(),
    name: goalNameSchema.optional(),
    description: goalDescriptionSchema,
    term: z.nativeEnum(GOAL_TERM).optional(),
    priority: z.nativeEnum(PRIORITY).optional(),
    target_date: goalTargetDateSchema,
    progress: goalProgressSchema.optional(),
    is_completed: z.boolean().optional(),
    is_archived: z.boolean().optional(),
    is_inactive: z.boolean().optional(),
  })
  .strict();

export const createGoalSchema = createGoalSchemaBase.superRefine(validateFutureTargetDate);

export const createGoalFormSchema = createGoalSchemaBase
  .omit({
    is_archived: true,
    is_completed: true,
    is_inactive: true,
    slug: true,
  })
  .superRefine(validateFutureTargetDate);

export const updateGoalSchema = updateGoalSchemaBase;

export const updateGoalFormSchema = updateGoalSchemaBase.omit({
  is_archived: true,
  is_completed: true,
  is_inactive: true,
});

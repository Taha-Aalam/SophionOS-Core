import { z } from "zod";

import { PRIORITY, PROJECT_STATUS } from "../utils/constants";

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid ISO date");
const projectStatusValues = [
  PROJECT_STATUS.PLANNING,
  PROJECT_STATUS.ACTIVE,
  PROJECT_STATUS.COMPLETED,
  PROJECT_STATUS.ON_HOLD,
  PROJECT_STATUS.ARCHIVED,
] as const;
const priorityValues = [
  PRIORITY.LOW,
  PRIORITY.MEDIUM,
  PRIORITY.HIGH,
  PRIORITY.URGENT,
] as const;
const nullableUuidSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().uuid().nullable().optional(),
);
const nullableDateSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  dateStringSchema.nullable().optional(),
);

const projectBaseSchema = z
  .object({
    area_id: nullableUuidSchema,
    name: z.string().min(1, "Name is required").max(100),
    description: z.string().max(500).optional().nullable(),
    start_date: nullableDateSchema,
    due_date: nullableDateSchema,
    goal_ids: z.array(z.string().uuid()).optional(),
  })
  .strict();

export const createProjectSchema = projectBaseSchema.extend({
  status: z.enum(projectStatusValues).default(PROJECT_STATUS.PLANNING),
  priority: z.enum(priorityValues).default(PRIORITY.MEDIUM),
  progress: z.number().min(0).max(100).default(0),
  is_archived: z.boolean().default(false),
  goal_ids: z.array(z.string().uuid()).default([]),
});

export const updateProjectSchema = projectBaseSchema
  .extend({
    status: z.enum(projectStatusValues).optional(),
    priority: z.enum(priorityValues).optional(),
    progress: z.number().min(0).max(100).optional(),
    is_archived: z.boolean().optional(),
  })
  .partial()
  .strict();

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

function addProjectDateRules<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  options: { rejectPastDates: boolean },
) {
  return schema.superRefine((data, ctx) => {
    const projectData = data as {
      due_date?: string | null;
      start_date?: string | null;
    };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (options.rejectPastDates && projectData.start_date) {
      const startDate = new Date(`${projectData.start_date}T00:00:00`);

      if (startDate < today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Start date cannot be in the past",
          path: ["start_date"],
        });
      }
    }

    if (options.rejectPastDates && projectData.due_date) {
      const dueDate = new Date(`${projectData.due_date}T00:00:00`);

      if (dueDate < today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Due date cannot be in the past",
          path: ["due_date"],
        });
      }
    }

    if (projectData.start_date && projectData.due_date) {
      const startDate = new Date(`${projectData.start_date}T00:00:00`);
      const dueDate = new Date(`${projectData.due_date}T00:00:00`);

      if (dueDate < startDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Due date cannot be before the start date",
          path: ["due_date"],
        });
      }
    }
  });
}

const projectAreaIdsSchema = z.array(z.string().uuid()).default([]);

const projectBaseSchema = z
  .object({
    area_id: nullableUuidSchema,
    area_ids: projectAreaIdsSchema,
    name: z.string().min(1, "Name is required").max(100),
    description: z.string().max(500).optional().nullable(),
    start_date: nullableDateSchema,
    due_date: nullableDateSchema,
    goal_ids: z.array(z.string().uuid()).optional(),
  })
  .strict();

export const createProjectSchema = addProjectDateRules(
  projectBaseSchema.extend({
    status: z.enum(projectStatusValues).default(PROJECT_STATUS.PLANNING),
    priority: z.enum(priorityValues).default(PRIORITY.MEDIUM),
    progress: z.number().min(0).max(100).default(0),
    is_archived: z.boolean().default(false),
    goal_ids: z.array(z.string().uuid()).default([]),
  }),
  { rejectPastDates: true },
);

export const updateProjectSchema = addProjectDateRules(
  projectBaseSchema
    .extend({
      area_ids: z.array(z.string().uuid()).optional(),
      status: z.enum(projectStatusValues).optional(),
      priority: z.enum(priorityValues).optional(),
      progress: z.number().min(0).max(100).optional(),
      is_archived: z.boolean().optional(),
    })
    .partial()
    .strict(),
  { rejectPastDates: false },
);

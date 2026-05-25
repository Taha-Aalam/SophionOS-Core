import { z } from "zod";

import { NOTE_STATUS, NOTE_TYPE } from "../utils/constants";

const noteStatusValues = [
  NOTE_STATUS.INBOX,
  NOTE_STATUS.TO_REVIEW,
  NOTE_STATUS.ACTIVE,
  NOTE_STATUS.SAVED,
  NOTE_STATUS.ARCHIVE,
] as const;

const nullableUuidSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().uuid().nullable().optional(),
);

const emptyToNull = z.preprocess((v) => (v === "" ? null : v), z.string().nullable().optional());

const noteTypeValues = Object.values(NOTE_TYPE) as string[];
const noteTypeSchema = z
  .string()
  .min(1)
  .refine(
    (val) => noteTypeValues.includes(val) || /[A-Z ]/.test(val),
    { message: "Invalid note type" },
  );

const noteBaseSchema = z
  .object({
    area_id: nullableUuidSchema,
    area_ids: z.array(z.string().uuid()).default([]),
    project_id: nullableUuidSchema,
    topic_id: nullableUuidSchema,
    name: z.string().min(1, "Name is required").max(255),
    content: emptyToNull,
    notebooks: z.array(z.string().min(1).max(100)).default([]),
    goal_ids: z.array(z.string().uuid()).default([]),
    task_ids: z.array(z.string().uuid()).default([]),
    project_ids: z.array(z.string().uuid()).default([]),
  })
  .strict();

export const createNoteSchema = noteBaseSchema.extend({
  type: noteTypeSchema.default(NOTE_TYPE.NOTE),
  status: z.enum(noteStatusValues).default(NOTE_STATUS.INBOX),
  favorite: z.boolean().default(false),
  pin: z.boolean().default(false),
  is_archived: z.boolean().default(false),
});

export const updateNoteSchema = noteBaseSchema
  .extend({
    type: noteTypeSchema.optional(),
    status: z.enum(noteStatusValues).optional(),
    favorite: z.boolean().optional(),
    pin: z.boolean().optional(),
    is_archived: z.boolean().optional(),
    goal_ids: z.array(z.string().uuid()).optional(),
    task_ids: z.array(z.string().uuid()).optional(),
    area_ids: z.array(z.string().uuid()).optional(),
    project_ids: z.array(z.string().uuid()).optional(),
  })
  .partial()
  .strict();

export const bulkArchiveSchema = z.object({
  noteIds: z.array(z.string().uuid()),
});

export const bulkUpdateStatusSchema = z.object({
  noteIds: z.array(z.string().uuid()),
  status: z.enum(noteStatusValues),
});

export const addNotesToNotebookSchema = z.object({
  noteIds: z.array(z.string().uuid()),
  notebook: z.string().min(1).max(100),
});

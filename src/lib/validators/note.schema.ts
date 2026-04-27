import { z } from "zod";

import { NOTE_STATUS, NOTE_TYPE } from "../utils/constants";

const noteStatusValues = [
  NOTE_STATUS.INBOX,
  NOTE_STATUS.TO_REVIEW,
  NOTE_STATUS.ACTIVE,
  NOTE_STATUS.ARCHIVE,
] as const;

const noteTypeValues = [
  NOTE_TYPE.NOTE,
  NOTE_TYPE.RESEARCH,
  NOTE_TYPE.JOURNAL,
] as const;

const nullableUuidSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().uuid().nullable().optional(),
);

const noteBaseSchema = z
  .object({
    area_id: nullableUuidSchema,
    project_id: nullableUuidSchema,
    topic_id: nullableUuidSchema,
    name: z.string().min(1, "Name is required").max(255),
    content: z.string().nullable().optional(),
    notebook: z.string().max(100).nullable().optional(),
  })
  .strict();

export const createNoteSchema = noteBaseSchema.extend({
  type: z.enum(noteTypeValues).default(NOTE_TYPE.NOTE),
  status: z.enum(noteStatusValues).default(NOTE_STATUS.INBOX),
  favorite: z.boolean().default(false),
  pin: z.boolean().default(false),
  is_archived: z.boolean().default(false),
});

export const updateNoteSchema = noteBaseSchema
  .extend({
    type: z.enum(noteTypeValues).optional(),
    status: z.enum(noteStatusValues).optional(),
    favorite: z.boolean().optional(),
    pin: z.boolean().optional(),
    is_archived: z.boolean().optional(),
  })
  .partial()
  .strict();

import { z } from "zod";

import { RESOURCE_STATUS, RESOURCE_TYPE } from "../utils/constants";

const resourceStatusValues = [
  RESOURCE_STATUS.INBOX,
  RESOURCE_STATUS.TO_REVIEW,
  RESOURCE_STATUS.ACTIVE,
] as const;

const resourceTypeValues = [
  RESOURCE_TYPE.WEBSITE,
  RESOURCE_TYPE.ARTICLE,
  RESOURCE_TYPE.VIDEO,
  RESOURCE_TYPE.DOCUMENT,
  RESOURCE_TYPE.PODCAST,
  RESOURCE_TYPE.SOCIAL_MEDIA,
  RESOURCE_TYPE.TOOL,
] as const;

const nullableUuidSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().uuid().nullable().optional(),
);

const resourceBaseSchema = z
  .object({
    area_id: nullableUuidSchema,
    project_id: nullableUuidSchema,
    topic_id: nullableUuidSchema,
    name: z.string().min(1, "Name is required").max(255),
    url: z.string().url("Must be a valid URL").nullable().optional(),
  })
  .strict();

export const createResourceSchema = resourceBaseSchema.extend({
  type: z.enum(resourceTypeValues).default(RESOURCE_TYPE.WEBSITE),
  status: z.enum(resourceStatusValues).default(RESOURCE_STATUS.INBOX),
  favorite: z.boolean().default(false),
  is_archived: z.boolean().default(false),
  goal_ids: z.array(z.string().uuid()).default([]),
});

export const updateResourceSchema = resourceBaseSchema
  .extend({
    type: z.enum(resourceTypeValues).optional(),
    status: z.enum(resourceStatusValues).optional(),
    favorite: z.boolean().optional(),
    is_archived: z.boolean().optional(),
  })
  .partial()
  .strict();
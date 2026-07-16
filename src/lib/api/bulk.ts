import { z } from "zod";

/** Hard cap on ids accepted by any bulk mutation endpoint (API + MCP). */
export const MAX_BULK_IDS = 100;

/** Shared UUID bulk-ids schema used by task/note bulk routes. */
export const bulkIdsSchema = z
  .object({
    ids: z
      .array(z.string().uuid())
      .min(1)
      .max(MAX_BULK_IDS, `At most ${MAX_BULK_IDS} ids are allowed per bulk request`),
  })
  .strict();

export function bulkIdsArraySchema(description?: string) {
  const schema = z
    .array(z.string().uuid())
    .min(1)
    .max(MAX_BULK_IDS, `At most ${MAX_BULK_IDS} ids are allowed per bulk request`);
  return description ? schema.describe(description) : schema;
}

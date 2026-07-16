import { z } from "zod/v4";

export const accessModeSchema = z.enum([
  "read_only",
  "write_limited",
  "write_enabled",
]);

export const clientTypeSchema = z.enum([
  "mcp",
  "automation",
  "personal",
  "unknown",
]);

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(80),
  client_type: clientTypeSchema.optional(),
  /** camelCase alias accepted from newer clients */
  clientType: clientTypeSchema.optional(),
  client_name: z.string().min(1).max(120).nullable().optional(),
  clientName: z.string().min(1).max(120).nullable().optional(),
  access_mode: accessModeSchema.optional(),
  accessMode: accessModeSchema.optional(),
  scopes: z.array(z.string().min(1).max(64)).max(32).optional(),
  expires_at: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const updateApiKeySchema = z.object({
  name: z.string().min(1).max(80).optional(),
  access_mode: accessModeSchema.optional(),
  accessMode: accessModeSchema.optional(),
  client_name: z.string().min(1).max(120).nullable().optional(),
  clientName: z.string().min(1).max(120).nullable().optional(),
  scopes: z.array(z.string().min(1).max(64)).max(32).optional(),
  expires_at: z.string().datetime().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const patchAiAccessSchema = z.object({
  ai_access_enabled: z.boolean().optional(),
  ai_write_access_enabled: z.boolean().optional(),
  privacy_notice_version: z.string().min(1).max(40).nullable().optional(),
  privacy_notice_accepted_at: z.string().datetime().nullable().optional(),
});

export type CreateApiKeyBody = z.infer<typeof createApiKeySchema>;
export type UpdateApiKeyBody = z.infer<typeof updateApiKeySchema>;
export type PatchAiAccessBody = z.infer<typeof patchAiAccessSchema>;

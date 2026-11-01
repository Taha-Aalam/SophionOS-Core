import { z } from "zod/v4";
import { PROVIDER_IDS } from "@/lib/ai/provider-registry";

export const upsertProviderCredentialSchema = z
  .object({
    provider: z.enum(PROVIDER_IDS),
    apiKey: z.string().min(1).max(512),
    baseUrl: z.string().url().max(500).nullish(),
    model: z.string().min(1).max(200).nullish(),
    label: z.string().min(1).max(100).nullish(),
  })
  .refine((value) => value.provider !== "custom" || !!value.baseUrl, {
    message: "A base URL is required for custom providers",
    path: ["baseUrl"],
  });

export type UpsertProviderCredentialInput = z.infer<
  typeof upsertProviderCredentialSchema
>;

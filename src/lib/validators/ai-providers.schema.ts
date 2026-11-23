import { z } from "zod/v4";
import { PROVIDER_IDS } from "@/lib/ai/provider-registry";
import { isPrivateHostname } from "@/lib/ai/fetch-guard";

export const upsertProviderCredentialSchema = z
  .object({
    provider: z.enum(PROVIDER_IDS),
    apiKey: z.string().min(1).max(512),
    // Audit F2: parseability-only .url() accepted loopback/link-local/ftp
    // targets. Enforce https + a non-private literal host at the boundary;
    // the fetch-time guard (assertFetchableProviderUrl) additionally resolves
    // DNS so rebound hostnames are denied.
    baseUrl: z
      .string()
      .max(500)
      .refine(
        (value) => {
          try {
            const url = new URL(value);
            return url.protocol === "https:" && !isPrivateHostname(url.hostname);
          } catch {
            return false;
          }
        },
        "baseUrl must be a public https URL",
      )
      .nullish(),
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

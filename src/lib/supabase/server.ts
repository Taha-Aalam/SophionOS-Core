import { auth } from "@clerk/nextjs/server";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

import type { AuthResult } from "@/lib/api/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Supabase client for the current Clerk session (browser-equivalent JWT).
 * Used by RSC and by API routes when the caller authenticated via Clerk.
 */
export const createClient = async (): Promise<SupabaseClient> => {
  const { getToken } = await auth();

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      async accessToken() {
        return (await getToken()) ?? null;
      },
    },
  );
};

/**
 * Data-plane client for an already-authenticated API caller.
 *
 * - Clerk session → user JWT client (RLS via auth.jwt()->>'sub')
 * - API key → service-role admin client. Callers MUST still pass the resolved
 *   userId into every service method; services filter by user_id and
 *   `assertOwnedIds` guards junction writes. RLS is bypassed only after the
 *   key was validated and mapped to that userId in authorizeApiRequest.
 */
export async function createDataClient(authResult: AuthResult): Promise<SupabaseClient> {
  if (authResult.type === "api_key") {
    return createAdminClient();
  }
  return createClient();
}

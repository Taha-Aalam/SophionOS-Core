import { auth } from "@clerk/nextjs/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export const createClient = async () => {
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

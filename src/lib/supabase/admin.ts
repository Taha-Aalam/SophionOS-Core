import { createClient } from "@supabase/supabase-js"

// Guardrail: this module wraps the service-role key, which bypasses RLS and
// must never reach the browser bundle. If it is ever imported into a client
// component, this throws at module-eval time instead of leaking the key.
// (Prefer the `server-only` package if it gets added as a dependency.)
if (typeof window !== "undefined") {
  throw new Error(
    "supabase/admin.ts (service-role client) must never be imported in client code",
  )
}

export const createAdminClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

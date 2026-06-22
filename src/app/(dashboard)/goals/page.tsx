import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"

import { createClient } from "@/lib/supabase/server"
import { makeQueryClient } from "@/lib/queries/server-query-client"
import { GOALS_QUERY_KEY } from "@/lib/hooks/use-goals"
import { serverFetchGoals } from "@/lib/queries/goals.queries"
import { GoalsContent } from "./goals-content"

// Mirror the client filter store's default exactly (src/lib/stores/filters.store.ts)
// so the dehydrated query lands on the same cache key useGoals(filters) reads on
// mount. React Query hashes keys via stable stringify (undefined dropped), so
// areaId vanishes but priority:"all" must be present — omitting it forks the
// cache and forces a cold refetch despite the prefetch. serverFetchGoals reads
// only status/term, so the fetched data is identical.
const DEFAULT_FILTERS = {
  status: "active" as const,
  term: "all" as const,
  priority: "all" as const,
  areaId: undefined,
}

export default async function GoalsPage() {
  const { userId } = await auth()
  if (!userId) redirect("/login")

  const supabase = await createClient()
  const queryClient = makeQueryClient()
  await queryClient.prefetchQuery({
    queryKey: [GOALS_QUERY_KEY, DEFAULT_FILTERS],
    queryFn: () => serverFetchGoals(supabase, userId, DEFAULT_FILTERS),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <GoalsContent />
    </HydrationBoundary>
  )
}

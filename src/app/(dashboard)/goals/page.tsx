import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"

import { createClient } from "@/lib/supabase/server"
import { makeQueryClient } from "@/lib/queries/server-query-client"
import { GOALS_QUERY_KEY } from "@/lib/hooks/use-goals"
import { serverFetchGoals } from "@/lib/queries/goals.queries"
import { GoalsContent } from "./goals-content"

const DEFAULT_FILTERS = { status: "active" as const, term: "all" as const }

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

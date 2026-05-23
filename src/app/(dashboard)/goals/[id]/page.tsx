import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { makeQueryClient } from "@/lib/queries/server-query-client"
import { GOAL_DETAIL_QUERY_KEY } from "@/lib/hooks/use-goal-detail"
import { serverFetchGoalDetail } from "@/lib/queries/goal-detail.queries"
import { GoalDetailContent } from "./goal-detail-content"

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const queryClient = makeQueryClient()
  await queryClient.prefetchQuery({
    queryKey: [GOAL_DETAIL_QUERY_KEY, id, undefined],
    queryFn: () => serverFetchGoalDetail(supabase, user.id, id),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <GoalDetailContent />
    </HydrationBoundary>
  )
}

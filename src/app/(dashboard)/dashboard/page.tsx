import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { makeQueryClient } from "@/lib/queries/server-query-client"
import { DASHBOARD_QUERY_KEY } from "@/lib/hooks/use-dashboard"
import { serverFetchDashboardToday } from "@/lib/queries/dashboard.queries"
import { DashboardContent } from "./dashboard-content"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const queryClient = makeQueryClient()
  await queryClient.prefetchQuery({
    queryKey: [DASHBOARD_QUERY_KEY, user.id, "today"],
    queryFn: () => serverFetchDashboardToday(supabase, user.id),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardContent />
    </HydrationBoundary>
  )
}

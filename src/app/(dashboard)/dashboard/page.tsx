import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"

import { createClient } from "@/lib/supabase/server"
import { makeQueryClient } from "@/lib/queries/server-query-client"
import { DASHBOARD_QUERY_KEY } from "@/lib/hooks/use-dashboard"
import { serverFetchDashboardToday } from "@/lib/queries/dashboard.queries"
import { DashboardContent } from "./dashboard-content"

export default async function DashboardPage() {
  const { userId } = await auth()
  if (!userId) redirect("/login")

  const supabase = await createClient()
  const queryClient = makeQueryClient()
  await queryClient.prefetchQuery({
    queryKey: [DASHBOARD_QUERY_KEY, userId, "today"],
    queryFn: () => serverFetchDashboardToday(supabase, userId),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <DashboardContent />
    </HydrationBoundary>
  )
}

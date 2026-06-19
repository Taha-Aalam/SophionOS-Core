import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"

import { createClient } from "@/lib/supabase/server"
import { makeQueryClient } from "@/lib/queries/server-query-client"
import { AREA_DETAIL_QUERY_KEY } from "@/lib/hooks/use-area-detail"
import { serverFetchAreaDetail } from "@/lib/queries/area-detail.queries"
import { AreaDetailContent } from "./area-detail-content"

export default async function AreaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) redirect("/login")

  const supabase = await createClient()
  const queryClient = makeQueryClient()
  await queryClient.prefetchQuery({
    queryKey: [AREA_DETAIL_QUERY_KEY, id],
    queryFn: () => serverFetchAreaDetail(supabase, userId, id),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AreaDetailContent />
    </HydrationBoundary>
  )
}

import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { makeQueryClient } from "@/lib/queries/server-query-client"
import { TOPICS_QUERY_KEY } from "@/lib/hooks/use-topics"
import {
  serverFetchTopicByIdentifier,
  serverFetchNotesForTopic,
  serverFetchResourcesForTopic,
} from "@/lib/queries/topic-detail.queries"
import { TopicDetailContent } from "./topic-detail-content"

export default async function TopicDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const queryClient = makeQueryClient()
  const topic = await serverFetchTopicByIdentifier(supabase, user.id, id)
  await queryClient.prefetchQuery({
    queryKey: [TOPICS_QUERY_KEY, "detail", user.id, id],
    queryFn: () => Promise.resolve(topic),
  })

  if (topic) {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: [TOPICS_QUERY_KEY, "notes", user.id, topic.id],
        queryFn: () => serverFetchNotesForTopic(supabase, user.id, topic.id),
      }),
      queryClient.prefetchQuery({
        queryKey: [TOPICS_QUERY_KEY, "resources", user.id, topic.id],
        queryFn: () => serverFetchResourcesForTopic(supabase, user.id, topic.id),
      }),
    ])
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TopicDetailContent />
    </HydrationBoundary>
  )
}

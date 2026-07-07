import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { createClient } from "@/lib/supabase/server";
import { makeQueryClient } from "@/lib/queries/server-query-client";
import { TOPICS_QUERY_KEY } from "@/lib/hooks/use-topics";
import {
  serverFetchTopicByIdentifier,
  serverFetchNotesForTopic,
  serverFetchResourcesForTopic,
} from "@/lib/queries/topic-detail.queries";
import { TopicDetailContent } from "./topic-detail-content";

export default async function TopicDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  const queryClient = makeQueryClient();
  const topic = await serverFetchTopicByIdentifier(supabase, userId, id);
  await queryClient.prefetchQuery({
    queryKey: [TOPICS_QUERY_KEY, "detail", userId, id],
    queryFn: () => Promise.resolve(topic),
  });

  if (topic) {
    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: [TOPICS_QUERY_KEY, "notes", userId, topic.id],
        queryFn: () => serverFetchNotesForTopic(supabase, userId, topic.id),
      }),
      queryClient.prefetchQuery({
        queryKey: [TOPICS_QUERY_KEY, "resources", userId, topic.id],
        queryFn: () => serverFetchResourcesForTopic(supabase, userId, topic.id),
      }),
    ]);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TopicDetailContent />
    </HydrationBoundary>
  );
}

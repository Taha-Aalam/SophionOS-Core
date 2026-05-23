import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { makeQueryClient } from "@/lib/queries/server-query-client";
import { TOPICS_QUERY_KEY } from "@/lib/hooks/use-topics";
import { serverFetchTopics } from "@/lib/queries/topics.queries";
import { TopicsContent } from "./topics-content";

export default async function TopicsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const queryClient = makeQueryClient();
  await queryClient.prefetchQuery({
    queryKey: [TOPICS_QUERY_KEY, "list", user.id],
    queryFn: () => serverFetchTopics(supabase, user.id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TopicsContent />
    </HydrationBoundary>
  );
}

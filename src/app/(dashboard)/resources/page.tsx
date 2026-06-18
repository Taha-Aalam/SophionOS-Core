import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { createClient } from "@/lib/supabase/server";
import { makeQueryClient } from "@/lib/queries/server-query-client";
import { RESOURCES_QUERY_KEY } from "@/lib/hooks/use-resources";
import { GOALS_QUERY_KEY } from "@/lib/hooks/use-goals";
import { serverFetchResources } from "@/lib/queries/resources.queries";
import { serverFetchGoals } from "@/lib/queries/goals.queries";
import { ResourcesContent } from "./resources-content";

export default async function ResourcesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  const queryClient = makeQueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: [RESOURCES_QUERY_KEY, "list", userId, { status: "all" }],
      queryFn: () => serverFetchResources(supabase, userId),
    }),
    queryClient.prefetchQuery({
      queryKey: [GOALS_QUERY_KEY, {}],
      queryFn: () => serverFetchGoals(supabase, userId, {}),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ResourcesContent />
    </HydrationBoundary>
  );
}

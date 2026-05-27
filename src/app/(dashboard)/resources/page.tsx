import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { makeQueryClient } from "@/lib/queries/server-query-client";
import { RESOURCES_QUERY_KEY } from "@/lib/hooks/use-resources";
import { GOALS_QUERY_KEY } from "@/lib/hooks/use-goals";
import { serverFetchResources } from "@/lib/queries/resources.queries";
import { serverFetchGoals } from "@/lib/queries/goals.queries";
import { ResourcesContent } from "./resources-content";

export default async function ResourcesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const queryClient = makeQueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: [RESOURCES_QUERY_KEY, "list", user.id, { status: "all" }],
      queryFn: () => serverFetchResources(supabase, user.id),
    }),
    queryClient.prefetchQuery({
      queryKey: [GOALS_QUERY_KEY, {}],
      queryFn: () => serverFetchGoals(supabase, user.id, {}),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ResourcesContent />
    </HydrationBoundary>
  );
}

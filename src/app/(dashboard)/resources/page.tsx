import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { makeQueryClient } from "@/lib/queries/server-query-client";
import { RESOURCES_QUERY_KEY } from "@/lib/hooks/use-resources";
import { serverFetchResources } from "@/lib/queries/resources.queries";
import { ResourcesContent } from "./resources-content";

export default async function ResourcesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const queryClient = makeQueryClient();
  await queryClient.prefetchQuery({
    queryKey: [RESOURCES_QUERY_KEY, "list", user.id, { status: "all" }],
    queryFn: () => serverFetchResources(supabase, user.id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ResourcesContent />
    </HydrationBoundary>
  );
}

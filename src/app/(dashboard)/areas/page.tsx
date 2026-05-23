import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { makeQueryClient } from "@/lib/queries/server-query-client";
import { AREAS_QUERY_KEY } from "@/lib/hooks/use-areas";
import { serverFetchAreas } from "@/lib/queries/areas.queries";
import { AreasContent } from "./areas-content";

export default async function AreasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const queryClient = makeQueryClient();
  await queryClient.prefetchQuery({
    queryKey: [AREAS_QUERY_KEY, "list", user.id, {}],
    queryFn: () => serverFetchAreas(supabase, user.id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AreasContent />
    </HydrationBoundary>
  );
}

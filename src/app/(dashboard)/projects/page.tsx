import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { makeQueryClient } from "@/lib/queries/server-query-client";
import { PROJECTS_QUERY_KEY } from "@/lib/hooks/use-projects";
import { serverFetchProjects } from "@/lib/queries/projects.queries";
import { ProjectsContent } from "./projects-content";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const queryClient = makeQueryClient();
  await queryClient.prefetchQuery({
    queryKey: [PROJECTS_QUERY_KEY, { status: "all" }],
    queryFn: () => serverFetchProjects(supabase, user.id, { status: "all" }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectsContent />
    </HydrationBoundary>
  );
}

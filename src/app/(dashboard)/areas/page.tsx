import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { makeQueryClient } from "@/lib/queries/server-query-client";
import { AREAS_QUERY_KEY } from "@/lib/hooks/use-areas";
import { GOALS_QUERY_KEY } from "@/lib/hooks/use-goals";
import { PROJECTS_QUERY_KEY } from "@/lib/hooks/use-projects";
import { TASKS_QUERY_KEY } from "@/lib/hooks/use-tasks";
import { NOTES_QUERY_KEY } from "@/lib/hooks/use-notes";
import { RESOURCES_QUERY_KEY } from "@/lib/hooks/use-resources";
import { serverFetchAreas } from "@/lib/queries/areas.queries";
import { serverFetchGoals } from "@/lib/queries/goals.queries";
import { serverFetchProjects } from "@/lib/queries/projects.queries";
import { serverFetchTasks } from "@/lib/queries/tasks.queries";
import { serverFetchNotes } from "@/lib/queries/notes.queries";
import { serverFetchResources } from "@/lib/queries/resources.queries";
import { AreasContent } from "./areas-content";

export default async function AreasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const queryClient = makeQueryClient();
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: [AREAS_QUERY_KEY, "list", user.id, {}],
      queryFn: () => serverFetchAreas(supabase, user.id),
    }),
    queryClient.prefetchQuery({
      queryKey: [GOALS_QUERY_KEY, { status: "all" }],
      queryFn: () => serverFetchGoals(supabase, user.id, { status: "all" }),
    }),
    queryClient.prefetchQuery({
      queryKey: [PROJECTS_QUERY_KEY, { status: "all" }],
      queryFn: () => serverFetchProjects(supabase, user.id, { status: "all" }),
    }),
    queryClient.prefetchQuery({
      queryKey: [TASKS_QUERY_KEY],
      queryFn: () => serverFetchTasks(supabase, user.id),
    }),
    queryClient.prefetchQuery({
      queryKey: [NOTES_QUERY_KEY, "list", user.id, { includeArchived: true }],
      queryFn: () => serverFetchNotes(supabase, user.id, { includeArchived: true }),
    }),
    queryClient.prefetchQuery({
      queryKey: [RESOURCES_QUERY_KEY, "list", user.id, {}],
      queryFn: () => serverFetchResources(supabase, user.id),
    }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AreasContent />
    </HydrationBoundary>
  );
}

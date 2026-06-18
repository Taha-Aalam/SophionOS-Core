import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { createClient } from "@/lib/supabase/server";
import { makeQueryClient } from "@/lib/queries/server-query-client";
import { PROJECTS_QUERY_KEY } from "@/lib/hooks/use-projects";
import { RESOURCES_QUERY_KEY } from "@/lib/hooks/use-resources";
import { CONTACTS_QUERY_KEY } from "@/lib/hooks/use-contacts";
import { AREAS_QUERY_KEY } from "@/lib/hooks/use-areas";
import { GOALS_QUERY_KEY } from "@/lib/hooks/use-goals";
import { TASKS_QUERY_KEY } from "@/lib/hooks/use-tasks";
import { TOPICS_QUERY_KEY } from "@/lib/hooks/use-topics";
import {
  serverFetchProjectByIdentifier,
  serverFetchProjectWithRelations,
  serverFetchResourcesByProject,
  serverFetchContactsByProject,
} from "@/lib/queries/project-detail.queries";
import { serverFetchAreas } from "@/lib/queries/areas.queries";
import { serverFetchGoals } from "@/lib/queries/goals.queries";
import { serverFetchTasks } from "@/lib/queries/tasks.queries";
import { serverFetchTopics } from "@/lib/queries/topics.queries";
import { ProjectDetailContent } from "./project-detail-content";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  const queryClient = makeQueryClient();

  // Stage 1: resolve identifier → project (slug or UUID)
  const project = await serverFetchProjectByIdentifier(supabase, userId, id);
  await queryClient.prefetchQuery({
    queryKey: [PROJECTS_QUERY_KEY, id],
    queryFn: () => Promise.resolve(project),
  });

  // Stage 2: parallel secondary prefetches using resolved UUID.
  // The reference-list prefetches (areas/goals/tasks/topics) populate the same
  // query keys the detail content reads for its name-lookup maps, so note and
  // resource relationship badges resolve on first paint instead of popping in
  // as each independent list hook finishes its own client fetch.
  if (project) {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: [PROJECTS_QUERY_KEY, "relations", project.id],
        queryFn: () => serverFetchProjectWithRelations(supabase, project.id),
      }),
      queryClient.prefetchQuery({
        queryKey: [RESOURCES_QUERY_KEY, "byProject", userId, project.id],
        queryFn: () => serverFetchResourcesByProject(supabase, userId, project.id),
      }),
      queryClient.prefetchQuery({
        queryKey: [CONTACTS_QUERY_KEY, "project", project.id],
        queryFn: () => serverFetchContactsByProject(supabase, project.id),
      }),
      queryClient.prefetchQuery({
        queryKey: [AREAS_QUERY_KEY, "list", userId, {}],
        queryFn: () => serverFetchAreas(supabase, userId),
      }),
      queryClient.prefetchQuery({
        queryKey: [GOALS_QUERY_KEY, { status: "all" }],
        queryFn: () => serverFetchGoals(supabase, userId, { status: "all" }),
      }),
      queryClient.prefetchQuery({
        queryKey: [TASKS_QUERY_KEY],
        queryFn: () => serverFetchTasks(supabase, userId),
      }),
      queryClient.prefetchQuery({
        queryKey: [TOPICS_QUERY_KEY, "list", userId],
        queryFn: () => serverFetchTopics(supabase, userId),
      }),
    ]);
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectDetailContent />
    </HydrationBoundary>
  );
}

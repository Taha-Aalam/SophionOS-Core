import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { makeQueryClient } from "@/lib/queries/server-query-client"
import { PROJECTS_QUERY_KEY } from "@/lib/hooks/use-projects"
import { RESOURCES_QUERY_KEY } from "@/lib/hooks/use-resources"
import { CONTACTS_QUERY_KEY } from "@/lib/hooks/use-contacts"
import {
  serverFetchProjectByIdentifier,
  serverFetchProjectWithRelations,
  serverFetchResourcesByProject,
  serverFetchContactsByProject,
} from "@/lib/queries/project-detail.queries"
import { ProjectDetailContent } from "./project-detail-content"

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const queryClient = makeQueryClient()

  // Stage 1: resolve identifier → project (slug or UUID)
  const project = await serverFetchProjectByIdentifier(supabase, user.id, id)
  await queryClient.prefetchQuery({
    queryKey: [PROJECTS_QUERY_KEY, id],
    queryFn: () => Promise.resolve(project),
  })

  // Stage 2: parallel secondary prefetches using resolved UUID
  if (project) {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: [PROJECTS_QUERY_KEY, "relations", project.id],
        queryFn: () => serverFetchProjectWithRelations(supabase, project.id),
      }),
      queryClient.prefetchQuery({
        queryKey: [RESOURCES_QUERY_KEY, "byProject", user.id, project.id],
        queryFn: () => serverFetchResourcesByProject(supabase, user.id, project.id),
      }),
      queryClient.prefetchQuery({
        queryKey: [CONTACTS_QUERY_KEY, "project", project.id],
        queryFn: () => serverFetchContactsByProject(supabase, project.id),
      }),
    ])
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProjectDetailContent />
    </HydrationBoundary>
  )
}

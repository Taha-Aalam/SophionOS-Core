import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { redirect } from "next/navigation"
import { auth } from "@clerk/nextjs/server"

import { createClient } from "@/lib/supabase/server"
import { makeQueryClient } from "@/lib/queries/server-query-client"
import { CONTACTS_QUERY_KEY } from "@/lib/hooks/use-contacts"
import {
  serverFetchContactBySlug,
  serverFetchContactProjectLinks,
  serverFetchContactTaskLinks,
  serverFetchContactAreaLinks,
  serverFetchContactGoalLinks,
  serverFetchContactLogs,
} from "@/lib/queries/contact-detail.queries"
import { ContactDetailContent } from "./contact-detail-content"

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { userId } = await auth()
  if (!userId) redirect("/login")

  const supabase = await createClient()
  const queryClient = makeQueryClient()
  const contact = await serverFetchContactBySlug(supabase, userId, id)
  await queryClient.prefetchQuery({
    queryKey: [CONTACTS_QUERY_KEY, "slug", id],
    queryFn: () => Promise.resolve(contact),
  })

  if (contact) {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: [CONTACTS_QUERY_KEY, contact.id, "projects"],
        queryFn: () => serverFetchContactProjectLinks(supabase, contact.id),
      }),
      queryClient.prefetchQuery({
        queryKey: [CONTACTS_QUERY_KEY, contact.id, "tasks"],
        queryFn: () => serverFetchContactTaskLinks(supabase, contact.id),
      }),
      queryClient.prefetchQuery({
        queryKey: [CONTACTS_QUERY_KEY, contact.id, "areas"],
        queryFn: () => serverFetchContactAreaLinks(supabase, contact.id),
      }),
      queryClient.prefetchQuery({
        queryKey: [CONTACTS_QUERY_KEY, contact.id, "goals"],
        queryFn: () => serverFetchContactGoalLinks(supabase, contact.id),
      }),
      queryClient.prefetchQuery({
        queryKey: [CONTACTS_QUERY_KEY, contact.id, "logs"],
        queryFn: () => serverFetchContactLogs(supabase, userId, contact.id),
      }),
    ])
  }

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ContactDetailContent />
    </HydrationBoundary>
  )
}

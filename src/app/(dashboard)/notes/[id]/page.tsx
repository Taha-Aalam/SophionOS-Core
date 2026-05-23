import { dehydrate, HydrationBoundary } from "@tanstack/react-query"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import { makeQueryClient } from "@/lib/queries/server-query-client"
import { NOTES_QUERY_KEY, NOTE_TYPES_QUERY_KEY } from "@/lib/hooks/use-notes"
import {
  serverFetchNoteByIdentifier,
  serverFetchNoteTypes,
  serverFetchRelatedNotes,
} from "@/lib/queries/note-detail.queries"
import { NoteDetailContent } from "./note-detail-content"

export default async function NoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const queryClient = makeQueryClient()
  const note = await serverFetchNoteByIdentifier(supabase, user.id, id)
  await queryClient.prefetchQuery({
    queryKey: [NOTES_QUERY_KEY, "detail", user.id, id],
    queryFn: () => Promise.resolve(note),
  })

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: [NOTE_TYPES_QUERY_KEY, user.id],
      queryFn: () => serverFetchNoteTypes(supabase, user.id),
    }),
    ...(note
      ? [
          queryClient.prefetchQuery({
            queryKey: [NOTES_QUERY_KEY, "related", user.id, id],
            queryFn: () => serverFetchRelatedNotes(supabase, user.id, note.id),
          }),
        ]
      : []),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <NoteDetailContent />
    </HydrationBoundary>
  )
}

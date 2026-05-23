import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { makeQueryClient } from "@/lib/queries/server-query-client";
import { NOTES_QUERY_KEY } from "@/lib/hooks/use-notes";
import { serverFetchNotes } from "@/lib/queries/notes.queries";
import { NotesContent } from "./notes-content";

export default async function NotesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const queryClient = makeQueryClient();
  await queryClient.prefetchQuery({
    queryKey: [NOTES_QUERY_KEY, "list", user.id, { includeArchived: true }],
    queryFn: () => serverFetchNotes(supabase, user.id, { includeArchived: true }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <NotesContent />
    </HydrationBoundary>
  );
}

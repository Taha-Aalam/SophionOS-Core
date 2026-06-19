import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { createClient } from "@/lib/supabase/server";
import { makeQueryClient } from "@/lib/queries/server-query-client";
import { NOTES_QUERY_KEY } from "@/lib/hooks/use-notes";
import { serverFetchNotes } from "@/lib/queries/notes.queries";
import { NotesContent } from "./notes-content";

export default async function NotesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  const queryClient = makeQueryClient();
  await queryClient.prefetchQuery({
    queryKey: [NOTES_QUERY_KEY, "list", userId, { includeArchived: true }],
    queryFn: () => serverFetchNotes(supabase, userId, { includeArchived: true }),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <NotesContent />
    </HydrationBoundary>
  );
}

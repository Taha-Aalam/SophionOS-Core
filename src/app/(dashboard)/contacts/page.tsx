import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { createClient } from "@/lib/supabase/server";
import { makeQueryClient } from "@/lib/queries/server-query-client";
import { CONTACTS_QUERY_KEY } from "@/lib/hooks/use-contacts";
import { serverFetchContacts } from "@/lib/queries/contacts.queries";
import { ContactsContent } from "./contacts-content";

export default async function ContactsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  const queryClient = makeQueryClient();
  await queryClient.prefetchQuery({
    queryKey: [CONTACTS_QUERY_KEY, undefined],
    queryFn: () => serverFetchContacts(supabase, userId),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ContactsContent />
    </HydrationBoundary>
  );
}

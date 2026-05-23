import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { makeQueryClient } from "@/lib/queries/server-query-client";
import { TASKS_QUERY_KEY } from "@/lib/hooks/use-tasks";
import { serverFetchTasks } from "@/lib/queries/tasks.queries";
import { TasksContent } from "./tasks-content";

export default async function TasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const queryClient = makeQueryClient();
  await queryClient.prefetchQuery({
    queryKey: [TASKS_QUERY_KEY],
    queryFn: () => serverFetchTasks(supabase, user.id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TasksContent />
    </HydrationBoundary>
  );
}

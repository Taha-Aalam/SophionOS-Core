import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { createClient } from "@/lib/supabase/server";
import { makeQueryClient } from "@/lib/queries/server-query-client";
import { TASKS_QUERY_KEY } from "@/lib/hooks/use-tasks";
import { serverFetchTasks } from "@/lib/queries/tasks.queries";
import { TasksContent } from "./tasks-content";

export default async function TasksPage() {
  const { userId } = await auth();
  if (!userId) redirect("/login");

  const supabase = await createClient();
  const queryClient = makeQueryClient();
  await queryClient.prefetchQuery({
    queryKey: [TASKS_QUERY_KEY],
    queryFn: () => serverFetchTasks(supabase, userId),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TasksContent />
    </HydrationBoundary>
  );
}

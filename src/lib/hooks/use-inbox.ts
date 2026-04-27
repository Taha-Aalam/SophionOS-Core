import { useMemo } from "react";

import { useNotes } from "@/lib/hooks/use-notes";
import { useResources } from "@/lib/hooks/use-resources";
import { useTasks } from "@/lib/hooks/use-tasks";
import { NOTE_STATUS, RESOURCE_STATUS, TASK_STATUS } from "@/lib/utils/constants";

export function useInboxTasks() {
  const query = useTasks();
  const inboxTasks = useMemo(
    () =>
      (query.data ?? []).filter(
        (t) => t.status === TASK_STATUS.INBOX && !t.is_archived && !t.is_completed,
      ),
    [query.data],
  );
  return { ...query, data: inboxTasks };
}

export function useInboxNotes() {
  const query = useNotes({ status: NOTE_STATUS.INBOX });
  return query;
}

export function useInboxResources() {
  const query = useResources({ status: RESOURCE_STATUS.INBOX });
  return query;
}

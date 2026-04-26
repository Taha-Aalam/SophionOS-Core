import { useMemo } from "react";

import { useNotes } from "@/lib/hooks/use-notes";
import { useTasks } from "@/lib/hooks/use-tasks";
import { NOTE_STATUS, TASK_STATUS } from "@/lib/utils/constants";

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

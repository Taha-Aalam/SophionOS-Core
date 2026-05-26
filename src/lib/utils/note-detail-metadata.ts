import type { UpdateNoteInput } from "../types/domain.types";

interface NoteMetadataSnapshot {
  status: NonNullable<UpdateNoteInput["status"]>;
  type: NonNullable<UpdateNoteInput["type"]>;
  notebooks: string[];
  areaIds: string[];
  goalIds: string[];
  projectIds: string[];
  taskIds: string[];
  favorite: NonNullable<UpdateNoteInput["favorite"]>;
  pin: NonNullable<UpdateNoteInput["pin"]>;
}

export function buildNoteMetadataUpdateInput(
  snapshot: NoteMetadataSnapshot,
  overrides: UpdateNoteInput,
): UpdateNoteInput {
  return {
    status: overrides.status ?? snapshot.status,
    type: overrides.type ?? snapshot.type,
    notebooks: overrides.notebooks ?? snapshot.notebooks,
    area_ids: overrides.area_ids ?? snapshot.areaIds,
    goal_ids: overrides.goal_ids ?? snapshot.goalIds,
    project_ids: overrides.project_ids ?? snapshot.projectIds,
    task_ids: overrides.task_ids ?? snapshot.taskIds,
    favorite: overrides.favorite ?? snapshot.favorite,
    pin: overrides.pin ?? snapshot.pin,
  };
}

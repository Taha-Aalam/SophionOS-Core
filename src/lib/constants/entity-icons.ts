import { Folder, Link2, NotebookPen, SquareCheck, Tag, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Canonical lucide glyph per entity type. Single source of truth for rollup
 * counts, link badges and type pills, replacing the emoji set that previously
 * drifted across components. User-chosen entity emoji (area/goal/project
 * icons via the emoji picker) are rendered separately and take precedence
 * wherever they exist.
 */
export const ENTITY_ICONS = {
  goal: Target,
  project: Folder,
  task: SquareCheck,
  note: NotebookPen,
  resource: Link2,
  topic: Tag,
} as const satisfies Record<string, LucideIcon>;

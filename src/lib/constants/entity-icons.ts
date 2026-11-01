import type { ComponentType } from "react";

import {
  CircleCheckIcon,
  FolderOpenIcon,
  LayersIcon,
  Link2Icon,
  RocketIcon,
  SquarePenIcon,
} from "@/components/icons";

export type EntityIcon = ComponentType<{
  className?: string;
  size?: number;
}>;

/**
 * Canonical animated glyph per entity type (pqoqubbw/icons, hover-animated).
 * Single source of truth for rollup counts, link badges and type pills,
 * replacing the emoji set that previously drifted across components.
 * User-chosen entity emoji (area/goal/project icons via the emoji picker)
 * are rendered separately and take precedence wherever they exist.
 */
export const ENTITY_ICONS = {
  goal: RocketIcon,
  project: FolderOpenIcon,
  task: CircleCheckIcon,
  note: SquarePenIcon,
  resource: Link2Icon,
  topic: LayersIcon,
} as const satisfies Record<string, EntityIcon>;

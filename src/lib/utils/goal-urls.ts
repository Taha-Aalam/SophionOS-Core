import { generateSlug } from "@/lib/utils";
import type { Goal } from "@/lib/types/domain.types";

/**
 * Build the href string for a goal detail page.
 * Uses slug-based URL pattern: /goals/<slug>
 */
export function buildGoalDetailHref(goal: Goal): string {
  const slug = goal.slug ?? generateSlug(goal.name);
  return `/goals/${slug}`;
}

/**
 * Get the slug from a goal name.
 */
export function getGoalSlug(name: string): string {
  return generateSlug(name);
}

/**
 * Resolve a goal from a list by slug.
 * Returns the first matching goal, or undefined.
 */
export function resolveGoalBySlug(goals: Goal[], slug: string): Goal | undefined {
  return goals.find((g) => (g.slug ?? generateSlug(g.name)) === slug);
}

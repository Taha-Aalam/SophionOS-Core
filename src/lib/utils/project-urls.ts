import { generateSlug } from "@/lib/utils";
import type { Project } from "@/lib/types/domain.types";

/**
 * Build the href string for a project detail page.
 * Uses slug-based URL pattern: /projects/<slug>
 */
export function buildProjectDetailHref(project: Project): string {
  const slug = project.slug ?? generateSlug(project.name);
  return `/projects/${slug}`;
}

/**
 * Get the slug from a project name.
 */
export function getProjectSlug(name: string): string {
  return generateSlug(name);
}

/**
 * Resolve a project from a list by slug.
 * Returns the first matching project, or undefined.
 */
export function resolveProjectBySlug(
  projects: Project[],
  slug: string,
): Project | undefined {
  return projects.find((p) => (p.slug ?? generateSlug(p.name)) === slug);
}

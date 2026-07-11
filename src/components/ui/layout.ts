/**
 * Shared responsive layout utilities.
 *
 * The card-grid rhythm (1 column on mobile -> 2 on tablet -> 3 on desktop)
 * was duplicated across ~14 surfaces with three different class orderings
 * that all compile to the same CSS. Centralize it so the canonical grid is
 * defined once and future pages stay visually consistent.
 *
 * Intentionally NOT included: the `md:grid-cols-2 xl:grid-cols-3` rhythm used
 * by detail views (projects/goals/areas) is a wider-breakpoint 2->3 intent and
 * lives separately to avoid merging two distinct layouts.
 */
export const cardGrid = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

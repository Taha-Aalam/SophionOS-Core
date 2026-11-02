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
export const cardGrid = "grid grid-cols-1 gap-[var(--grid-gap-sm)] sm:grid-cols-2 lg:grid-cols-3 sm:gap-[var(--grid-gap)]";

/**
 * Centered content column for standard grid surfaces (Dashboard, Areas, Goals, Projects, Contacts, Topics, Tasks).
 * Enforces the Muse-style calm centered column (~1240px max-width) with generous responsive gutters.
 */
export const contentColumnGrid =
  "mx-auto w-full max-w-[var(--content-max-width-grid)] px-4 py-6 sm:px-6 sm:py-8 lg:px-8";

/**
 * Centered content column for reading-first surfaces (Notes detail, Resources stream, Settings documents).
 * Enforces a narrower column (~864px max-width) for optimal typographical line length and reading calm.
 */
export const contentColumnReading =
  "mx-auto w-full max-w-[var(--content-max-width-reading)] px-4 py-6 sm:px-6 sm:py-8 lg:px-8";

/** Shared grid gap token class for multi-column surfaces. */
export const gridGap = "gap-[var(--grid-gap-sm)] sm:gap-[var(--grid-gap)]";

/** Generous vertical section rhythm token class. */
export const sectionGap = "gap-8 sm:gap-10";

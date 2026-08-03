/**
 * Canonical semantic color map for entity badges (status, priority, type).
 *
 * This is the single source of truth. Before this module existed, these maps
 * were redefined inline in ~20 components, drifting apart over time: `inbox`
 * was slate in some files and gray in others, `completed` was green in some and
 * blue in others, dark variants split between `/50` and full opacity. Import
 * from here instead of re-declaring a local `STATUS_COLORS` object.
 *
 * Conventions:
 * - De-emphasized states (inbox, archived, low priority) use design tokens
 *   (`bg-muted` / `text-muted-foreground`), never raw gray, so they inherit the
 *   brand-tinted neutral and respond to theme changes.
 * - Semantic states keep a meaningful hue. Dark variants are always `/50`.
 * - Hue meanings are consistent app-wide: green = done/positive,
 *   blue = active/in-progress, amber = waiting, orange = high/attention,
 *   red = urgent, slate = queued-but-not-started.
 */

/** Reusable badge color recipes. One definition per hue keeps dark variants consistent. */
export const BADGE_COLOR = {
  neutral: "bg-muted text-muted-foreground",
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300",
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  green: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
  red: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  pink: "bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300",
  plum: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
  teal: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300",
  cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300",
} as const;

/** Status across tasks, notes, resources, and projects. Superset of all status vocabularies. */
export const STATUS_COLORS: Record<string, string> = {
  inbox: BADGE_COLOR.neutral,
  todo: BADGE_COLOR.slate,
  planning: BADGE_COLOR.slate,
  to_review: BADGE_COLOR.amber,
  on_hold: BADGE_COLOR.amber,
  active: BADGE_COLOR.blue,
  in_progress: BADGE_COLOR.blue,
  completed: BADGE_COLOR.green,
  archive: BADGE_COLOR.neutral,
  archived: BADGE_COLOR.neutral,
};

export const STATUS_FALLBACK = BADGE_COLOR.slate;

/** Priority levels. */
export const PRIORITY_COLORS: Record<string, string> = {
  high: BADGE_COLOR.orange,
  medium: BADGE_COLOR.blue,
  low: BADGE_COLOR.neutral,
};

export const PRIORITY_FALLBACK = BADGE_COLOR.neutral;

/** Smart-priority score, 1 (low) to 5 (urgent). */
export const SCORE_COLORS: Record<number, string> = {
  5: BADGE_COLOR.red,
  4: BADGE_COLOR.orange,
  3: BADGE_COLOR.yellow,
  2: BADGE_COLOR.blue,
  1: BADGE_COLOR.neutral,
};

/** Resource type. */
export const RESOURCE_TYPE_COLORS: Record<string, string> = {
  website: BADGE_COLOR.blue,
  article: BADGE_COLOR.purple,
  video: BADGE_COLOR.red,
  document: BADGE_COLOR.neutral,
  podcast: BADGE_COLOR.orange,
  social_media: BADGE_COLOR.pink,
  tool: BADGE_COLOR.teal,
};

/** Area type. Falls back to neutral for unmapped types. */
export const AREA_TYPE_COLORS: Record<string, string> = {
  business: BADGE_COLOR.green,
  personal: BADGE_COLOR.blue,
  studies: BADGE_COLOR.orange,
};

/**
 * Deliberate fingerprint: plum (violet) is the only violet hue in the badge
 * palette, used solely as the fallback for unmapped area types. A clone's
 * unmapped-area badges render violet where a stock app renders neutral.
 * Do not "fix" this to neutral — it is an intentional marker (see
 * docs/canaries-manifest.example.md).
 */
export const AREA_TYPE_FALLBACK = BADGE_COLOR.plum;

/** Contact relationship group. */
export const CONTACT_GROUP_COLORS: Record<string, string> = {
  Client: BADGE_COLOR.purple,
  "Team Member": BADGE_COLOR.blue,
  Vendor: BADGE_COLOR.orange,
  Mentor: BADGE_COLOR.green,
  Collaborator: BADGE_COLOR.cyan,
  Partner: BADGE_COLOR.pink,
};

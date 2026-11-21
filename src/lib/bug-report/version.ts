/**
 * Build-surfaced app metadata for the bug report. Kept in its own module so
 * importing the event name / repo constant elsewhere never pulls the
 * package.json fallback into unrelated client chunks (the sidebar and the
 * error boundary only need the event name).
 *
 * next.config.ts `env` reads package.json and inlines NEXT_PUBLIC_APP_VERSION
 * at build time — no version string is hardcoded in a component. The named
 * JSON import is the vitest/dev fallback where the inline hasn't run.
 */

import { version as packageVersion } from "../../../package.json";

export const APP_VERSION: string = process.env.NEXT_PUBLIC_APP_VERSION ?? packageVersion;

/** Git SHA when the build platform exposes one (e.g. Vercel); "" otherwise. */
export const BUILD_SHA: string = process.env.NEXT_PUBLIC_GIT_COMMIT_SHA ?? "";

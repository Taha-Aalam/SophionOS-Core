// Feature flags for SophionOS.
//
// Each flag is a simple boolean constant. Flip a value to `true` to enable its
// feature; defaults are `false`. Because these live in source, the flag state
// is version-controlled (git shows when a feature was turned on) and
// `isFeatureEnabled` is pure, so it works in both server and client
// components without any build-time env inlining.
//
// To turn a flag on, set its value to `true` below and redeploy.

export type FeatureFlag = "cloud_later" | "sop_cloud";

/**
 * Feature flag values — the single source of truth.
 * - cloud_later: shows the Notifications settings tab (briefings/digests/reminders).
 * - sop_cloud: shows the Billing settings tab (plan, usage, upgrades).
 */
export const FEATURE_FLAGS: Record<FeatureFlag, boolean> = {
  cloud_later: false,
  sop_cloud: false,
};

/**
 * True when the flag is enabled. Defaults to false — flags are OFF until
 * turned on in {@link FEATURE_FLAGS}.
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag] ?? false;
}

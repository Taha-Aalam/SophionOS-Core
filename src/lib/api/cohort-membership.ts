const TIMEOUT_MS = 3000;

/**
 * Checks whether an email is a paid Founding Cohort member by asking the
 * marketing site's membership API (GET /api/cohort/membership, gated by a
 * shared secret sent as x-cohort-key). Fail-closed: returns false when
 * unconfigured, unreachable, or on any error, so a marketing-site outage can
 * never break dashboard rendering.
 */
export async function isCohortMember(email: string | null): Promise<boolean> {
  const base = process.env.COHORT_MEMBERSHIP_URL;
  const secret = process.env.COHORT_MEMBERSHIP_SECRET;
  if (!base || !secret || !email) return false;
  try {
    const res = await fetch(
      `${base.replace(/\/+$/, "")}/api/cohort/membership?email=${encodeURIComponent(email)}`,
      {
        headers: { "x-cohort-key": secret },
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      },
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { member?: boolean };
    return data.member === true;
  } catch {
    return false;
  }
}

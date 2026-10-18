/**
 * Standard document header for every policy page: what version you are reading,
 * when it took effect, and what changed. Kept as one component so the six
 * documents cannot drift into six different header formats.
 *
 * Deliberately NOT a TrustPage prop — a page can carry two (e.g. a "previous
 * version" pointer) without touching the shared shell.
 */
export function PolicyMeta({
  version,
  effective,
  summary,
}: {
  version: string;
  effective: string;
  summary: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
      <p>
        <strong className="text-foreground">Version {version}</strong> · Effective{" "}
        {effective}
      </p>
      <p className="mt-1">{summary}</p>
    </div>
  );
}

import { TrustPageShell } from "@/components/trust/trust-page-shell";

export const metadata = {
  title: "Subprocessors | SophionOS",
  description: "Vendors that may process SophionOS data.",
};

export default function SubprocessorsPage() {
  return (
    <TrustPageShell title="Subprocessors">
      <p>
        Depending on deployment (Sophion Cloud vs self-host), the following may
        process data:
      </p>
      <table>
        <thead>
          <tr>
            <th>Vendor</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Clerk</td>
            <td>Authentication, sessions, account identity</td>
          </tr>
          <tr>
            <td>Supabase / Postgres</td>
            <td>Application database and optional storage</td>
          </tr>
          <tr>
            <td>Vercel (hosted)</td>
            <td>Application hosting and edge delivery</td>
          </tr>
          <tr>
            <td>Billing provider (Cloud)</td>
            <td>Subscriptions and invoices when enabled</td>
          </tr>
          <tr>
            <td>PostHog (optional)</td>
            <td>Product analytics only if keys are configured</td>
          </tr>
          <tr>
            <td>User-chosen AI clients</td>
            <td>MCP/API consumers authorized by the user</td>
          </tr>
        </tbody>
      </table>
      <p className="text-sm text-muted-foreground">
        Self-hosters choose their own processors. Keep{" "}
        <code>docs/data-inventory.md</code> current when integrations change.
      </p>
    </TrustPageShell>
  );
}

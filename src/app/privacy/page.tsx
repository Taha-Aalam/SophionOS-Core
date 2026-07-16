import { TrustPageShell } from "@/components/trust/trust-page-shell";

export const metadata = {
  title: "Privacy | SophionOS",
  description: "How SophionOS handles your personal context data.",
};

export default function PrivacyPage() {
  return (
    <TrustPageShell title="Privacy">
      <p>
        Your SophionOS data is yours. We do not train AI models on your private
        SophionOS content. SophionOS does not send your data to an AI model by
        default.
      </p>
      <h2>What we store</h2>
      <p>
        Account identity (via Clerk), your work graph (areas, goals, projects,
        tasks), knowledge (notes, resources, topics), relationships (contacts),
        API key metadata (hashed secrets only), settings, and optional billing
        records. See also the product data inventory maintained for operators.
      </p>
      <h2>Your controls</h2>
      <ul>
        <li>Review and revoke AI/API access in Settings → AI Access</li>
        <li>Export your data from Settings → Privacy &amp; data</li>
        <li>Request account deletion with a grace period from Privacy &amp; data</li>
      </ul>
      <h2>AI clients</h2>
      <p>
        When you connect Claude, Cursor, or another MCP client, SophionOS serves
        data through the API key you authorize. The client and its model provider
        process whatever that client sends under their terms—outside SophionOS
        control after you connect them.
      </p>
      <h2>Retention &amp; deletion</h2>
      <p>
        Application data is kept until you delete it or complete account
        deletion. Backups may persist for a provider-defined window. Billing and
        legal records may be retained where required. We do not claim instant
        erasure from every backup worldwide.
      </p>
      <p className="text-sm text-muted-foreground">
        This page is product documentation, not legal counsel. Formal policy
        publication may follow legal review.
      </p>
    </TrustPageShell>
  );
}

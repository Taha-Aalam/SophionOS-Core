import { FeatureDisabled } from "@/components/settings/feature-disabled";
import { isFeatureEnabled } from "@/lib/config/feature-flags";

import { BillingContent } from "./billing-content";

export default function BillingPage() {
  // sop_cloud gates the entire Billing feature. When off, the tab is hidden on
  // the settings landing page and direct URL access is blocked here.
  if (!isFeatureEnabled("sop_cloud")) {
    return (
      <div className="content-fade-in reveal-stagger flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
        <FeatureDisabled feature="Billing" />
      </div>
    );
  }

  return <BillingContent />;
}

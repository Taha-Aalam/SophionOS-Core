import { FeatureDisabled } from "@/components/settings/feature-disabled";
import { isFeatureEnabled } from "@/lib/config/feature-flags";

import { NotificationsContent } from "./notifications-content";

export default function NotificationsPage() {
  // cloud_later gates the entire Notifications feature. When off, the tab is
  // hidden on the settings landing page and direct URL access is blocked here.
  if (!isFeatureEnabled("cloud_later")) {
    return (
      <div className="content-fade-in reveal-stagger flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
        <FeatureDisabled feature="Notifications" />
      </div>
    );
  }

  return <NotificationsContent />;
}

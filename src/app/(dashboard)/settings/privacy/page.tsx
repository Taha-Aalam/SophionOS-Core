import { PrivacyCenter } from "@/components/settings/privacy-center";
import { SettingsDetailHeader } from "@/components/settings/settings-detail-header";

export default function PrivacySettingsPage() {
  return (
    <div className="content-fade-in reveal-stagger flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <SettingsDetailHeader
        title="Privacy & data"
        description="Inspect what SophionOS stores, export your data, and request account deletion."
      />
      <PrivacyCenter />
    </div>
  );
}

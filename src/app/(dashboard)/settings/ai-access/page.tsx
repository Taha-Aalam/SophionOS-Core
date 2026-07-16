import { AiAccessCard } from "@/components/settings/ai-access-card";
import { SettingsDetailHeader } from "@/components/settings/settings-detail-header";

export default function AiAccessPage() {
  return (
    <div className="content-fade-in reveal-stagger flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <SettingsDetailHeader
        title="AI Access"
        description="Control which AI clients and external tools can access your SophionOS context. Revoke keys or disable all AI access at any time."
      />
      <AiAccessCard />
    </div>
  );
}

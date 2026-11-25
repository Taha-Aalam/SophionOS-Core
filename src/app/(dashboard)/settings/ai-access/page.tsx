import { useI18n } from "@/components/providers/i18n-provider";
import { AiAccessCard } from "@/components/settings/ai-access-card";
import { SettingsDetailHeader } from "@/components/settings/settings-detail-header";

export default function AiAccessPage() {
  const { t } = useI18n();
  return (
    <div className="content-fade-in reveal-stagger flex flex-col gap-6 p-6 content-column-grid mx-auto w-full">
      <SettingsDetailHeader
        title={t("settings.aiAccess.title")}
        description={t("page.controlWhichAiClientsAndExternalToolsCanAc")}
      />
      <AiAccessCard />
    </div>
  );
}

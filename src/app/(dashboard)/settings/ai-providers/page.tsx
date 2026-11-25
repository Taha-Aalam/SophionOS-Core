import { useI18n } from "@/components/providers/i18n-provider";
import { AiProvidersContent } from "@/components/settings/ai-providers-content";
import { SettingsDetailHeader } from "@/components/settings/settings-detail-header";

export default function AiProvidersPage() {
  const { t } = useI18n();
  return (
    <div className="content-fade-in reveal-stagger flex flex-col gap-6 p-6 content-column-grid mx-auto w-full">
      <SettingsDetailHeader
        title={t("settings.aiProviders.title")}
        description={t("page.connectYourOwnAiProviderKeysClaudeGptGemin")}
      />

      <AiProvidersContent />
    </div>
  );
}

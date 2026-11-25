import { useI18n } from "@/components/providers/i18n-provider";
import { ApiKeyManager } from "@/components/settings/api-key-manager";
import { SettingsDetailHeader } from "@/components/settings/settings-detail-header";

export default function ApiKeysPage() {
  const { t } = useI18n();
  return (
    <div className="content-fade-in reveal-stagger flex flex-col gap-6 p-6 content-column-grid mx-auto w-full">
      <SettingsDetailHeader
        title={t("chrome.apiKeys")}
        description={t("page.createAndManageApiKeysToAuthenticateYourMc")}
      />

      <ApiKeyManager />
    </div>
  );
}

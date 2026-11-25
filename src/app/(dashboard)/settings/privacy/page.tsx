import { useI18n } from "@/components/providers/i18n-provider";
import { PrivacyCenter } from "@/components/settings/privacy-center";
import { SettingsDetailHeader } from "@/components/settings/settings-detail-header";

export default function PrivacySettingsPage() {
  const { t } = useI18n();
  return (
    <div className="content-fade-in reveal-stagger flex flex-col gap-6 p-6 content-column-grid mx-auto w-full">
      <SettingsDetailHeader
        title={t("settings.privacy.title")}
        description={t("page.inspectWhatSophionosStoresExportYourDataAn")}
      />
      <PrivacyCenter />
    </div>
  );
}

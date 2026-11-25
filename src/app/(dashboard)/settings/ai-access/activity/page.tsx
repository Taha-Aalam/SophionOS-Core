import { useI18n } from "@/components/providers/i18n-provider";
import Link from "next/link";
import { AiActivityList } from "@/components/settings/ai-activity-list";
import { SettingsDetailHeader } from "@/components/settings/settings-detail-header";
import { buttonVariants } from "@/components/ui/button";

export default function AiActivityPage() {
  const { t } = useI18n();
  return (
    <div className="content-fade-in reveal-stagger flex flex-col gap-6 p-6 content-column-grid mx-auto w-full">
      <SettingsDetailHeader
        title={t("page.aiActivity")}
        description={t("page.reviewWhatConnectedClientsAndApiKeysDidRec")}
      />
      <div>
        <Link
          href="/settings/ai-access"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          {t("page.backToAiAccess")}
        </Link>
      </div>
      <AiActivityList />
    </div>
  );
}

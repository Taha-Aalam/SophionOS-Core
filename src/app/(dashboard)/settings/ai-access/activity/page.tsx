import Link from "next/link";
import { AiActivityList } from "@/components/settings/ai-activity-list";
import { SettingsDetailHeader } from "@/components/settings/settings-detail-header";
import { Button } from "@/components/ui/button";

export default function AiActivityPage() {
  return (
    <div className="content-fade-in reveal-stagger flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <SettingsDetailHeader
        title="AI activity"
        description="Review what connected clients and API keys did recently."
      />
      <div>
        <Button asChild variant="outline" size="sm">
          <Link href="/settings/ai-access">← Back to AI Access</Link>
        </Button>
      </div>
      <AiActivityList />
    </div>
  );
}

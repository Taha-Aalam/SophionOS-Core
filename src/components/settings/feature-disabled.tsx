import { useI18n } from "@/components/providers/i18n-provider";
import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface FeatureDisabledProps {
  /** Display name of the gated feature, e.g. "Notifications". */
  feature: string;
}

/**
 * Rendered in place of a feature's content when its feature flag is OFF.
 * Keeps the route reachable by URL but makes clear the feature is turned off,
 * with a link back to the settings landing page. This is a Server Component
 * (no client hooks) so it can be rendered directly from a server `page.tsx`.
 */
export function FeatureDisabled({ feature }: FeatureDisabledProps) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-2">
          <Lock className="size-5 text-muted-foreground" aria-hidden="true" />
          <CardTitle className="text-base">{feature} {t("featureDisabled.isUnavailable")}</CardTitle>
        </div>
        <CardDescription>
          {t("featureDisabled.thisFeatureIsCurrentlyTurnedOffAndWillAppe")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none rounded"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("featureDisabled.backToSettings")}
        </Link>
      </CardContent>
    </Card>
  );
}

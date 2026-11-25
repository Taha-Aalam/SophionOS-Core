"use client";
import { useI18n } from "@/components/providers/i18n-provider";

import { RouteError } from "@/components/route-error";

export default function GoalDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();
  return (
    <RouteError
      error={error}
      reset={reset}
      title={t("error.thisGoalCouldNotBeLoaded")}
      description={t("error.somethingWentWrongLoadingThisGoalTryAgainO")}
    />
  );
}

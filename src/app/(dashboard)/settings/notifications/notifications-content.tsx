"use client";
import { useI18n } from "@/components/providers/i18n-provider";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { SettingsDetailHeader } from "@/components/settings/settings-detail-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import {
  useNotifications,
  useUpdateNotifications,
} from "@/lib/hooks/use-user-settings";
import { useAuth } from "@/components/providers/auth-provider";
import {
  getProviderDefinition,
  PROVIDER_IDS,
} from "@/lib/ai/provider-registry";
import { useAiProviders } from "@/lib/hooks/use-ai-providers";

const WEEKDAYS = [
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
];

const HOURS = Array.from({ length: 24 }, (_, h) => ({
  value: h,
  label: `${String(h).padStart(2, "0")}:00`,
}));

function HourSelect(input: {
  id: string;
  name: string;
  defaultValue: number;
  disabled?: boolean;
}) {
  return (
    <select
      id={input.id}
      name={input.name}
      defaultValue={input.defaultValue}
      disabled={input.disabled}
      className="flex h-9 w-full max-w-40 rounded-md border border-input bg-transparent px-3 text-sm"
    >
      {HOURS.map((h) => (
        <option key={h.value} value={h.value}>
          {h.label}
        </option>
      ))}
    </select>
  );
}

export function NotificationsContent() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { data: notifications } = useNotifications();
  const { mutate: updateNotifications, isPending } = useUpdateNotifications();
  const [digestDaySelect, setDigestDaySelect] = useState<number>();
  const { providers, loading: providersLoading } = useAiProviders();
  const [narrationProviderSelect, setNarrationProviderSelect] = useState<
    string | undefined
  >();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const morningBriefingEnabled =
      formData.get("morning_briefing_enabled") === "on";
    const morningHourRaw = formData.get("morning_briefing_hour");
    const eveningReviewEnabled = formData.get("evening_review_enabled") === "on";
    const eveningHourRaw = formData.get("evening_review_hour");
    const weeklyDigestDay = formData.get("weekly_digest_day")
      ? Number(formData.get("weekly_digest_day"))
      : null;
    const weeklyHourRaw = formData.get("weekly_digest_hour");
    const emailEnabled = formData.get("email_enabled") === "on";
    const narrationEnabled = formData.get("ai_narration_enabled") === "on";
    const narrationProvider = formData.get("ai_narration_provider");
    const narrationModel = formData.get("ai_narration_model");

    updateNotifications(
      {
        morning_briefing_enabled: morningBriefingEnabled,
        morning_briefing_hour: morningBriefingEnabled
          ? Number(morningHourRaw ?? 8)
          : null,
        evening_review_enabled: eveningReviewEnabled,
        evening_review_hour: eveningReviewEnabled
          ? Number(eveningHourRaw ?? 18)
          : null,
        weekly_digest_day: weeklyDigestDay,
        weekly_digest_hour: weeklyDigestDay !== null ? Number(weeklyHourRaw ?? 9) : null,
        email_enabled: emailEnabled,
        ai_narration_enabled: narrationEnabled,
        ai_narration_provider:
          narrationEnabled && typeof narrationProvider === "string" && narrationProvider
            ? narrationProvider
            : null,
        ai_narration_model:
          narrationEnabled && typeof narrationModel === "string" && narrationModel
            ? narrationModel
            : null,
      },
      {
        onSuccess: () => toast.success(t("notificationsContent.notificationSettingsSaved")),
      },
    );
  }

  if (!user) return (
    <div className="reveal-stagger flex flex-col gap-6 p-6 content-column-grid mx-auto w-full" aria-busy="true" role="status" aria-label={t("notificationsContent.loadingNotifications")}>
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="h-64 w-full rounded-lg border border-border/40 bg-muted/30 animate-pulse" />
        <div className="h-48 w-full rounded-lg border border-border/40 bg-muted/30 animate-pulse" />
      </div>
    </div>
  );

  const connectedProvider = providers.find(
    (p) => p.provider === narrationProviderSelect,
  );
  const narrationModels = narrationProviderSelect
    ? getProviderDefinition(narrationProviderSelect as never).models
    : [];
  const narrationModelDefault =
    narrationProviderSelect
      ? getProviderDefinition(narrationProviderSelect as never).defaultModel
      : "";

  return (
    <div className="content-fade-in reveal-stagger flex flex-col gap-6 p-6 content-column-grid mx-auto w-full">
      <SettingsDetailHeader
        title={t("settings.notifications.title")}
        description={t("notificationsContent.sophionosEmailsBriefingsAroundTheHourYouSe")}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("notificationsContent.deliveryChannel")}</CardTitle>
            <CardDescription>
              {t("notificationsContent.additionalChannelsTelegramWhatsappLaterDel")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="email_enabled">{t("notificationsContent.emailDelivery")}</Label>
                <CardDescription>
                  {t("notificationsContent.sendBriefingsToTheEmailOnYourAccount")}
                </CardDescription>
              </div>
              <Checkbox
                id="email_enabled"
                name="email_enabled"
                defaultChecked={notifications?.email_enabled !== false}
                disabled={isPending}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("notificationsContent.dailyBriefings")}</CardTitle>
            <CardDescription>
              {t("notificationsContent.startAndEndYourDayWithASummaryOfWhatMatter")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="morning_briefing_enabled">
                  {t("notificationsContent.morningBriefing")}
                </Label>
                <CardDescription>
                  {t("notificationsContent.aSummaryOfYourTopPrioritiesFirstThing")}
                </CardDescription>
              </div>
              <Checkbox
                id="morning_briefing_enabled"
                name="morning_briefing_enabled"
                defaultChecked={notifications?.morning_briefing_enabled ?? false}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="morning_briefing_hour">{t("notificationsContent.morningHour")}</Label>
              <HourSelect
                id="morning_briefing_hour"
                name="morning_briefing_hour"
                defaultValue={notifications?.morning_briefing_hour ?? 8}
                disabled={isPending}
              />
            </div>

            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="evening_review_enabled">{t("notificationsContent.eveningReview")}</Label>
                <CardDescription>
                  {t("notificationsContent.reflectOnProgressAndPlanTomorrow")}
                </CardDescription>
              </div>
              <Checkbox
                id="evening_review_enabled"
                name="evening_review_enabled"
                defaultChecked={notifications?.evening_review_enabled ?? false}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evening_review_hour">{t("notificationsContent.eveningHour")}</Label>
              <HourSelect
                id="evening_review_hour"
                name="evening_review_hour"
                defaultValue={notifications?.evening_review_hour ?? 18}
                disabled={isPending}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("notificationsContent.weeklyDigest")}</CardTitle>
            <CardDescription>
              {t("notificationsContent.aWeeklySummaryOfYourProgressAndInsightsOnT")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="weekly_digest_day">{t("notificationsContent.dayOfWeek")}</Label>
              <Select
                name="weekly_digest_day"
                value={String(digestDaySelect ?? notifications?.weekly_digest_day ?? 0)}
                onValueChange={(v) => setDigestDaySelect(Number(v))}
                disabled={isPending}
              >
                <SelectTrigger className="w-full max-w-48">
                  <SelectValue placeholder={t("notificationsContent.selectDay")} />
                </SelectTrigger>
                <SelectContent>
                  {WEEKDAYS.map((d) => (
                    <SelectItem key={d.value} value={String(d.value)}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="weekly_digest_hour">{t("notificationsContent.digestHour")}</Label>
              <HourSelect
                id="weekly_digest_hour"
                name="weekly_digest_hour"
                defaultValue={notifications?.weekly_digest_hour ?? 9}
                disabled={isPending}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-primary" aria-hidden="true" />
              {t("notificationsContent.aiwrittenSummaries")}
            </CardTitle>
            <CardDescription>
              {t("notificationsContent.whenEnabledEachBriefOpensWithAShortSummary")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="ai_narration_enabled">{t("notificationsContent.aiSummaries")}</Label>
                <CardDescription>
                  {t("notificationsContent.usesYourOwnApiKeyFrom")}{" "}
                  <Link href="/settings/ai-providers" className="underline">
                    {t("notificationsContent.settingsAiProviders")}
                  </Link>
                  .
                </CardDescription>
              </div>
              <Checkbox
                id="ai_narration_enabled"
                name="ai_narration_enabled"
                defaultChecked={notifications?.ai_narration_enabled ?? false}
                disabled={isPending || providersLoading}
              />
            </div>

            {providers.length === 0 ? (
              <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                {t("notificationsContent.noProviderConnectedYet")}{" "}
                <Link href="/settings/ai-providers" className="underline">
                  {t("notificationsContent.connectOne")}
                </Link>{" "}
                {t("notificationsContent.toEnableAiSummaries")}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ai_narration_provider">{t("notificationsContent.provider")}</Label>
                  <Select
                    name="ai_narration_provider"
                    value={
                      narrationProviderSelect ??
                      notifications?.ai_narration_provider ??
                      String(providers[0]?.provider ?? "")
                    }
                    onValueChange={(v) => {
                      setNarrationProviderSelect(v ?? undefined);
                    }}
                    disabled={isPending}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("notificationsContent.selectProvider")} />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDER_IDS.filter((id) =>
                        providers.some((p) => p.provider === id),
                      ).map((id) => (
                        <SelectItem key={id} value={id}>
                          {getProviderDefinition(id).label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {narrationModels.length > 0 ? (
                  <div className="space-y-2">
                    <Label htmlFor="ai_narration_model">{t("notificationsContent.model")}</Label>
                    <select
                      id="ai_narration_model"
                      name="ai_narration_model"
                      defaultValue={
                        notifications?.ai_narration_model ??
                        narrationModelDefault
                      }
                      disabled={isPending}
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    >
                      {narrationModels.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : narrationProviderSelect ? (
                  <div className="space-y-2">
                    <Label htmlFor="ai_narration_model">{t("notificationsContent.model2")}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t("notificationsContent.customProvidersUseTheModelStoredOnTheCrede")}{connectedProvider?.model ?? t("notificationsContent.setItInAiProviders")}).
                    </p>
                  </div>
                ) : null}
                {connectedProvider?.status === "invalid" ? (
                  <Badge variant="destructive">{t("notificationsContent.connectedKeyIsInvalid")}</Badge>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : t("notificationsContent.saveNotificationSettings")}
          </Button>
        </div>
      </form>
    </div>
  );
}

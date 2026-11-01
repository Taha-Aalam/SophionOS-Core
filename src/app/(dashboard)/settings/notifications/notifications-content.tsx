"use client";

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
        onSuccess: () => toast.success("Notification settings saved"),
      },
    );
  }

  if (!user) return (
    <div className="reveal-stagger flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full" aria-busy="true" role="status" aria-label="Loading notifications">
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
    <div className="content-fade-in reveal-stagger flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <SettingsDetailHeader
        title="Notifications"
        description="SophionOS emails briefings around the hour you set, in your timezone, using your account email. Set your timezone under Preferences."
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Delivery channel</CardTitle>
            <CardDescription>
              Additional channels (Telegram, WhatsApp) later. Delivery uses the
              timezone from Settings → Preferences.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="email_enabled">Email delivery</Label>
                <CardDescription>
                  Send briefings to the email on your account.
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
            <CardTitle className="text-base">Daily briefings</CardTitle>
            <CardDescription>
              Start and end your day with a summary of what matters. Each
              arrives on the first hourly check at or after the hour you pick.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="morning_briefing_enabled">
                  Morning briefing
                </Label>
                <CardDescription>
                  A summary of your top priorities first thing.
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
              <Label htmlFor="morning_briefing_hour">Morning hour</Label>
              <HourSelect
                id="morning_briefing_hour"
                name="morning_briefing_hour"
                defaultValue={notifications?.morning_briefing_hour ?? 8}
                disabled={isPending}
              />
            </div>

            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="evening_review_enabled">Evening review</Label>
                <CardDescription>
                  Reflect on progress and plan tomorrow.
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
              <Label htmlFor="evening_review_hour">Evening hour</Label>
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
            <CardTitle className="text-base">Weekly digest</CardTitle>
            <CardDescription>
              A weekly summary of your progress and insights, on the day and
              around the hour you pick.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="weekly_digest_day">Day of week</Label>
              <Select
                name="weekly_digest_day"
                value={String(digestDaySelect ?? notifications?.weekly_digest_day ?? 0)}
                onValueChange={(v) => setDigestDaySelect(Number(v))}
                disabled={isPending}
              >
                <SelectTrigger className="w-full max-w-48">
                  <SelectValue placeholder="Select day" />
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
              <Label htmlFor="weekly_digest_hour">Digest hour</Label>
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
              AI-written summaries
            </CardTitle>
            <CardDescription>
              When enabled, each brief opens with a short summary written by
              your connected AI provider, based on the same dashboard data the
              brief already contains. If the provider is unavailable, the
              standard brief is sent instead.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between space-x-2">
              <div className="space-y-0.5">
                <Label htmlFor="ai_narration_enabled">AI summaries</Label>
                <CardDescription>
                  Uses your own API key from{" "}
                  <Link href="/settings/ai-providers" className="underline">
                    Settings → AI Providers
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
                No provider connected yet.{" "}
                <Link href="/settings/ai-providers" className="underline">
                  Connect one
                </Link>{" "}
                to enable AI summaries.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ai_narration_provider">Provider</Label>
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
                      <SelectValue placeholder="Select provider" />
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
                    <Label htmlFor="ai_narration_model">Model</Label>
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
                    <Label htmlFor="ai_narration_model">Model</Label>
                    <p className="text-xs text-muted-foreground">
                      Custom providers use the model stored on the credential
                      ({connectedProvider?.model ?? "set it in AI Providers"}).
                    </p>
                  </div>
                ) : null}
                {connectedProvider?.status === "invalid" ? (
                  <Badge variant="destructive">Connected key is invalid</Badge>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Save notification settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}

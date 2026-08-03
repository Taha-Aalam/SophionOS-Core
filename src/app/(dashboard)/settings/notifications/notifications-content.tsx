"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsDetailHeader } from "@/components/settings/settings-detail-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

import {
  useNotifications,
  useUpdateNotifications,
} from "@/lib/hooks/use-user-settings";
import { useAuth } from "@/components/providers/auth-provider";

const WEEKDAYS = [
  { label: "Sunday", value: 0 },
  { label: "Monday", value: 1 },
  { label: "Tuesday", value: 2 },
  { label: "Wednesday", value: 3 },
  { label: "Thursday", value: 4 },
  { label: "Friday", value: 5 },
  { label: "Saturday", value: 6 },
];

export function NotificationsContent() {
  const { user } = useAuth();
  const { data: notifications } = useNotifications();
  const { mutate: updateNotifications, isPending } = useUpdateNotifications();
  const [digestDaySelect, setDigestDaySelect] = useState<number>();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const morningBriefingEnabled = formData.get("morning_briefing_enabled") === "on";
    const morningBriefingTime = formData.get("morning_briefing_time") as string | null;
    const eveningReviewEnabled = formData.get("evening_review_enabled") === "on";
    const eveningReviewTime = formData.get("evening_review_time") as string | null;
    const weeklyDigestDay = formData.get("weekly_digest_day")
      ? Number(formData.get("weekly_digest_day"))
      : null;
    const emailEnabled = formData.get("email_enabled") === "on";

    updateNotifications(
      {
        morning_briefing_enabled: morningBriefingEnabled,
        morning_briefing_time: morningBriefingEnabled ? morningBriefingTime : null,
        evening_review_enabled: eveningReviewEnabled,
        evening_review_time: eveningReviewEnabled ? eveningReviewTime : null,
        weekly_digest_day: weeklyDigestDay,
        email_enabled: emailEnabled,
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

  return (
    <div className="content-fade-in reveal-stagger flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <SettingsDetailHeader
        title="Notifications"
        description="SophionOS emails briefings at the times you set (within a 15-minute window), using your account email. Set your timezone under Preferences."
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
              Start and end your day with a summary of what matters. Sent within
              15 minutes of the time you set.
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
            {notifications?.morning_briefing_enabled && (
              <div className="space-y-2">
                <Label htmlFor="morning_briefing_time">Time</Label>
                <Input
                  id="morning_briefing_time"
                  name="morning_briefing_time"
                  type="time"
                  defaultValue={notifications.morning_briefing_time ?? "08:00"}
                  disabled={isPending}
                />
              </div>
            )}

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
            {notifications?.evening_review_enabled && (
              <div className="space-y-2">
                <Label htmlFor="evening_review_time">Time</Label>
                <Input
                  id="evening_review_time"
                  name="evening_review_time"
                  type="time"
                  defaultValue={notifications.evening_review_time ?? "18:00"}
                  disabled={isPending}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekly digest</CardTitle>
            <CardDescription>
              A weekly summary of your progress and insights. Weekly digest
              emails send at 09:00 local on the selected day.
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

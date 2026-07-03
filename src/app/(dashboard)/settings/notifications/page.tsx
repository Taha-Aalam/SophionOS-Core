"use client";

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

export default function NotificationsPage() {
  const { user } = useAuth();
  const { data: notifications } = useNotifications();
  const { mutate: updateNotifications, isPending } = useUpdateNotifications();

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

    updateNotifications(
      {
        morning_briefing_enabled: morningBriefingEnabled,
        morning_briefing_time: morningBriefingEnabled ? morningBriefingTime : null,
        evening_review_enabled: eveningReviewEnabled,
        evening_review_time: eveningReviewEnabled ? eveningReviewTime : null,
        weekly_digest_day: weeklyDigestDay,
      },
      {
        onSuccess: () => toast.success("Notification settings saved"),
      },
    );
  }

  if (!user) return null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Notifications</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Configure when and how you receive briefings, reviews, and digests.
          More delivery channels coming soon.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily briefings</CardTitle>
            <CardDescription>
              Start and end your day with a summary of what matters.
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
              A weekly summary of your progress and insights.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="weekly_digest_day">Day of week</Label>
              <select
                id="weekly_digest_day"
                name="weekly_digest_day"
                className="w-full max-w-48 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                defaultValue={notifications?.weekly_digest_day ?? 0}
                disabled={isPending}
              >
                {WEEKDAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
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

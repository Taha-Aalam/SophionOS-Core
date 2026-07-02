"use client";

import { useEffect } from "react";
import { Globe, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

import {
  usePreferences,
  useUpdatePreferences,
} from "@/lib/hooks/use-user-settings";
import { useAuth } from "@/components/providers/auth-provider";

const TIMEZONES = [
  { label: "UTC", value: "UTC" },
  { label: "America/New York (EST/EDT)", value: "America/New_York" },
  { label: "America/Los Angeles (PST/PDT)", value: "America/Los_Angeles" },
  { label: "Europe/London (GMT/BST)", value: "Europe/London" },
  { label: "Europe/Paris (CET/CEST)", value: "Europe/Paris" },
  { label: "Asia/Kolkata (IST)", value: "Asia/Kolkata" },
  { label: "Asia/Tokyo (JST)", value: "Asia/Tokyo" },
  { label: "Australia/Sydney (AEST/AEDT)", value: "Australia/Sydney" },
];

const THEMES = [
  { label: "System", value: "system" },
  { label: "Light", value: "light" },
  { label: "Dark", value: "dark" },
];

const LANGUAGES = [
  { label: "English", value: "en" },
  { label: "Español", value: "es" },
  { label: "Français", value: "fr" },
  { label: "Deutsch", value: "de" },
];

export default function PreferencesPage() {
  const { user } = useAuth();
  const { data: preferences } = usePreferences();
  const { mutate: updatePreferences, isPending } = useUpdatePreferences();
  const { theme, setTheme } = useTheme();

  // Sync next-themes with persisted preference on mount
  useEffect(() => {
    if (preferences?.theme && preferences.theme !== theme) {
      setTheme(preferences.theme);
    }
  }, [preferences?.theme, theme, setTheme]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const timezone = formData.get("timezone") as string;
    const theme = formData.get("theme") as "light" | "dark" | "system";
    const language = formData.get("language") as string;

    updatePreferences(
      { timezone, theme, language },
      {
        onSuccess: () => toast.success("Preferences saved"),
      },
    );
  }

  if (!user) return null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Preferences</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Set your timezone, theme, and language. Theme preference is synced
          with the UI immediately.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Display</CardTitle>
            <CardDescription>
              Choose how LifeOS looks and feels.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme">Theme</Label>
              <Select
                name="theme"
                defaultValue={preferences?.theme ?? theme ?? "system"}
                disabled={isPending}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  {THEMES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        {t.value === "light" && <Sun className="size-4" />}
                        {t.value === "dark" && <Moon className="size-4" />}
                        {t.value === "system" && <Globe className="size-4" />}
                        {t.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select
                name="language"
                defaultValue={preferences?.language ?? "en"}
                disabled={isPending}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Localization</CardTitle>
            <CardDescription>
              Set your timezone for date/time displays.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                name="timezone"
                defaultValue={preferences?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone}
                disabled={isPending}
              >
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Save preferences"}
          </Button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
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
  usePreferences,
  useUpdatePreferences,
} from "@/lib/hooks/use-user-settings";
import { useAuth } from "@/components/providers/auth-provider";
import { useI18n } from "@/components/providers/i18n-provider";
import { TIER1_LOCALES } from "@/lib/i18n/config";
import type { TranslationKey } from "@/lib/i18n/dictionary";

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

const THEMES: Array<{ labelKey: TranslationKey; value: string }> = [
  { labelKey: "preferences.theme.system", value: "system" },
  { labelKey: "preferences.theme.light", value: "light" },
  { labelKey: "preferences.theme.dark", value: "dark" },
];

export default function PreferencesPage() {
  const { user } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const { data: preferences } = usePreferences();
  const { mutate: updatePreferences, isPending } = useUpdatePreferences();
  const { theme, setTheme } = useTheme();

  // SSR-safe client values. `next-themes`' `theme` and the browser timezone
  // are only known after hydration; using them in the first render makes the
  // server HTML ("system"/"UTC") disagree with the client ("dark"/local tz)
  // and React regenerates the tree (hydration mismatch).
  const [isMounted, setIsMounted] = useState(false);
  /* eslint-disable react-hooks/set-state-in-effect -- mounted gate for client-only values */
  useEffect(() => setIsMounted(true), []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const [themeSelect, setThemeSelect] = useState<string>();
  const [languageSelect, setLanguageSelect] = useState<string>();
  const [timezoneSelect, setTimezoneSelect] = useState<string>();

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

    // Apply the language to the live UI first (and keep it if the write
    // fails); the preferences mutation persists language, theme and timezone
    // together in the existing user_settings row.
    void setLocale(language as typeof locale, false);
    updatePreferences(
      { timezone, theme, language },
      {
        onSuccess: () => toast.success(t("preferences.saved")),
      },
    );
  }

  if (!user) return (
    <div className="reveal-stagger flex flex-col gap-6 p-6 content-column-grid mx-auto w-full" aria-busy="true" role="status" aria-label={t("preferences.loading")}>
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-muted animate-pulse" />
        <div className="h-48 w-full rounded-lg border border-border/40 bg-muted/30 animate-pulse" />
      </div>
    </div>
  );

  return (
    <div className="content-fade-in reveal-stagger flex flex-col gap-6 p-6 content-column-grid mx-auto w-full">
      <SettingsDetailHeader
        title={t("preferences.title")}
        description={t("preferences.description")}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("preferences.display.title")}
            </CardTitle>
            <CardDescription>
              {t("preferences.display.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="theme">{t("preferences.theme.label")}</Label>
              <Select
                value={themeSelect ?? (isMounted ? preferences?.theme ?? theme ?? "system" : "system")}
                onValueChange={(v) => setThemeSelect(v ?? undefined)}
                disabled={isPending}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder={t("preferences.theme.placeholder")}>
                    {(value) => {
                      const labelKey = THEMES.find((item) => item.value === value)?.labelKey;
                      return labelKey ? t(labelKey) : undefined;
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {THEMES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      <div className="flex items-center gap-2">
                        {item.value === "light" && <Sun className="size-4" />}
                        {item.value === "dark" && <Moon className="size-4" />}
                        {item.value === "system" && <Globe className="size-4" />}
                        {t(item.labelKey)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">{t("preferences.language.label")}</Label>
              <Select
                name="language"
                required
                value={languageSelect ?? locale}
                onValueChange={(v) => setLanguageSelect(v ?? undefined)}
                disabled={isPending}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder={t("preferences.language.placeholder")}>
                    {(value) => TIER1_LOCALES.find((item) => item.code === value)?.nativeName}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {/* Native names are never translated: a user looking for
                      their language should recognise it as they write it. */}
                  {TIER1_LOCALES.map((item) => (
                    <SelectItem key={item.code} value={item.code}>
                      {item.nativeName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {t("preferences.localization.title")}
            </CardTitle>
            <CardDescription>
              {t("preferences.localization.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">{t("preferences.timezone.label")}</Label>
              <Select
                name="timezone"
                required
                value={timezoneSelect ?? (isMounted ? preferences?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC")}
                onValueChange={(v) => setTimezoneSelect(v ?? undefined)}
                disabled={isPending}
              >
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder={t("preferences.timezone.placeholder")} />
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
            {isPending ? t("preferences.saving") : t("preferences.save")}
          </Button>
        </div>
      </form>
    </div>
  );
}

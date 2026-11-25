"use client";

import Link from "next/link";
import {
  Bell,
  CreditCard,
  KeyRound,
  Lock,
  Plug,
  Settings2,
  Shield,
  Sparkles,
  User,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { contentColumnGrid, sectionGap } from "@/components/ui/layout";
import { useI18n } from "@/components/providers/i18n-provider";
import type { TranslationKey } from "@/lib/i18n/dictionary";
import { cn } from "@/lib/utils";
import { isFeatureEnabled, type FeatureFlag } from "@/lib/config/feature-flags";

const settingsCards: Array<{
  href: string;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: typeof User;
}> = [
  {
    href: "/settings/profile",
    titleKey: "settings.profile.title",
    descriptionKey: "settings.profile.description",
    icon: User,
  },
  {
    href: "/settings/preferences",
    titleKey: "settings.preferences.title",
    descriptionKey: "settings.preferences.description",
    icon: Settings2,
  },
  {
    href: "/settings/notifications",
    titleKey: "settings.notifications.title",
    descriptionKey: "settings.notifications.description",
    icon: Bell,
  },
  {
    href: "/settings/ai-access",
    titleKey: "settings.aiAccess.title",
    descriptionKey: "settings.aiAccess.description",
    icon: Shield,
  },
  {
    href: "/settings/ai-providers",
    titleKey: "settings.aiProviders.title",
    descriptionKey: "settings.aiProviders.description",
    icon: Sparkles,
  },
  {
    href: "/settings/privacy",
    titleKey: "settings.privacy.title",
    descriptionKey: "settings.privacy.description",
    icon: Lock,
  },
  {
    href: "/settings/api-keys",
    titleKey: "settings.apiAccess.title",
    descriptionKey: "settings.apiAccess.description",
    icon: KeyRound,
  },
  {
    href: "/settings/mcp",
    titleKey: "settings.mcpServer.title",
    descriptionKey: "settings.mcpServer.description",
    icon: Plug,
  },
  {
    href: "/settings/billing",
    titleKey: "settings.billing.title",
    descriptionKey: "settings.billing.description",
    icon: CreditCard,
  },
  {
    href: "/settings/integrations",
    titleKey: "settings.integrations.title",
    descriptionKey: "settings.integrations.description",
    icon: User,
  },
];

export default function SettingsPage() {
  const { t } = useI18n();

  // Hide a settings card when its feature flag is OFF. The flags default to off,
  // so the gated tabs only appear once their NEXT_PUBLIC_FEATURE_* env var is
  // truthy. Add an entry here when a new flag is introduced.
  const featureForCard: Record<string, FeatureFlag> = {
    "/settings/notifications": "cloud_later",
    "/settings/billing": "sop_cloud",
  };
  const visibleSettingsCards = settingsCards.filter((card) => {
    const flag = featureForCard[card.href];
    return flag ? isFeatureEnabled(flag) : true;
  });

  return (
    <div className={cn("content-fade-in reveal-stagger flex flex-col", contentColumnGrid, sectionGap)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings2 className="size-6" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-heading">
              {t("nav.settings")}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {t("settings.subtitle")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-[var(--grid-gap-sm)] sm:gap-[var(--grid-gap)] md:grid-cols-2 lg:grid-cols-3">
        {visibleSettingsCards.map((card) => {
          const title = t(card.titleKey);
          return (
            <Link key={card.href} href={card.href} className="block focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none rounded-lg">
              <Card className="hover-lift h-full">
                <CardHeader className="space-y-3">
                  <div className="flex items-center gap-2">
                    <card.icon className="size-5 text-primary" />
                    <CardTitle className="text-base">{title}</CardTitle>
                  </div>
                  <CardDescription>{t(card.descriptionKey)}</CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-primary">
                  {t("settings.openCard", { name: title })}
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

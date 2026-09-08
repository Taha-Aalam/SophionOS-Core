import Link from "next/link";
import {
  Bell,
  CreditCard,
  KeyRound,
  Lock,
  Plug,
  Settings2,
  Shield,
  User,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isFeatureEnabled, type FeatureFlag } from "@/lib/config/feature-flags";

const settingsCards = [
  {
    href: "/settings/preferences",
    title: "Preferences",
    description: "Theme, timezone, language, and display options.",
    icon: Settings2,
  },
  {
    href: "/settings/notifications",
    title: "Notifications",
    description: "Configure briefings, digests, and reminder schedules.",
    icon: Bell,
  },
  {
    href: "/settings/ai-access",
    title: "AI Access",
    description:
      "See connected clients, revoke keys, and disable all AI/API access.",
    icon: Shield,
  },
  {
    href: "/settings/privacy",
    title: "Privacy & data",
    description: "Export your data, review counts, and request account deletion.",
    icon: Lock,
  },
  {
    href: "/settings/api-keys",
    title: "API Access",
    description: "Create and manage API keys for MCP and direct API use.",
    icon: KeyRound,
  },
  {
    href: "/settings/mcp",
    title: "MCP Server",
    description: "Connect SophionOS to your AI client. Requires Pro.",
    icon: Plug,
  },
  {
    href: "/settings/billing",
    title: "Billing",
    description: "View your plan, usage, and upgrade options.",
    icon: CreditCard,
  },
  {
    href: "/settings/integrations",
    title: "Integrations",
    description: "Connect third-party services and sync data.",
    icon: User,
  },
];

export default function SettingsPage() {
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
    <div className="content-fade-in reveal-stagger flex flex-col gap-6 p-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings2 className="size-6" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-heading">Settings</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Configure your SophionOS experience, access, and connections.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visibleSettingsCards.map((card) => (
          <Link key={card.href} href={card.href} className="block focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none rounded-lg">
            <Card className="hover-lift h-full">
              <CardHeader className="space-y-3">
                <div className="flex items-center gap-2">
                  <card.icon className="size-5 text-primary" />
                  <CardTitle className="text-base">{card.title}</CardTitle>
                </div>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-primary">
                Open {card.title} →
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

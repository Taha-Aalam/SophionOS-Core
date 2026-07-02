import Link from "next/link";
import {
  Bell,
  CreditCard,
  KeyRound,
  Plug,
  Settings2,
  User,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
    href: "/settings/api-keys",
    title: "API Access",
    description: "Create and manage API keys for MCP and direct API use.",
    icon: KeyRound,
  },
  {
    href: "/settings/mcp",
    title: "MCP Server",
    description: "Connect LifeOS to your AI client. Requires Pro.",
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
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Configure your LifeOS experience, access, and connections.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsCards.map((card) => (
          <Link key={card.href} href={card.href} className="block">
            <Card className="transition-colors hover:border-primary/50 h-full">
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

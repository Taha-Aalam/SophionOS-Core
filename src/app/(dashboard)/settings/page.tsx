import { Mail, Palette, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const settingsCards = [
  {
    description: "Theme, timezone, and personal preferences are restored in later batches.",
    icon: Palette,
    title: "Preferences",
  },
  {
    description: "Account management stays available through your auth session and user menu.",
    icon: ShieldCheck,
    title: "Account",
  },
  {
    description: "Support and notification settings will land here once the broader settings area returns.",
    icon: Mail,
    title: "Notifications",
  },
];

export default function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          This placeholder keeps shell navigation trustworthy while full settings restoration waits
          for a later batch.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {settingsCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="space-y-3">
              <card.icon className="size-5 text-primary" />
              <div className="space-y-1">
                <CardTitle className="text-base">{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Coming back as the dedicated settings batch is restored.
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

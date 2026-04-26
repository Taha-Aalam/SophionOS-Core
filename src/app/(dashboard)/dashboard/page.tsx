import Link from "next/link";
import { ArrowRight, CheckSquare, FolderKanban, Map, Target } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const dashboardDestinations = [
  {
    description: "Review the restored default areas and make sure your life domains feel right.",
    href: "/areas",
    icon: Map,
    title: "Areas",
  },
  {
    description: "Project pages are back in the shell and ready for the later restoration batches.",
    href: "/projects",
    icon: FolderKanban,
    title: "Projects",
  },
  {
    description: "Task views remain available without pulling deeper feature work into Batch C.",
    href: "/tasks",
    icon: CheckSquare,
    title: "Tasks",
  },
  {
    description: "Goal routes stay reachable while the richer goal restoration waits for Batch E.",
    href: "/goals",
    icon: Target,
    title: "Goals",
  },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">LifeOS Dashboard</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Batch C keeps the app shell trustworthy: auth is stable, navigation is consistent, and
          the dashboard now serves as a clean launch point instead of pretending deeper features
          are fully restored.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {dashboardDestinations.map((destination) => (
          <Link href={destination.href} key={destination.href}>
            <Card className="h-full transition-colors hover:border-primary/60 hover:bg-muted/30">
              <CardHeader className="space-y-3">
                <destination.icon className="size-5 text-primary" />
                <div className="space-y-1">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{destination.title}</span>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </CardTitle>
                  <CardDescription>{destination.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Open {destination.title.toLowerCase()}.
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

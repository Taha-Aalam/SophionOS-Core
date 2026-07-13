import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

// Branded 404 for both the apex host and the (dashboard) group. Next renders
// this for unmatched routes, so it must stand alone (no sidebar/topbar shell).
export default function NotFound() {
  return (
    <main className="reveal-once flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="rounded-xl bg-muted/40 p-2 ring-1 ring-foreground/5">
        <div className="flex size-16 items-center justify-center rounded-lg bg-card shadow-soft ring-1 ring-foreground/10">
          <Compass className="size-7 text-muted-foreground" strokeWidth={1.5} />
        </div>
      </div>
      <div className="space-y-1.5">
        <p className="font-heading text-5xl font-bold tracking-tight tabular-nums">404</p>
        <h1 className="text-lg font-medium tracking-tight">This page wandered off</h1>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          The link may be old or the page may have moved. Your goals, projects,
          and notes are still where you left them.
        </p>
      </div>
      <Link
        href="/dashboard"
        className={buttonVariants({ variant: "default", size: "sm" }) + " h-9 gap-2 rounded-full pl-4 pr-2"}
      >
        Back to dashboard
        <span className="flex size-6 items-center justify-center rounded-full bg-primary-foreground/15">
          <Compass className="size-3.5" />
        </span>
      </Link>
    </main>
  );
}

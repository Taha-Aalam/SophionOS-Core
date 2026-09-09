import Link from "next/link";
import type { ReactNode } from "react";

export function TrustPageShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto max-w-3xl px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="font-heading font-semibold tracking-tight">
            SophionOS
          </Link>
          <nav className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/security" className="hover:text-foreground">
              Security
            </Link>
            <Link href="/subprocessors" className="hover:text-foreground">
              Subprocessors
            </Link>
            <Link href="/data-and-ai" className="hover:text-foreground">
              Data &amp; AI
            </Link>
            <Link href="/responsible-disclosure" className="hover:text-foreground">
              Disclosure
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10 prose prose-neutral dark:prose-invert">
        <h1>{title}</h1>
        {children}
      </main>
    </div>
  );
}

import Link from "next/link";

// Apex marketing landing (e.g. localhost:3000 / your-domain.com).
//
// The application lives on the `app.` subdomain; middleware (src/proxy.ts)
// redirects the subdomain root to /dashboard, so this page is only ever
// rendered for the apex host. The "Sign in" link points at the bare /login
// path — on the apex host middleware relocates it to the subdomain origin, so
// no origin/port is hardcoded here.
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-4xl">SophionOS Core</h1>
      <p className="max-w-md text-muted-foreground">
        Your personal operating system for goals, projects, tasks, notes, and
        the people and areas of your life.
      </p>
      <Link
        href="/login"
        className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Sign in
      </Link>
    </main>
  );
}

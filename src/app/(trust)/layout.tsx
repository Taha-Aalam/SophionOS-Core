import React, { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";

import { CommandPalette } from "@/components/layout/command-palette";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { AuthProvider } from "@/components/providers/auth-provider";

/**
 * Standard app shell for the system policy pages — the same Sidebar/Topbar/
 * MobileNav as (dashboard), so policies sit inside the product instead of on a
 * bespoke marketing-style header.
 *
 * PERMANENTLY PUBLIC. These routes never bounce the visitor to sign-in and
 * never apply the onboarding redirect: anyone, signed in or not, must be able
 * to read the terms. Signed out, the shell degrades to a logo-only header, because
 * Sidebar/MobileNav/Topbar all read auth context.
 *
 * Two shells on purpose: a fixed h-screen pane with an independently scrolling
 * <main> is right on desktop and wrong on mobile, where the viewport can be
 * 480px tall and a pinned pane would cut the document off. `min-h-0` on the
 * column is load-bearing — without it the flex child grows to content height
 * and the outer overflow-hidden clips the bottom of a long page.
 *
 * ponytail: the two branches duplicate the header JSX. Ceiling: one file, two
 * divs. Upgrade path: extract <AppShell signedIn> once a second responsive
 * consumer exists.
 */
export default async function TrustLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  const signedIn = typeof userId === "string";

  return (
    <AuthProvider
      initialUser={{
        id: signedIn ? userId : "",
        email: null,
        name: null,
        imageUrl: null,
      }}
    >
      {/* Desktop: fixed shell, independently scrolling main pane. */}
      <div className="hidden h-screen overflow-hidden bg-background lg:flex">
        {signedIn ? (
          <>
            <Sidebar />
            <MobileNav />
          </>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col min-w-0 overflow-hidden">
          {signedIn ? <Topbar /> : <PublicPolicyHeader />}
          <main className="flex-1 overflow-y-auto overscroll-contain">{children}</main>
        </div>
      </div>

      {/* Mobile: normal document scroll, no clipped pane. */}
      <div className="flex min-h-screen flex-col bg-background lg:hidden">
        {signedIn ? <MobileNav /> : null}
        <div className="flex flex-1 flex-col min-w-0">
          {signedIn ? <Topbar /> : <PublicPolicyHeader />}
          <main className="flex-1">{children}</main>
        </div>
      </div>

      {signedIn ? (
        <Suspense fallback={null}>
          <CommandPalette />
        </Suspense>
      ) : null}
    </AuthProvider>
  );
}

/**
 * Signed-out header: the wordmark only, linking home. Same h-12 + border-b as
 * Topbar so the content top edge never jumps between states. No nav — there is
 * no session to navigate; the documents are cross-linked from their bodies and
 * from transactional email footers.
 */
function PublicPolicyHeader() {
  return (
    <header className="flex h-12 shrink-0 items-center border-b border-border bg-background px-4">
      <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
        <Image
          src="/brand/sophion-symbol.svg"
          alt=""
          width={24}
          height={24}
          unoptimized
          className="size-6 dark:hidden"
        />
        <Image
          src="/brand/sophion-symbol-reversed-white.svg"
          alt=""
          width={24}
          height={24}
          unoptimized
          className="hidden size-6 dark:block"
        />
        <span className="tracking-tight">SophionOS</span>
      </Link>
    </header>
  );
}

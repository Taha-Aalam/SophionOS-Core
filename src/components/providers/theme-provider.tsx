"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

/**
 * Theme wiring for the whole app.
 *
 * - `defaultTheme="dark"`: no stored choice renders dark.
 * - `enableSystem={false}`: the OS preference never overrides that default.
 * - `attribute="class"`: next-themes toggles the `dark` class on <html>. This
 *   is load-bearing — the library's own default is `data-theme`, which the
 *   Tailwind `dark:` variant (a class selector) ignores, so the app used to
 *   depend on a post-hydration effect to add the class and therefore painted
 *   light first.
 * - `nonce`: the pre-paint script is inline; the app ships a nonce-based CSP
 *   (see src/lib/security/csp.ts), so without the nonce the browser blocks it
 *   and the theme can only be applied after hydration — i.e. after first paint.
 *
 * The pre-paint script is the only thing that sets the class before paint, so
 * there is deliberately no client-side fallback that re-applies it on mount.
 */
export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      {...props}
      attribute="class"
      defaultTheme="dark"
      storageKey="sophionos-theme"
      enableSystem={false}
      disableTransitionOnChange={false}
    >
      {children}
    </NextThemesProvider>
  )
}

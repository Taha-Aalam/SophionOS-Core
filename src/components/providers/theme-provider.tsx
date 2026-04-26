"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { ThemeClass } from "./theme-class"

export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      {...props}
      defaultTheme="dark"
      storageKey="lifeos-theme"
      enableSystem={false}
      disableTransitionOnChange={false}
    >
      <ThemeClass />
      {children}
    </NextThemesProvider>
  )
}

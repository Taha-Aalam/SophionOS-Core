import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { InboxBackfillProvider } from "@/components/providers/inbox-backfill-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UIProvider } from "@/lib/stores/ui.store";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LifeOS Core",
  description: "SaaS Life Management Platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-full flex flex-col antialiased`} suppressHydrationWarning>
        <ClerkProvider>
          <QueryProvider>
            <div suppressHydrationWarning>
              <ThemeProvider>
                <AuthProvider>
                  <InboxBackfillProvider>
                    <TooltipProvider>
                      <UIProvider>
                        {children}
                      </UIProvider>
                    </TooltipProvider>
                  </InboxBackfillProvider>
                </AuthProvider>
              </ThemeProvider>
            </div>
          </QueryProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sora } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UIProvider } from "@/lib/stores/ui.store";
import { PwaProvider } from "@/components/providers/pwa-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SophionOS",
  description: "SaaS Life Management Platform",
  manifest: "/manifest.webmanifest",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://sophionos.com"),
  openGraph: {
    title: "SophionOS",
    description: "One calm system for your whole life.",
    type: "website",
    siteName: "SophionOS",
  },
  twitter: {
    card: "summary_large_image",
    title: "SophionOS",
    description: "One calm system for your whole life.",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png" }],
    apple: [{ url: "/icons/apple-touch-icon.png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SophionOS",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfcfd" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} min-h-full flex flex-col antialiased`} suppressHydrationWarning>
        <ClerkProvider>
          <QueryProvider>
            <PwaProvider />
            <div suppressHydrationWarning>
              <ThemeProvider>
                <TooltipProvider>
                  <UIProvider>
                    {children}
                  </UIProvider>
                </TooltipProvider>
              </ThemeProvider>
            </div>
          </QueryProvider>
        </ClerkProvider>
        <div className="grain-overlay" aria-hidden="true" />
      </body>
    </html>
  );
}
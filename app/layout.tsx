import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#d4f262" },
    { media: "(prefers-color-scheme: dark)", color: "#2d3438" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Skyflint — Hunt cheap flights",
    template: "%s — Skyflint",
  },
  description:
    "Deep multi-source flight deal search powered by an autonomous agent.",
  applicationName: "Skyflint",
  authors: [{ name: "Skyflint contributors" }],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Skyflint",
    title: "Skyflint — Hunt cheap flights",
    description:
      "Deep multi-source flight deal search powered by an autonomous agent.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Skyflint — Hunt cheap flights",
    description:
      "Deep multi-source flight deal search powered by an autonomous agent.",
  },
  appleWebApp: {
    capable: true,
    title: "Skyflint",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(inter.variable, "min-h-dvh font-sans antialiased")}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}

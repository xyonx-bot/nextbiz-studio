import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { getActiveDesign } from "@/lib/design";
import { designAttrs, designVars } from "@/lib/design-core";
import { AnnouncementBar, DesignProvider } from "@/components/chrome/Design";
import { Motion } from "@/components/chrome/Motion";

// Fonts ship with the site (app/fonts, latin subset from Google Fonts) so builds never depend on
// downloading them — the Google Fonts fetch failed several beta builds.
const manrope = localFont({
  src: "./fonts/manrope-latin-var.woff2",
  weight: "200 800",
  variable: "--font-manrope",
  display: "swap",
});

const scribbleFont = localFont({
  src: "./fonts/nothing-you-could-do-latin.woff2",
  weight: "400",
  variable: "--font-scribble-family",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NextBiz Studio — Your Digital Team, When You Need It",
  description:
    "We help businesses build, improve and grow through thoughtful digital solutions, marketing support and technology shaped around the way they work.",
  // ?v= busts browser caches (nginx serves these with a 7-day cache); bump it whenever the icon changes
  icons: {
    icon: [
      { url: "/favicon.ico?v=3", sizes: "any" },
      { url: "/favicons/favicon-32.png?v=3", sizes: "32x32", type: "image/png" },
      { url: "/favicons/favicon-16.png?v=3", sizes: "16x16", type: "image/png" },
      { url: "/favicons/favicon-192.png?v=3", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/favicons/apple-touch-icon.png?v=3", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Admin → Design: visitors get the published design; the signed-in admin previewing gets the draft.
  const { design, preview } = await getActiveDesign();
  return (
    <html lang="en" className={`${manrope.variable} ${scribbleFont.variable}`} {...designAttrs(design)} suppressHydrationWarning>
      <head>
        {/* values are validated hex colours (lib/design-core.ts normalizeDesign) */}
        <style id="nbs-design" dangerouslySetInnerHTML={{ __html: `:root{${designVars(design)}}` }} />
      </head>
      <body>
        <DesignProvider initial={design} preview={preview}>
          <AnnouncementBar />
          {children}
          <Motion />
        </DesignProvider>
      </body>
    </html>
  );
}

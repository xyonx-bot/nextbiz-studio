import type { Metadata, Viewport } from "next";
import { Manrope, Nothing_You_Could_Do } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { isAuthenticated } from "@/lib/auth";
import { getDraftDesign, getPublishedDesign } from "@/lib/design";
import { designAttrs, designVars } from "@/lib/design-core";
import { AnnouncementBar, DesignProvider } from "@/components/chrome/Design";
import { Motion } from "@/components/chrome/Motion";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
  display: "swap",
});

const scribbleFont = Nothing_You_Could_Do({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-scribble-family",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NextBiz Studio — Your Digital Team, When You Need It",
  description:
    "We help businesses build, improve and grow through thoughtful digital solutions, marketing support and technology shaped around the way they work.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicons/favicon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/favicons/apple-touch-icon.png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Admin → Design: visitors get the published design; the signed-in admin previewing gets the draft.
  const preview = (await cookies()).get("nbs_preview")?.value === "1" && (await isAuthenticated());
  const design = preview ? await getDraftDesign() : await getPublishedDesign();
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

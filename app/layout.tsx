import type { Metadata, Viewport } from "next";
import { Manrope, Nothing_You_Could_Do } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${manrope.variable} ${scribbleFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}

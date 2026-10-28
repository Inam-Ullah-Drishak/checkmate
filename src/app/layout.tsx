import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import {
  generateMetadata,
  generateViewport,
} from "@/utils/seo/generate-page-metadata";
import { getSiteStructuredData } from "@/utils/seo/structured-data";

import { AdaptiveGrid } from "@/components/common/grid";
import { PixelWaves } from "@/components/common/pixel-waves";
import { Preloader } from "@/components/common/preloader";
import { ReducedMotion } from "@/components/common/reduced-motion";
import { ScrollLayout } from "@/layouts/scroll-layout";

import { themeBootScript } from "@/lib/site-themes";

import "@/app/globals.css";

/**
 * The two faces the design uses, and only those. The starter shipped Onest from
 * Google Fonts; it was a third family doing the same job as General Sans, so it
 * is gone rather than left loading in the background.
 */
const generalSans = localFont({
  src: "./fonts/GeneralSans-Medium-latin.woff2",
  variable: "--font-general-sans",
  weight: "500",
  style: "normal",
  display: "swap",
});

export const metadata: Metadata = generateMetadata();
export const viewport: Viewport = generateViewport();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${generalSans.variable} font-sans`}>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(getSiteStructuredData()),
          }}
        />
        <ScrollLayout>
          <AdaptiveGrid />
          <ReducedMotion />
          <PixelWaves />
          <Preloader />
          {children}
        </ScrollLayout>
      </body>
    </html>
  );
}

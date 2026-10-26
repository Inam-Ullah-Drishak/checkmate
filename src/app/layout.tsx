import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import {
  generateMetadata,
  generateViewport,
} from "@/utils/seo/generate-page-metadata";
import { getSiteStructuredData } from "@/utils/seo/structured-data";

import { LazyCookie } from "@/components/common/Cookie";
import { CONSENT_FLAG_SCRIPT } from "@/components/common/Cookie/consent-flag";
import { AdaptiveGrid } from "@/components/common/grid";
import { PixelWaves } from "@/components/common/pixel-waves";
import { Preloader } from "@/components/common/preloader";
import { ReducedMotion } from "@/components/common/reduced-motion";
import { ScrollLayout } from "@/layouts/scroll-layout";

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

const jersey = localFont({
  src: "./fonts/Jersey25-Regular-latin.woff2",
  variable: "--font-jersey",
  weight: "400",
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
    // `data-consent` is set on <html> by CONSENT_FLAG_SCRIPT before hydration.
    <html lang="en" suppressHydrationWarning>
      <body className={`${generalSans.variable} ${jersey.variable} font-sans`}>
        {/* Before anything is parsed: marks a returning visitor's choice so the
            server-rendered consent banner is hidden before its first paint. */}
        <script dangerouslySetInnerHTML={{ __html: CONSENT_FLAG_SCRIPT }} />
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
          <LazyCookie />
          {children}
        </ScrollLayout>
      </body>
    </html>
  );
}

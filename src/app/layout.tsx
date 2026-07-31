import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CompareTray } from "@/components/compare-tray";
import { SiteChrome } from "@/components/site-chrome";

// Brand fonts per the SeedhiDeal Design System v1.0:
// Newsreader (headlines, prices, wordmark) + Inter (UI and body)
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

// Same fallback pattern already used on the homepage's JSON-LD (src/app/page.tsx)
// and the new sitemap/robots routes — no production domain configured yet.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const SITE_TITLE = "SeedhiDeal — verified cars from real owners";
const SITE_DESCRIPTION =
  "Trust-first marketplace for verified private-owner cars in Pakistan. Real owners. Real buyers. Seedhi deal.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: "%s | SeedhiDeal",
  },
  description: SITE_DESCRIPTION,
  // No global canonical here — canonical URLs are defined only by individual
  // pages that need one (e.g. /cars, /cars/[id], /dealers, /dealers/[id]),
  // each via its own `alternates.canonical`, same pattern as per-page `title`.
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: "SeedhiDeal",
    images: [{ url: "/logo.jpg" }],
    locale: "en_PK",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/logo.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteChrome header={<Header />} footer={<Footer />} compareTray={<CompareTray />}>
          {children}
        </SiteChrome>
      </body>
    </html>
  );
}

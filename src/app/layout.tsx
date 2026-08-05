import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CompareTray } from "@/components/compare-tray";
import { SiteChrome } from "@/components/site-chrome";
import { NewListingNotifications } from "@/components/new-listing-notifications";
import { AssistantWidget } from "@/components/assistant/assistant-widget";
import { getSiteSettings } from "@/lib/site-settings";

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
// and the sitemap/robots routes — no production domain configured yet.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Metadata is generated per-request (not a static export) so the admin Website
// Settings > SEO/General tabs take effect immediately, with no rebuild — the same
// "no fake settings" requirement as everything else in this phase. Falls back to the
// exact same copy this file hardcoded before if nothing has been configured yet.
export async function generateMetadata(): Promise<Metadata> {
  const { general, seo, media } = await getSiteSettings();
  const title = seo.metaTitle || general.siteName;
  const description = seo.metaDescription || general.description;
  const canonicalBase = seo.canonicalUrl || SITE_URL;

  return {
    metadataBase: new URL(canonicalBase),
    title: {
      default: title,
      template: `%s | ${general.siteName}`,
    },
    description,
    robots: seo.robots || undefined,
    // No global canonical *path* here — canonical URLs for individual pages are still
    // defined by those pages themselves (e.g. /cars, /cars/[id]) via their own
    // alternates.canonical; only metadataBase (the origin canonical URLs resolve
    // against) is admin-configurable.
    openGraph: {
      title,
      description,
      url: canonicalBase,
      siteName: general.siteName,
      images: [{ url: seo.ogImage || "/logo.jpg" }],
      locale: "en_PK",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [seo.twitterImage || "/logo.jpg"],
    },
    icons: media.favicon ? { icon: media.favicon } : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { general } = await getSiteSettings();

  return (
    <html
      lang={general.language || "en"}
      className={`${inter.variable} ${newsreader.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SiteChrome header={<Header />} footer={<Footer />} compareTray={<CompareTray />}>
          {children}
        </SiteChrome>
        <NewListingNotifications />
        <AssistantWidget />
      </body>
    </html>
  );
}

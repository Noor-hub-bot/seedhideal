import type { MetadataRoute } from "next";
import { getSiteSettings } from "@/lib/site-settings";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Without this, Next.js prerenders robots.txt once at build time (it has no per-request
// API to otherwise infer dynamic rendering from) — which would silently bake in whatever
// the SEO > Robots setting was at build time, defeating "every change immediately
// affects the live website" for the one setting this route actually reads.
export const dynamic = "force-dynamic";

// Blocks crawling of authenticated/account-management surfaces and the auth
// flow itself (none of it is content search engines should index) while
// leaving every browse/content route — including individual listing and
// dealer pages — crawlable, UNLESS the admin's SEO > Robots setting contains
// "noindex" — a genuine site-wide override (e.g. for a staging deploy or a
// deliberate temporary opt-out), not a per-page directive.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const { seo } = await getSiteSettings();
  if (seo.robots.toLowerCase().includes("noindex")) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/admin",
        "/api",
        "/sign-in",
        "/sign-up",
        "/forgot-password",
        "/reset-password",
        "/verify",
        "/complete-profile",
        "/account-created",
        "/google-bridge",
        "/welcome",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

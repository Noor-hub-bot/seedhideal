import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Blocks crawling of authenticated/account-management surfaces and the auth
// flow itself (none of it is content search engines should index) while
// leaving every browse/content route — including individual listing and
// dealer pages — crawlable.
export default function robots(): MetadataRoute.Robots {
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

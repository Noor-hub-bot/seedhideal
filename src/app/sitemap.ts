import type { MetadataRoute } from "next";

// Same fallback pattern already used on the homepage's JSON-LD (src/app/page.tsx) —
// no production domain is configured yet, so this resolves to localhost until
// NEXT_PUBLIC_SITE_URL is set.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// Static/browse pages only for now — individual /cars/[id] and /dealers/[id]
// listing URLs are a follow-up once inventory volume justifies per-listing
// sitemap entries (they also churn far more often than these pages).
const ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "", changeFrequency: "daily", priority: 1 },
  { path: "/cars", changeFrequency: "daily", priority: 0.9 },
  { path: "/dealers", changeFrequency: "weekly", priority: 0.7 },
  { path: "/sell", changeFrequency: "monthly", priority: 0.6 },
  { path: "/help", changeFrequency: "monthly", priority: 0.4 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.2 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}

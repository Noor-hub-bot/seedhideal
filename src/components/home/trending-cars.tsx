import { unstable_cache } from "next/cache";
import { and, desc, eq, gt, gte, isNull, or } from "drizzle-orm";
import { db, listings } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { enrichListings } from "@/lib/listing-enrichment";
import { ListingCard } from "@/components/listing-card";
import { SectionHeading } from "./section-heading";
import { CarRail, CarRailItem } from "./car-rail";
import { safeSection } from "@/lib/safe-section";

// Only the listing rows are cached — `getSessionUser()` and `enrichListings`'s
// favorites lookup below stay fully dynamic (per-viewer), so personalization
// (favorited state, signed-in state) is unaffected by this cache.
const getTrendingListings = unstable_cache(
  async () =>
    db
      .select()
      .from(listings)
      .where(
        and(
          eq(listings.status, "active"),
          gte(listings.viewCount, 1),
          or(isNull(listings.expiresAt), gt(listings.expiresAt, new Date()))!,
        ),
      )
      .orderBy(desc(listings.viewCount))
      .limit(12),
  ["home-trending-cars"],
  { revalidate: 60 },
);

// Cumulative view count, not a rolling "last 7 days" window (that needs a
// per-event log table — a separate future feature). Only shows when at least
// one listing has real views, so it never displays as "trending" on zero data.
export async function TrendingCars() {
  const data = await safeSection(async () => {
    const [results, viewer] = await Promise.all([getTrendingListings(), getSessionUser()]);
    if (results.length === 0) return null;
    const enriched = await enrichListings(results, viewer);
    return { results, viewer, ...enriched };
  }, null);

  if (!data) return null;
  const { results, viewer, verifiedSellers, photosByListing, favoritedSet } = data;

  return (
    <section className="mx-auto max-w-6xl px-6 py-14">
      <SectionHeading title="Trending cars" subtitle="Getting the most attention right now" seeAllHref="/cars" />
      <CarRail>
        {results.map((l) => (
          <CarRailItem key={l.id}>
            <ListingCard
              listing={l}
              sellerVerified={verifiedSellers.has(l.sellerId)}
              photos={photosByListing.get(l.id) ?? []}
              favorited={favoritedSet.has(l.id)}
              signedIn={!!viewer}
            />
          </CarRailItem>
        ))}
      </CarRail>
    </section>
  );
}
